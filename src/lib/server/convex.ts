import { PUBLIC_CONVEX_URL } from "$env/static/public";
import { ConvexHttpClient } from "convex/browser";
import type { User } from "@workos-inc/node";
import { api } from "../../convex/_generated/api.js";
import { createWorkOS } from "./workos";

let convexClient: ConvexHttpClient | null = null;

function getConvexClient() {
  if (!convexClient) {
    convexClient = new ConvexHttpClient(PUBLIC_CONVEX_URL);
  }

  return convexClient;
}

export function getServerTokenIdentifier(user: User) {
  return `workos:${user.id}`;
}

export function getServerIdentity(user: User) {
  return {
    tokenIdentifier: getServerTokenIdentifier(user),
    name: [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email,
    email: user.email,
    ...(user.profilePictureUrl ? { avatarUrl: user.profilePictureUrl } : {}),
  };
}

async function getOrganizationName(workosOrgId: string) {
  try {
    const workos = createWorkOS();
    const organization = await workos.organizations.getOrganization(workosOrgId);
    return organization.name;
  } catch {
    return workosOrgId;
  }
}

export async function bootstrapConvexSession(input: {
  user: User;
  organizationId: string | null;
}) {
  const client = getConvexClient();
  const organizationName = input.organizationId
    ? await getOrganizationName(input.organizationId)
    : undefined;

  return await client.mutation(api.auth.bootstrapSession, {
    identity: getServerIdentity(input.user),
    ...(input.organizationId ? { workosOrgId: input.organizationId } : {}),
    ...(organizationName ? { organizationName } : {}),
  });
}

export async function getCurrentConvexContext(input: {
  user: User;
  organizationId: string | null;
}) {
  const client = getConvexClient();
  return await client.query(api.auth.getCurrentOrgContext, {
    tokenIdentifier: getServerTokenIdentifier(input.user),
    ...(input.organizationId ? { workosOrgId: input.organizationId } : {}),
  });
}
