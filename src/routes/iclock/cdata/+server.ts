import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { devices, rawPunches, people, attendanceLogs, bioTemplates } from '$lib/server/db/schema';
import { eq, and, or } from 'drizzle-orm';
import {
	buildHandshakeResponse,
	parseAttLog,
	parseOperLog,
	toDateString,
	verifyCodeToMethod
} from '$lib/zkteco';
import { notifyChange, notifyCheckIn, notifyCheckOut, notifyEnrollment } from '$lib/server/events';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Buffer } from 'node:buffer';
import sharp from 'sharp';

/** Save photo and generate thumbnail. Returns { photoUrl, thumbUrl }. */
async function savePersonPhoto(
	pin: string,
	imageBuffer: Buffer
): Promise<{ photoUrl: string; thumbUrl: string } | null> {
	if (imageBuffer.length === 0) return null;

	const uploadDir = join(process.cwd(), 'static', 'uploads', 'people');
	try {
		mkdirSync(uploadDir, { recursive: true });
	} catch (e) {
		console.error(`[Photo] Failed to create upload directory:`, e);
	}

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

/** GET — Device handshake (first contact + periodic) */
export const GET: RequestHandler = async ({ url }) => {
	const sn = url.searchParams.get('SN');
	if (!sn) return new Response('Missing SN', { status: 400 });

	console.log(`[ZK:Handshake] Device ${sn} connected`);

	// Upsert device (auto-register on first contact)
	const [existing] = await db.select().from(devices).where(eq(devices.serialNumber, sn));

	if (existing) {
		await db
			.update(devices)
			.set({ lastHeartbeat: new Date(), status: 'online' })
			.where(eq(devices.serialNumber, sn));
	} else {
		await db.insert(devices).values({
			id: crypto.randomUUID(),
			serialNumber: sn,
			name: `Device ${sn}`,
			lastHeartbeat: new Date(),
			status: 'online'
		});
	}

	const response = buildHandshakeResponse(sn);
	console.log(`[ZK:Handshake] Response to ${sn}:\n${response.replace(/\n/g, ' | ')}`);

	return new Response(response, {
		headers: {
			'Content-Type': 'text/plain',
			'Content-Length': Buffer.byteLength(response).toString()
		}
	});
};

/** POST — Attendance data push (ATTLOG), enrollment photos (ATTPHOTO), operation logs (OPERLOG) */
export const POST: RequestHandler = async ({ url, request }) => {
	const sn = url.searchParams.get('SN');
	const table = url.searchParams.get('table');

	if (!sn) return new Response('Missing SN', { status: 400 });

	console.log(`[ZK:Data] Received POST from ${sn} table=${table}`);

	// Handle ATTPHOTO — device sends a face photo during enrollment or attendance
	if (table === 'ATTPHOTO') {
		const pin = url.searchParams.get('PIN') || url.searchParams.get('pin');
		console.log(`[ZK:Photo] Received ATTPHOTO for PIN ${pin}`);
		if (!pin) return new Response('OK', { headers: { 'Content-Type': 'text/plain' } });

		try {
			const imageBuffer = Buffer.from(await request.arrayBuffer());
			console.log(`[ZK:Photo] Image size: ${imageBuffer.length} bytes`);

			const result = await savePersonPhoto(pin, imageBuffer);
			if (result) {
				const [person] = await db
					.select()
					.from(people)
					.where(
						or(
							eq(people.biometricId, pin),
							eq(people.biometricId, parseInt(pin, 10).toString())
						)
					);

				if (person) {
					await db
						.update(people)
						.set({ 
							photoUrl: result.photoUrl,
							thumbUrl: result.thumbUrl
						})
						.where(eq(people.id, person.id));
					console.log(`[ZK:Photo] Saved ATTPHOTO for PIN ${pin}: ${result.photoUrl}`);
					notifyChange();
				}
			}
		} catch (e) {
			console.error(`[ZK:Photo] Error saving photo:`, e);
		}

		return new Response('OK', {
			headers: {
				'Content-Type': 'text/plain',
				'Content-Length': '2'
			}
		});
	}

	const body = await request.text();
	// Log truncated body for debugging
	console.log(
		`[ZK:Data] Body (${body.length} chars): ${body.substring(0, 200).replace(/\n/g, ' ')}...`
	);

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
						.from(people)
						.where(
							or(
								eq(people.biometricId, photoPin),
								eq(people.biometricId, parseInt(photoPin, 10).toString())
							)
						);

					if (person) {
						await db
							.update(people)
							.set({ 
								photoUrl: result.photoUrl,
								thumbUrl: result.thumbUrl
							})
							.where(eq(people.id, person.id));
						console.log(
							`[ZK:OperLog] Saved face photo for PIN ${photoPin}: ${result.photoUrl}`
						);
						notifyChange();
					}
				}
			} catch (e) {
				console.error(`[ZK:OperLog] Error saving face photo:`, e);
			}
		}

		const opEntries = parseOperLog(body);
		for (const entry of opEntries) {
			if (!entry.enrollMethod) continue;

			const [person] = await db
				.select()
				.from(people)
				.where(
					or(
						eq(people.biometricId, entry.pin),
						eq(people.biometricId, parseInt(entry.pin, 10).toString())
					)
				);

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
					.update(people)
					.set({ enrolledMethods: JSON.stringify(methods) })
					.where(eq(people.id, person.id));
				console.log(`[ZK:Enroll] Detected ${entry.enrollMethod} enrollment for person ${person.id}`);
				notifyEnrollment({ personId: person.id, personName: person.name, method: entry.enrollMethod });
			}
		}
		notifyChange();
		return new Response('OK', {
			headers: {
				'Content-Type': 'text/plain',
				'Content-Length': '2'
			}
		});
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
				.from(people)
				.where(
					or(
						eq(people.biometricId, pin),
						eq(people.biometricId, parseInt(pin, 10).toString())
					)
				);

			if (person) {
				// Strip table name prefix from body (device sends "BIODATA Pin=1\t..." but we just want the KV pairs)
				let kvData = body.trim();
				const prefixPattern = new RegExp(`^${table}\\s+`, 'i');
				kvData = kvData.replace(prefixPattern, '');

				// Store template data
				const [existingTemplate] = await db
					.select()
					.from(bioTemplates)
					.where(
						and(
							eq(bioTemplates.personId, person.id),
							eq(bioTemplates.templateType, table!),
							eq(bioTemplates.fid, fid),
							eq(bioTemplates.templateNo, templateNo)
						)
					);

				if (existingTemplate) {
					await db
						.update(bioTemplates)
						.set({ templateData: kvData, updatedAt: new Date() })
						.where(eq(bioTemplates.id, existingTemplate.id));
					console.log(`[ZK:BioData] Updated ${table} template for person ${person.id} (FID=${fid}, No=${templateNo})`);
				} else {
					await db.insert(bioTemplates).values({
						id: crypto.randomUUID(),
						personId: person.id,
						templateType: table!,
						templateData: kvData,
						fid,
						templateNo
					});
					console.log(`[ZK:BioData] Stored new ${table} template for person ${person.id} (FID=${fid}, No=${templateNo})`);
				}

				// Track enrolled methods
				let methods: string[] = [];
				try {
					methods = person.enrolledMethods ? JSON.parse(person.enrolledMethods) : [];
				} catch {
					methods = [];
				}

				let method = fid === '111' || table === 'FACE' ? 'face' : 'finger';
				
				if (!methods.includes(method)) {
					methods.push(method);
					await db
						.update(people)
						.set({ enrolledMethods: JSON.stringify(Array.from(new Set(methods))) })
						.where(eq(people.id, person.id));
					console.log(`[ZK:BioData] Added ${method} to enrolledMethods for person ${person.id}`);
				}
				notifyEnrollment({ personId: person.id, personName: person.name, method });
				notifyChange();
			}
		}
		return new Response('OK', {
			headers: {
				'Content-Type': 'text/plain',
				'Content-Length': '2'
			}
		});
	}

	// Only process ATTLOG beyond this point, acknowledge everything else
	if (table !== 'ATTLOG') {
		return new Response('OK', {
			headers: {
				'Content-Type': 'text/plain',
				'Content-Length': '2'
			}
		});
	}
	const entries = parseAttLog(body);

	// Collect events to emit after transaction commits
	const pendingEvents: Array<() => void> = [];

	/** Minimum seconds a person must be checked in before a punch triggers check-out.
	 *  Prevents accidental double-scans from immediately checking someone out. */
	const MIN_CHECKIN_DURATION_SEC = 60;

	await db.transaction(async (tx) => {
		for (const entry of entries) {
			// --- Deduplication: skip if we already have this exact punch ---
			const [existingPunch] = await tx
				.select({ id: rawPunches.id })
				.from(rawPunches)
				.where(
					and(
						eq(rawPunches.pin, entry.pin),
						eq(rawPunches.punchTime, entry.timestamp),
						eq(rawPunches.deviceSn, sn)
					)
				);

			if (existingPunch) {
				console.log(`[ZK:ATTLOG] Skipping duplicate punch PIN=${entry.pin} time=${entry.timestamp.toISOString()}`);
				continue;
			}

			const rawId = crypto.randomUUID();

			// 1. Store raw punch (audit trail)
			await tx.insert(rawPunches).values({
				id: rawId,
				deviceSn: sn,
				pin: entry.pin,
				punchTime: entry.timestamp,
				status: entry.status,
				verify: entry.verify,
				rawLine: entry.rawLine,
				processed: false
			});

			// 2. Look up person by biometricId
			const [person] = await tx
				.select()
				.from(people)
				.where(
					or(
						eq(people.biometricId, entry.pin),
						eq(people.biometricId, parseInt(entry.pin, 10).toString())
					)
				);

			if (!person) continue; // No matching person — raw punch still stored

			// 3. Punch-to-attendance mapping
			const punchDate = toDateString(entry.timestamp);

			const [activeLog] = await tx
				.select()
				.from(attendanceLogs)
				.where(and(eq(attendanceLogs.personId, person.id), eq(attendanceLogs.status, 'on_premises')));

			const method = verifyCodeToMethod(entry.verify);

			if (!activeLog) {
				// CHECK-IN: no active log → create new entry
				const newLogId = crypto.randomUUID();
				await tx.insert(attendanceLogs).values({
					id: newLogId,
					personId: person.id,
					entryTime: entry.timestamp,
					verifyMethod: method,
					status: 'on_premises',
					date: punchDate
				});

				pendingEvents.push(() =>
					notifyCheckIn({
						personId: person.id,
						personName: person.name,
						verifyMethod: method,
						photoUrl: person.photoUrl,
						thumbUrl: person.thumbUrl,
						logId: newLogId,
						categoryId: person.categoryId,
						isTrained: person.isTrained
					})
				);
			} else {
				// CHECK-OUT: active log exists → mark as checked out
				// Guard: ignore if checked in less than MIN_CHECKIN_DURATION_SEC ago
				const elapsedSec = (entry.timestamp.getTime() - activeLog.entryTime.getTime()) / 1000;
				if (elapsedSec < MIN_CHECKIN_DURATION_SEC) {
					console.log(`[ZK:ATTLOG] Ignoring too-quick checkout for PIN=${entry.pin} (${elapsedSec.toFixed(0)}s < ${MIN_CHECKIN_DURATION_SEC}s)`);
					await tx.update(rawPunches).set({ processed: true }).where(eq(rawPunches.id, rawId));
					continue;
				}

				await tx
					.update(attendanceLogs)
					.set({ exitTime: entry.timestamp, status: 'checked_out' })
					.where(eq(attendanceLogs.id, activeLog.id));

				pendingEvents.push(() =>
					notifyCheckOut({
						personId: person.id,
						personName: person.name,
						verifyMethod: method,
						photoUrl: person.photoUrl,
						thumbUrl: person.thumbUrl,
						logId: activeLog.id,
						categoryId: person.categoryId
					})
				);
			}

			// 4. Mark raw punch as processed
			await tx.update(rawPunches).set({ processed: true }).where(eq(rawPunches.id, rawId));
		}
	});

	// Emit events only after transaction successfully commits
	for (const emit of pendingEvents) emit();

	notifyChange();

	return new Response('OK', {
		headers: {
			'Content-Type': 'text/plain',
			'Content-Length': '2'
		}
	});
};
