import { query } from "./_generated/server.js";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

import {
	requireAuthenticatedFacilitatorManager,
	requireDoc,
} from "./lib/helpers";

async function slideImageView(ctx: QueryCtx, slide: {
	imageStorageId?: Id<"_storage">;
	imageName?: string;
	imageContentType?: string;
	imageSize?: number;
}) {
	const imageUrl = slide.imageStorageId
		? await ctx.storage.getUrl(slide.imageStorageId)
		: null;

	return {
		imageStorageId: slide.imageStorageId ?? null,
		imageUrl,
		imageName: slide.imageName ?? null,
		imageContentType: slide.imageContentType ?? null,
		imageSize: slide.imageSize ?? null,
	};
}

export const getFacilitatorDashboard = query({
	args: {
		organizationId: v.id("organizations"),
	},
	handler: async (ctx, args) => {
		const actor = await requireAuthenticatedFacilitatorManager(ctx, args.organizationId);

		const courses = await ctx.db
			.query("courses")
			.withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", actor.user._id))
			.take(100);

		const classrooms = await ctx.db
			.query("classrooms")
			.withIndex("by_facilitatorId_and_orgId", (q) =>
				q.eq("facilitatorId", actor.user._id).eq("orgId", actor.organization._id),
			)
			.take(100);

		const classroomCountsByCourseId = new Map<string, number>();
		for (const classroom of classrooms) {
			if (classroom.archivedAt) {
				continue;
			}

			classroomCountsByCourseId.set(
				classroom.courseId,
				(classroomCountsByCourseId.get(classroom.courseId) ?? 0) + 1,
			);
		}

		const courseSummaries = await Promise.all(
			courses.map(async (course) => {
				const topics = await ctx.db
					.query("topics")
					.withIndex("by_courseId_and_order", (q) => q.eq("courseId", course._id))
					.take(256);

				let slideCount = 0;
				let questionCount = 0;
				for (const topic of topics) {
					const slides = await ctx.db
						.query("slides")
						.withIndex("by_topicId_and_order", (q) => q.eq("topicId", topic._id))
						.take(512);

					slideCount += slides.length;

					for (const slide of slides) {
						const questions = await ctx.db
							.query("quizQuestions")
							.withIndex("by_slideId_and_order", (q) => q.eq("slideId", slide._id))
							.take(256);
						questionCount += questions.length;
					}
				}

				return {
					courseId: course._id,
					title: course.title,
					description: course.description ?? null,
					status: course.status,
					topicCount: topics.length,
					slideCount,
					questionCount,
					classroomCount: classroomCountsByCourseId.get(course._id) ?? 0,
				};
			}),
		);

		const classroomSummaries = await Promise.all(
			classrooms.map(async (classroom) => {
				const course = await requireDoc(ctx, classroom.courseId, "Course not found.");
				const enrollments = await ctx.db
					.query("classroomEnrollments")
					.withIndex("by_classroomId", (q) => q.eq("classroomId", classroom._id))
					.take(512);

				return {
					classroomId: classroom._id,
					name: classroom.name,
					courseId: course._id,
					courseTitle: course.title,
					activeStudentCount: enrollments.filter(
						(enrollment) => enrollment.status === "active",
					).length,
					archivedAt: classroom.archivedAt ?? null,
				};
			}),
		);

		return {
			facilitator: {
				id: actor.user._id,
				name: actor.user.name,
				email: actor.user.email,
			},
			organization: {
				id: actor.organization._id,
				name: actor.organization.name,
			},
			courses: courseSummaries.sort((left, right) =>
				left.title.localeCompare(right.title),
			),
			classrooms: classroomSummaries.sort((left, right) =>
				left.name.localeCompare(right.name),
			),
		};
	},
});

export const getFacilitatorCourseEditor = query({
	args: {
		organizationId: v.id("organizations"),
		courseId: v.id("courses"),
	},
	handler: async (ctx, args) => {
		const actor = await requireAuthenticatedFacilitatorManager(ctx, args.organizationId);
		const course = await requireDoc(ctx, args.courseId, "Course not found.");

		if (course.ownerUserId !== actor.user._id) {
			throw new Error("You do not have access to this course editor.");
		}

		const topics = await ctx.db
			.query("topics")
			.withIndex("by_courseId_and_order", (q) => q.eq("courseId", course._id))
			.take(256);

		let slideCount = 0;
		let questionCount = 0;
		const topicViews = [];
		for (const topic of topics) {
			const slides = await ctx.db
				.query("slides")
				.withIndex("by_topicId_and_order", (q) => q.eq("topicId", topic._id))
				.take(512);

			slideCount += slides.length;
			const slideViews = [];

			for (const slide of slides) {
				const questions = await ctx.db
					.query("quizQuestions")
					.withIndex("by_slideId_and_order", (q) => q.eq("slideId", slide._id))
					.take(256);

				questionCount += questions.length;
				slideViews.push({
					slideId: slide._id,
					type: slide.type,
					title: slide.title ?? null,
					subtitle: slide.subtitle ?? null,
					body: slide.body ?? null,
					imageDescription: slide.imageDescription ?? null,
					...(await slideImageView(ctx, slide)),
					presenterNotes: slide.presenterNotes ?? null,
					order: slide.order,
					questionCount: questions.length,
					questions: questions
						.sort((left, right) => left.order - right.order)
						.map((question) => ({
							questionId: question._id,
							type: question.type,
							prompt: question.prompt,
							options: question.options ?? null,
							correctOptions: question.correctOptions ?? null,
							acceptedAnswers: question.acceptedAnswers ?? null,
							order: question.order,
						})),
				});
			}

			topicViews.push({
				topicId: topic._id,
				title: topic.title,
				order: topic.order,
				slideCount: slides.length,
				questionCount: slideViews.reduce((count, slide) => count + slide.questionCount, 0),
				slides: slideViews.sort((left, right) => left.order - right.order),
			});
		}

		return {
			organization: {
				id: actor.organization._id,
				name: actor.organization.name,
			},
			course: {
				courseId: course._id,
				title: course.title,
				description: course.description ?? null,
				status: course.status,
				topicCount: topics.length,
				slideCount,
				questionCount,
				topics: topicViews.sort((left, right) => left.order - right.order),
			},
		};
	},
});
