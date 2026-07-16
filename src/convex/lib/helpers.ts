import type { MutationCtx, QueryCtx } from "../_generated/server.js";
import type { Doc, Id, TableNames } from "../_generated/dataModel.js";

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

type Ctx = QueryCtx | MutationCtx;
type Role = Doc<"memberships">["roles"][number];

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function uniqueStrings(values: string[]) {
  return [...new Set(values)].sort();
}

export function clampLimit(limit: number | undefined) {
  if (!limit) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.max(1, Math.min(limit, MAX_PAGE_SIZE));
}

export function normalizeOptionalString(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function getUserByTokenIdentifier(
  ctx: Ctx,
  tokenIdentifier: string,
) {
  return await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();
}

export async function getMembership(
  ctx: Ctx,
  userId: Id<"users">,
  orgId: Id<"organizations">,
) {
  return await ctx.db
    .query("memberships")
    .withIndex("by_userId_and_orgId", (q) =>
      q.eq("userId", userId).eq("orgId", orgId),
    )
    .unique();
}

export async function requireUserByTokenIdentifier(
  ctx: Ctx,
  tokenIdentifier: string,
) {
  const user = await getUserByTokenIdentifier(ctx, tokenIdentifier);
  assert(user, "User has not been bootstrapped in Convex.");
  return user;
}

export async function requireOrganizationById(
  ctx: Ctx,
  organizationId: Id<"organizations">,
) {
  const organization = await ctx.db.get(organizationId);
  assert(organization, "Organization was not found.");
  return organization;
}

export async function requireMembership(
  ctx: Ctx,
  userId: Id<"users">,
  orgId: Id<"organizations">,
) {
  const membership = await getMembership(ctx, userId, orgId);
  assert(membership, "Membership was not found for this organization.");
  return membership;
}

export async function requireOrgActorById(
  ctx: Ctx,
  tokenIdentifier: string,
  organizationId: Id<"organizations">,
) {
  const user = await requireUserByTokenIdentifier(ctx, tokenIdentifier);
  const organization = await requireOrganizationById(ctx, organizationId);
  const membership = await requireMembership(ctx, user._id, organization._id);

  return { user, organization, membership };
}

export function hasRole(membership: Doc<"memberships">, role: Role) {
  return membership.roles.includes(role);
}

export function requireAnyRole(
  membership: Doc<"memberships">,
  roles: Role[],
  message = "You do not have permission to perform this action.",
) {
  assert(roles.some((role) => membership.roles.includes(role)), message);
}

export async function requireSuperAdminOrOrgAdminById(
  ctx: Ctx,
  tokenIdentifier: string,
  organizationId: Id<"organizations">,
) {
  const actor = await requireOrgActorById(ctx, tokenIdentifier, organizationId);
  if (actor.user.isSuperAdmin) {
    return actor;
  }

  requireAnyRole(actor.membership, ["admin"], "Admin access is required.");
  return actor;
}

export async function requireFacilitatorManagerById(
  ctx: Ctx,
  tokenIdentifier: string,
  organizationId: Id<"organizations">,
) {
  const actor = await requireOrgActorById(ctx, tokenIdentifier, organizationId);
  if (actor.user.isSuperAdmin) {
    return actor;
  }

  requireAnyRole(
    actor.membership,
    ["admin", "facilitator"],
    "Facilitator or admin access is required.",
  );
  return actor;
}

export async function requireDoc<T extends TableNames>(
  ctx: Ctx,
  id: Id<T>,
  message: string,
) {
  const doc = await ctx.db.get(id);
  assert(doc, message);
  return doc;
}

export function buildName(firstName: string | null, lastName: string | null, email: string) {
  const joined = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ").trim();
  return joined || email;
}

export function arraysEqualAsSets(left: number[], right: number[]) {
  if (left.length !== right.length) {
    return false;
  }

  const normalizedLeft = [...left].sort((a, b) => a - b);
  const normalizedRight = [...right].sort((a, b) => a - b);
  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

export function scoreQuizQuestion(
  question: Doc<"quizQuestions">,
  selectedOptions: number[] | undefined,
  textAnswer: string | undefined,
) {
  switch (question.type) {
    case "multiple_choice":
    case "true_false":
    case "multi_select":
      assert(question.correctOptions, "Quiz question is missing correct options.");
      return arraysEqualAsSets(selectedOptions ?? [], question.correctOptions);
    case "fill_in_the_blank":
      assert(question.acceptedAnswers, "Quiz question is missing accepted answers.");
      assert(textAnswer, "A text answer is required for fill in the blank questions.");
      return question.acceptedAnswers.some(
        (answer) => answer.trim().toLowerCase() === textAnswer.trim().toLowerCase(),
      );
  }
}

export async function duplicateCourseTree(
  ctx: MutationCtx,
  sourceCourseId: Id<"courses">,
  destinationCourseId: Id<"courses">,
  forkMode: boolean,
) {
  const sourceTopics = await ctx.db
    .query("topics")
    .withIndex("by_courseId_and_order", (q) => q.eq("courseId", sourceCourseId))
    .take(256);

  for (const sourceTopic of sourceTopics) {
    const topicId = await ctx.db.insert("topics", {
      courseId: destinationCourseId,
      title: sourceTopic.title,
      order: sourceTopic.order,
      updatedAt: Date.now(),
      ...(forkMode ? { forkOf: sourceTopic._id, forkedAt: Date.now() } : {}),
    });

    const sourceSlides = await ctx.db
      .query("slides")
      .withIndex("by_topicId_and_order", (q) => q.eq("topicId", sourceTopic._id))
      .take(512);

    for (const sourceSlide of sourceSlides) {
      const slideId = await ctx.db.insert("slides", {
        topicId,
        type: sourceSlide.type,
        order: sourceSlide.order,
        updatedAt: Date.now(),
        ...(sourceSlide.title ? { title: sourceSlide.title } : {}),
        ...(sourceSlide.subtitle ? { subtitle: sourceSlide.subtitle } : {}),
        ...(sourceSlide.body ? { body: sourceSlide.body } : {}),
        ...(sourceSlide.imageDescription
          ? { imageDescription: sourceSlide.imageDescription }
          : {}),
        ...(sourceSlide.imageStorageId ? { imageStorageId: sourceSlide.imageStorageId } : {}),
        ...(sourceSlide.imageName ? { imageName: sourceSlide.imageName } : {}),
        ...(sourceSlide.imageContentType
          ? { imageContentType: sourceSlide.imageContentType }
          : {}),
        ...(sourceSlide.imageSize !== undefined ? { imageSize: sourceSlide.imageSize } : {}),
        ...(sourceSlide.presenterNotes ? { presenterNotes: sourceSlide.presenterNotes } : {}),
        ...(forkMode ? { forkOf: sourceSlide._id } : {}),
      });

      const sourceQuestions = await ctx.db
        .query("quizQuestions")
        .withIndex("by_slideId_and_order", (q) => q.eq("slideId", sourceSlide._id))
        .take(256);

      for (const sourceQuestion of sourceQuestions) {
        await ctx.db.insert("quizQuestions", {
          slideId,
          order: sourceQuestion.order,
          type: sourceQuestion.type,
          prompt: sourceQuestion.prompt,
          ...(sourceQuestion.options ? { options: sourceQuestion.options } : {}),
          ...(sourceQuestion.correctOptions
            ? { correctOptions: sourceQuestion.correctOptions }
            : {}),
          ...(sourceQuestion.acceptedAnswers
            ? { acceptedAnswers: sourceQuestion.acceptedAnswers }
            : {}),
        });
      }
    }
  }
}
