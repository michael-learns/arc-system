import type { Handle } from '@sveltejs/kit';
import { withServerConvexToken } from 'convex-svelte/sveltekit/server';
import { getActiveOrganizationId } from '$lib/server/app-session';
import {
	WORKOS_SESSION_COOKIE,
	createWorkOS,
	getCookieOptions,
	getWorkOSConfig,
	isWorkOSConfigured
} from '$lib/server/workos';
import {
	bootstrapAuthenticatedConvexSession,
	getAuthenticatedConvexContext
} from '$lib/server/convex';

async function safeBootstrap(user: NonNullable<App.Locals['user']>, organizationId: string | null) {
	try {
		return await getAuthenticatedConvexContext(organizationId);
	} catch (error) {
		try {
			// Existing sessions only need this once while their legacy WorkOS ID is
			// migrated to the verified JWT identity.
			await bootstrapAuthenticatedConvexSession(user);
			return await getAuthenticatedConvexContext(organizationId);
		} catch (bootstrapError) {
			console.error('Convex session bootstrap failed', bootstrapError, error);
			return null;
		}
	}
}

async function resolveAuthenticated(
	event: Parameters<Handle>[0]['event'],
	resolve: Parameters<Handle>[0]['resolve'],
	accessToken: string,
	user: NonNullable<App.Locals['user']>,
	sessionId: string,
	organizationId: string | null
) {
	return withServerConvexToken(accessToken, async () => {
		event.locals.user = user;
		event.locals.session = { sessionId, organizationId };
		event.locals.convexContext = await safeBootstrap(user, organizationId);
		return resolve(event);
	});
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.session = null;
	event.locals.workosConfigured = isWorkOSConfigured();
	event.locals.convexContext = null;

	const sealedSession = event.cookies.get(WORKOS_SESSION_COOKIE);
	const activeOrganizationId = getActiveOrganizationId(event.cookies);

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
			return resolveAuthenticated(
				event,
				resolve,
				auth.accessToken,
				auth.user,
				auth.sessionId,
				activeOrganizationId
			);
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

		if (!refreshed.session?.accessToken) {
			event.cookies.delete(WORKOS_SESSION_COOKIE, { path: '/' });
			return resolve(event);
		}

		event.cookies.set(WORKOS_SESSION_COOKIE, refreshed.sealedSession, getCookieOptions());
		return resolveAuthenticated(
			event,
			resolve,
			refreshed.session.accessToken,
			refreshed.user,
			refreshed.sessionId,
			activeOrganizationId
		);
	} catch {
		event.cookies.delete(WORKOS_SESSION_COOKIE, { path: '/' });
		return resolve(event);
	}
};
