import { isRedirect, redirect } from '@sveltejs/kit';
import { withServerConvexToken } from 'convex-svelte/sveltekit/server';
import {
	WORKOS_SESSION_COOKIE,
	WORKOS_STATE_COOKIE,
	createWorkOS,
	getAuthErrorRedirect,
	getCookieOptions,
	getWorkOSConfig,
	isWorkOSConfigured
} from '$lib/server/workos';
import {
	bootstrapAuthenticatedConvexSession
} from '$lib/server/convex';

export const GET = async ({ cookies, url }) => {
	if (!isWorkOSConfigured()) {
		throw redirect(302, getAuthErrorRedirect(url, 'login_unavailable'));
	}

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const expectedState = cookies.get(WORKOS_STATE_COOKIE);

	cookies.delete(WORKOS_STATE_COOKIE, { path: '/' });

	if (!code) {
		throw redirect(302, getAuthErrorRedirect(url, 'login_failed'));
	}

	if (!state || !expectedState || state !== expectedState) {
		throw redirect(302, getAuthErrorRedirect(url, 'login_failed'));
	}

	try {
		const workos = createWorkOS();
		const { clientId, cookiePassword } = getWorkOSConfig();
		const auth = await workos.userManagement.authenticateWithCode({
			clientId,
			code,
			session: {
				sealSession: true,
				cookiePassword
			}
		});

		if (!auth.sealedSession) {
			throw redirect(302, getAuthErrorRedirect(url, 'login_failed'));
		}

		cookies.set(WORKOS_SESSION_COOKIE, auth.sealedSession, getCookieOptions());

		// Bootstrap the verified Convex identity during sign-in. A Convex hiccup
		// should not turn a successful WorkOS login into a failed login.
		try {
			await withServerConvexToken(auth.accessToken, async () => {
				await bootstrapAuthenticatedConvexSession(auth.user);
			});
		} catch (bootstrapError) {
			console.error('Convex session bootstrap failed after login', bootstrapError);
		}

		throw redirect(302, '/dashboard');
	} catch (error) {
		if (isRedirect(error)) {
			throw error;
		}

		console.error('WorkOS callback failed', error);
		throw redirect(302, getAuthErrorRedirect(url, 'login_failed'));
	}
};
