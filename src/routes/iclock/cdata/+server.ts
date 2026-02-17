import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { devices, rawPunches, people, attendanceLogs, bioTemplates } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { buildHandshakeResponse, parseAttLog, parseOperLog, toDateString, verifyCodeToMethod } from '$lib/zkteco';
import { notifyChange, notifyCheckIn, notifyCheckOut, notifyEnrollment } from '$lib/server/events';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

/** Headers for strict ZKTeco compatibility on VPS */
const ZK_HEADERS = (contentLength: number) => ({
    'Content-Type': 'text/plain',
    'Content-Length': contentLength.toString(),
    'Server': 'ZK ADMS',
    'Connection': 'close'
});

/** Save photo and generate thumbnail. Returns { photoUrl, thumbUrl }. */
async function savePersonPhoto(pin: string, imageBuffer: Buffer): Promise<{ photoUrl: string; thumbUrl: string } | null> {
	if (imageBuffer.length === 0) return null;

	const uploadDir = join(process.cwd(), 'static', 'uploads', 'people');
	try { mkdirSync(uploadDir, { recursive: true }); } catch {}

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
	const options = url.searchParams.get('options');
	const command = url.searchParams.get('c');

	if (!sn) return new Response('Missing SN', { status: 400 });

	console.log(`[ZK:Handshake] Device ${sn} connected (options=${options}, c=${command})`);

	// Update device status
	await db.update(devices)
		.set({ lastHeartbeat: new Date(), status: 'online' })
		.where(eq(devices.serialNumber, sn));

	// If it's a simple registry check without options request, just return OK
	if (command === 'registry' && !options) {
		const okBody = 'OK\r\n';
		return new Response(okBody, { headers: ZK_HEADERS(okBody.length) });
	}

	const response = buildHandshakeResponse(sn);
	return new Response(response, { headers: ZK_HEADERS(response.length) });
};

/** POST — Attendance data push (ATTLOG), enrollment photos (ATTPHOTO), operation logs (OPERLOG) */
export const POST: RequestHandler = async ({ url, request }) => {
	const sn = url.searchParams.get('SN');
	const table = url.searchParams.get('table');
    const okBody = 'OK\r\n';

	if (!sn) return new Response('Missing SN', { status: 400 });

	// 1. Handle ATTPHOTO
	if (table === 'ATTPHOTO') {
		const pin = url.searchParams.get('PIN') || url.searchParams.get('pin');
		if (!pin) return new Response(okBody, { headers: ZK_HEADERS(okBody.length) });

		try {
			const imageBuffer = Buffer.from(await request.arrayBuffer());
			const result = await savePersonPhoto(pin, imageBuffer);
			if (result) {
				const [person] = await db.select().from(people).where(eq(people.biometricId, pin));
				if (person) {
					await db.update(people).set({ photoUrl: result.photoUrl }).where(eq(people.id, person.id));
					notifyChange();
				}
			}
		} catch (e) { console.error(`[ZK:Photo] Error:`, e); }

		return new Response(okBody, { headers: ZK_HEADERS(okBody.length) });
	}

	const body = await request.text();

	// 2. Process OPERLOG
	if (table === 'OPERLOG') {
		const photoMatch = body.match(/(?:BIOPHOTO\s+)?PIN=(\w+).*?Content=([A-Za-z0-9+/=]+)/s);
		if (photoMatch) {
			const photoPin = photoMatch[1];
			const base64Content = photoMatch[2];
			try {
				const imageBuffer = Buffer.from(base64Content, 'base64');
				const result = await savePersonPhoto(photoPin, imageBuffer);
				if (result) {
					const [person] = await db.select().from(people).where(eq(people.biometricId, photoPin));
					if (person) {
						await db.update(people).set({ photoUrl: result.photoUrl }).where(eq(people.id, person.id));
						notifyChange();
					}
				}
			} catch (e) { console.error(`[ZK:OperLog] Photo Error:`, e); }
		}

		const opEntries = parseOperLog(body);
		for (const entry of opEntries) {
			if (!entry.enrollMethod) continue;
			const [person] = await db.select().from(people).where(eq(people.biometricId, entry.pin));
			if (!person) continue;

			let methods: string[] = [];
			try { methods = person.enrolledMethods ? JSON.parse(person.enrolledMethods) : []; } catch { methods = []; }

			if (!methods.includes(entry.enrollMethod)) {
				methods.push(entry.enrollMethod);
				await db.update(people).set({ enrolledMethods: JSON.stringify(methods) }).where(eq(people.id, person.id));
				notifyEnrollment({ personId: person.id, method: entry.enrollMethod });
			}
		}
		notifyChange();
		return new Response(okBody, { headers: ZK_HEADERS(okBody.length) });
	}

	// 3. Handle BIODATA / FACE / FINGERTMP
	if (table === 'BIODATA' || table === 'FACE' || table === 'FINGERTMP') {
		let pin = url.searchParams.get('PIN') || url.searchParams.get('pin');
		if (!pin) {
			const pinMatch = body.match(/(?:^|\t)PIN=(\w+)/im) || body.match(/Pin=(\w+)/i);
			pin = pinMatch ? pinMatch[1] : null;
		}

		const fidMatch = body.match(/(?:^|\t)FID=(\w+)/im) || body.match(/(?:^|\t)Fid=(\w+)/im);
		const noMatch = body.match(/(?:^|\t)No=(\w+)/im);
		const fid = fidMatch ? fidMatch[1] : (table === 'FACE' ? '111' : '0');
		const templateNo = noMatch ? noMatch[1] : '0';

		if (pin) {
			const [person] = await db.select().from(people).where(eq(people.biometricId, pin));
			if (person) {
				let kvData = body.trim();
				const prefixPattern = new RegExp(`^${table}\\s+`, 'i');
				kvData = kvData.replace(prefixPattern, '');

				const [existingTemplate] = await db.select().from(bioTemplates).where(and(
						eq(bioTemplates.personId, person.id),
						eq(bioTemplates.templateType, table!),
						eq(bioTemplates.fid, fid)
					));

				if (existingTemplate) {
					await db.update(bioTemplates).set({ templateData: kvData, templateNo, updatedAt: new Date() }).where(eq(bioTemplates.id, existingTemplate.id));
				} else {
					await db.insert(bioTemplates).values({ id: crypto.randomUUID(), personId: person.id, templateType: table!, templateData: kvData, fid, templateNo });
				}

				let methods: string[] = [];
				try { methods = person.enrolledMethods ? JSON.parse(person.enrolledMethods) : []; } catch { methods = []; }
				const method = fid === '111' || table === 'FACE' ? 'face' : 'finger';
				if (!methods.includes(method)) {
					methods.push(method);
					await db.update(people).set({ enrolledMethods: JSON.stringify(methods) }).where(eq(people.id, person.id));
				}
				notifyEnrollment({ personId: person.id, method });
				notifyChange();
			}
		}
		return new Response(okBody, { headers: ZK_HEADERS(okBody.length) });
	}

	// 4. Handle ATTLOG
	if (table === 'ATTLOG') {
        const entries = parseAttLog(body);
        for (const entry of entries) {
            const rawId = crypto.randomUUID();
            await db.insert(rawPunches).values({ id: rawId, deviceSn: sn, pin: entry.pin, punchTime: entry.timestamp, status: entry.status, verify: entry.verify, rawLine: entry.rawLine, processed: false });

            const [person] = await db.select().from(people).where(eq(people.biometricId, entry.pin));
            if (!person) continue;

            const punchDate = toDateString(entry.timestamp);
            const [activeLog] = await db.select().from(attendanceLogs).where(and(eq(attendanceLogs.personId, person.id), eq(attendanceLogs.status, 'on_premises')));
            const method = verifyCodeToMethod(entry.verify);

            if (!activeLog) {
                await db.insert(attendanceLogs).values({ id: crypto.randomUUID(), personId: person.id, entryTime: entry.timestamp, verifyMethod: method, status: 'on_premises', date: punchDate });
                notifyCheckIn({ personId: person.id, personName: person.name, verifyMethod: method, photoUrl: person.photoUrl });
            } else if (activeLog.date === punchDate) {
                await db.update(attendanceLogs).set({ exitTime: entry.timestamp, status: 'checked_out' }).where(eq(attendanceLogs.id, activeLog.id));
                notifyCheckOut({ personId: person.id, personName: person.name, verifyMethod: method, photoUrl: person.photoUrl });
            } else {
                await db.update(attendanceLogs).set({ exitTime: entry.timestamp, status: 'checked_out' }).where(eq(attendanceLogs.id, activeLog.id));
                notifyCheckOut({ personId: person.id, personName: person.name, verifyMethod: method, photoUrl: person.photoUrl });
                await db.insert(attendanceLogs).values({ id: crypto.randomUUID(), personId: person.id, entryTime: entry.timestamp, verifyMethod: method, status: 'on_premises', date: punchDate });
                notifyCheckIn({ personId: person.id, personName: person.name, verifyMethod: method, photoUrl: person.photoUrl });
            }
            await db.update(rawPunches).set({ processed: true }).where(eq(rawPunches.id, rawId));
        }
        notifyChange();
    }

	return new Response(okBody, { headers: ZK_HEADERS(okBody.length) });
};
