import { mutation, query } from "./_generated/server.js";
import { v } from "convex/values";
import {
  buildName,
  getMembership,
  requireOrgActorById,
  requireSuperAdminOrOrgAdminById,
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

export const bootstrapSession = mutation({
  args: {
    identity: serverIdentityValidator,
  },
  handler: async (ctx, args) => {
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
  },
});

export const getCurrentOrganizationContext = query({
  args: {
    tokenIdentifier: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const user = await requireUserByTokenIdentifier(ctx, args.tokenIdentifier);
    if (!args.organizationId) {
      return {
        user,
        organization: null,
        membership: null,
      };
    }

    const actor = await requireOrgActorById(
      ctx,
      args.tokenIdentifier,
      args.organizationId,
    );
    return actor;
  },
});

export const listUserOrganizations = query({
  args: {
    actorTokenIdentifier: v.string(),
    activeOrganizationId: v.optional(v.union(v.id("organizations"), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await requireUserByTokenIdentifier(ctx, args.actorTokenIdentifier);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(100);

    const options = await Promise.all(
      memberships.map(async (membership) => {
        const organization = await ctx.db.get(membership.orgId);
        return organization
          ? {
              organization,
              membership,
              isActive: args.activeOrganizationId === organization._id,
            }
          : null;
      }),
    );

    return options
      .filter((option) => option !== null)
      .sort((left, right) => {
        if (left.isActive !== right.isActive) {
          return left.isActive ? -1 : 1;
        }

        return left.organization.name.localeCompare(right.organization.name);
      });
  },
});

export const createOrganization = mutation({
  args: {
    actorTokenIdentifier: v.string(),
    name: v.string(),
    enrollmentPolicy: v.optional(enrollmentPolicyValidator),
  },
  handler: async (ctx, args) => {
    const user = await requireUserByTokenIdentifier(ctx, args.actorTokenIdentifier);
    const organizationId = await ctx.db.insert("organizations", {
      name: args.name.trim(),
      enrollmentPolicy: args.enrollmentPolicy ?? "org_controlled",
    });

    const membershipId = await ctx.db.insert("memberships", {
      userId: user._id,
      orgId: organizationId,
      roles: ["admin"],
    });

    return {
      organization: await ctx.db.get(organizationId),
      membership: await ctx.db.get(membershipId),
    };
  },
});

export const setMembershipRoles = mutation({
  args: {
    actorTokenIdentifier: v.string(),
    organizationId: v.id("organizations"),
    memberUserId: v.id("users"),
    roles: v.array(roleValidator),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdminOrOrgAdminById(
      ctx,
      args.actorTokenIdentifier,
      args.organizationId,
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
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminOrOrgAdminById(
      ctx,
      args.actorTokenIdentifier,
      args.organizationId,
    );
    const actor = await requireOrgActorById(
      ctx,
      args.actorTokenIdentifier,
      args.organizationId,
    );
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
