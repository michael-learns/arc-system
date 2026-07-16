import { PUBLIC_CONVEX_URL } from "$env/static/public";
import { ConvexHttpClient } from "convex/browser";
import type { User } from "@workos-inc/node";
import { api } from "../../convex/_generated/api.js";
import type { Id } from "../../convex/_generated/dataModel.js";

let convexClient: ConvexHttpClient | null = null;

function getConvexClient() {
  if (!convexClient) {
    convexClient = new ConvexHttpClient(PUBLIC_CONVEX_URL);
  }

  return convexClient;
}

function toOrganizationId(organizationId: string): Id<"organizations"> {
  return organizationId as Id<"organizations">;
}

function toCourseId(courseId: string): Id<"courses"> {
  return courseId as Id<"courses">;
}

function toTopicId(topicId: string): Id<"topics"> {
  return topicId as Id<"topics">;
}

function toSlideId(slideId: string): Id<"slides"> {
  return slideId as Id<"slides">;
}

function toStorageId(storageId: string): Id<"_storage"> {
  return storageId as Id<"_storage">;
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

export async function bootstrapConvexSession(input: {
  user: User;
  organizationId: string | null;
}) {
  const client = getConvexClient();

  return await client.mutation(api.auth.bootstrapSession, {
    identity: getServerIdentity(input.user),
  });
}

export async function getCurrentConvexContext(input: {
  user: User;
  organizationId: string | null;
}) {
  const client = getConvexClient();
  return await client.query(api.auth.getCurrentOrganizationContext, {
    tokenIdentifier: getServerTokenIdentifier(input.user),
    ...(input.organizationId
      ? { organizationId: toOrganizationId(input.organizationId) }
      : {}),
  });
}

export async function listUserOrganizations(input: {
  user: User;
  activeOrganizationId: string | null;
}) {
  const client = getConvexClient();
  return await client.query(api.auth.listUserOrganizations, {
    actorTokenIdentifier: getServerTokenIdentifier(input.user),
    activeOrganizationId: input.activeOrganizationId
      ? toOrganizationId(input.activeOrganizationId)
      : null,
  });
}

export async function createOrganizationWorkspace(input: {
  user: User;
  name: string;
}) {
  const client = getConvexClient();
  return await client.mutation(api.auth.createOrganization, {
    actorTokenIdentifier: getServerTokenIdentifier(input.user),
    name: input.name,
  });
}

export async function createFacilitatorCourseWorkspace(input: {
  user: User;
  organizationId: string;
  title: string;
  description?: string;
}) {
  const client = getConvexClient();
  return await client.mutation(api.courses.createFacilitatorCourse, {
    actorTokenIdentifier: getServerTokenIdentifier(input.user),
    organizationId: toOrganizationId(input.organizationId),
    title: input.title,
    ...(input.description ? { description: input.description } : {}),
  });
}

export async function createClassroomWorkspace(input: {
  user: User;
  organizationId: string;
  name: string;
  courseId: string;
}) {
  const client = getConvexClient();
  return await client.mutation(api.classrooms.createClassroom, {
    actorTokenIdentifier: getServerTokenIdentifier(input.user),
    organizationId: toOrganizationId(input.organizationId),
    name: input.name,
    courseId: toCourseId(input.courseId),
  });
}

export async function createCourseSectionWorkspace(input: {
  user: User;
  organizationId: string;
  courseId: string;
  title: string;
}) {
  const client = getConvexClient();
  return await client.mutation(api.courses.createTopic, {
    actorTokenIdentifier: getServerTokenIdentifier(input.user),
    organizationId: toOrganizationId(input.organizationId),
    courseId: toCourseId(input.courseId),
    title: input.title,
  });
}

export async function createCourseSlideWorkspace(input: {
  user: User;
  organizationId: string;
  topicId: string;
  type: "content" | "quiz";
  title?: string;
  subtitle?: string;
  body?: string;
  imageDescription?: string;
  presenterNotes?: string;
}) {
  const client = getConvexClient();
  return await client.mutation(api.courses.createSlide, {
    actorTokenIdentifier: getServerTokenIdentifier(input.user),
    organizationId: toOrganizationId(input.organizationId),
    topicId: toTopicId(input.topicId),
    type: input.type,
    ...(input.title ? { title: input.title } : {}),
    ...(input.subtitle ? { subtitle: input.subtitle } : {}),
    ...(input.body ? { body: input.body } : {}),
    ...(input.imageDescription ? { imageDescription: input.imageDescription } : {}),
    ...(input.presenterNotes ? { presenterNotes: input.presenterNotes } : {}),
  });
}

export async function updateCourseSlideWorkspace(input: {
  user: User;
  organizationId: string;
  slideId: string;
  type: "content" | "quiz";
  title?: string;
  subtitle?: string;
  body?: string;
  imageDescription?: string;
  presenterNotes?: string;
}) {
  const client = getConvexClient();
  return await client.mutation(api.courses.updateSlide, {
    actorTokenIdentifier: getServerTokenIdentifier(input.user),
    organizationId: toOrganizationId(input.organizationId),
    slideId: toSlideId(input.slideId),
    type: input.type,
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
    ...(input.body !== undefined ? { body: input.body } : {}),
    ...(input.imageDescription !== undefined
      ? { imageDescription: input.imageDescription }
      : {}),
    ...(input.presenterNotes !== undefined ? { presenterNotes: input.presenterNotes } : {}),
  });
}

export async function generateCourseSlideImageUploadUrlWorkspace(input: {
  user: User;
  organizationId: string;
  slideId: string;
}) {
  const client = getConvexClient();
  return await client.mutation(api.courses.generateSlideImageUploadUrl, {
    actorTokenIdentifier: getServerTokenIdentifier(input.user),
    organizationId: toOrganizationId(input.organizationId),
    slideId: toSlideId(input.slideId),
  });
}

export async function attachCourseSlideImageWorkspace(input: {
  user: User;
  organizationId: string;
  slideId: string;
  storageId: string;
  fileName: string;
}) {
  const client = getConvexClient();
  return await client.mutation(api.courses.attachSlideImage, {
    actorTokenIdentifier: getServerTokenIdentifier(input.user),
    organizationId: toOrganizationId(input.organizationId),
    slideId: toSlideId(input.slideId),
    storageId: toStorageId(input.storageId),
    fileName: input.fileName,
  });
}

export async function deleteCourseSlideWorkspace(input: {
  user: User;
  organizationId: string;
  slideId: string;
}) {
  const client = getConvexClient();
  return await client.mutation(api.courses.deleteSlide, {
    actorTokenIdentifier: getServerTokenIdentifier(input.user),
    organizationId: toOrganizationId(input.organizationId),
    slideId: toSlideId(input.slideId),
  });
}

export async function getFacilitatorDashboardView(input: {
  user: User;
  organizationId: string;
}) {
  const client = getConvexClient();
  return await client.query(api.dashboard.getFacilitatorDashboard, {
    actorTokenIdentifier: getServerTokenIdentifier(input.user),
    organizationId: toOrganizationId(input.organizationId),
  });
}

export async function getFacilitatorCourseEditorView(input: {
  user: User;
  organizationId: string;
  courseId: string;
}) {
  const client = getConvexClient();
  return await client.query(api.dashboard.getFacilitatorCourseEditor, {
    actorTokenIdentifier: getServerTokenIdentifier(input.user),
    organizationId: toOrganizationId(input.organizationId),
    courseId: toCourseId(input.courseId),
  });
}
