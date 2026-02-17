import type { RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase64url, encodeHexLowerCase } from '@oslojs/encoding';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

import { dev } from '$app/environment';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export const sessionCookieName = 'auth-session';

export function generateSessionToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(18));
	const token = encodeBase64url(bytes);
	return token;
}

export async function createSession(token: string, userId: string, durationMs: number = DAY_IN_MS * 30) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session: table.Session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + durationMs)
	};
	await db.insert(table.session).values(session);
	return session;
}

export async function validateSessionToken(token: string) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const rows = await db
		.select({
			user: table.user,
			session: table.session,
			role: table.roles,
			permissionId: table.permissions.id
		})
		.from(table.session)
		.innerJoin(table.user, eq(table.session.userId, table.user.id))
		.leftJoin(table.roles, eq(table.user.roleId, table.roles.id))
		.leftJoin(table.rolePermissions, eq(table.roles.id, table.rolePermissions.roleId))
		.leftJoin(table.permissions, eq(table.rolePermissions.permissionId, table.permissions.id))
		.where(eq(table.session.id, sessionId));

	if (rows.length === 0) {
		return { session: null, user: null };
	}

	const { session, user: userBase, role } = rows[0];
	const permissions = new Set<string>();

	for (const row of rows) {
		if (row.permissionId) {
			permissions.add(row.permissionId);
		}
	}

	const user = {
		id: userBase.id,
		username: userBase.username,
		roleId: role?.id ?? null,
		roleName: role?.name ?? null,
		permissions: Array.from(permissions)
	};

	const sessionExpired = Date.now() >= session.expiresAt.getTime();
	if (sessionExpired) {
		await db.delete(table.session).where(eq(table.session.id, session.id));
		return { session: null, user: null };
	}

	const renewSession = Date.now() >= session.expiresAt.getTime() - DAY_IN_MS * 15;
	if (renewSession) {
		session.expiresAt = new Date(Date.now() + DAY_IN_MS * 30);
		await db
			.update(table.session)
			.set({ expiresAt: session.expiresAt })
			.where(eq(table.session.id, session.id));
	}

	return { session, user };
}

export type SessionValidationResult = Awaited<ReturnType<typeof validateSessionToken>>;

export async function invalidateSession(sessionId: string) {
	await db.delete(table.session).where(eq(table.session.id, sessionId));
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date) {
	event.cookies.set(sessionCookieName, token, {
		expires: expiresAt,
		path: '/',
		secure: false,
		httpOnly: true,
		sameSite: 'lax'
	});
}

export function deleteSessionTokenCookie(event: RequestEvent) {
	event.cookies.delete(sessionCookieName, {
		path: '/'
	});
}
