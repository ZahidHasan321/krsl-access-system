/**
 * ZKTeco PUSH protocol utilities.
 * Pure functions — no DB imports.
 */

/** Device timezone offset — Bangladesh Standard Time (UTC+6) */
const DEVICE_TZ_OFFSET = '+06:00';

/** Parse a device timestamp string as Bangladesh local time.
 *  Device sends "2026-02-07 15:57:00" — we append the TZ offset
 *  so it's correctly interpreted regardless of server timezone. */
function parseDeviceTime(timeStr: string): Date {
	// Convert "2026-02-07 15:57:00" → "2026-02-07T15:57:00+06:00"
	return new Date(timeStr.replace(' ', 'T') + DEVICE_TZ_OFFSET);
}

/** Device handshake response options */
export function buildHandshakeResponse(sn: string): string {
	return [
		`GET OPTION FROM: ${sn}`,
		'Stamp=0',
		'OpStamp=0',
		'PhotoStamp=0',
		'ErrorDelay=30',
		'Delay=2',
		'TransInterval=1',
		'TransFlag=TransData\tAttLog\tAttPhoto\tEnrollUser\tEnrollFP\tFACE\tUserPic\tBioPhoto\tChgUser',
		'Realtime=1',
		'Encrypt=0',
		'BioPhotoFun=1',
		'BioDataFun=1',
		'VisilightFun=1',
		'PostBackTmpFlag=1',
		'DuplicatePunchTimer=1',
		'MultiBioDataSupport=0:1:0:0:0:0:0:0:1:1',
		'MultiBioPhotoSupport=0:0:0:0:0:0:0:0:0:1',
		'PushOptions=UserPicURLFunOn,MultiBioDataSupport,MultiBioPhotoSupport'
	].join('\n') + '\n';
}

export interface AttLogEntry {
	pin: string;
	timestamp: Date;
	status: number;
	verify: number;
	rawLine: string;
}

/** Parse tab-separated ATTLOG lines from device POST body */
export function parseAttLog(body: string): AttLogEntry[] {
	const entries: AttLogEntry[] = [];

	for (const line of body.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		const parts = trimmed.split('\t');
		if (parts.length < 2) continue;

		const pin = parts[0].trim();
		const timestamp = parseDeviceTime(parts[1].trim());
		const status = parseInt(parts[2]?.trim() || '0', 10);
		const verify = parseInt(parts[3]?.trim() || '0', 10);

		if (pin && !isNaN(timestamp.getTime())) {
			entries.push({ pin, timestamp, status, verify, rawLine: trimmed });
		}
	}

	return entries;
}

/** Format a command for heartbeat response */
export function formatCommand(id: number | string, commandString: string): string {
	return `C:${id}:${commandString}`;
}

/** Format date as YYYY-MM-DD */
export function toDateString(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/** ZKTeco FID constants for biometric enrollment */
export const FID = {
	FINGER: 0,
	FACE: 111,
} as const;

/** Common ZKTeco command builders */
export const Commands = {
	setUser(pin: string, name: string, card: string = ''): string {
		return `DATA UPDATE USERINFO PIN=${pin}\tName=${name}\tPri=0\tPasswd=\tCard=${card}\tGrp=1`;
	},
	/** Enroll fingerprint — device must capture the print physically */
	enrollFinger(pin: string): string {
		return `ENROLL_FP PIN=${pin}\tFID=${FID.FINGER}\tRETRY=3\tOVERWRITE=1`;
	},
	/** Enroll face — device must capture the face physically (FID=111 for SpeedFace V5L) */
	enrollFace(pin: string): string {
		return `ENROLL_FP PIN=${pin}\tFID=${FID.FACE}\tRETRY=3\tOVERWRITE=1`;
	},
	deleteUser(pin: string): string {
		return `DATA DELETE USERINFO PIN=${pin}`;
	},
	reboot(): string {
		return 'CONTROL DEVICE REBOOT';
	},
	clearLog(): string {
		return 'CLEAR LOG';
	},
	clearData(): string {
		return 'CLEAR DATA';
	},
	getInfo(): string {
		return 'INFO';
	},
	reloadOptions(): string {
		return 'RELOAD OPTIONS';
	},
	updateTemplate(table: string, kvString: string): string {
		return `DATA UPDATE ${table} ${kvString}`;
	}
};

/** Map ZKTeco verify code to human-readable method */
export function verifyCodeToMethod(verify: number): string | null {
	switch (verify) {
		case 0: return 'password';
		case 1: return 'finger';
		case 2: return 'card';
		case 15: return 'face';
		default: return null;
	}
}

/** Enrollment operation type mappings */
export const ENROLLMENT_OPS: Record<string, string> = {
	'EnrollFP': 'finger',
	'EnrollFinger': 'finger',
	'EnrollFace': 'face',
	'EnrollCard': 'card',
};

export interface OperLogEntry {
	pin: string;
	operation: string;
	enrollMethod: string | null; // 'finger' | 'face' | 'card' | null
	rawLine: string;
}

/** Parse OPERLOG lines from device POST body */
export function parseOperLog(body: string): OperLogEntry[] {
	const entries: OperLogEntry[] = [];

	for (const line of body.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		const parts = trimmed.split('\t');
		if (parts.length < 4) continue;

		// OPERLOG format varies, but typically:
		// OPERLOG <timestamp> <admin> <user1> <user2> <user3> <pin> <action> <reserved> <operation>
		// Or simpler tab-separated formats
		const operation = parts[parts.length - 1]?.trim() || '';
		const enrollMethod = ENROLLMENT_OPS[operation] || null;

		// Find the PIN — typically in the line
		// Common format: pin is one of the fields
		let pin = '';
		for (const part of parts) {
			const p = part.trim();
			// PIN is typically a numeric string
			if (/^\d+$/.test(p) && p.length > 0) {
				pin = p;
				break;
			}
		}

		if (pin) {
			entries.push({ pin, operation, enrollMethod, rawLine: trimmed });
		}
	}

	return entries;
}
