import { isRedirect, redirect } from '@sveltejs/kit';
import {
	WORKOS_STATE_COOKIE,
	createWorkOS,
	getAuthErrorRedirect,
	getCallbackUrl,
	getCookieOptions,
	isWorkOSConfigured
} from '$lib/server/workos';

export const GET = async ({ cookies, url }) => {
	if (!isWorkOSConfigured()) {
		throw redirect(302, getAuthErrorRedirect(url, 'login_unavailable'));
	}

	try {
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
	} catch (error) {
		if (isRedirect(error)) {
			throw error;
		}

		console.error('WorkOS login redirect failed', error);
		throw redirect(302, getAuthErrorRedirect(url, 'login_unavailable'));
	}
};
