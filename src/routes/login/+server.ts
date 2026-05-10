import { redirect } from '@sveltejs/kit';
import {
	WORKOS_STATE_COOKIE,
	createWorkOS,
	getCallbackUrl,
	getCookieOptions,
	isWorkOSConfigured
} from '$lib/server/workos';

export const GET = async ({ cookies, url }) => {
	if (!isWorkOSConfigured()) {
		throw new Error(
			'WorkOS is not configured yet. Add WORKOS_API_KEY, WORKOS_CLIENT_ID, and WORKOS_COOKIE_PASSWORD first.'
		);
	}

	const workos = createWorkOS();
	const state = crypto.randomUUID();
	const authUrl = workos.userManagement.getAuthorizationUrl({
		provider: 'authkit',
		redirectUri: getCallbackUrl(url),
		state
	});

	cookies.set(WORKOS_STATE_COOKIE, state, {
		...getCookieOptions(),
		maxAge: 60 * 10
	});

	throw redirect(302, authUrl);
};
