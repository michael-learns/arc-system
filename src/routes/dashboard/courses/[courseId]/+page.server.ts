import { fail, redirect } from '@sveltejs/kit';
import type { User } from '@workos-inc/node';
import { getActiveOrganizationId } from '$lib/server/app-session';
import {
	attachCourseSlideImageWorkspace,
	createCourseSectionWorkspace,
	createCourseSlideWorkspace,
	deleteCourseSlideWorkspace,
	generateCourseSlideImageUploadUrlWorkspace,
	getFacilitatorCourseEditorView,
	updateCourseSlideWorkspace
} from '$lib/server/convex';
import {
	type OrganizationOption,
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

const MAX_SLIDE_IMAGE_BYTES = 5 * 1024 * 1024;

function toEditorSlide(slide: {
	_id: string;
	type: 'content' | 'quiz';
	title?: string;
	subtitle?: string;
	body?: string;
	imageDescription?: string;
	imageStorageId?: string;
	imageUrl?: string | null;
	imageName?: string;
	imageContentType?: string;
	imageSize?: number;
	presenterNotes?: string;
	order: number;
}, questionCount = 0) {
	return {
		slideId: slide._id,
		type: slide.type,
		title: slide.title ?? null,
		subtitle: slide.subtitle ?? null,
		body: slide.body ?? null,
		imageDescription: slide.imageDescription ?? null,
		imageStorageId: slide.imageStorageId ?? null,
		imageUrl: slide.imageUrl ?? null,
		imageName: slide.imageName ?? null,
		imageContentType: slide.imageContentType ?? null,
		imageSize: slide.imageSize ?? null,
		presenterNotes: slide.presenterNotes ?? null,
		order: slide.order,
		questionCount
	};
}

export const actions = {
	createSection: async ({ cookies, locals, params, request }) => {
		if (!locals.user) {
			throw redirect(302, '/login');
		}

		const formData = await request.formData();
		const title = formData.get('title');
		const activeOrganization = await getActiveOrganizationOption(
			locals.user,
			getActiveOrganizationId(cookies)
		);

		if (!activeOrganization) {
			return fail(400, {
				sectionCreationError: 'Pick an organization before adding a section.',
				sectionValues: {
					title: typeof title === 'string' ? title : ''
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
				sectionCreationError: 'Only organization admins and facilitators can add sections.',
				sectionValues: {
					title: typeof title === 'string' ? title : ''
				}
			});
		}

		if (typeof title !== 'string' || !title.trim()) {
			return fail(400, {
				sectionCreationError: 'Give the section a title first.',
				sectionValues: {
					title: typeof title === 'string' ? title : ''
				}
			});
		}

		try {
			await createCourseSectionWorkspace({
				user: locals.user,
				organizationId: activeOrganization.organizationId,
				courseId: params.courseId,
				title: title.trim()
			});
		} catch (error) {
			console.error('Convex section creation failed', error);
			return fail(500, {
				sectionCreationError: 'We could not add that section right now.',
				sectionValues: {
					title
				}
			});
		}

		throw redirect(303, `/dashboard/courses/${params.courseId}`);
	},
	createSlide: async ({ cookies, locals, params, request }) => {
		if (!locals.user) {
			throw redirect(302, '/login');
		}

		const formData = await request.formData();
		const topicId = formData.get('topicId');
		const type = formData.get('type');
		const title = formData.get('title');
		const subtitle = formData.get('subtitle');
		const body = formData.get('body');
		const imageDescription = formData.get('imageDescription');
		const presenterNotes = formData.get('presenterNotes');
		const activeOrganization = await getActiveOrganizationOption(
			locals.user,
			getActiveOrganizationId(cookies)
		);

		if (!activeOrganization) {
			return fail(400, {
				slideCreationError: 'Pick an organization before adding a slide.',
				slideValues: {
					topicId: typeof topicId === 'string' ? topicId : '',
					type: typeof type === 'string' ? type : 'content',
					title: typeof title === 'string' ? title : '',
					subtitle: typeof subtitle === 'string' ? subtitle : '',
					body: typeof body === 'string' ? body : '',
					imageDescription: typeof imageDescription === 'string' ? imageDescription : '',
					presenterNotes: typeof presenterNotes === 'string' ? presenterNotes : ''
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
				slideCreationError: 'Only organization admins and facilitators can add slides.',
				slideValues: {
					topicId: typeof topicId === 'string' ? topicId : '',
					type: typeof type === 'string' ? type : 'content',
					title: typeof title === 'string' ? title : '',
					subtitle: typeof subtitle === 'string' ? subtitle : '',
					body: typeof body === 'string' ? body : '',
					imageDescription: typeof imageDescription === 'string' ? imageDescription : '',
					presenterNotes: typeof presenterNotes === 'string' ? presenterNotes : ''
				}
			});
		}

		if (typeof topicId !== 'string' || !topicId) {
			return fail(400, {
				slideCreationError: 'Choose a section before adding a slide.',
				slideValues: {
					topicId: typeof topicId === 'string' ? topicId : '',
					type: typeof type === 'string' ? type : 'content',
					title: typeof title === 'string' ? title : '',
					subtitle: typeof subtitle === 'string' ? subtitle : '',
					body: typeof body === 'string' ? body : '',
					imageDescription: typeof imageDescription === 'string' ? imageDescription : '',
					presenterNotes: typeof presenterNotes === 'string' ? presenterNotes : ''
				}
			});
		}

		const slideType = type === 'quiz' ? 'quiz' : 'content';

		try {
			const createdSlide = await createCourseSlideWorkspace({
				user: locals.user,
				organizationId: activeOrganization.organizationId,
				topicId,
				type: slideType,
				...(typeof title === 'string' && title.trim() ? { title: title.trim() } : {}),
				...(typeof subtitle === 'string' && subtitle.trim() ? { subtitle: subtitle.trim() } : {}),
				...(typeof body === 'string' && body.trim() ? { body: body.trim() } : {}),
				...(typeof imageDescription === 'string' && imageDescription.trim()
					? { imageDescription: imageDescription.trim() }
					: {}),
				...(typeof presenterNotes === 'string' && presenterNotes.trim()
					? { presenterNotes: presenterNotes.trim() }
					: {})
			});

			return {
				slideCreated: {
					topicId,
					slide: createdSlide ? toEditorSlide(createdSlide) : null
				}
			};
		} catch (error) {
			console.error('Convex slide creation failed', error);
			return fail(500, {
				slideCreationError: 'We could not add that slide right now.',
				slideValues: {
					topicId,
					type: slideType,
					title: typeof title === 'string' ? title : '',
					subtitle: typeof subtitle === 'string' ? subtitle : '',
					body: typeof body === 'string' ? body : '',
					imageDescription: typeof imageDescription === 'string' ? imageDescription : '',
					presenterNotes: typeof presenterNotes === 'string' ? presenterNotes : ''
				}
			});
		}

	},
	updateSlide: async ({ cookies, locals, params, request }) => {
		if (!locals.user) {
			throw redirect(302, '/login');
		}

		const formData = await request.formData();
		const slideId = formData.get('slideId');
		const type = formData.get('type');
		const title = formData.get('title');
		const subtitle = formData.get('subtitle');
		const body = formData.get('body');
		const imageDescription = formData.get('imageDescription');
		const presenterNotes = formData.get('presenterNotes');
		const activeOrganization = await getActiveOrganizationOption(
			locals.user,
			getActiveOrganizationId(cookies)
		);

		if (!activeOrganization) {
			return fail(400, {
				slideUpdateError: 'Pick an organization before updating a slide.',
				slideUpdateValues: {
					slideId: typeof slideId === 'string' ? slideId : '',
					type: typeof type === 'string' ? type : 'content',
					title: typeof title === 'string' ? title : '',
					subtitle: typeof subtitle === 'string' ? subtitle : '',
					body: typeof body === 'string' ? body : '',
					imageDescription: typeof imageDescription === 'string' ? imageDescription : '',
					presenterNotes: typeof presenterNotes === 'string' ? presenterNotes : ''
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
				slideUpdateError: 'Only organization admins and facilitators can update slides.',
				slideUpdateValues: {
					slideId: typeof slideId === 'string' ? slideId : '',
					type: typeof type === 'string' ? type : 'content',
					title: typeof title === 'string' ? title : '',
					subtitle: typeof subtitle === 'string' ? subtitle : '',
					body: typeof body === 'string' ? body : '',
					imageDescription: typeof imageDescription === 'string' ? imageDescription : '',
					presenterNotes: typeof presenterNotes === 'string' ? presenterNotes : ''
				}
			});
		}

		if (typeof slideId !== 'string' || !slideId) {
			return fail(400, {
				slideUpdateError: 'Choose a slide before saving changes.',
				slideUpdateValues: {
					slideId: typeof slideId === 'string' ? slideId : '',
					type: typeof type === 'string' ? type : 'content',
					title: typeof title === 'string' ? title : '',
					subtitle: typeof subtitle === 'string' ? subtitle : '',
					body: typeof body === 'string' ? body : '',
					imageDescription: typeof imageDescription === 'string' ? imageDescription : '',
					presenterNotes: typeof presenterNotes === 'string' ? presenterNotes : ''
				}
			});
		}

		const slideType = type === 'quiz' ? 'quiz' : 'content';

		try {
			const updatedSlide = await updateCourseSlideWorkspace({
				user: locals.user,
				organizationId: activeOrganization.organizationId,
				slideId,
				type: slideType,
				...(typeof title === 'string' ? { title: title.trim() } : {}),
				...(typeof subtitle === 'string' ? { subtitle: subtitle.trim() } : {}),
				...(typeof body === 'string' ? { body: body.trim() } : {}),
				...(typeof imageDescription === 'string'
					? { imageDescription: imageDescription.trim() }
					: {}),
				...(typeof presenterNotes === 'string'
					? { presenterNotes: presenterNotes.trim() }
					: {})
			});

			return {
				slideUpdated: {
					slide: updatedSlide ? toEditorSlide(updatedSlide) : null
				}
			};
		} catch (error) {
			console.error('Convex slide update failed', error);
			return fail(500, {
				slideUpdateError: 'We could not save that slide right now.',
				slideUpdateValues: {
					slideId,
					type: slideType,
					title: typeof title === 'string' ? title : '',
					subtitle: typeof subtitle === 'string' ? subtitle : '',
					body: typeof body === 'string' ? body : '',
					imageDescription: typeof imageDescription === 'string' ? imageDescription : '',
					presenterNotes: typeof presenterNotes === 'string' ? presenterNotes : ''
				}
			});
		}

	},
	uploadSlideImage: async ({ cookies, locals, request }) => {
		if (!locals.user) {
			throw redirect(302, '/login');
		}

		const formData = await request.formData();
		const slideId = formData.get('slideId');
		const imageFile = formData.get('imageFile');
		const activeOrganization = await getActiveOrganizationOption(
			locals.user,
			getActiveOrganizationId(cookies)
		);

		if (!activeOrganization) {
			return fail(400, {
				slideImageUploadError: 'Pick an organization before uploading an image.'
			});
		}

		if (
			!hasFacilitatorAccess(
				activeOrganization.roles,
				Boolean(locals.convexContext?.user?.isSuperAdmin)
			)
		) {
			return fail(403, {
				slideImageUploadError: 'Only organization admins and facilitators can upload images.'
			});
		}

		if (typeof slideId !== 'string' || !slideId || slideId.startsWith('temp-')) {
			return fail(400, {
				slideImageUploadError: 'Save the slide before uploading an image.'
			});
		}

		if (!(imageFile instanceof File) || imageFile.size === 0) {
			return fail(400, {
				slideImageUploadError: 'Choose an image file first.'
			});
		}

		if (!imageFile.type.startsWith('image/')) {
			return fail(400, {
				slideImageUploadError: 'Slide images must be image files.'
			});
		}

		if (imageFile.size > MAX_SLIDE_IMAGE_BYTES) {
			return fail(400, {
				slideImageUploadError: 'Slide images must be 5 MB or smaller.'
			});
		}

		try {
			const uploadUrl = await generateCourseSlideImageUploadUrlWorkspace({
				user: locals.user,
				organizationId: activeOrganization.organizationId,
				slideId
			});

			const uploadResponse = await fetch(uploadUrl, {
				method: 'POST',
				headers: {
					'Content-Type': imageFile.type
				},
				body: imageFile
			});

			if (!uploadResponse.ok) {
				throw new Error(`Convex storage upload failed with ${uploadResponse.status}`);
			}

			const uploadResult = (await uploadResponse.json()) as { storageId?: string };
			if (!uploadResult.storageId) {
				throw new Error('Convex storage did not return a storage id.');
			}

			const updatedSlide = await attachCourseSlideImageWorkspace({
				user: locals.user,
				organizationId: activeOrganization.organizationId,
				slideId,
				storageId: uploadResult.storageId,
				fileName: imageFile.name
			});

			return {
				slideImageUploaded: {
					slide: updatedSlide ? toEditorSlide(updatedSlide) : null
				}
			};
		} catch (error) {
			console.error('Convex slide image upload failed', error);
			return fail(500, {
				slideImageUploadError: 'We could not upload that image right now.'
			});
		}
	},
	deleteSlide: async ({ cookies, locals, params, request }) => {
		if (!locals.user) {
			throw redirect(302, '/login');
		}

		const formData = await request.formData();
		const slideId = formData.get('slideId');
		const activeOrganization = await getActiveOrganizationOption(
			locals.user,
			getActiveOrganizationId(cookies)
		);

		if (!activeOrganization) {
			return fail(400, {
				slideDeleteError: 'Pick an organization before deleting a slide.'
			});
		}

		if (
			!hasFacilitatorAccess(
				activeOrganization.roles,
				Boolean(locals.convexContext?.user?.isSuperAdmin)
			)
		) {
			return fail(403, {
				slideDeleteError: 'Only organization admins and facilitators can delete slides.'
			});
		}

		if (typeof slideId !== 'string' || !slideId) {
			return fail(400, {
				slideDeleteError: 'Choose a slide before deleting it.'
			});
		}

		try {
			await deleteCourseSlideWorkspace({
				user: locals.user,
				organizationId: activeOrganization.organizationId,
				slideId
			});
		} catch (error) {
			console.error('Convex slide delete failed', error);
			return fail(500, {
				slideDeleteError: 'We could not delete that slide right now.'
			});
		}

		return {
			slideDeleted: {
				slideId
			}
		};
	}
};

export const load = async ({ cookies, locals, params }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const activeOrganization = await getActiveOrganizationOption(
		locals.user,
		getActiveOrganizationId(cookies)
	);

	if (!activeOrganization) {
		throw redirect(303, '/dashboard');
	}

	if (
		!hasFacilitatorAccess(
			activeOrganization.roles,
			Boolean(locals.convexContext?.user?.isSuperAdmin)
		)
	) {
		throw redirect(303, '/dashboard');
	}

	const editor = await getFacilitatorCourseEditorView({
		user: locals.user,
		organizationId: activeOrganization.organizationId,
		courseId: params.courseId
	});

	return {
		editor
	};
};
