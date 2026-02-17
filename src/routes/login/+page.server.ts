import { verify } from '@node-rs/argon2';
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import * as auth from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/');
	}
	return {};
};

export const actions: Actions = {
	login: async (event) => {
		const formData = await event.request.formData();
		const rawUsername = formData.get('username');
		const password = formData.get('password');
		const rememberMe = formData.get('rememberMe') === 'on';

		const username = typeof rawUsername === 'string' ? rawUsername.trim().toLowerCase() : rawUsername;

		if (!validateUsername(username)) {
			return fail(400, {
				message: 'Invalid username'
			});
		}
		if (!validatePassword(password)) {
			return fail(400, { message: 'Password must be at least 8 characters with both letters and numbers' });
		}

		const results = await db.select().from(table.user).where(eq(table.user.username, username));

		const existingUser = results.at(0);
		if (!existingUser) {
			return fail(400, { message: 'Incorrect username or password' });
		}

		// Check for account lockout
		if (existingUser.lockoutUntil && existingUser.lockoutUntil > new Date()) {
			const minutesLeft = Math.ceil((existingUser.lockoutUntil.getTime() - Date.now()) / (1000 * 60));
			return fail(403, { 
				message: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minutes.` 
			});
		}

		const validPassword = await verify(existingUser.passwordHash, password, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});

		if (!validPassword) {
			const newAttempts = existingUser.failedAttempts + 1;
			const MAX_ATTEMPTS = 5;
			const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

			const updates: any = {
				failedAttempts: newAttempts
			};

			if (newAttempts >= MAX_ATTEMPTS) {
				updates.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
			}

			await db.update(table.user).set(updates).where(eq(table.user.id, existingUser.id));

			if (newAttempts >= MAX_ATTEMPTS) {
				return fail(403, { message: 'Account locked for 15 minutes due to too many failed attempts.' });
			}

			return fail(400, { message: 'Incorrect username or password' });
		}

		// Reset failed attempts on successful login
		await db.update(table.user).set({
			failedAttempts: 0,
			lockoutUntil: null
		}).where(eq(table.user.id, existingUser.id));

		const sessionToken = auth.generateSessionToken();
		const duration = rememberMe ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 24 * 7; // 30 days vs 7 days
		const session = await auth.createSession(sessionToken, existingUser.id, duration);
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

		return redirect(302, '/');
	}
};

function validateUsername(username: unknown): username is string {
	return (
		typeof username === 'string' &&
		username.length >= 3 &&
		username.length <= 31
	);
}

function validatePassword(password: unknown): password is string {
	return (
		typeof password === 'string' &&
		password.length >= 8 &&
		password.length <= 255 &&
		/[a-zA-Z]/.test(password) &&
		/[0-9]/.test(password)
	);
}