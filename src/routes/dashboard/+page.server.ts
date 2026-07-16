import { fail, redirect } from '@sveltejs/kit';
import type { User } from '@workos-inc/node';
import {
	getActiveOrganizationId,
	setActiveOrganizationId
} from '$lib/server/app-session';
import {
	createClassroomWorkspace,
	createFacilitatorCourseWorkspace,
	getFacilitatorDashboardView
} from '$lib/server/convex';
import {
	type OrganizationOption,
	createOrganizationOption,
	listOrganizationOptions
} from '$lib/server/organization-session';

async function getActiveOrganizationOption(
	user: User,
	activeOrganizationId: string | null
): Promise<OrganizationOption | null> {
	if (!activeOrganizationId) {
		return null;
	}

	const organizationOptions = await listOrganizationOptions(user, activeOrganizationId);
	return (
		organizationOptions.find((option) => option.organizationId === activeOrganizationId) ?? null
	);
}

function hasFacilitatorAccess(roles: string[], isSuperAdmin: boolean) {
	return isSuperAdmin || roles.includes('admin') || roles.includes('facilitator');
}

export const actions = {
	selectOrganization: async ({ cookies, locals, request }) => {
		if (!locals.user) {
			throw redirect(302, '/login');
		}

		const formData = await request.formData();
		const organizationId = formData.get('organizationId');

		if (typeof organizationId !== 'string' || !organizationId) {
			return fail(400, {
				selectionError: 'Choose an organization to continue.'
			});
		}

		const organizationOptions = await listOrganizationOptions(
			locals.user,
			getActiveOrganizationId(cookies)
		);
		const selectedOrganization = organizationOptions.find(
			(option) => option.organizationId === organizationId
		);

		if (!selectedOrganization) {
			return fail(403, {
				selectionError: 'That organization is not available for this account.'
			});
		}

		setActiveOrganizationId(cookies, organizationId);

		throw redirect(303, '/dashboard');
	},
	createOrganization: async ({ cookies, locals, request }) => {
		if (!locals.user) {
			throw redirect(302, '/login');
		}

		const formData = await request.formData();
		const name = formData.get('name');

		if (typeof name !== 'string' || !name.trim()) {
			return fail(400, {
				creationError: 'Give your organization a name first.'
			});
		}

		try {
			const created = await createOrganizationOption({
				user: locals.user,
				name: name.trim()
			});

			if (!created.organization?._id) {
				return fail(500, {
					creationError: 'We could not create that organization right now.'
				});
			}

			setActiveOrganizationId(cookies, created.organization._id);
		} catch (error) {
			console.error('Convex organization creation failed', error);
			return fail(500, {
				creationError: 'We could not create that organization right now.'
			});
		}

		throw redirect(303, '/dashboard');
	},
	createCourse: async ({ cookies, locals, request }) => {
		if (!locals.user) {
			throw redirect(302, '/login');
		}

		const formData = await request.formData();
		const title = formData.get('title');
		const description = formData.get('description');
		const activeOrganization = await getActiveOrganizationOption(
			locals.user,
			getActiveOrganizationId(cookies)
		);

		if (!activeOrganization) {
			return fail(400, {
				courseCreationError: 'Pick an organization before creating a course.',
				courseValues: {
					title: typeof title === 'string' ? title : '',
					description: typeof description === 'string' ? description : ''
				}
			});
		}

		if (
			!hasFacilitatorAccess(
				activeOrganization.roles,
				Boolean(locals.convexContext?.user?.isSuperAdmin)
			)
		) {
			return fail(403, {
				courseCreationError:
					'Only organization admins and facilitators can create courses here.',
				courseValues: {
					title: typeof title === 'string' ? title : '',
					description: typeof description === 'string' ? description : ''
				}
			});
		}

		if (typeof title !== 'string' || !title.trim()) {
			return fail(400, {
				courseCreationError: 'Give the course a title first.',
				courseValues: {
					title: typeof title === 'string' ? title : '',
					description: typeof description === 'string' ? description : ''
				}
			});
		}

		let createdCourseId: string | null = null;

		try {
			const course = await createFacilitatorCourseWorkspace({
				user: locals.user,
				organizationId: activeOrganization.organizationId,
				title: title.trim(),
				...(typeof description === 'string' && description.trim()
					? { description: description.trim() }
					: {})
			});
			createdCourseId = course?._id ?? null;
		} catch (error) {
			console.error('Convex course creation failed', error);
			return fail(500, {
				courseCreationError: 'We could not create that course right now.',
				courseValues: {
					title: typeof title === 'string' ? title : '',
					description: typeof description === 'string' ? description : ''
				}
			});
		}

		if (createdCourseId) {
			throw redirect(303, `/dashboard/courses/${createdCourseId}`);
		}

		throw redirect(303, '/dashboard');
	},
	createClassroom: async ({ cookies, locals, request }) => {
		if (!locals.user) {
			throw redirect(302, '/login');
		}

		const formData = await request.formData();
		const name = formData.get('name');
		const courseId = formData.get('courseId');
		const activeOrganization = await getActiveOrganizationOption(
			locals.user,
			getActiveOrganizationId(cookies)
		);

		if (!activeOrganization) {
			return fail(400, {
				classroomCreationError: 'Pick an organization before creating a classroom.',
				classroomValues: {
					name: typeof name === 'string' ? name : '',
					courseId: typeof courseId === 'string' ? courseId : ''
				}
			});
		}

		if (
			!hasFacilitatorAccess(
				activeOrganization.roles,
				Boolean(locals.convexContext?.user?.isSuperAdmin)
			)
		) {
			return fail(403, {
				classroomCreationError:
					'Only organization admins and facilitators can create classrooms here.',
				classroomValues: {
					name: typeof name === 'string' ? name : '',
					courseId: typeof courseId === 'string' ? courseId : ''
				}
			});
		}

		if (typeof name !== 'string' || !name.trim()) {
			return fail(400, {
				classroomCreationError: 'Give the classroom a name first.',
				classroomValues: {
					name: typeof name === 'string' ? name : '',
					courseId: typeof courseId === 'string' ? courseId : ''
				}
			});
		}

		if (typeof courseId !== 'string' || !courseId) {
			return fail(400, {
				classroomCreationError: 'Choose a course for the classroom first.',
				classroomValues: {
					name: typeof name === 'string' ? name : '',
					courseId: typeof courseId === 'string' ? courseId : ''
				}
			});
		}

		try {
			await createClassroomWorkspace({
				user: locals.user,
				organizationId: activeOrganization.organizationId,
				name: name.trim(),
				courseId
			});
		} catch (error) {
			console.error('Convex classroom creation failed', error);
			return fail(500, {
				classroomCreationError: 'We could not create that classroom right now.',
				classroomValues: {
					name: typeof name === 'string' ? name : '',
					courseId: typeof courseId === 'string' ? courseId : ''
				}
			});
		}

		throw redirect(303, '/dashboard');
	}
};

export const load = async ({ cookies, locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const organizationOptions = await listOrganizationOptions(
		locals.user,
		getActiveOrganizationId(cookies)
	);
	const selectedOrganizationId = organizationOptions.some(
		(option) => option.organizationId === locals.session?.organizationId
	)
		? locals.session?.organizationId ?? null
		: null;
	const selectedOrganizationOption =
		organizationOptions.find((option) => option.organizationId === selectedOrganizationId) ?? null;
	const roles =
		selectedOrganizationId === locals.convexContext?.organization?._id
			? locals.convexContext?.membership?.roles ?? []
			: selectedOrganizationOption?.roles ?? [];
	const hasFacilitatorAccess =
		Boolean(locals.convexContext?.user?.isSuperAdmin) ||
		roles.includes('admin') ||
		roles.includes('facilitator');

	const dashboard =
		hasFacilitatorAccess && selectedOrganizationId
			? await getFacilitatorDashboardView({
					user: locals.user,
					organizationId: selectedOrganizationId
				})
			: null;

	return {
		user: locals.user,
		session: locals.session
			? {
					...locals.session,
					organizationId: selectedOrganizationId
				}
			: null,
		convexContext: locals.convexContext,
		hasFacilitatorAccess,
		organizationOptions,
		dashboard
	};
};
