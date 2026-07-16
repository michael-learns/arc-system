import { mutation, query } from "./_generated/server.js";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel.js";
import {
  assert,
  clampLimit,
  getMembership,
  hasRole,
  requireDoc,
  requireFacilitatorManagerById,
  requireUserByTokenIdentifier,
} from "./lib/helpers";

async function requireClassroomManager(
  ctx: any,
  actorTokenIdentifier: string,
  organizationId: Id<"organizations">,
  classroomId: Id<"classrooms">,
) {
  const actor = await requireFacilitatorManagerById(
    ctx,
    actorTokenIdentifier,
    organizationId,
  );
  const classroom = await requireDoc(ctx, classroomId, "Classroom not found.");
  assert(
    classroom.orgId === actor.organization._id,
    "This classroom does not belong to the active organization.",
  );
  assert(
    actor.user.isSuperAdmin ||
      hasRole(actor.membership, "admin") ||
      classroom.facilitatorId === actor.user._id,
    "You do not manage this classroom.",
  );

  return { actor, classroom };
}

export const createClassroom = mutation({
  args: {
    actorTokenIdentifier: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
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
      course.ownerOrgId === actor.organization._id || course.ownerUserId === actor.user._id,
      "The classroom course must belong to the active organization or facilitator.",
    );

    const classroomId = await ctx.db.insert("classrooms", {
      name: args.name.trim(),
      facilitatorId: actor.user._id,
      orgId: actor.organization._id,
      courseId: course._id,
    });

    return await ctx.db.get(classroomId);
  },
});

export const updateClassroom = mutation({
  args: {
    actorTokenIdentifier: v.string(),
    organizationId: v.id("organizations"),
    classroomId: v.id("classrooms"),
    name: v.optional(v.string()),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { classroom } = await requireClassroomManager(
      ctx,
      args.actorTokenIdentifier,
      args.organizationId,
      args.classroomId,
    );

    await ctx.db.replace(classroom._id, {
      name: args.name ? args.name.trim() : classroom.name,
      facilitatorId: classroom.facilitatorId,
      orgId: classroom.orgId,
      courseId: classroom.courseId,
      ...((args.archived === true
        ? Date.now()
        : args.archived === false
          ? undefined
          : classroom.archivedAt)
        ? {
            archivedAt:
              args.archived === true
                ? Date.now()
                : args.archived === false
                  ? undefined
                  : classroom.archivedAt,
          }
        : {}),
    });

    return await ctx.db.get(classroom._id);
  },
});

export const listFacilitatorClassrooms = query({
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

    const classrooms = await ctx.db
      .query("classrooms")
      .withIndex("by_facilitatorId_and_orgId", (q) =>
        q.eq("facilitatorId", actor.user._id).eq("orgId", actor.organization._id),
      )
      .take(clampLimit(args.limit));

    return await Promise.all(
      classrooms.map(async (classroom) => ({
        ...classroom,
        course: await ctx.db.get(classroom.courseId),
      })),
    );
  },
});

export const enrollStudent = mutation({
  args: {
    actorTokenIdentifier: v.string(),
    organizationId: v.id("organizations"),
    classroomId: v.id("classrooms"),
    studentTokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const { actor, classroom } = await requireClassroomManager(
      ctx,
      args.actorTokenIdentifier,
      args.organizationId,
      args.classroomId,
    );
    const student = await requireUserByTokenIdentifier(ctx, args.studentTokenIdentifier);
    const existingMembership = await getMembership(
      ctx,
      student._id,
      actor.organization._id,
    );

    if (actor.organization.enrollmentPolicy === "org_controlled") {
      assert(existingMembership, "Student must already be a member of the organization.");
      assert(
        existingMembership.roles.includes("student"),
        "Student must have the student role before org-controlled enrollment.",
      );
    } else if (!existingMembership) {
      await ctx.db.insert("memberships", {
        userId: student._id,
        orgId: actor.organization._id,
        roles: ["student"],
      });
    } else if (!existingMembership.roles.includes("student")) {
      await ctx.db.patch(existingMembership._id, {
        roles: [...new Set([...existingMembership.roles, "student"])].sort() as typeof existingMembership.roles,
      });
    }

    const existingEnrollment = await ctx.db
      .query("classroomEnrollments")
      .withIndex("by_classroomId_and_studentId", (q) =>
        q.eq("classroomId", classroom._id).eq("studentId", student._id),
      )
      .unique();

    if (existingEnrollment) {
      await ctx.db.patch(existingEnrollment._id, {
        status: "active",
        enrolledAt: Date.now(),
        enrolledBy: actor.user._id,
      });
      return await ctx.db.get(existingEnrollment._id);
    }

    const enrollmentId = await ctx.db.insert("classroomEnrollments", {
      classroomId: classroom._id,
      studentId: student._id,
      enrolledAt: Date.now(),
      enrolledBy: actor.user._id,
      status: "active",
    });

    return await ctx.db.get(enrollmentId);
  },
});

export const listClassroomRoster = query({
  args: {
    actorTokenIdentifier: v.string(),
    organizationId: v.id("organizations"),
    classroomId: v.id("classrooms"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { classroom } = await requireClassroomManager(
      ctx,
      args.actorTokenIdentifier,
      args.organizationId,
      args.classroomId,
    );

    const topics = await ctx.db
      .query("topics")
      .withIndex("by_courseId_and_order", (q) => q.eq("courseId", classroom.courseId))
      .take(256);
    const slideCounts = await Promise.all(
      topics.map((topic) =>
        ctx.db
          .query("slides")
          .withIndex("by_topicId_and_order", (q) => q.eq("topicId", topic._id))
          .take(512),
      ),
    );
    const totalSlides = slideCounts.reduce((count, slides) => count + slides.length, 0);

    const enrollments = await ctx.db
      .query("classroomEnrollments")
      .withIndex("by_classroomId", (q) => q.eq("classroomId", classroom._id))
      .take(clampLimit(args.limit));

    return await Promise.all(
      enrollments
        .filter((enrollment) => enrollment.status === "active")
        .map(async (enrollment) => {
          const user = await ctx.db.get(enrollment.studentId);
          const completedSlides = await ctx.db
            .query("slideProgress")
            .withIndex("by_classroomEnrollmentId", (q) =>
              q.eq("classroomEnrollmentId", enrollment._id),
            )
            .take(512);

          return {
            enrollment,
            student: user,
            progress: {
              completedSlides: completedSlides.length,
              totalSlides,
            },
          };
        }),
    );
  },
});
