import type { Handle } from '@sveltejs/kit';
import {
	WORKOS_SESSION_COOKIE,
	createWorkOS,
	getCookieOptions,
	getWorkOSConfig,
	isWorkOSConfigured
} from '$lib/server/workos';
import { bootstrapConvexSession } from '$lib/server/convex';

async function safeBootstrap(user: NonNullable<App.Locals['user']>, organizationId: string | null) {
	try {
		return await bootstrapConvexSession({
			user,
			organizationId
		});
	} catch (error) {
		console.error('Convex session bootstrap failed', error);
		return null;
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.session = null;
	event.locals.workosConfigured = isWorkOSConfigured();
	event.locals.convexContext = null;

	const sealedSession = event.cookies.get(WORKOS_SESSION_COOKIE);

	if (!event.locals.workosConfigured || !sealedSession) {
		return resolve(event);
	}

	const workos = createWorkOS();
	const { cookiePassword } = getWorkOSConfig();
	const session = workos.userManagement.loadSealedSession({
		sessionData: sealedSession,
		cookiePassword
	});

	try {
		const auth = await session.authenticate();

		if (auth.authenticated) {
			event.locals.user = auth.user;
			event.locals.session = {
				sessionId: auth.sessionId,
				organizationId: auth.organizationId ?? null,
				role: auth.role ?? null
			};
			event.locals.convexContext = await safeBootstrap(
				auth.user,
				auth.organizationId ?? null
			);

			return resolve(event);
		}

		if (auth.reason === 'no_session_cookie_provided') {
			return resolve(event);
		}

		const refreshed = await session.refresh();

		if (!refreshed.authenticated) {
			event.cookies.delete(WORKOS_SESSION_COOKIE, { path: '/' });
			return resolve(event);
		}

		if (!refreshed.sealedSession) {
			event.cookies.delete(WORKOS_SESSION_COOKIE, { path: '/' });
			return resolve(event);
		}

		event.cookies.set(WORKOS_SESSION_COOKIE, refreshed.sealedSession, getCookieOptions());
		event.locals.user = refreshed.user;
		event.locals.session = {
			sessionId: refreshed.sessionId,
			organizationId: refreshed.organizationId ?? null,
			role: refreshed.role ?? null
		};
		event.locals.convexContext = await safeBootstrap(
			refreshed.user,
			refreshed.organizationId ?? null
		);

		return resolve(event);
	} catch {
		event.cookies.delete(WORKOS_SESSION_COOKIE, { path: '/' });
		return resolve(event);
	}
};
