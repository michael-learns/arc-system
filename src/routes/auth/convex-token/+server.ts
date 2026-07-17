import { json } from '@sveltejs/kit';
import {
	WORKOS_SESSION_COOKIE,
	createWorkOS,
	getCookieOptions,
	getWorkOSConfig,
	isWorkOSConfigured
} from '$lib/server/workos';

const noStoreHeaders = {
	'cache-control': 'private, no-store, max-age=0'
};

export const GET = async ({ cookies, url }) => {
	const sealedSession = cookies.get(WORKOS_SESSION_COOKIE);
	if (!isWorkOSConfigured() || !sealedSession) {
		return json({ token: null }, { status: 401, headers: noStoreHeaders });
	}

	const { cookiePassword } = getWorkOSConfig();
	const session = createWorkOS().userManagement.loadSealedSession({
		sessionData: sealedSession,
		cookiePassword
	});

	try {
		if (url.searchParams.get('refresh') === '1') {
			const refreshed = await session.refresh();
			if (!refreshed.authenticated || !refreshed.sealedSession || !refreshed.session?.accessToken) {
				cookies.delete(WORKOS_SESSION_COOKIE, { path: '/' });
				return json({ token: null }, { status: 401, headers: noStoreHeaders });
			}

			cookies.set(WORKOS_SESSION_COOKIE, refreshed.sealedSession, getCookieOptions());
			return json({ token: refreshed.session.accessToken }, { headers: noStoreHeaders });
		}

		const auth = await session.authenticate();
		if (!auth.authenticated) {
			return json({ token: null }, { status: 401, headers: noStoreHeaders });
		}

		return json({ token: auth.accessToken }, { headers: noStoreHeaders });
	} catch {
		return json({ token: null }, { status: 401, headers: noStoreHeaders });
	}
};
