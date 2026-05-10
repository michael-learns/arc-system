import { redirect } from '@sveltejs/kit';
import {
	WORKOS_SESSION_COOKIE,
	WORKOS_STATE_COOKIE,
	createWorkOS,
	getCookieOptions,
	getWorkOSConfig,
	isWorkOSConfigured
} from '$lib/server/workos';

export const GET = async ({ cookies, url }) => {
	if (!isWorkOSConfigured()) {
		throw new Error(
			'WorkOS is not configured yet. Add WORKOS_API_KEY, WORKOS_CLIENT_ID, and WORKOS_COOKIE_PASSWORD first.'
		);
	}

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const expectedState = cookies.get(WORKOS_STATE_COOKIE);

	cookies.delete(WORKOS_STATE_COOKIE, { path: '/' });

	if (!code) {
		throw new Error('WorkOS callback did not include an authorization code.');
	}

	if (!state || !expectedState || state !== expectedState) {
		throw new Error('WorkOS callback state validation failed.');
	}

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
		throw new Error('WorkOS did not return a sealed session.');
	}

	cookies.set(WORKOS_SESSION_COOKIE, auth.sealedSession, getCookieOptions());

	throw redirect(302, '/dashboard');
};
