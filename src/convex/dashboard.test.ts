/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const facilitatorIdentity = {
	tokenIdentifier: "workos:facilitator-1",
	name: "Ada Facilitator",
	email: "ada@example.com",
};

const studentIdentity = {
	tokenIdentifier: "workos:student-1",
	name: "Theo Student",
	email: "theo@example.com",
};

async function seedFacilitatorWorkspace() {
	const t = convexTest({
		schema,
		modules,
	});

	await t.mutation(api.auth.bootstrapSession, {
		identity: facilitatorIdentity
	});

	const facilitator = await t.query(api.auth.getCurrentOrganizationContext, {
		tokenIdentifier: facilitatorIdentity.tokenIdentifier
	});
	const created = await t.mutation(api.auth.createOrganization, {
		actorTokenIdentifier: facilitatorIdentity.tokenIdentifier,
		name: "Grace Seminary"
	});
	const organization = created.organization;

	await t.mutation(api.auth.setMembershipRoles, {
		actorTokenIdentifier: facilitatorIdentity.tokenIdentifier,
		organizationId: organization!._id,
		memberUserId: facilitator?.user?._id ?? created.membership!.userId,
		roles: ["admin", "facilitator"],
	});

	const course = await t.mutation(api.courses.createFacilitatorCourse, {
		actorTokenIdentifier: facilitatorIdentity.tokenIdentifier,
		organizationId: organization!._id,
		title: "Theology 101",
		description: "Doctrine of God",
	});

	const topic = await t.mutation(api.courses.createTopic, {
		actorTokenIdentifier: facilitatorIdentity.tokenIdentifier,
		organizationId: organization!._id,
		courseId: course!._id,
		title: "Divine Attributes",
	});

	await t.mutation(api.courses.createSlide, {
		actorTokenIdentifier: facilitatorIdentity.tokenIdentifier,
		organizationId: organization!._id,
		topicId: topic!._id,
		type: "content",
		body: "God is self-existent.",
	});

	const quizSlide = await t.mutation(api.courses.createSlide, {
		actorTokenIdentifier: facilitatorIdentity.tokenIdentifier,
		organizationId: organization!._id,
		topicId: topic!._id,
		type: "quiz",
	});

	await t.mutation(api.courses.createQuizQuestion, {
		actorTokenIdentifier: facilitatorIdentity.tokenIdentifier,
		organizationId: organization!._id,
		slideId: quizSlide!._id,
		type: "multiple_choice",
		prompt: "Which attribute names God's self-existence?",
		options: ["Omnipotence", "Aseity"],
		correctOptions: [1],
	});

	const classroom = await t.mutation(api.classrooms.createClassroom, {
		actorTokenIdentifier: facilitatorIdentity.tokenIdentifier,
		organizationId: organization!._id,
		name: "Monday Cohort",
		courseId: course!._id,
	});

	await t.mutation(api.auth.bootstrapSession, {
		identity: studentIdentity
	});
	const student = await t.query(api.auth.getCurrentOrganizationContext, {
		tokenIdentifier: studentIdentity.tokenIdentifier
	});

	await t.mutation(api.auth.setMembershipRoles, {
		actorTokenIdentifier: facilitatorIdentity.tokenIdentifier,
		organizationId: organization!._id,
		memberUserId: student.user!._id,
		roles: ["student"],
	});

	await t.mutation(api.classrooms.enrollStudent, {
		actorTokenIdentifier: facilitatorIdentity.tokenIdentifier,
		organizationId: organization!._id,
		classroomId: classroom!._id,
		studentTokenIdentifier: studentIdentity.tokenIdentifier,
	});

	return { t, organization, course, topic, quizSlide };
}

describe("facilitator dashboard", () => {
	test("facilitator can view course and classroom summaries", async () => {
		const { t, organization } = await seedFacilitatorWorkspace();

		const dashboard = await t.query(api.dashboard.getFacilitatorDashboard, {
			actorTokenIdentifier: facilitatorIdentity.tokenIdentifier,
			organizationId: organization!._id,
		});

		expect(dashboard).toMatchObject({
			facilitator: {
				name: "Ada Facilitator",
			},
			organization: {
				name: "Grace Seminary",
			},
			courses: [
				{
					title: "Theology 101",
					topicCount: 1,
					slideCount: 2,
					questionCount: 1,
					classroomCount: 1,
				},
			],
			classrooms: [
				{
					name: "Monday Cohort",
					courseTitle: "Theology 101",
					activeStudentCount: 1,
				},
			],
		});
	});

	test("facilitator can update and delete slides", async () => {
		const { t, organization, course, topic, quizSlide } = await seedFacilitatorWorkspace();

		const updated = await t.mutation(api.courses.updateSlide, {
			actorTokenIdentifier: facilitatorIdentity.tokenIdentifier,
			organizationId: organization!._id,
			slideId: quizSlide!._id,
			type: "content",
			title: "Aseity",
			subtitle: "Divine Attributes",
			body: "Updated teaching slide",
			imageDescription: "A simple diagram showing source and dependence",
			presenterNotes: "Pause for student reflection before moving on.",
		});

		expect(updated).toMatchObject({
			type: "content",
			title: "Aseity",
			subtitle: "Divine Attributes",
			body: "Updated teaching slide",
			imageDescription: "A simple diagram showing source and dependence",
			presenterNotes: "Pause for student reflection before moving on.",
		});

		const editor = await t.query(api.dashboard.getFacilitatorCourseEditor, {
			actorTokenIdentifier: facilitatorIdentity.tokenIdentifier,
			organizationId: organization!._id,
			courseId: course!._id,
		});

		expect(editor.course.topics[0].slides[1]).toMatchObject({
			title: "Aseity",
			subtitle: "Divine Attributes",
			body: "Updated teaching slide",
			imageDescription: "A simple diagram showing source and dependence",
			presenterNotes: "Pause for student reflection before moving on.",
		});

		await t.mutation(api.courses.deleteSlide, {
			actorTokenIdentifier: facilitatorIdentity.tokenIdentifier,
			organizationId: organization!._id,
			slideId: updated!._id,
		});

		const dashboard = await t.query(api.dashboard.getFacilitatorDashboard, {
			actorTokenIdentifier: facilitatorIdentity.tokenIdentifier,
			organizationId: organization!._id,
		});

		expect(dashboard.courses[0]).toMatchObject({
			topicCount: 1,
			slideCount: 1,
			questionCount: 0,
		});

		const remainingSlides = await t.mutation(api.courses.reorderSlides, {
			actorTokenIdentifier: facilitatorIdentity.tokenIdentifier,
			organizationId: organization!._id,
			topicId: topic!._id,
			slideIds: dashboard.courses[0].topics[0].slides.map((slide) => slide.slideId),
		});

		expect(remainingSlides).toHaveLength(1);
		expect(remainingSlides[0]).toMatchObject({
			order: 0,
		});
	});
});
