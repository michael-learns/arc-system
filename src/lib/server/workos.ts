import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { WorkOS } from '@workos-inc/node';

export const WORKOS_SESSION_COOKIE = 'wos-session';
export const WORKOS_STATE_COOKIE = 'wos-state';

function getRequiredEnv(name: 'WORKOS_API_KEY' | 'WORKOS_CLIENT_ID' | 'WORKOS_COOKIE_PASSWORD') {
	const value = env[name];

	if (!value) {
		throw new Error(`Missing required WorkOS environment variable: ${name}`);
	}

	return value;
}

export function isWorkOSConfigured() {
	return Boolean(env.WORKOS_API_KEY && env.WORKOS_CLIENT_ID && env.WORKOS_COOKIE_PASSWORD);
}

export function getWorkOSConfig() {
	return {
		apiKey: getRequiredEnv('WORKOS_API_KEY'),
		clientId: getRequiredEnv('WORKOS_CLIENT_ID'),
		cookiePassword: getRequiredEnv('WORKOS_COOKIE_PASSWORD')
	};
}

export function createWorkOS() {
	const { apiKey, clientId } = getWorkOSConfig();

	return new WorkOS(apiKey, { clientId });
}

export function getCallbackUrl(url: URL) {
	return new URL('/auth/callback', url).toString();
}

export function getLogoutReturnTo(url: URL) {
	return new URL('/', url).toString();
}

export function getCookieOptions() {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: !dev
	};
}
