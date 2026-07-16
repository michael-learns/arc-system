import { redirect } from '@sveltejs/kit';
import { ACTIVE_ORGANIZATION_COOKIE } from '$lib/server/app-session';
import {
	WORKOS_SESSION_COOKIE,
	createWorkOS,
	getLogoutReturnTo,
	getWorkOSConfig,
	isWorkOSConfigured
} from '$lib/server/workos';

export const POST = async ({ cookies, url }) => {
	const sealedSession = cookies.get(WORKOS_SESSION_COOKIE);
	cookies.delete(WORKOS_SESSION_COOKIE, { path: '/' });
	cookies.delete(ACTIVE_ORGANIZATION_COOKIE, { path: '/' });

	if (!sealedSession || !isWorkOSConfigured()) {
		throw redirect(303, '/');
	}

	const workos = createWorkOS();
	const { cookiePassword } = getWorkOSConfig();
	const session = workos.userManagement.loadSealedSession({
		sessionData: sealedSession,
		cookiePassword
	});
	const logoutUrl = await session.getLogoutUrl({
		returnTo: getLogoutReturnTo(url)
	});

	throw redirect(303, logoutUrl);
};
