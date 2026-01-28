import type { Handle } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';

const handleAuth: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(auth.sessionCookieName);

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;

		return resolve(event);
	}

	const { session, user } = await auth.validateSessionToken(sessionToken);

	if (session) {
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
	} else {
		auth.deleteSessionTokenCookie(event);
	}

	event.locals.user = user;
	event.locals.session = session;

	// Protect routes - redirect to login if not authenticated
	// Exempt /login and /api routes from this check
	if (!event.locals.user && !event.url.pathname.startsWith('/login') && !event.url.pathname.startsWith('/api')) {
		return new Response(null, {
			status: 302,
			headers: { location: '/login' }
		});
	}

	return resolve(event);
};

export const handle: Handle = handleAuth;
