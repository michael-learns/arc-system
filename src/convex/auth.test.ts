/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const identity = {
	tokenIdentifier: "workos:owner-1",
	name: "Olivia Owner",
	email: "olivia@example.com",
};

describe("local organization ownership", () => {
	test("creator becomes an admin and can reload their organization list", async () => {
		const t = convexTest({
			schema,
			modules,
		});

		await t.mutation(api.auth.bootstrapSession, {
			identity,
		});

		const created = await t.mutation(api.auth.createOrganization, {
			actorTokenIdentifier: identity.tokenIdentifier,
			name: "Local First Academy",
		});

		expect(created.organization?.name).toBe("Local First Academy");
		expect(created.membership?.roles).toEqual(["admin"]);

		const organizations = await t.query(api.auth.listUserOrganizations, {
			actorTokenIdentifier: identity.tokenIdentifier,
			activeOrganizationId: created.organization?._id ?? null,
		});

		expect(organizations).toHaveLength(1);
		expect(organizations[0]).toMatchObject({
			isActive: true,
			organization: {
				name: "Local First Academy",
			},
			membership: {
				roles: ["admin"],
			},
		});
	});
});
