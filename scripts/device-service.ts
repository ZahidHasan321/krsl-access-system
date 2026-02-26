/**
 * ZKTeco Device Communication Service (Middleware)
 *
 * This service runs on a separate port (e.g. 8080) and handles
 * insecure HTTP communication from ZKTeco devices.
 *
 * It shares the same database with the SvelteKit app and
 * notifies the app of events via an internal API.
 *
 * Run with: node --env-file=.env --import=tsx scripts/device-service.ts
 */

import http from 'node:http';
import { URL } from 'node:url';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, asc, sql } from 'drizzle-orm';
import * as schema from '../src/lib/server/db/schema';
import {
	buildHandshakeResponse,
	parseAttLog,
	parseOperLog,
	toDateString,
	verifyCodeToMethod,
	formatCommand,
	Commands
} from '../src/lib/zkteco';
import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const PORT = process.env.DEVICE_SERVICE_PORT || 8080;
const DATABASE_URL = process.env.DATABASE_URL;
const SVELTE_INTERNAL_URL = process.env.SVELTE_INTERNAL_URL || 'http://localhost:5173';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'dev-secret';

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

console.log(`[Database] Connecting to: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);

// Initialize DB
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool, { schema });

// Startup check
pool.query('SELECT NOW()', (err) => {
	if (err) console.error('[Database] Connection failed:', err.message);
	else console.log('[Database] Connection successful');
});

/** Notify SvelteKit of an event via internal API */
async function notifySvelte(type: string, data: any = {}) {
	try {
		console.log(`[Notify] Sending ${type} event to SvelteKit...`);
		const res = await fetch(`${SVELTE_INTERNAL_URL}/api/internal/event`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${INTERNAL_API_KEY}`
			},
			body: JSON.stringify({ type, data })
		});
		if (!res.ok) {
			const text = await res.text();
			console.error(
				`[Notify] Failed to notify SvelteKit: ${res.status} ${res.statusText} - ${text}`
			);
		} else {
			console.log(`[Notify] Successfully notified SvelteKit of ${type}`);
		}
	} catch (e: any) {
		console.error(`[Notify] Error notifying SvelteKit:`, e.message);
	}
}

/** Helper to read request body */
async function readBody(req: http.IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		let body = '';
		req.on('data', (chunk) => (body += chunk.toString()));
		req.on('end', () => resolve(body));
		req.on('error', reject);
	});
}

/** Helper to read request body as Buffer */
async function readBuffer(req: http.IncomingMessage): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: any[] = [];
		req.on('data', (chunk) => chunks.push(chunk));
		req.on('end', () => resolve(Buffer.concat(chunks)));
		req.on('error', reject);
	});
}

/** Get next sequential command ID */
async function nextCommandId(): Promise<number> {
	const [row] = await db
		.select({ maxId: sql<number>`COALESCE(MAX(id), 999)` })
		.from(schema.deviceCommands);
	return (row.maxId || 999) + 1;
}

/** Save photo and generate thumbnail. Returns { photoUrl, thumbUrl }. */
async function savePersonPhoto(
	pin: string,
	imageBuffer: Buffer
): Promise<{ photoUrl: string; thumbUrl: string } | null> {
	if (imageBuffer.length === 0) return null;

	const uploadDir = join(process.cwd(), 'static', 'uploads', 'people');
	try {
		mkdirSync(uploadDir, { recursive: true });
	} catch {}

	const baseName = `user_${pin}_face`;

	// Save original
	const photoPath = join(uploadDir, `${baseName}.jpg`);
	writeFileSync(photoPath, imageBuffer);

	// Generate thumbnail (80x80, optimized JPEG)
	const thumbPath = join(uploadDir, `${baseName}_thumb.jpg`);
	try {
		await sharp(imageBuffer)
			.resize(80, 80, { fit: 'cover' })
			.jpeg({ quality: 75 })
			.toFile(thumbPath);
	} catch (e) {
		console.error(`[ZK:Photo] Failed to generate thumbnail:`, e);
	}

	return {
		photoUrl: `/uploads/people/${baseName}.jpg`,
		thumbUrl: `/uploads/people/${baseName}_thumb.jpg`
	};
}

const server = http.createServer(async (req, res) => {
	try {
		const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
		const pathname = url.pathname.toLowerCase(); // Force lowercase for matching
		const sn = url.searchParams.get('SN');
		const remoteIp = req.socket.remoteAddress;

		console.log(`[Device] ${req.method} ${url.pathname}${url.search} from ${remoteIp}`);

		// Health Check / Browser Test
		if (pathname === '/' || pathname === '/status' || pathname === '/iclock/status') {
			res.writeHead(200, { 'Content-Type': 'text/plain' });
			return res.end('Device Service is Running OK');
		}

		// ZKTeco Handshake / Data Push
		if (pathname === '/iclock/cdata') {
			if (req.method === 'GET') {
				if (!sn) return res.writeHead(400).end('Missing SN');

				// Upsert device
				const [existing] = await db
					.select()
					.from(schema.devices)
					.where(eq(schema.devices.serialNumber, sn));
				if (existing) {
					await db
						.update(schema.devices)
						.set({ lastHeartbeat: new Date(), status: 'online' })
						.where(eq(schema.devices.serialNumber, sn));
				} else {
					await db.insert(schema.devices).values({
						id: crypto.randomUUID(),
						serialNumber: sn,
						name: `Device ${sn}`,
						lastHeartbeat: new Date(),
						status: 'online'
					});
				}

				const response = buildHandshakeResponse(sn);
				res.writeHead(200, {
					'Content-Type': 'text/plain',
					'Content-Length': Buffer.byteLength(response).toString()
				});
				return res.end(response);
			}

			if (req.method === 'POST') {
				if (!sn) return res.writeHead(400).end('Missing SN');
				const table = url.searchParams.get('table');

				// Handle ATTPHOTO — device sends a face photo during enrollment or attendance
				if (table === 'ATTPHOTO') {
					const pin = url.searchParams.get('PIN') || url.searchParams.get('pin');
					console.log(`[ZK:Photo] Received ATTPHOTO for PIN ${pin}`);
					if (!pin) return res.writeHead(200).end('OK');

					try {
						const imageBuffer = await readBuffer(req);
						console.log(`[ZK:Photo] Image size: ${imageBuffer.length} bytes`);

						const result = await savePersonPhoto(pin, imageBuffer);
						if (result) {
							const [person] = await db
								.select()
								.from(schema.people)
								.where(eq(schema.people.biometricId, pin));
							if (person) {
								await db
									.update(schema.people)
									.set({ 
										photoUrl: result.photoUrl,
										thumbUrl: result.thumbUrl
									})
									.where(eq(schema.people.id, person.id));
								console.log(`[ZK:Photo] Saved ATTPHOTO for ${person.name}: ${result.photoUrl}`);
								notifySvelte('change');
							}
						}
					} catch (e) {
						console.error(`[ZK:Photo] Error saving photo:`, e);
					}
					return res.writeHead(200).end('OK');
				}

				const body = await readBody(req);

				// Process OPERLOG for enrollment tracking + face photos
				if (table === 'OPERLOG') {
					// Check for embedded BIOPHOTO/face photo (BIOPHOTO PIN=2\tNo=0\t...Content=<base64>)
					const photoMatch = body.match(/(?:BIOPHOTO\s+)?PIN=(\w+).*?Content=([A-Za-z0-9+/=]+)/s);
					if (photoMatch) {
						const photoPin = photoMatch[1];
						const base64Content = photoMatch[2];
						console.log(
							`[ZK:OperLog] Found face photo for PIN ${photoPin} (${base64Content.length} base64 chars)`
						);

						try {
							const imageBuffer = Buffer.from(base64Content, 'base64');
															const result = await savePersonPhoto(photoPin, imageBuffer);
															if (result) {
																const [person] = await db
																	.select()
																	.from(schema.people)
																	.where(eq(schema.people.biometricId, photoPin));
																if (person) {
																	await db
																		.update(schema.people)
																		.set({ 
																			photoUrl: result.photoUrl,
																			thumbUrl: result.thumbUrl
																		})
																		.where(eq(schema.people.id, person.id));
																	console.log(
																		`[ZK:OperLog] Saved face photo for ${person.name}: ${result.photoUrl} (thumb: ${result.thumbUrl})`
																	);
																	notifySvelte('change');
																}
															}						} catch (e) {
							console.error(`[ZK:OperLog] Error saving face photo:`, e);
						}
					}

					const opEntries = parseOperLog(body);
					for (const entry of opEntries) {
						if (!entry.enrollMethod) continue;

						const [person] = await db
							.select()
							.from(schema.people)
							.where(eq(schema.people.biometricId, entry.pin));
						if (!person) continue;

						let methods: string[] = [];
						try {
							methods = person.enrolledMethods ? JSON.parse(person.enrolledMethods) : [];
						} catch {
							methods = [];
						}

						if (!methods.includes(entry.enrollMethod)) {
							methods.push(entry.enrollMethod);
							await db
								.update(schema.people)
								.set({ enrolledMethods: JSON.stringify(methods) })
								.where(eq(schema.people.id, person.id));
							console.log(
								`[ZK:Enroll] Detected ${entry.enrollMethod} enrollment for ${person.name}`
							);
						}
						// Always notify SvelteKit so the UI can close its waiting dialog
						notifySvelte('enrollment', {
							personId: person.id,
							method: entry.enrollMethod,
							photoUrl: person.photoUrl
						});
					}
					notifySvelte('change');
					return res.writeHead(200).end('OK');
				}

				// Handle BIODATA / FACE / FINGERTMP — device sends biometric template after enrollment
				if (table === 'BIODATA' || table === 'FACE' || table === 'FINGERTMP') {
					// PIN may be in URL params or in the body (e.g. "BIODATA Pin=2\tNo=0...")
					let pin = url.searchParams.get('PIN') || url.searchParams.get('pin');
					if (!pin) {
						const pinMatch = body.match(/(?:^|\t)PIN=(\w+)/im) || body.match(/Pin=(\w+)/i);
						pin = pinMatch ? pinMatch[1] : null;
					}

					// Parse FID and No from body KV pairs
					const fidMatch = body.match(/(?:^|\t)FID=(\w+)/im) || body.match(/(?:^|\t)Fid=(\w+)/im);
					const noMatch = body.match(/(?:^|\t)No=(\w+)/im);
					const fid = fidMatch ? fidMatch[1] : table === 'FACE' ? '111' : '0';
					const templateNo = noMatch ? noMatch[1] : '0';

					console.log(
						`[ZK:BioData] Received ${table} template for PIN ${pin} FID=${fid} No=${templateNo}`
					);
					if (pin) {
						const [person] = await db
							.select()
							.from(schema.people)
							.where(eq(schema.people.biometricId, pin));
						if (person) {
							// Strip table name prefix from body (device sends "BIODATA Pin=1\t..." but we just want the KV pairs)
							let kvData = body.trim();
							const prefixPattern = new RegExp(`^${table}\\s+`, 'i');
							kvData = kvData.replace(prefixPattern, '');

							// Store template data
							const [existingTemplate] = await db
								.select()
								.from(schema.bioTemplates)
								.where(
									and(
										eq(schema.bioTemplates.personId, person.id),
										eq(schema.bioTemplates.templateType, table),
										eq(schema.bioTemplates.fid, fid)
									)
								);

							if (existingTemplate) {
								await db
									.update(schema.bioTemplates)
									.set({ templateData: kvData, templateNo, updatedAt: new Date() })
									.where(eq(schema.bioTemplates.id, existingTemplate.id));
								console.log(`[ZK:BioData] Updated ${table} template for ${person.name}`);
							} else {
								await db.insert(schema.bioTemplates).values({
									id: crypto.randomUUID(),
									personId: person.id,
									templateType: table,
									templateData: kvData,
									fid,
									templateNo
								});
								console.log(`[ZK:BioData] Stored new ${table} template for ${person.name}`);
							}

							// Track enrolled methods
							let methods: string[] = [];
							try {
								methods = person.enrolledMethods ? JSON.parse(person.enrolledMethods) : [];
							} catch {
								methods = [];
							}

							const method = fid === '111' || table === 'FACE' ? 'face' : 'finger';
							console.log(`[ZK:BioData] Associating template as ${method} for ${person.name}`);

							if (!methods.includes(method)) {
								methods.push(method);
								await db
									.update(schema.people)
									.set({ enrolledMethods: JSON.stringify(Array.from(new Set(methods))) })
									.where(eq(schema.people.id, person.id));
							}
							// Always notify SvelteKit so the UI can close its waiting dialog
							notifySvelte('enrollment', {
								personId: person.id,
								method,
								photoUrl: person.photoUrl
							});
							notifySvelte('change');
						}
					}
					return res.writeHead(200).end('OK');
				}

				// Handle ATTLOG
				if (table === 'ATTLOG') {
					const entries = parseAttLog(body);
					console.log(`[ZK:Punch] Received ${entries.length} punches from device ${sn}`);
					for (const entry of entries) {
						const rawId = crypto.randomUUID();
						await db.insert(schema.rawPunches).values({
							id: rawId,
							deviceSn: sn,
							pin: entry.pin,
							punchTime: entry.timestamp,
							status: entry.status,
							verify: entry.verify,
							rawLine: entry.rawLine,
							processed: false
						});

						const [person] = await db
							.select()
							.from(schema.people)
							.where(eq(schema.people.biometricId, entry.pin));
						if (!person) {
							console.log(`[ZK:Punch] Unknown PIN ${entry.pin} punched`);
							continue;
						}

						const punchDate = toDateString(entry.timestamp);
						const [activeLog] = await db
							.select()
							.from(schema.attendanceLogs)
							.where(
								and(
									eq(schema.attendanceLogs.personId, person.id),
									eq(schema.attendanceLogs.status, 'on_premises')
								)
							);

						const method = verifyCodeToMethod(entry.verify);
						if (!activeLog) {
							const newLogId = crypto.randomUUID();
							console.log(`[ZK:Punch] CHECK-IN for ${person.name} (${method})`);
							await db.insert(schema.attendanceLogs).values({
								id: newLogId,
								personId: person.id,
								entryTime: entry.timestamp,
								verifyMethod: method,
								status: 'on_premises',
								date: punchDate
							});
							notifySvelte('checkin', {
								personId: person.id,
								personName: person.name,
								verifyMethod: method,
								photoUrl: person.photoUrl,
								thumbUrl: person.thumbUrl,
								logId: newLogId,
								categoryId: person.categoryId
							});
						} else {
							console.log(`[ZK:Punch] CHECK-OUT for ${person.name} (${method})`);
							await db
								.update(schema.attendanceLogs)
								.set({ exitTime: entry.timestamp, status: 'checked_out' })
								.where(eq(schema.attendanceLogs.id, activeLog.id));
							notifySvelte('checkout', {
								personId: person.id,
								personName: person.name,
								verifyMethod: method,
								photoUrl: person.photoUrl,
								thumbUrl: person.thumbUrl,
								logId: activeLog.id,
								categoryId: person.categoryId
							});
						}
						await db
							.update(schema.rawPunches)
							.set({ processed: true })
							.where(eq(schema.rawPunches.id, rawId));
					}
					notifySvelte('change');
					return res.writeHead(200).end('OK');
				}

				// Generic OK for any other tables
				return res.writeHead(200).end('OK');
			}
		}

		// ZKTeco Command Polling
		if (pathname === '/iclock/getrequest') {
			if (!sn) return res.writeHead(400).end('Missing SN');

			await db
				.update(schema.devices)
				.set({ lastHeartbeat: new Date(), status: 'online' })
				.where(eq(schema.devices.serialNumber, sn));

			const [cmd] = await db
				.select()
				.from(schema.deviceCommands)
				.where(
					and(eq(schema.deviceCommands.deviceSn, sn), eq(schema.deviceCommands.status, 'PENDING'))
				)
				.orderBy(asc(schema.deviceCommands.createdAt))
				.limit(1);

			if (cmd) {
				await db
					.update(schema.deviceCommands)
					.set({ status: 'SENT', updatedAt: new Date() })
					.where(eq(schema.deviceCommands.id, cmd.id));
				const response = formatCommand(cmd.id, cmd.commandString);
				res.writeHead(200, {
					'Content-Type': 'text/plain',
					'Content-Length': Buffer.byteLength(response).toString()
				});
				return res.end(response);
			}
			return res.writeHead(200).end('OK');
		}

		// ZKTeco Command Confirmation
		if (pathname === '/iclock/devicecmd') {
			const body = await readBody(req);
			const params = new URLSearchParams(body);
			const cmdIdRaw = params.get('ID');
			const cmdId = cmdIdRaw ? Number(cmdIdRaw) : null;
			const returnCode = params.get('Return');

			if (cmdId) {
				const newStatus = returnCode === '0' ? 'SUCCESS' : 'FAILED';
				const [cmd] = await db
					.select()
					.from(schema.deviceCommands)
					.where(eq(schema.deviceCommands.id, cmdId));

				await db
					.update(schema.deviceCommands)
					.set({ status: newStatus as any, updatedAt: new Date() })
					.where(eq(schema.deviceCommands.id, cmdId));

				// Enrollment logic
				if (
					sn &&
					cmd &&
					(cmd.commandString.startsWith('ENROLL_FP') || cmd.commandString.startsWith('ENROLL_BIO'))
				) {
					const match = cmd.commandString.match(/PIN=(\w+)/);
					const pin = match ? match[1] : null;
					if (pin) {
						const [person] = await db
							.select()
							.from(schema.people)
							.where(eq(schema.people.biometricId, pin));
						if (newStatus === 'SUCCESS' && person) {
							await db.insert(schema.deviceCommands).values({
								id: await nextCommandId(),
								deviceSn: sn,
								commandString: Commands.setUser(pin, person.name),
								status: 'PENDING'
							});
							const method = cmd.commandString.includes('FID=111') ? 'face' : 'finger';

							// Update enrolledMethods in DB
							let methods: string[] = [];
							try {
								methods = person.enrolledMethods ? JSON.parse(person.enrolledMethods) : [];
							} catch {
								methods = [];
							}
							if (!methods.includes(method)) {
								methods.push(method);
								await db
									.update(schema.people)
									.set({ enrolledMethods: JSON.stringify(Array.from(new Set(methods))) })
									.where(eq(schema.people.id, person.id));
							}

							notifySvelte('enrollment', {
								personId: person.id,
								method,
								photoUrl: person.photoUrl
							});
						} else if (newStatus === 'FAILED' && person) {
							notifySvelte('enrollment-failed', {
								personId: person.id,
								returnCode: returnCode || 'unknown'
							});
						}
					}
				}
			}
			return res.writeHead(200).end('OK');
		}

		// ZKTeco Registry
		if (pathname === '/iclock/registry') {
			if (!sn) return res.writeHead(400).end('Missing SN');
			// Registry logic is similar to handshake GET cdata
			const response = buildHandshakeResponse(sn);
			res.writeHead(200, { 'Content-Type': 'text/plain' });
			return res.end(response);
		}

		// 404
		res.writeHead(404).end('Not Found');
	} catch (e: any) {
		console.error(`[Device:Error] Internal Error:`, e.message);
		res.writeHead(500).end('Internal Server Error');
	}
});

server.listen(PORT, () => {
	console.log(`[DeviceService] Listening on port ${PORT}`);
	console.log(`[DeviceService] SvelteKit Internal URL: ${SVELTE_INTERNAL_URL}`);
});
