import { mutation, query } from "./_generated/server.js";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel.js";
import {
  assert,
  clampLimit,
  requireDoc,
  requireFacilitatorManager,
  requireOrgActor,
  requireUserByTokenIdentifier,
  scoreQuizQuestion,
} from "./lib/helpers";

async function requireEnrollmentAccess(
  ctx: any,
  tokenIdentifier: string,
  classroomEnrollmentId: Id<"classroomEnrollments">,
) {
  const actor = await requireUserByTokenIdentifier(ctx, tokenIdentifier);
  const enrollment = await requireDoc(ctx, classroomEnrollmentId, "Enrollment not found.");
  const classroom = await requireDoc(ctx, enrollment.classroomId, "Classroom not found.");

  if (enrollment.studentId === actor._id) {
    return { actor, enrollment, classroom, role: "student" as const };
  }

  const organization = await requireDoc(ctx, classroom.orgId, "Organization not found.");
  const orgActor = await requireOrgActor(ctx, tokenIdentifier, organization.workosOrgId);
  assert(
    orgActor.user.isSuperAdmin ||
      orgActor.membership.roles.includes("admin") ||
      classroom.facilitatorId === orgActor.user._id,
    "You do not have access to this enrollment.",
  );

  return { actor: orgActor.user, enrollment, classroom, role: "manager" as const };
}

export const markSlideComplete = mutation({
  args: {
    actorTokenIdentifier: v.string(),
    classroomEnrollmentId: v.id("classroomEnrollments"),
    slideId: v.id("slides"),
  },
  handler: async (ctx, args) => {
    const access = await requireEnrollmentAccess(
      ctx,
      args.actorTokenIdentifier,
      args.classroomEnrollmentId,
    );
    assert(access.role === "student", "Only the enrolled student can mark slide completion.");
    const slide = await requireDoc(ctx, args.slideId, "Slide not found.");
    const topic = await requireDoc(ctx, slide.topicId, "Parent topic not found.");
    assert(
      topic.courseId === access.classroom.courseId,
      "This slide does not belong to the classroom course.",
    );

    const existing = await ctx.db
      .query("slideProgress")
      .withIndex("by_classroomEnrollmentId_and_slideId", (q) =>
        q
          .eq("classroomEnrollmentId", access.enrollment._id)
          .eq("slideId", slide._id),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { completedAt: Date.now() });
      return await ctx.db.get(existing._id);
    }

    const progressId = await ctx.db.insert("slideProgress", {
      classroomEnrollmentId: access.enrollment._id,
      slideId: slide._id,
      completedAt: Date.now(),
    });

    return await ctx.db.get(progressId);
  },
});

export const submitQuizAttempt = mutation({
  args: {
    actorTokenIdentifier: v.string(),
    classroomEnrollmentId: v.id("classroomEnrollments"),
    questionId: v.id("quizQuestions"),
    selectedOptions: v.optional(v.array(v.number())),
    textAnswer: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await requireEnrollmentAccess(
      ctx,
      args.actorTokenIdentifier,
      args.classroomEnrollmentId,
    );
    assert(access.role === "student", "Only the enrolled student can submit quiz attempts.");
    const question = await requireDoc(ctx, args.questionId, "Question not found.");
    const slide = await requireDoc(ctx, question.slideId, "Quiz slide not found.");
    const topic = await requireDoc(ctx, slide.topicId, "Parent topic not found.");
    assert(
      topic.courseId === access.classroom.courseId,
      "This quiz question does not belong to the classroom course.",
    );

    const attemptId = await ctx.db.insert("quizAttempts", {
      classroomEnrollmentId: access.enrollment._id,
      questionId: question._id,
      slideId: slide._id,
      ...(args.selectedOptions ? { selectedOptions: args.selectedOptions } : {}),
      ...(args.textAnswer ? { textAnswer: args.textAnswer.trim() } : {}),
      isCorrect: scoreQuizQuestion(question, args.selectedOptions, args.textAnswer),
    });

    return await ctx.db.get(attemptId);
  },
});

export const upsertNote = mutation({
  args: {
    actorTokenIdentifier: v.string(),
    slideId: v.id("slides"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireUserByTokenIdentifier(ctx, args.actorTokenIdentifier);
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_studentId_and_slideId", (q) =>
        q.eq("studentId", actor._id).eq("slideId", args.slideId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        body: args.body.trim(),
        updatedAt: Date.now(),
      });
      return await ctx.db.get(existing._id);
    }

    const noteId = await ctx.db.insert("notes", {
      studentId: actor._id,
      slideId: args.slideId,
      body: args.body.trim(),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(noteId);
  },
});

export const createStudentLog = mutation({
  args: {
    actorTokenIdentifier: v.string(),
    workosOrgId: v.string(),
    studentId: v.id("users"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireFacilitatorManager(
      ctx,
      args.actorTokenIdentifier,
      args.workosOrgId,
    );

    const logId = await ctx.db.insert("studentLogs", {
      facilitatorId: actor.user._id,
      studentId: args.studentId,
      body: args.body.trim(),
      createdAt: Date.now(),
    });

    return await ctx.db.get(logId);
  },
});

export const listStudentLogs = query({
  args: {
    actorTokenIdentifier: v.string(),
    workosOrgId: v.string(),
    studentId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const actor = await requireFacilitatorManager(
      ctx,
      args.actorTokenIdentifier,
      args.workosOrgId,
    );

    return await ctx.db
      .query("studentLogs")
      .withIndex("by_facilitatorId_and_studentId", (q) =>
        q.eq("facilitatorId", actor.user._id).eq("studentId", args.studentId),
      )
      .order("desc")
      .take(clampLimit(args.limit));
  },
});

export const getStudentAssignedCourseView = query({
  args: {
    actorTokenIdentifier: v.string(),
    classroomEnrollmentId: v.id("classroomEnrollments"),
  },
  handler: async (ctx, args) => {
    const access = await requireEnrollmentAccess(
      ctx,
      args.actorTokenIdentifier,
      args.classroomEnrollmentId,
    );
    const course = await requireDoc(ctx, access.classroom.courseId, "Course not found.");
    const topics = await ctx.db
      .query("topics")
      .withIndex("by_courseId_and_order", (q) => q.eq("courseId", course._id))
      .take(256);

    const topicViews = await Promise.all(
      topics.map(async (topic) => {
        const slides = await ctx.db
          .query("slides")
          .withIndex("by_topicId_and_order", (q) => q.eq("topicId", topic._id))
          .take(512);

        const slideViews = await Promise.all(
          slides.map(async (slide) => {
            const progress = await ctx.db
              .query("slideProgress")
              .withIndex("by_classroomEnrollmentId_and_slideId", (q) =>
                q
                  .eq("classroomEnrollmentId", access.enrollment._id)
                  .eq("slideId", slide._id),
              )
              .unique();
            const note = await ctx.db
              .query("notes")
              .withIndex("by_studentId_and_slideId", (q) =>
                q.eq("studentId", access.enrollment.studentId).eq("slideId", slide._id),
              )
              .unique();
            const quizQuestions = await ctx.db
              .query("quizQuestions")
              .withIndex("by_slideId_and_order", (q) => q.eq("slideId", slide._id))
              .take(256);

            const quizStates = await Promise.all(
              quizQuestions.map(async (question) => {
                const latestAttempt = await ctx.db
                  .query("quizAttempts")
                  .withIndex("by_classroomEnrollmentId_and_questionId", (q) =>
                    q
                      .eq("classroomEnrollmentId", access.enrollment._id)
                      .eq("questionId", question._id),
                  )
                  .order("desc")
                  .take(1);

                return {
                  question,
                  latestAttempt: latestAttempt[0] ?? null,
                };
              }),
            );

            return {
              ...slide,
              note,
              progress,
              quizStates,
            };
          }),
        );

        return {
          ...topic,
          slides: slideViews,
        };
      }),
    );

    return {
      classroom: access.classroom,
      enrollment: access.enrollment,
      course,
      topics: topicViews,
    };
  },
});
