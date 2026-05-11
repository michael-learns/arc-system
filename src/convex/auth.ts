import { mutation, query } from "./_generated/server.js";
import { v } from "convex/values";
import {
  buildName,
  getMembership,
  requireOrgActor,
  requireOrganizationByWorkosOrgId,
  requireSuperAdminOrOrgAdmin,
  requireUserByTokenIdentifier,
  uniqueStrings,
} from "./lib/helpers";
import {
  enrollmentPolicyValidator,
  roleValidator,
  serverIdentityValidator,
} from "./lib/validators";

export const ensureCurrentUser = mutation({
  args: {
    identity: serverIdentityValidator,
    isSuperAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", args.identity.tokenIdentifier),
      )
      .unique();

    const profile = {
      tokenIdentifier: args.identity.tokenIdentifier,
      name: args.identity.name,
      email: args.identity.email,
      isSuperAdmin: args.isSuperAdmin ?? existing?.isSuperAdmin ?? false,
      ...(args.identity.avatarUrl ? { avatarUrl: args.identity.avatarUrl } : {}),
    };

    if (existing) {
      await ctx.db.patch(existing._id, profile);
      return await ctx.db.get(existing._id);
    }

    const userId = await ctx.db.insert("users", profile);
    return await ctx.db.get(userId);
  },
});

export const ensureOrganization = mutation({
  args: {
    workosOrgId: v.string(),
    name: v.string(),
    enrollmentPolicy: v.optional(enrollmentPolicyValidator),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", args.workosOrgId))
      .unique();

    const patch = {
      workosOrgId: args.workosOrgId,
      name: args.name,
      enrollmentPolicy: args.enrollmentPolicy ?? existing?.enrollmentPolicy ?? "org_controlled",
    } as const;

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return await ctx.db.get(existing._id);
    }

    const organizationId = await ctx.db.insert("organizations", patch);
    return await ctx.db.get(organizationId);
  },
});

export const ensureMembershipForCurrentOrg = mutation({
  args: {
    tokenIdentifier: v.string(),
    workosOrgId: v.string(),
    roles: v.optional(v.array(roleValidator)),
  },
  handler: async (ctx, args) => {
    const user = await requireUserByTokenIdentifier(ctx, args.tokenIdentifier);
    const organization = await requireOrganizationByWorkosOrgId(ctx, args.workosOrgId);
    const existing = await getMembership(ctx, user._id, organization._id);

    if (existing) {
      if (args.roles) {
        await ctx.db.patch(existing._id, {
          roles: uniqueStrings(args.roles) as typeof existing.roles,
        });
      }

      return await ctx.db.get(existing._id);
    }

    const membershipId = await ctx.db.insert("memberships", {
      userId: user._id,
      orgId: organization._id,
      roles: uniqueStrings(args.roles ?? []) as ("admin" | "facilitator" | "student")[],
    });

    return await ctx.db.get(membershipId);
  },
});

export const bootstrapSession = mutation({
  args: {
    identity: serverIdentityValidator,
    workosOrgId: v.optional(v.string()),
    organizationName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await (async () => {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_tokenIdentifier", (q) =>
          q.eq("tokenIdentifier", args.identity.tokenIdentifier),
        )
        .unique();

      const userPatch = {
        tokenIdentifier: args.identity.tokenIdentifier,
        name: args.identity.name,
        email: args.identity.email,
        isSuperAdmin: existing?.isSuperAdmin ?? false,
        ...(args.identity.avatarUrl ? { avatarUrl: args.identity.avatarUrl } : {}),
      };

      if (existing) {
        await ctx.db.patch(existing._id, userPatch);
        return await ctx.db.get(existing._id);
      }

      const insertedId = await ctx.db.insert("users", userPatch);
      return await ctx.db.get(insertedId);
    })();

    if (!args.workosOrgId || !user) {
      return {
        user,
        organization: null,
        membership: null,
      };
    }

    const organization = await (async () => {
      const workosOrgId = args.workosOrgId!;
      const existing = await ctx.db
        .query("organizations")
        .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", workosOrgId))
        .unique();

      const organizationPatch = {
        workosOrgId,
        name: args.organizationName ?? existing?.name ?? workosOrgId,
        enrollmentPolicy: existing?.enrollmentPolicy ?? "org_controlled",
      } as const;

      if (existing) {
        await ctx.db.patch(existing._id, organizationPatch);
        return await ctx.db.get(existing._id);
      }

      const insertedId = await ctx.db.insert("organizations", organizationPatch);
      return await ctx.db.get(insertedId);
    })();

    const existingMembership = await getMembership(ctx, user._id, organization!._id);
    if (existingMembership) {
      return {
        user,
        organization,
        membership: await ctx.db.get(existingMembership._id),
      };
    }

    const membershipId = await ctx.db.insert("memberships", {
      userId: user._id,
      orgId: organization!._id,
      roles: [],
    });

    return {
      user,
      organization,
      membership: await ctx.db.get(membershipId),
    };
  },
});

export const getCurrentOrgContext = query({
  args: {
    tokenIdentifier: v.string(),
    workosOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUserByTokenIdentifier(ctx, args.tokenIdentifier);
    if (!args.workosOrgId) {
      return {
        user,
        organization: null,
        membership: null,
      };
    }

    const actor = await requireOrgActor(ctx, args.tokenIdentifier, args.workosOrgId);
    return actor;
  },
});

export const setMembershipRoles = mutation({
  args: {
    actorTokenIdentifier: v.string(),
    workosOrgId: v.string(),
    memberUserId: v.id("users"),
    roles: v.array(roleValidator),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdminOrOrgAdmin(
      ctx,
      args.actorTokenIdentifier,
      args.workosOrgId,
    );

    const membership = await getMembership(ctx, args.memberUserId, admin.organization._id);
    if (membership) {
      await ctx.db.patch(membership._id, {
        roles: uniqueStrings(args.roles) as typeof membership.roles,
      });
      return await ctx.db.get(membership._id);
    }

    const membershipId = await ctx.db.insert("memberships", {
      userId: args.memberUserId,
      orgId: admin.organization._id,
      roles: uniqueStrings(args.roles) as ("admin" | "facilitator" | "student")[],
    });
    return await ctx.db.get(membershipId);
  },
});

export const listOrganizationMemberships = query({
  args: {
    actorTokenIdentifier: v.string(),
    workosOrgId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminOrOrgAdmin(ctx, args.actorTokenIdentifier, args.workosOrgId);
    const actor = await requireOrgActor(ctx, args.actorTokenIdentifier, args.workosOrgId);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_orgId", (q) => q.eq("orgId", actor.organization._id))
      .take(args.limit ?? 50);

    const members = await Promise.all(
      memberships.map(async (membership) => ({
        membership,
        user: await ctx.db.get(membership.userId),
      })),
    );

    return members.map(({ membership, user }) => ({
      membership,
      user,
      label: user ? buildName(user.name, null, user.email) : null,
    }));
  },
});
