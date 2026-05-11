import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Keyed by WorkOS JWT tokenIdentifier. WorkOS owns user creation;
  // this table stores app-specific profile data and the Super Admin flag.
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    isSuperAdmin: v.boolean(),
  }).index("by_tokenIdentifier", ["tokenIdentifier"]),

  // Keyed by WorkOS org ID. WorkOS owns org creation and membership;
  // this table stores app-specific settings only.
  organizations: defineTable({
    workosOrgId: v.string(),
    name: v.string(),
    enrollmentPolicy: v.union(
      v.literal("org_controlled"),
      v.literal("facilitator_open")
    ),
  }).index("by_workosOrgId", ["workosOrgId"]),

  // Domain roles per user+org pair. WorkOS is the source of truth for
  // who belongs to which org; this table only stores the role layer.
  memberships: defineTable({
    userId: v.id("users"),
    orgId: v.id("organizations"),
    roles: v.array(
      v.union(
        v.literal("admin"),
        v.literal("facilitator"),
        v.literal("student")
      )
    ),
  })
    .index("by_userId", ["userId"])
    .index("by_orgId", ["orgId"])
    .index("by_userId_and_orgId", ["userId", "orgId"]),

  // Owned by an org (ownerOrgId) or a facilitator (ownerUserId) — exactly one is set.
  // forkOf + forkedAt track fork lineage for merge/replace operations.
  courses: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    ownerOrgId: v.optional(v.id("organizations")),
    ownerUserId: v.optional(v.id("users")),
    forkOf: v.optional(v.id("courses")),
    forkedAt: v.optional(v.number()),
    status: v.union(v.literal("draft"), v.literal("published")),
  })
    .index("by_ownerOrgId", ["ownerOrgId"])
    .index("by_ownerUserId", ["ownerUserId"])
    .index("by_forkOf", ["forkOf"]),

  // A facilitator submits one of their courses to an org for adoption.
  // On acceptance the org receives an independent copy (adoptedCourseId).
  contributions: defineTable({
    courseId: v.id("courses"),
    orgId: v.id("organizations"),
    facilitatorId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected")
    ),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    adoptedCourseId: v.optional(v.id("courses")),
  })
    .index("by_orgId_and_status", ["orgId", "status"])
    .index("by_facilitatorId", ["facilitatorId"])
    .index("by_courseId", ["courseId"]),

  // Ordered sections within a course.
  // updatedAt drives fork merge detection: if originTopic.updatedAt > forkedTopic.forkedAt,
  // the topic has diverged from its fork and a merge/replace is available.
  topics: defineTable({
    courseId: v.id("courses"),
    title: v.string(),
    order: v.number(),
    updatedAt: v.number(),
    forkOf: v.optional(v.id("topics")),
    forkedAt: v.optional(v.number()),
  })
    .index("by_courseId", ["courseId"])
    .index("by_courseId_and_order", ["courseId", "order"]),

  // Ordered items within a topic. Content slides store rich text JSON in body.
  // Quiz slides leave body empty; their questions live in quizQuestions.
  slides: defineTable({
    topicId: v.id("topics"),
    type: v.union(v.literal("content"), v.literal("quiz")),
    order: v.number(),
    body: v.optional(v.string()),
    updatedAt: v.number(),
    forkOf: v.optional(v.id("slides")),
  })
    .index("by_topicId", ["topicId"])
    .index("by_topicId_and_order", ["topicId", "order"]),

  // Questions within a quiz slide. All types are auto-scored.
  // options/correctOptions: used by multiple_choice, multi_select, true_false.
  // acceptedAnswers: used by fill_in_the_blank (case-insensitive matching).
  quizQuestions: defineTable({
    slideId: v.id("slides"),
    order: v.number(),
    type: v.union(
      v.literal("multiple_choice"),
      v.literal("multi_select"),
      v.literal("true_false"),
      v.literal("fill_in_the_blank")
    ),
    prompt: v.string(),
    options: v.optional(v.array(v.string())),
    correctOptions: v.optional(v.array(v.number())),
    acceptedAnswers: v.optional(v.array(v.string())),
  })
    .index("by_slideId", ["slideId"])
    .index("by_slideId_and_order", ["slideId", "order"]),

  // A facilitator's named cohort of students, scoped to one org and one course.
  classrooms: defineTable({
    name: v.string(),
    facilitatorId: v.id("users"),
    orgId: v.id("organizations"),
    courseId: v.id("courses"),
    archivedAt: v.optional(v.number()),
  })
    .index("by_facilitatorId", ["facilitatorId"])
    .index("by_orgId", ["orgId"])
    .index("by_courseId", ["courseId"])
    .index("by_facilitatorId_and_orgId", ["facilitatorId", "orgId"]),

  // Main enrollment record for student participation in a classroom.
  classroomEnrollments: defineTable({
    classroomId: v.id("classrooms"),
    studentId: v.id("users"),
    enrolledAt: v.number(),
    enrolledBy: v.optional(v.id("users")),
    status: v.union(v.literal("active"), v.literal("removed")),
  })
    .index("by_classroomId", ["classroomId"])
    .index("by_studentId", ["studentId"])
    .index("by_classroomId_and_studentId", ["classroomId", "studentId"])
    .index("by_studentId_and_classroomId", ["studentId", "classroomId"]),

  // One record per classroomEnrollment+slide. Progress is classroom-scoped.
  slideProgress: defineTable({
    classroomEnrollmentId: v.id("classroomEnrollments"),
    slideId: v.id("slides"),
    completedAt: v.number(),
  })
    .index("by_classroomEnrollmentId", ["classroomEnrollmentId"])
    .index("by_slideId", ["slideId"])
    .index("by_classroomEnrollmentId_and_slideId", [
      "classroomEnrollmentId",
      "slideId",
    ]),

  // Unlimited attempts per classroomEnrollment+question. Latest by _creationTime
  // is the active score.
  // slideId is denormalized for efficient per-slide score aggregation.
  quizAttempts: defineTable({
    classroomEnrollmentId: v.id("classroomEnrollments"),
    questionId: v.id("quizQuestions"),
    slideId: v.id("slides"),
    selectedOptions: v.optional(v.array(v.number())),
    textAnswer: v.optional(v.string()),
    isCorrect: v.boolean(),
  })
    .index("by_classroomEnrollmentId_and_questionId", [
      "classroomEnrollmentId",
      "questionId",
    ])
    .index("by_classroomEnrollmentId_and_slideId", [
      "classroomEnrollmentId",
      "slideId",
    ])
    .index("by_questionId", ["questionId"]),

  // One editable note per student+slide. Upserted on save; not a log.
  notes: defineTable({
    studentId: v.id("users"),
    slideId: v.id("slides"),
    body: v.string(),
    updatedAt: v.number(),
  })
    .index("by_studentId", ["studentId"])
    .index("by_studentId_and_slideId", ["studentId", "slideId"]),

  // Timestamped qualitative log entries written by a facilitator about a student.
  // Private to the facilitator — not visible to the student.
  studentLogs: defineTable({
    facilitatorId: v.id("users"),
    studentId: v.id("users"),
    body: v.string(),
    createdAt: v.number(),
  })
    .index("by_facilitatorId_and_studentId", ["facilitatorId", "studentId"])
    .index("by_studentId", ["studentId"]),
});
