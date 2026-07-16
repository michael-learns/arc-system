import type { Cookies } from "@sveltejs/kit";
import { getCookieOptions } from "./workos";

export const ACTIVE_ORGANIZATION_COOKIE = "arq-active-organization";

export function getActiveOrganizationId(cookies: Cookies) {
	return cookies.get(ACTIVE_ORGANIZATION_COOKIE) ?? null;
}

export function setActiveOrganizationId(
	cookies: Cookies,
	organizationId: string | null,
) {
	if (!organizationId) {
		cookies.delete(ACTIVE_ORGANIZATION_COOKIE, { path: "/" });
		return;
	}

	cookies.set(
		ACTIVE_ORGANIZATION_COOKIE,
		organizationId,
		getCookieOptions(),
	);
}
