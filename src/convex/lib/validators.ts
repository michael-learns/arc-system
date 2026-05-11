import { v } from "convex/values";

export const roleValidator = v.union(
  v.literal("admin"),
  v.literal("facilitator"),
  v.literal("student"),
);

export const courseStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
);

export const enrollmentPolicyValidator = v.union(
  v.literal("org_controlled"),
  v.literal("facilitator_open"),
);

export const classroomEnrollmentStatusValidator = v.union(
  v.literal("active"),
  v.literal("removed"),
);

export const slideTypeValidator = v.union(
  v.literal("content"),
  v.literal("quiz"),
);

export const quizQuestionTypeValidator = v.union(
  v.literal("multiple_choice"),
  v.literal("multi_select"),
  v.literal("true_false"),
  v.literal("fill_in_the_blank"),
);

export const contributionStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("rejected"),
);

export const serverIdentityValidator = v.object({
  tokenIdentifier: v.string(),
  name: v.string(),
  email: v.string(),
  avatarUrl: v.optional(v.string()),
});
