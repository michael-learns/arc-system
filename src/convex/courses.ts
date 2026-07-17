import { mutation, query } from "./_generated/server.js";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel.js";
import {
  assert,
  clampLimit,
  duplicateCourseTree,
  normalizeOptionalString,
  requireAuthenticatedOrgActor,
  requireDoc,
  requireFacilitatorManagerById,
  requireOrgActorById,
  requireSuperAdminOrOrgAdminById,
} from "./lib/helpers";
import {
  contributionStatusValidator,
  courseStatusValidator,
  quizQuestionTypeValidator,
  slideTypeValidator,
} from "./lib/validators";

const MAX_SLIDE_IMAGE_BYTES = 5 * 1024 * 1024;

async function requireCourseAccess(
  ctx: any,
  tokenIdentifier: string,
  organizationId: Id<"organizations">,
  courseId: Id<"courses">,
) {
  const actor = await requireOrgActorById(ctx, tokenIdentifier, organizationId);
  const course = await requireDoc(ctx, courseId, "Course not found.");

  if (course.ownerOrgId) {
    assert(
      course.ownerOrgId === actor.organization._id,
      "This course does not belong to the active organization.",
    );
    return { actor, course };
  }

  assert(
    course.ownerUserId === actor.user._id || actor.user.isSuperAdmin || actor.membership.roles.includes("admin"),
    "You do not have access to this facilitator course.",
  );

  return { actor, course };
}

async function requireAuthenticatedCourseAccess(
  ctx: any,
  organizationId: Id<"organizations">,
  courseId: Id<"courses">,
) {
  const actor = await requireAuthenticatedOrgActor(ctx, organizationId);
  const course = await requireDoc(ctx, courseId, "Course not found.");

  if (course.ownerOrgId) {
    assert(
      course.ownerOrgId === actor.organization._id,
      "This course does not belong to the active organization.",
    );
    return { actor, course };
  }

  assert(
    course.ownerUserId === actor.user._id ||
      actor.user.isSuperAdmin ||
      actor.membership.roles.includes("admin"),
    "You do not have access to this facilitator course.",
  );

  return { actor, course };
}

export const createOrgCourse = mutation({
  args: {
    actorTokenIdentifier: v.string(),
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireSuperAdminOrOrgAdminById(
      ctx,
      args.actorTokenIdentifier,
      args.organizationId,
    );

    const courseId = await ctx.db.insert("courses", {
      title: args.title.trim(),
      ...(normalizeOptionalString(args.description)
        ? { description: normalizeOptionalString(args.description) }
        : {}),
      ownerOrgId: actor.organization._id,
      status: "draft",
    });

    return await ctx.db.get(courseId);
  },
});

export const updateOrgCourse = mutation({
  args: {
    actorTokenIdentifier: v.string(),
    organizationId: v.id("organizations"),
    courseId: v.id("courses"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(courseStatusValidator),
  },
  handler: async (ctx, args) => {
    const { actor, course } = await requireCourseAccess(
      ctx,
      args.actorTokenIdentifier,
      args.organizationId,
      args.courseId,
    );

    assert(course.ownerOrgId === actor.organization._id, "Only org-owned courses can be updated here.");

    const nextDescription =
      args.description !== undefined
        ? normalizeOptionalString(args.description)
        : course.description;

    await ctx.db.replace(course._id, {
      title: args.title ? args.title.trim() : course.title,
      ownerOrgId: course.ownerOrgId,
      status: args.status ?? course.status,
      ...(course.ownerUserId ? { ownerUserId: course.ownerUserId } : {}),
      ...(course.forkOf ? { forkOf: course.forkOf } : {}),
      ...(course.forkedAt ? { forkedAt: course.forkedAt } : {}),
      ...(nextDescription ? { description: nextDescription } : {}),
    });

    return await ctx.db.get(course._id);
  },
});

export const listOrgCourses = query({
  args: {
    actorTokenIdentifier: v.string(),
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const actor = await requireOrgActorById(
      ctx,
      args.actorTokenIdentifier,
      args.organizationId,
    );
    const courses = await ctx.db
      .query("courses")
      .withIndex("by_ownerOrgId", (q) => q.eq("ownerOrgId", actor.organization._id))
      .take(clampLimit(args.limit));

    return courses;
  },
});

export const createFacilitatorCourse = mutation({
  args: {
    actorTokenIdentifier: v.string(),
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireFacilitatorManagerById(
      ctx,
      args.actorTokenIdentifier,
      args.organizationId,
    );

    const courseId = await ctx.db.insert("courses", {
      title: args.title.trim(),
      ...(normalizeOptionalString(args.description)
        ? { description: normalizeOptionalString(args.description) }
        : {}),
      ownerUserId: actor.user._id,
      status: "draft",
    });

    return await ctx.db.get(courseId);
  },
});

export const updateFacilitatorCourse = mutation({
  args: {
    actorTokenIdentifier: v.string(),
    organizationId: v.id("organizations"),
    courseId: v.id("courses"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(courseStatusValidator),
  },
  handler: async (ctx, args) => {
    const { actor, course } = await requireCourseAccess(
      ctx,
      args.actorTokenIdentifier,
      args.organizationId,
      args.courseId,
    );

    assert(course.ownerUserId === actor.user._id, "Only the facilitator owner can update this course.");

    const nextDescription =
      args.description !== undefined
        ? normalizeOptionalString(args.description)
        : course.description;

    await ctx.db.replace(course._id, {
      title: args.title ? args.title.trim() : course.title,
      ownerUserId: course.ownerUserId,
      status: args.status ?? course.status,
      ...(course.ownerOrgId ? { ownerOrgId: course.ownerOrgId } : {}),
      ...(course.forkOf ? { forkOf: course.forkOf } : {}),
      ...(course.forkedAt ? { forkedAt: course.forkedAt } : {}),
      ...(nextDescription ? { description: nextDescription } : {}),
    });

    return await ctx.db.get(course._id);
  },
});

export const listFacilitatorCourses = query({
  args: {
    actorTokenIdentifier: v.string(),
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const actor = await requireFacilitatorManagerById(
      ctx,
      args.actorTokenIdentifier,
      args.organizationId,
    );

    return await ctx.db
      .query("courses")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", actor.user._id))
      .take(clampLimit(args.limit));
  },
});

export const createTopic = mutation({
  args: {
    organizationId: v.id("organizations"),
    courseId: v.id("courses"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedCourseAccess(ctx, args.organizationId, args.courseId);
    const existingTopics = await ctx.db
      .query("topics")
      .withIndex("by_courseId_and_order", (q) => q.eq("courseId", args.courseId))
      .take(256);

    const topicId = await ctx.db.insert("topics", {
      courseId: args.courseId,
      title: args.title.trim(),
      order: existingTopics.length,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(topicId);
  },
});

export const updateTopic = mutation({
  args: {
    organizationId: v.id("organizations"),
    topicId: v.id("topics"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const topic = await requireDoc(ctx, args.topicId, "Topic not found.");
    await requireAuthenticatedCourseAccess(ctx, args.organizationId, topic.courseId);
    await ctx.db.patch(topic._id, {
      title: args.title.trim(),
      updatedAt: Date.now(),
    });
    return await ctx.db.get(topic._id);
  },
});

export const reorderTopics = mutation({
  args: {
    organizationId: v.id("organizations"),
    courseId: v.id("courses"),
    topicIds: v.array(v.id("topics")),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedCourseAccess(ctx, args.organizationId, args.courseId);
    const topics = await ctx.db
      .query("topics")
      .withIndex("by_courseId_and_order", (q) => q.eq("courseId", args.courseId))
      .take(256);

    assert(
      topics.length === args.topicIds.length,
      "Topic order must include every topic in the course.",
    );

    const existingIds = new Set(topics.map((topic) => topic._id));
    for (const topicId of args.topicIds) {
      assert(existingIds.has(topicId), "One of the provided topics does not belong to this course.");
    }

    await Promise.all(
      args.topicIds.map((topicId, index) =>
        ctx.db.patch(topicId, { order: index, updatedAt: Date.now() }),
      ),
    );

    return await ctx.db
      .query("topics")
      .withIndex("by_courseId_and_order", (q) => q.eq("courseId", args.courseId))
      .take(256);
  },
});

export const createSlide = mutation({
  args: {
    organizationId: v.id("organizations"),
    topicId: v.id("topics"),
    type: slideTypeValidator,
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    body: v.optional(v.string()),
    imageDescription: v.optional(v.string()),
    presenterNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const topic = await requireDoc(ctx, args.topicId, "Topic not found.");
    await requireAuthenticatedCourseAccess(ctx, args.organizationId, topic.courseId);
    const existingSlides = await ctx.db
      .query("slides")
      .withIndex("by_topicId_and_order", (q) => q.eq("topicId", topic._id))
      .take(512);

    const slideId = await ctx.db.insert("slides", {
      topicId: topic._id,
      type: args.type,
      order: existingSlides.length,
      updatedAt: Date.now(),
      ...(normalizeOptionalString(args.title) ? { title: normalizeOptionalString(args.title) } : {}),
      ...(normalizeOptionalString(args.subtitle) ? { subtitle: normalizeOptionalString(args.subtitle) } : {}),
      ...(normalizeOptionalString(args.body) ? { body: normalizeOptionalString(args.body) } : {}),
      ...(normalizeOptionalString(args.imageDescription)
        ? { imageDescription: normalizeOptionalString(args.imageDescription) }
        : {}),
      ...(normalizeOptionalString(args.presenterNotes)
        ? { presenterNotes: normalizeOptionalString(args.presenterNotes) }
        : {}),
    });

    await ctx.db.patch(topic._id, { updatedAt: Date.now() });
    return await ctx.db.get(slideId);
  },
});

export const updateSlide = mutation({
  args: {
    organizationId: v.id("organizations"),
    slideId: v.id("slides"),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    body: v.optional(v.string()),
    imageDescription: v.optional(v.string()),
    presenterNotes: v.optional(v.string()),
    type: v.optional(slideTypeValidator),
  },
  handler: async (ctx, args) => {
    const slide = await requireDoc(ctx, args.slideId, "Slide not found.");
    const topic = await requireDoc(ctx, slide.topicId, "Parent topic not found.");
    await requireAuthenticatedCourseAccess(ctx, args.organizationId, topic.courseId);

    const nextBody =
      args.body !== undefined ? normalizeOptionalString(args.body) : slide.body;
    const nextTitle =
      args.title !== undefined ? normalizeOptionalString(args.title) : slide.title;
    const nextSubtitle =
      args.subtitle !== undefined ? normalizeOptionalString(args.subtitle) : slide.subtitle;
    const nextImageDescription =
      args.imageDescription !== undefined
        ? normalizeOptionalString(args.imageDescription)
        : slide.imageDescription;
    const nextPresenterNotes =
      args.presenterNotes !== undefined
        ? normalizeOptionalString(args.presenterNotes)
        : slide.presenterNotes;

    await ctx.db.replace(slide._id, {
      topicId: slide.topicId,
      type: args.type ?? slide.type,
      order: slide.order,
      updatedAt: Date.now(),
      ...(slide.forkOf ? { forkOf: slide.forkOf } : {}),
      ...(nextTitle ? { title: nextTitle } : {}),
      ...(nextSubtitle ? { subtitle: nextSubtitle } : {}),
      ...(nextBody ? { body: nextBody } : {}),
      ...(nextImageDescription ? { imageDescription: nextImageDescription } : {}),
      ...(slide.imageStorageId ? { imageStorageId: slide.imageStorageId } : {}),
      ...(slide.imageName ? { imageName: slide.imageName } : {}),
      ...(slide.imageContentType ? { imageContentType: slide.imageContentType } : {}),
      ...(slide.imageSize !== undefined ? { imageSize: slide.imageSize } : {}),
      ...(nextPresenterNotes ? { presenterNotes: nextPresenterNotes } : {}),
    });

    await ctx.db.patch(topic._id, { updatedAt: Date.now() });
    const updatedSlide = await ctx.db.get(slide._id);
    const imageUrl = updatedSlide?.imageStorageId
      ? await ctx.storage.getUrl(updatedSlide.imageStorageId)
      : null;

    return updatedSlide
      ? {
          ...updatedSlide,
          imageUrl,
        }
      : null;
  },
});

export const generateSlideImageUploadUrl = mutation({
  args: {
    organizationId: v.id("organizations"),
    slideId: v.id("slides"),
  },
  handler: async (ctx, args) => {
    const slide = await requireDoc(ctx, args.slideId, "Slide not found.");
    const topic = await requireDoc(ctx, slide.topicId, "Parent topic not found.");
    await requireAuthenticatedCourseAccess(ctx, args.organizationId, topic.courseId);

    return await ctx.storage.generateUploadUrl();
  },
});

export const attachSlideImage = mutation({
  args: {
    organizationId: v.id("organizations"),
    slideId: v.id("slides"),
    storageId: v.id("_storage"),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const slide = await requireDoc(ctx, args.slideId, "Slide not found.");
    const topic = await requireDoc(ctx, slide.topicId, "Parent topic not found.");
    await requireAuthenticatedCourseAccess(ctx, args.organizationId, topic.courseId);

    const metadata = await ctx.db.system.get("_storage", args.storageId);
    assert(metadata !== null, "Uploaded image was not found.");
    assert(
      metadata.contentType?.startsWith("image/") ?? false,
      "Slide images must be image files.",
    );
    assert(metadata.size <= MAX_SLIDE_IMAGE_BYTES, "Slide images must be 5 MB or smaller.");

    const imageName = normalizeOptionalString(args.fileName) ?? "Slide image";
    await ctx.db.patch(slide._id, {
      imageStorageId: args.storageId,
      imageName,
      imageContentType: metadata.contentType,
      imageSize: metadata.size,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(topic._id, { updatedAt: Date.now() });

    const imageUrl = await ctx.storage.getUrl(args.storageId);
    const updatedSlide = await ctx.db.get(slide._id);

    return updatedSlide
      ? {
          ...updatedSlide,
          imageUrl,
        }
      : null;
  },
});

export const deleteSlide = mutation({
  args: {
    organizationId: v.id("organizations"),
    slideId: v.id("slides"),
  },
  handler: async (ctx, args) => {
    const slide = await requireDoc(ctx, args.slideId, "Slide not found.");
    const topic = await requireDoc(ctx, slide.topicId, "Parent topic not found.");
    await requireAuthenticatedCourseAccess(ctx, args.organizationId, topic.courseId);

    const quizQuestions = await ctx.db
      .query("quizQuestions")
      .withIndex("by_slideId_and_order", (q) => q.eq("slideId", slide._id))
      .take(256);

    for (const question of quizQuestions) {
      const attempts = await ctx.db
        .query("quizAttempts")
        .withIndex("by_questionId", (q) => q.eq("questionId", question._id))
        .take(512);

      for (const attempt of attempts) {
        await ctx.db.delete(attempt._id);
      }

      await ctx.db.delete(question._id);
    }

    const progressRecords = await ctx.db
      .query("slideProgress")
      .withIndex("by_slideId", (q) => q.eq("slideId", slide._id))
      .take(512);

    for (const progress of progressRecords) {
      await ctx.db.delete(progress._id);
    }

    await ctx.db.delete(slide._id);

    const remainingSlides = await ctx.db
      .query("slides")
      .withIndex("by_topicId_and_order", (q) => q.eq("topicId", topic._id))
      .take(512);

    await Promise.all(
      remainingSlides
        .sort((left, right) => left.order - right.order)
        .map((remainingSlide, index) =>
          ctx.db.patch(remainingSlide._id, { order: index, updatedAt: Date.now() }),
        ),
    );

    await ctx.db.patch(topic._id, { updatedAt: Date.now() });
    return { deletedSlideId: slide._id };
  },
});

export const reorderSlides = mutation({
  args: {
    organizationId: v.id("organizations"),
    topicId: v.id("topics"),
    slideIds: v.array(v.id("slides")),
  },
  handler: async (ctx, args) => {
    const topic = await requireDoc(ctx, args.topicId, "Topic not found.");
    await requireAuthenticatedCourseAccess(ctx, args.organizationId, topic.courseId);
    const slides = await ctx.db
      .query("slides")
      .withIndex("by_topicId_and_order", (q) => q.eq("topicId", topic._id))
      .take(512);

    assert(
      slides.length === args.slideIds.length,
      "Slide order must include every slide in the topic.",
    );

    const existingIds = new Set(slides.map((slide) => slide._id));
    for (const slideId of args.slideIds) {
      assert(existingIds.has(slideId), "One of the provided slides does not belong to this topic.");
    }

    await Promise.all(
      args.slideIds.map((slideId, index) =>
        ctx.db.patch(slideId, { order: index, updatedAt: Date.now() }),
      ),
    );

    await ctx.db.patch(topic._id, { updatedAt: Date.now() });
    return await ctx.db
      .query("slides")
      .withIndex("by_topicId_and_order", (q) => q.eq("topicId", topic._id))
      .take(512);
  },
});

export const createQuizQuestion = mutation({
  args: {
    organizationId: v.id("organizations"),
    slideId: v.id("slides"),
    type: quizQuestionTypeValidator,
    prompt: v.string(),
    options: v.optional(v.array(v.string())),
    correctOptions: v.optional(v.array(v.number())),
    acceptedAnswers: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const slide = await requireDoc(ctx, args.slideId, "Slide not found.");
    assert(slide.type === "quiz", "Quiz questions can only be added to quiz slides.");
    const topic = await requireDoc(ctx, slide.topicId, "Parent topic not found.");
    await requireAuthenticatedCourseAccess(ctx, args.organizationId, topic.courseId);
    const questions = await ctx.db
      .query("quizQuestions")
      .withIndex("by_slideId_and_order", (q) => q.eq("slideId", slide._id))
      .take(256);

    const questionId = await ctx.db.insert("quizQuestions", {
      slideId: slide._id,
      order: questions.length,
      type: args.type,
      prompt: args.prompt.trim(),
      ...(args.options ? { options: args.options } : {}),
      ...(args.correctOptions ? { correctOptions: args.correctOptions } : {}),
      ...(args.acceptedAnswers ? { acceptedAnswers: args.acceptedAnswers } : {}),
    });

    await ctx.db.patch(slide._id, { updatedAt: Date.now() });
    await ctx.db.patch(topic._id, { updatedAt: Date.now() });
    return await ctx.db.get(questionId);
  },
});

export const updateQuizQuestion = mutation({
  args: {
    organizationId: v.id("organizations"),
    questionId: v.id("quizQuestions"),
    prompt: v.optional(v.string()),
    options: v.optional(v.array(v.string())),
    correctOptions: v.optional(v.array(v.number())),
    acceptedAnswers: v.optional(v.array(v.string())),
    type: v.optional(quizQuestionTypeValidator),
  },
  handler: async (ctx, args) => {
    const question = await requireDoc(ctx, args.questionId, "Question not found.");
    const slide = await requireDoc(ctx, question.slideId, "Parent slide not found.");
    const topic = await requireDoc(ctx, slide.topicId, "Parent topic not found.");
    await requireAuthenticatedCourseAccess(ctx, args.organizationId, topic.courseId);

    await ctx.db.patch(question._id, {
      ...(args.prompt ? { prompt: args.prompt.trim() } : {}),
      ...(args.options ? { options: args.options } : {}),
      ...(args.correctOptions ? { correctOptions: args.correctOptions } : {}),
      ...(args.acceptedAnswers ? { acceptedAnswers: args.acceptedAnswers } : {}),
      ...(args.type ? { type: args.type } : {}),
    });

    await ctx.db.patch(slide._id, { updatedAt: Date.now() });
    await ctx.db.patch(topic._id, { updatedAt: Date.now() });
    return await ctx.db.get(question._id);
  },
});

export const reorderQuizQuestions = mutation({
  args: {
    organizationId: v.id("organizations"),
    slideId: v.id("slides"),
    questionIds: v.array(v.id("quizQuestions")),
  },
  handler: async (ctx, args) => {
    const slide = await requireDoc(ctx, args.slideId, "Slide not found.");
    const topic = await requireDoc(ctx, slide.topicId, "Parent topic not found.");
    await requireAuthenticatedCourseAccess(ctx, args.organizationId, topic.courseId);
    const questions = await ctx.db
      .query("quizQuestions")
      .withIndex("by_slideId_and_order", (q) => q.eq("slideId", slide._id))
      .take(256);

    assert(
      questions.length === args.questionIds.length,
      "Question order must include every question on the slide.",
    );

    const existingIds = new Set(questions.map((question) => question._id));
    for (const questionId of args.questionIds) {
      assert(existingIds.has(questionId), "A provided question does not belong to this slide.");
    }

    await Promise.all(
      args.questionIds.map((questionId, index) =>
        ctx.db.patch(questionId, { order: index }),
      ),
    );

    await ctx.db.patch(slide._id, { updatedAt: Date.now() });
    await ctx.db.patch(topic._id, { updatedAt: Date.now() });
    return await ctx.db
      .query("quizQuestions")
      .withIndex("by_slideId_and_order", (q) => q.eq("slideId", slide._id))
      .take(256);
  },
});

export const forkCourse = mutation({
  args: {
    actorTokenIdentifier: v.string(),
    organizationId: v.id("organizations"),
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const actor = await requireFacilitatorManagerById(
      ctx,
      args.actorTokenIdentifier,
      args.organizationId,
    );
    const course = await requireDoc(ctx, args.courseId, "Course not found.");

    assert(course.ownerOrgId === actor.organization._id, "Only org-owned courses can be forked.");

    const forkId = await ctx.db.insert("courses", {
      title: course.title,
      ...(course.description ? { description: course.description } : {}),
      ownerUserId: actor.user._id,
      forkOf: course._id,
      forkedAt: Date.now(),
      status: "draft",
    });

    await duplicateCourseTree(ctx, course._id, forkId, true);
    return await ctx.db.get(forkId);
  },
});

export const submitContribution = mutation({
  args: {
    actorTokenIdentifier: v.string(),
    organizationId: v.id("organizations"),
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const actor = await requireFacilitatorManagerById(
      ctx,
      args.actorTokenIdentifier,
      args.organizationId,
    );
    const course = await requireDoc(ctx, args.courseId, "Course not found.");

    assert(
      course.ownerUserId === actor.user._id,
      "Only facilitator-owned courses can be submitted as contributions.",
    );

    const contributionId = await ctx.db.insert("contributions", {
      courseId: course._id,
      orgId: actor.organization._id,
      facilitatorId: actor.user._id,
      status: "pending",
    });

    return await ctx.db.get(contributionId);
  },
});

export const reviewContribution = mutation({
  args: {
    actorTokenIdentifier: v.string(),
    organizationId: v.id("organizations"),
    contributionId: v.id("contributions"),
    status: contributionStatusValidator,
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdminOrOrgAdminById(
      ctx,
      args.actorTokenIdentifier,
      args.organizationId,
    );
    const contribution = await requireDoc(ctx, args.contributionId, "Contribution not found.");

    assert(
      contribution.orgId === admin.organization._id,
      "This contribution does not belong to the active organization.",
    );
    assert(
      contribution.status === "pending",
      "Only pending contributions can be reviewed.",
    );

    let adoptedCourseId: Id<"courses"> | undefined;

    if (args.status === "accepted") {
      const sourceCourse = await requireDoc(ctx, contribution.courseId, "Source course not found.");
      adoptedCourseId = await ctx.db.insert("courses", {
        title: sourceCourse.title,
        ...(sourceCourse.description ? { description: sourceCourse.description } : {}),
        ownerOrgId: admin.organization._id,
        status: sourceCourse.status,
      });

      await duplicateCourseTree(ctx, sourceCourse._id, adoptedCourseId, false);
    }

    await ctx.db.patch(contribution._id, {
      status: args.status,
      reviewedBy: admin.user._id,
      reviewedAt: Date.now(),
      ...(adoptedCourseId ? { adoptedCourseId } : {}),
    });

    return await ctx.db.get(contribution._id);
  },
});

export const getCourseOutline = query({
  args: {
    actorTokenIdentifier: v.string(),
    organizationId: v.id("organizations"),
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const { course } = await requireCourseAccess(
      ctx,
      args.actorTokenIdentifier,
      args.organizationId,
      args.courseId,
    );

    const topics = await ctx.db
      .query("topics")
      .withIndex("by_courseId_and_order", (q) => q.eq("courseId", course._id))
      .take(256);

    const topicsWithSlides = await Promise.all(
      topics.map(async (topic) => {
        const slides = await ctx.db
          .query("slides")
          .withIndex("by_topicId_and_order", (q) => q.eq("topicId", topic._id))
          .take(512);

        const slidesWithQuestions = await Promise.all(
          slides.map(async (slide) => {
            const imageUrl = slide.imageStorageId
              ? await ctx.storage.getUrl(slide.imageStorageId)
              : null;

            return {
              ...slide,
              imageUrl,
              quizQuestions: await ctx.db
                .query("quizQuestions")
                .withIndex("by_slideId_and_order", (q) => q.eq("slideId", slide._id))
                .take(256),
            };
          }),
        );

        return {
          ...topic,
          slides: slidesWithQuestions,
        };
      }),
    );

    return {
      course,
      topics: topicsWithSlides,
    };
  },
});
