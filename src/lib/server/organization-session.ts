import type { User } from "@workos-inc/node";
import {
	createOrganizationWorkspace,
	listUserOrganizations,
} from "./convex";

export type OrganizationOption = {
	membershipId: string;
	organizationId: string;
	organizationName: string;
	role: string | null;
	roles: string[];
	isActive: boolean;
};

export async function listOrganizationOptions(
	user: User,
	activeOrganizationId: string | null,
): Promise<OrganizationOption[]> {
	const organizations = await listUserOrganizations({
		user,
		activeOrganizationId,
	});

	return organizations.map(({ organization, membership, isActive }) => ({
		membershipId: membership._id,
		organizationId: organization._id,
		organizationName: organization.name,
		role: membership.roles[0] ?? null,
		roles: membership.roles,
		isActive,
	}));
}

export async function createOrganizationOption(input: {
	user: User;
	name: string;
}) {
	return await createOrganizationWorkspace(input);
}
