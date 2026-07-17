<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select } from '$lib/components/ui/select';
	import { Toaster } from '$lib/components/ui/sonner';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { useMutation } from 'convex-svelte';
	import { onDestroy, untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { api } from '../../../../convex/_generated/api.js';
	import type { Id } from '../../../../convex/_generated/dataModel.js';

	type QuestionType = 'multiple_choice' | 'multi_select' | 'true_false' | 'fill_in_the_blank';

	type EditorQuestion = {
		questionId: string;
		type: QuestionType;
		prompt: string;
		options: string[] | null;
		correctOptions: number[] | null;
		acceptedAnswers: string[] | null;
		order: number;
	};

	type EditorSlide = {
		slideId: string;
		type: 'content' | 'quiz';
		title: string | null;
		subtitle: string | null;
		body: string | null;
		imageDescription: string | null;
		imageStorageId: string | null;
		imageUrl: string | null;
		imageName: string | null;
		imageContentType: string | null;
		imageSize: number | null;
		presenterNotes: string | null;
		order: number;
		questionCount: number;
		questions: EditorQuestion[];
	};

	const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
		multiple_choice: 'Multiple choice',
		multi_select: 'Multi-select',
		true_false: 'True / False',
		fill_in_the_blank: 'Fill in the blank'
	};

	type EditorTopic = {
		topicId: string;
		title: string;
		order: number;
		slideCount: number;
		questionCount: number;
		slides: EditorSlide[];
	};

	let { data, form } = $props();

	const editor = $derived(data.editor);
	const course = $derived(editor.course);
	const initialTopics = getInitialTopics();
	let topics = $state<EditorTopic[]>(initialTopics);
	let pendingMutations = $state(0);
	let lastSyncedEditor = untrack(() => editor);

	let activeTopicId = $state(initialTopics[0]?.topicId ?? '');
	let selectedSlideId = $state('');
	let addMenuOpen = $state(false);
	let addMenuClosing = $state(false);
	let addMenuCloseTimer: number | null = null;
	let slideStatus = $state('');
	let slideActionError = $state('');

	const createTopicMutation = useMutation(api.courses.createTopic);
	const reorderTopicsMutation = useMutation(api.courses.reorderTopics);
	const createSlideMutation = useMutation(api.courses.createSlide);
	const updateSlideMutation = useMutation(api.courses.updateSlide);
	const generateSlideImageUploadUrlMutation = useMutation(api.courses.generateSlideImageUploadUrl);
	const attachSlideImageMutation = useMutation(api.courses.attachSlideImage);
	const deleteSlideMutation = useMutation(api.courses.deleteSlide);
	const reorderSlidesMutation = useMutation(api.courses.reorderSlides);
	const createQuestionMutation = useMutation(api.courses.createQuizQuestion);
	const updateQuestionMutation = useMutation(api.courses.updateQuizQuestion);
	const reorderQuestionsMutation = useMutation(api.courses.reorderQuizQuestions);

	const organizationId = $derived(editor.organization.id as Id<'organizations'>);
	const courseId = $derived(course.courseId as Id<'courses'>);

	const activeTopic = $derived(
		topics.find((t) => t.topicId === activeTopicId) ?? topics[0] ?? null
	);
	const selectedSlide = $derived(
		activeTopic?.slides.find((s) => s.slideId === selectedSlideId) ??
			activeTopic?.slides[0] ??
			null
	);
	const selectedSlideIndex = $derived(
		activeTopic && selectedSlide
			? activeTopic.slides.findIndex((s) => s.slideId === selectedSlide.slideId)
			: -1
	);

	const totalSlides = $derived(topics.reduce((n, t) => n + t.slideCount, 0));
	const totalQuestions = $derived(topics.reduce((n, t) => n + t.questionCount, 0));

	function cloneTopics(source: EditorTopic[]) {
		return source.map((topic) => ({
			...topic,
			slides: topic.slides.map((slide) => ({ ...slide }))
		}));
	}

	function getInitialTopics() {
		return cloneTopics(data.editor.course.topics as EditorTopic[]);
	}

	$effect(() => {
		const nextEditor = data.editor;
		if (nextEditor === lastSyncedEditor || pendingMutations > 0) return;

		lastSyncedEditor = nextEditor;
		const nextTopics = cloneTopics(nextEditor.course.topics as EditorTopic[]);
		const nextActiveId = nextTopics.some((topic) => topic.topicId === activeTopicId)
			? activeTopicId
			: (nextTopics[0]?.topicId ?? '');
		const nextActive = nextTopics.find((topic) => topic.topicId === nextActiveId);
		const nextSelectedId = nextActive?.slides.some((slide) => slide.slideId === selectedSlideId)
			? selectedSlideId
			: (nextActive?.slides[0]?.slideId ?? '');

		topics = nextTopics;
		activeTopicId = nextActiveId;
		selectedSlideId = nextSelectedId;
	});

	async function runMutation<T>(mutation: () => Promise<T>) {
		pendingMutations += 1;
		try {
			return await mutation();
		} finally {
			pendingMutations -= 1;
		}
	}

	function normalizeField(value: FormDataEntryValue | null) {
		return typeof value === 'string' && value.trim() ? value.trim() : null;
	}

	function slidePatchFromForm(formData: FormData) {
		return {
			title: normalizeField(formData.get('title')),
			subtitle: normalizeField(formData.get('subtitle')),
			body: normalizeField(formData.get('body')),
			imageDescription: normalizeField(formData.get('imageDescription')),
			presenterNotes: normalizeField(formData.get('presenterNotes'))
		};
	}

	function toEditorSlide(
		slide: {
			_id: string;
			type: 'content' | 'quiz';
			order: number;
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
		},
		questions: EditorQuestion[] = []
	): EditorSlide {
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
			questionCount: questions.length,
			questions
		};
	}

	function updateTopicSlides(topicId: string, updater: (slides: EditorSlide[]) => EditorSlide[]) {
		topics = topics.map((topic) => {
			if (topic.topicId !== topicId) return topic;
			const slides = updater(topic.slides).map((slide, order) => ({ ...slide, order }));
			return {
				...topic,
				slides,
				slideCount: slides.length,
				questionCount: slides.reduce((count, slide) => count + slide.questionCount, 0)
			};
		});
	}

	function replaceSlide(slideId: string, patch: Partial<EditorSlide>) {
		topics = topics.map((topic) => ({
			...topic,
			slides: topic.slides.map((slide) =>
				slide.slideId === slideId ? { ...slide, ...patch } : slide
			)
		}));
	}

	function findSlide(slideId: string) {
		for (const topic of topics) {
			const slide = topic.slides.find((candidate) => candidate.slideId === slideId);
			if (slide) return slide;
		}

		return null;
	}

	function updateSelectedSlideField(
		field: 'title' | 'subtitle' | 'body' | 'imageDescription' | 'presenterNotes',
		value: string
	) {
		if (!selectedSlide) return;
		replaceSlide(selectedSlide.slideId, { [field]: value || null });
	}

	function addOptimisticSlide(topicId: string, type: 'content' | 'quiz') {
		const topic = topics.find((t) => t.topicId === topicId);
		const tempSlide: EditorSlide = {
			slideId: `temp-${Date.now()}`,
			type,
			title: null,
			subtitle: null,
			body: null,
			imageDescription: null,
			imageStorageId: null,
			imageUrl: null,
			imageName: null,
			imageContentType: null,
			imageSize: null,
			presenterNotes: null,
			order: topic?.slides.length ?? 0,
			questionCount: 0,
			questions: []
		};

		updateTopicSlides(topicId, (slides) => [...slides, tempSlide]);
		selectedSlideId = tempSlide.slideId;
		closeAddMenu();
		return tempSlide.slideId;
	}

	function replaceOptimisticSlide(tempSlideId: string, savedSlide: EditorSlide) {
		const shouldKeepSelection = selectedSlideId === tempSlideId;
		topics = topics.map((topic) => ({
			...topic,
			slides: topic.slides.map((slide) =>
				slide.slideId === tempSlideId
					? {
							...savedSlide,
							title: slide.title ?? savedSlide.title,
							subtitle: slide.subtitle ?? savedSlide.subtitle,
							body: slide.body ?? savedSlide.body,
							imageDescription: slide.imageDescription ?? savedSlide.imageDescription,
							imageStorageId: slide.imageStorageId ?? savedSlide.imageStorageId,
							imageUrl: slide.imageUrl ?? savedSlide.imageUrl,
							imageName: slide.imageName ?? savedSlide.imageName,
							imageContentType: slide.imageContentType ?? savedSlide.imageContentType,
							imageSize: slide.imageSize ?? savedSlide.imageSize,
							presenterNotes: slide.presenterNotes ?? savedSlide.presenterNotes,
							questionCount: slide.questionCount
						}
					: slide
			)
		}));
		if (shouldKeepSelection) {
			selectedSlideId = savedSlide.slideId;
		}
	}

	function deleteOptimisticSlide(slideId: string) {
		const topic = topics.find((candidate) =>
			candidate.slides.some((slide) => slide.slideId === slideId)
		);
		const deletedIndex = topic?.slides.findIndex((slide) => slide.slideId === slideId) ?? -1;
		updateTopicSlides(topic?.topicId ?? '', (slides) =>
			slides.filter((slide) => slide.slideId !== slideId)
		);

		if (selectedSlideId === slideId) {
			const nextSlide =
				topic?.slides[deletedIndex + 1] ?? topic?.slides[deletedIndex - 1] ?? null;
			selectedSlideId = nextSlide?.slideId ?? '';
		}
	}

	function restoreTopics(snapshot: EditorTopic[]) {
		topics = cloneTopics(snapshot);
	}

	function clearAddMenuCloseTimer() {
		if (addMenuCloseTimer === null) return;
		window.clearTimeout(addMenuCloseTimer);
		addMenuCloseTimer = null;
	}

	function openAddMenu() {
		clearAddMenuCloseTimer();
		addMenuClosing = false;
		addMenuOpen = true;
	}

	function closeAddMenu() {
		if (!addMenuOpen) return;
		clearAddMenuCloseTimer();
		addMenuOpen = false;
		addMenuClosing = true;

		const closeMs =
			Number.parseFloat(
				getComputedStyle(document.documentElement).getPropertyValue('--dropdown-close-dur')
			) || 150;

		addMenuCloseTimer = window.setTimeout(() => {
			addMenuClosing = false;
			addMenuCloseTimer = null;
		}, closeMs);
	}

	function toggleAddMenu() {
		if (addMenuOpen) closeAddMenu();
		else openAddMenu();
	}

	onDestroy(clearAddMenuCloseTimer);

	function markSaved(message = 'Saved', toastId?: string | number) {
		slideStatus = message;
		toast.success(message, toastId ? { id: toastId } : undefined);
		window.setTimeout(() => {
			if (slideStatus === message) slideStatus = '';
		}, 1400);
	}

	function handleSlideFailure(
		snapshot: EditorTopic[],
		result: { data?: Record<string, unknown> } | unknown,
		toastId?: string | number
	) {
		restoreTopics(snapshot);
		const actionData =
			typeof result === 'object' && result && 'data' in result
				? (result.data as Record<string, unknown> | undefined)
				: undefined;
		slideStatus = '';
		slideActionError =
			(actionData?.slideCreationError as string | undefined) ??
			(actionData?.slideUpdateError as string | undefined) ??
			(actionData?.slideDeleteError as string | undefined) ??
			'That change could not be saved.';
		toast.error(slideActionError, toastId ? { id: toastId } : undefined);
	}

	function handleSlideImageFailure(result: { data?: Record<string, unknown> } | unknown, toastId?: string | number) {
		const actionData =
			typeof result === 'object' && result && 'data' in result
				? (result.data as Record<string, unknown> | undefined)
				: undefined;
		slideStatus = '';
		slideActionError =
			(actionData?.slideImageUploadError as string | undefined) ??
			'That image could not be uploaded.';
		toast.error(slideActionError, toastId ? { id: toastId } : undefined);
	}

	function enhanceCreateSlide(topicId: string, type: 'content' | 'quiz'): SubmitFunction {
		return async ({ cancel }) => {
			cancel();
			const snapshot = cloneTopics(topics);
			const tempSlideId = addOptimisticSlide(topicId, type);
			slideActionError = '';
			slideStatus = 'Saving...';
			const toastId = toast.loading('Adding slide...');

			try {
				const saved = await runMutation(() =>
					createSlideMutation({
						organizationId,
						topicId: topicId as Id<'topics'>,
						type
					})
				);
				if (saved) replaceOptimisticSlide(tempSlideId, toEditorSlide(saved));
				markSaved('Slide ready', toastId);
			} catch (error) {
				handleSlideFailure(snapshot, error, toastId);
			}
		};
	}

	const enhanceUpdateSlide: SubmitFunction = async (submit) => {
		if (!submit?.formData) {
			return;
		}

		const { cancel, formData } = submit;
		cancel();
		const slideId = String(formData.get('slideId') ?? '');
		if (!slideId) {
			slideActionError = 'Choose a slide before saving it.';
			return;
		}

		if (slideId.startsWith('temp-')) {
			slideStatus = 'Still creating slide...';
			return;
		}

		const snapshot = cloneTopics(topics);
		const submittedSlide = findSlide(slideId);
		const submittedQuestionCount = submittedSlide?.questionCount ?? 0;
		replaceSlide(slideId, slidePatchFromForm(formData));
		slideActionError = '';
		slideStatus = 'Saving...';
		const toastId = toast.loading('Saving slide...');

		try {
			const patch = slidePatchFromForm(formData);
			const saved = await runMutation(() =>
				updateSlideMutation({
					organizationId,
					slideId: slideId as Id<'slides'>,
					type: formData.get('type') === 'quiz' ? 'quiz' : 'content',
					title: patch.title ?? '',
					subtitle: patch.subtitle ?? '',
					body: patch.body ?? '',
					imageDescription: patch.imageDescription ?? '',
					presenterNotes: patch.presenterNotes ?? ''
				})
			);
			if (saved) {
				replaceSlide(slideId, {
					...toEditorSlide(saved),
					questions: submittedSlide?.questions ?? [],
					questionCount: submittedQuestionCount
				});
			}
			markSaved('Slide saved', toastId);
		} catch (error) {
			handleSlideFailure(snapshot, error, toastId);
		}
	};

	const enhanceUploadSlideImage: SubmitFunction = async (submit) => {
		if (!submit?.formData) {
			return;
		}

		const { cancel, formData } = submit;
		cancel();
		const slideId = String(formData.get('slideId') ?? '');
		const file = formData.get('imageFile');

		if (!slideId || slideId.startsWith('temp-')) {
			slideActionError = 'Save the slide before uploading an image.';
			return;
		}

		if (!(file instanceof File) || file.size === 0) {
			slideActionError = 'Choose an image file first.';
			return;
		}

		if (!file.type.startsWith('image/')) {
			slideActionError = 'Slide images must be image files.';
			return;
		}

		slideActionError = '';
		slideStatus = 'Uploading image...';
		const toastId = toast.loading('Uploading image...');

		try {
			const uploadUrl = await runMutation(() =>
				generateSlideImageUploadUrlMutation({
					organizationId,
					slideId: slideId as Id<'slides'>
				})
			);
			const uploadResponse = await fetch(uploadUrl, {
				method: 'POST',
				headers: { 'Content-Type': file.type },
				body: file
			});
			if (!uploadResponse.ok) throw new Error('Image upload failed.');
			const upload = (await uploadResponse.json()) as { storageId?: string };
			if (!upload.storageId) throw new Error('Image upload did not return a storage id.');
			const saved = await runMutation(() =>
				attachSlideImageMutation({
					organizationId,
					slideId: slideId as Id<'slides'>,
					storageId: upload.storageId as Id<'_storage'>,
					fileName: file.name
				})
			);
			if (saved) {
				const previous = findSlide(slideId);
				replaceSlide(slideId, {
					...toEditorSlide(saved),
					questions: previous?.questions ?? [],
					questionCount: previous?.questionCount ?? 0
				});
			}
			markSaved('Image uploaded', toastId);
		} catch (error) {
			handleSlideImageFailure(error, toastId);
		}
	};

	const enhanceDeleteSlide: SubmitFunction = async (submit) => {
		if (!submit?.formData) {
			return;
		}

		const { cancel, formData } = submit;
		cancel();
		const slideId = String(formData.get('slideId') ?? '');
		if (!slideId) {
			slideActionError = 'Choose a slide before deleting it.';
			return;
		}

			const snapshot = cloneTopics(topics);
			deleteOptimisticSlide(slideId);
			slideActionError = '';
			slideStatus = 'Deleting...';

			if (slideId.startsWith('temp-')) {
				markSaved('Slide removed');
				return;
			}

			const toastId = toast.loading('Deleting slide...');

			try {
				await runMutation(() =>
					deleteSlideMutation({
						organizationId,
						slideId: slideId as Id<'slides'>
					})
				);
				markSaved('Slide deleted', toastId);
			} catch (error) {
				handleSlideFailure(snapshot, error, toastId);
			}
	};

	// ── Reordering ─────────────────────────────────────────────
	// Return a copy of `list` with the item at `index` swapped one step in
	// `dir` (-1 up, 1 down); out-of-range moves return the list unchanged.
	function moved<T>(list: T[], index: number, dir: -1 | 1): T[] {
		const next = [...list];
		const target = index + dir;
		if (target < 0 || target >= next.length) return next;
		[next[index], next[target]] = [next[target], next[index]];
		return next;
	}

	const enhanceCreateTopic: SubmitFunction = async ({ cancel, formData, formElement }) => {
		cancel();
		const title = String(formData.get('title') ?? '').trim();
		if (!title) {
			slideActionError = 'Give the topic a title first.';
			return;
		}

		const snapshot = cloneTopics(topics);
		const tempId = `temp-topic-${Date.now()}`;
		const optimisticTopic: EditorTopic = {
			topicId: tempId,
			title,
			order: topics.length,
			slideCount: 0,
			questionCount: 0,
			slides: []
		};
		topics = [...topics, optimisticTopic];
		activeTopicId = tempId;
		selectedSlideId = '';
		(formElement.elements.namedItem('title') as HTMLInputElement | null)?.blur();
		formElement.reset();
		const toastId = toast.loading('Adding topic...');

		try {
			const saved = await runMutation(() =>
				createTopicMutation({ organizationId, courseId, title })
			);
			if (saved) {
				topics = topics.map((topic) =>
					topic.topicId === tempId
						? { ...optimisticTopic, topicId: saved._id, order: saved.order }
						: topic
				);
				if (activeTopicId === tempId) activeTopicId = saved._id;
			}
			markSaved('Topic added', toastId);
		} catch (error) {
			handleSlideFailure(snapshot, error, toastId);
		}
	};

	function enhanceReorderTopics(): SubmitFunction {
		return async ({ cancel, formData }) => {
			cancel();
			const topicIds = formData.getAll('topicIds').map(String);
			const snapshot = cloneTopics(topics);
			const byId = new Map(topics.map((topic) => [topic.topicId, topic]));
			topics = topicIds
				.map((id) => byId.get(id))
				.filter((topic): topic is EditorTopic => Boolean(topic))
				.map((topic, order) => ({ ...topic, order }));

			try {
				await runMutation(() =>
					reorderTopicsMutation({
						organizationId,
						courseId,
						topicIds: topicIds.map((id) => id as Id<'topics'>)
					})
				);
			} catch (error) {
				handleSlideFailure(snapshot, error);
			}
		};
	}

	function enhanceReorderSlides(): SubmitFunction {
		return async ({ cancel, formData }) => {
			cancel();
			const topicId = String(formData.get('topicId') ?? '');
			const slideIds = formData.getAll('slideIds').map(String);
			const snapshot = cloneTopics(topics);
			updateTopicSlides(topicId, (slides) => {
				const byId = new Map(slides.map((slide) => [slide.slideId, slide]));
				return slideIds
					.map((id) => byId.get(id))
					.filter((slide): slide is EditorSlide => Boolean(slide));
			});

			try {
				await runMutation(() =>
					reorderSlidesMutation({
						organizationId,
						topicId: topicId as Id<'topics'>,
						slideIds: slideIds.map((id) => id as Id<'slides'>)
					})
				);
			} catch (error) {
				handleSlideFailure(snapshot, error);
			}
		};
	}

	// ── Quiz question builder ──────────────────────────────────
	// One builder drives the currently selected slide; create vs. edit is
	// decided by whether `qEditingId` is set. Everything reloads on submit.
	let qEditingId = $state<string | null>(null);
	let qType = $state<QuestionType>('multiple_choice');
	let qPrompt = $state('');
	let qOptions = $state<string[]>(['', '']);
	let qCorrect = $state<number[]>([]);
	let qAnswers = $state<string[]>(['']);

	const singleCorrect = $derived(qType === 'multiple_choice' || qType === 'true_false');

	function resetQuestionForm() {
		qEditingId = null;
		qType = 'multiple_choice';
		qPrompt = '';
		qOptions = ['', ''];
		qCorrect = [];
		qAnswers = [''];
	}

	function startEditQuestion(question: EditorQuestion) {
		qEditingId = question.questionId;
		qType = question.type;
		qPrompt = question.prompt;
		qOptions = question.options ? [...question.options] : ['', ''];
		qCorrect = question.correctOptions ? [...question.correctOptions] : [];
		qAnswers = question.acceptedAnswers?.length ? [...question.acceptedAnswers] : [''];
	}

	function changeType(value: string) {
		qType = value as QuestionType;
		qCorrect = [];
	}

	function toggleCorrect(index: number) {
		if (singleCorrect) {
			qCorrect = [index];
		} else {
			qCorrect = qCorrect.includes(index)
				? qCorrect.filter((n) => n !== index)
				: [...qCorrect, index];
		}
	}

	function removeOption(index: number) {
		qOptions = qOptions.filter((_, i) => i !== index);
		qCorrect = qCorrect.filter((n) => n !== index).map((n) => (n > index ? n - 1 : n));
	}

	function questionSummary(question: EditorQuestion) {
		if (question.type === 'fill_in_the_blank') {
			return question.acceptedAnswers ?? [];
		}
		return question.options ?? [];
	}

	function toEditorQuestion(question: {
		_id: string;
		type: QuestionType;
		prompt: string;
		options?: string[];
		correctOptions?: number[];
		acceptedAnswers?: string[];
		order: number;
	}): EditorQuestion {
		return {
			questionId: question._id,
			type: question.type,
			prompt: question.prompt,
			options: question.options ?? null,
			correctOptions: question.correctOptions ?? null,
			acceptedAnswers: question.acceptedAnswers ?? null,
			order: question.order
		};
	}

	function setSlideQuestions(slideId: string, questions: EditorQuestion[]) {
		replaceSlide(slideId, {
			questions: questions.map((question, order) => ({ ...question, order })),
			questionCount: questions.length
		});
	}

	const enhanceQuestion: SubmitFunction = async ({ cancel, formData }) => {
		cancel();
		const slideId = String(formData.get('slideId') ?? '');
		const prompt = String(formData.get('prompt') ?? '').trim();
		if (!slideId || !prompt) {
			slideActionError = 'Write the question prompt first.';
			return;
		}

		const type = String(formData.get('type') ?? '') as QuestionType;
		const options = type === 'true_false'
			? ['True', 'False']
			: formData.getAll('options').map(String).map((value) => value.trim()).filter(Boolean);
		const correctOptions = formData.getAll('correctOptions').map(Number);
		const acceptedAnswers = formData
			.getAll('acceptedAnswers')
			.map(String)
			.map((value) => value.trim())
			.filter(Boolean);
		const payload = {
			organizationId,
			type,
			prompt,
			...(type === 'fill_in_the_blank'
				? { acceptedAnswers }
				: { options, correctOptions })
		};
		const snapshot = cloneTopics(topics);
		const current = findSlide(slideId);
		const editingQuestionId = qEditingId;
		const toastId = toast.loading(editingQuestionId ? 'Saving question...' : 'Adding question...');

		try {
			if (editingQuestionId) {
				const saved = await runMutation(() =>
					updateQuestionMutation({
						...payload,
						questionId: editingQuestionId as Id<'quizQuestions'>
					})
				);
				if (saved && current) {
					setSlideQuestions(
						slideId,
						current.questions.map((question) =>
							question.questionId === editingQuestionId ? toEditorQuestion(saved) : question
						)
					);
				}
			} else {
				const saved = await runMutation(() =>
					createQuestionMutation({
						...payload,
						slideId: slideId as Id<'slides'>
					})
				);
				if (saved && current) setSlideQuestions(slideId, [...current.questions, toEditorQuestion(saved)]);
			}
			resetQuestionForm();
			markSaved(editingQuestionId ? 'Question saved' : 'Question added', toastId);
		} catch (error) {
			handleSlideFailure(snapshot, error, toastId);
		}
	};

	function enhanceReorderQuestions(): SubmitFunction {
		return async ({ cancel, formData }) => {
			cancel();
			const slideId = String(formData.get('slideId') ?? '');
			const questionIds = formData.getAll('questionIds').map(String);
			const snapshot = cloneTopics(topics);
			const slide = findSlide(slideId);
			if (!slide) return;
			const byId = new Map(slide.questions.map((question) => [question.questionId, question]));
			const next = questionIds
				.map((id) => byId.get(id))
				.filter((question): question is EditorQuestion => Boolean(question));
			setSlideQuestions(slideId, next);

			try {
				await runMutation(() =>
					reorderQuestionsMutation({
						organizationId,
						slideId: slideId as Id<'slides'>,
						questionIds: questionIds.map((id) => id as Id<'quizQuestions'>)
					})
				);
			} catch (error) {
				handleSlideFailure(snapshot, error);
			}
		};
	}

	function selectTopic(topic: EditorTopic) {
		activeTopicId = topic.topicId;
		selectedSlideId = topic.slides[0]?.slideId ?? '';
		clearAddMenuCloseTimer();
		addMenuOpen = false;
		addMenuClosing = false;
		resetQuestionForm();
	}

	function selectSlide(slide: EditorSlide) {
		selectedSlideId = slide.slideId;
		closeAddMenu();
		resetQuestionForm();
	}

	function thumbTitle(slide: EditorSlide) {
		const title = slide.title || slide.body || '';
		return title.length > 56 ? title.slice(0, 56) + '…' : title;
	}

	function thumbSub(slide: EditorSlide) {
		if (slide.type === 'quiz') return `${slide.questionCount} questions`;
		return slide.subtitle || 'Content slide';
	}

	function slideValue(
		field: 'title' | 'subtitle' | 'body' | 'imageDescription' | 'presenterNotes'
	) {
		if (form?.slideUpdateValues?.slideId === selectedSlide?.slideId) {
			return form.slideUpdateValues[field] ?? '';
		}

		return selectedSlide?.[field] ?? '';
	}
</script>

<svelte:head>
	<title>Edit {course.title} · New Adam</title>
</svelte:head>

<Toaster richColors closeButton position="bottom-right" />

{#snippet idInputs(name: string, ids: string[])}
	{#each ids as id}
		<input type="hidden" {name} value={id} />
	{/each}
{/snippet}

<div class="na-editor">

	<!-- ── Editor Topbar ──────────────────────────────────────── -->
	<header class="na-topbar na-editor-topbar">
		<div class="na-topbar-left" style="flex:1;min-width:0">
			<a href={resolve('/dashboard')} class="na-btn na-btn-ghost">← Back</a>
			<span class="na-topbar-sep">|</span>
			<div class="na-topbar-title">
				<div class="na-topbar-main-label">
					Edit course
				</div>
				<div class="na-topbar-sublabel">
					{topics.length} topics · {totalSlides} slides · {totalQuestions} questions
				</div>
			</div>
		</div>
		<div class="na-hstack" style="gap:8px;flex-shrink:0">
			<button class="na-btn" disabled>Save draft</button>
			<a href={resolve('/dashboard')} class="na-btn na-btn-primary">Save & close</a>
		</div>
	</header>

	<!-- ── Editor Body ────────────────────────────────────────── -->
	<div class="na-editor-body">

		<!-- ── Left Rail ──────────────────────────────────────── -->
		<aside class="na-editor-rail">
			<!-- Course meta -->
			<div class="na-rail-section">
				<div class="na-rail-section-head">
					<span class="na-rail-label">Course</span>
				</div>
				<input
					class="na-input na-rail-input-title"
					aria-label="Course title"
					value={course.title}
					readonly
					placeholder="Course title"
				/>
				<input
					class="na-input"
					style="font-size:13px"
					aria-label="Description"
					value={course.description ?? ''}
					placeholder="Short description"
					readonly
				/>
			</div>

			<!-- Topics list -->
			<div class="na-rail-section na-rail-section-topics">
				<div class="na-rail-section-head">
					<span class="na-rail-label">Topics</span>
					<form
						method="POST"
						action="?/createSection"
						class="na-hstack"
						style="gap:6px"
						use:enhance={enhanceCreateTopic}
					>
						<input
							class="na-input"
							style="height:28px;width:100px;font-size:12px;padding:4px 8px"
							name="title"
							placeholder="Topic"
							value={form?.sectionValues?.title ?? ''}
						/>
						<button type="submit" class="na-btn na-btn-sm">+ Add</button>
					</form>
				</div>

				{#if form?.sectionCreationError}
					<Alert variant="destructive">
						<AlertDescription>{form.sectionCreationError}</AlertDescription>
					</Alert>
				{/if}
				{#if form?.reorderError}
					<Alert variant="destructive">
						<AlertDescription>{form.reorderError}</AlertDescription>
					</Alert>
				{/if}

				<div class="na-rail-topic-list">
					{#each topics as topic, i (topic.topicId)}
						<div class="na-rail-topic-row">
							<button
								type="button"
								class="na-rail-topic {activeTopic?.topicId === topic.topicId ? 'active' : ''}"
								onclick={() => selectTopic(topic)}
							>
								<div class="na-hstack" style="justify-content:space-between;min-width:0">
									<div class="na-hstack" style="gap:7px;min-width:0">
										<span class="na-mono" style="font-size:11px;color:var(--na-ink-4);flex-shrink:0">
											{String(i + 1).padStart(2, '0')}
										</span>
										<span class="na-rail-topic-title {activeTopic?.topicId === topic.topicId ? 'active-text' : ''}">
											{topic.title || 'Untitled topic'}
										</span>
									</div>
								</div>
								<div class="na-rail-topic-meta">
									<span>{topic.slideCount} slides</span>
									{#if topic.questionCount > 0}
										<span class="na-dot-sep-inline"></span>
										<span>{topic.questionCount} Q</span>
									{/if}
								</div>
							</button>
							<div class="na-reorder">
								<form method="POST" action="?/reorderSections" use:enhance={enhanceReorderTopics()}>
									{@render idInputs('topicIds', moved(topics, i, -1).map((t) => t.topicId))}
									<button type="submit" class="na-reorder-btn" disabled={i === 0} aria-label="Move topic up">↑</button>
								</form>
								<form method="POST" action="?/reorderSections" use:enhance={enhanceReorderTopics()}>
									{@render idInputs('topicIds', moved(topics, i, 1).map((t) => t.topicId))}
									<button type="submit" class="na-reorder-btn" disabled={i === topics.length - 1} aria-label="Move topic down">↓</button>
								</form>
							</div>
						</div>
					{/each}

					{#if !topics.length}
						<div class="na-rail-empty na-muted">
							No topics yet.<br />Click <strong>+ Add</strong> to start.
						</div>
					{/if}
				</div>
			</div>
		</aside>

		<!-- ── Canvas ─────────────────────────────────────────── -->
		<main class="na-editor-canvas">
			{#if !activeTopic}
				<div class="na-editor-empty">
					<div class="na-editor-empty-glyph">⌘</div>
					<h2 class="na-editor-empty-title">Start by adding a topic</h2>
					<p class="na-muted" style="max-width:40ch;text-align:center">
						Topics group your slides together. Add topics using the panel on the left.
					</p>
				</div>
			{:else}
				<!-- Topic title -->
				<div class="na-canvas-head">
					<input
						class="na-canvas-topic-input"
						aria-label="Topic title"
						value={activeTopic.title}
						placeholder="Topic title"
						readonly
					/>
				</div>

				<!-- Slides editor -->
				<div class="na-slides-editor">

					<!-- Thumbnail rail -->
					<div class="na-slides-thumb-rail">
						{#each activeTopic.slides as slide, si (slide.slideId)}
							{@const isActive = selectedSlide?.slideId === slide.slideId}
							<div
								class="na-thumb {isActive ? 'active' : ''} {slide.type === 'quiz' ? 'na-thumb-question' : ''}"
								role="button"
								tabindex="0"
								onclick={() => selectSlide(slide)}
								onkeydown={(e) => e.key === 'Enter' && selectSlide(slide)}
							>
								<div class="na-thumb-head">
									<span class="na-mono" style="font-size:10px;color:var(--na-ink-4)">
										{String(si + 1).padStart(2, '0')}
									</span>
									<span class="na-type-chip {slide.type === 'quiz' ? 'question' : 'content'}">
										{slide.type === 'quiz' ? '? Question' : '¶ Content'}
									</span>
								</div>
								<div class="na-thumb-preview-title">
									{thumbTitle(slide) || 'Untitled'}
								</div>
								<div class="na-thumb-preview-sub">{thumbSub(slide)}</div>

								<form
									method="POST"
									action="?/deleteSlide"
									class="na-thumb-remove-wrap"
									use:enhance={enhanceDeleteSlide}
								>
									<input type="hidden" name="slideId" value={slide.slideId} />
									<button
										type="submit"
										class="na-thumb-remove"
										aria-label="Delete slide"
										onclick={(e) => e.stopPropagation()}
									>×</button>
								</form>

								<div class="na-reorder na-thumb-reorder" role="none" onclick={(e) => e.stopPropagation()}>
									<form method="POST" action="?/reorderSlides" use:enhance={enhanceReorderSlides()}>
										<input type="hidden" name="topicId" value={activeTopic.topicId} />
										{@render idInputs('slideIds', moved(activeTopic.slides, si, -1).map((s) => s.slideId))}
										<button type="submit" class="na-reorder-btn" disabled={si === 0} aria-label="Move slide up">↑</button>
									</form>
									<form method="POST" action="?/reorderSlides" use:enhance={enhanceReorderSlides()}>
										<input type="hidden" name="topicId" value={activeTopic.topicId} />
										{@render idInputs('slideIds', moved(activeTopic.slides, si, 1).map((s) => s.slideId))}
										<button type="submit" class="na-reorder-btn" disabled={si === activeTopic.slides.length - 1} aria-label="Move slide down">↓</button>
									</form>
								</div>
							</div>
						{/each}

						<!-- Add slide -->
						<div style="position:relative">
						<button
							type="button"
							class="na-thumb-add"
							aria-expanded={addMenuOpen}
							aria-controls="add-slide-menu"
							onclick={toggleAddMenu}
						>+ Add slide</button>

						{#if addMenuOpen || addMenuClosing}
							<div
								id="add-slide-menu"
								class="na-add-menu t-dropdown {addMenuOpen ? 'is-open' : 'is-closing'}"
								data-origin="top-center"
							>
									<form method="POST" action="?/createSlide" use:enhance={enhanceCreateSlide(activeTopic.topicId, 'content')}>
										<input type="hidden" name="topicId" value={activeTopic.topicId} />
										<input type="hidden" name="type" value="content" />
										<button type="submit" class="na-add-menu-item">
											<span class="na-add-menu-glyph">¶</span>
											<div class="na-vstack" style="gap:2px;align-items:flex-start">
												<span style="font-size:13px;font-weight:500">Content</span>
												<span class="na-muted" style="font-size:11.5px">Text + image</span>
											</div>
										</button>
									</form>
									<form method="POST" action="?/createSlide" use:enhance={enhanceCreateSlide(activeTopic.topicId, 'quiz')}>
										<input type="hidden" name="topicId" value={activeTopic.topicId} />
										<input type="hidden" name="type" value="quiz" />
										<button type="submit" class="na-add-menu-item">
											<span class="na-add-menu-glyph">?</span>
											<div class="na-vstack" style="gap:2px;align-items:flex-start">
												<span style="font-size:13px;font-weight:500">Question</span>
												<span class="na-muted" style="font-size:11.5px">Multiple choice</span>
											</div>
										</button>
									</form>
									<button type="button" class="na-add-menu-item" disabled style="opacity:0.45">
										<span class="na-add-menu-glyph">✎</span>
										<div class="na-vstack" style="gap:2px;align-items:flex-start">
											<span style="font-size:13px;font-weight:500">Notes</span>
											<span class="na-muted" style="font-size:11.5px">Student writes</span>
										</div>
									</button>
								</div>
							{/if}
						</div>
					</div>

					<!-- Slide edit area -->
					{#if selectedSlide}
						<div class="na-slide-edit-area">

							<!-- Slide preview -->
							<div class="na-slide-preview-wrap">
								<div class="na-slide">
									{#if selectedSlide.type === 'quiz'}
										<!-- Question slide preview -->
										<div class="na-slide-question" style="flex:1">
											<div class="na-q-eyebrow">
												<span>{selectedSlide.subtitle || 'Quick check'}</span>
												<span class="na-q-points na-mono">1 pt</span>
											</div>
											<h2 class="na-q-prompt {!selectedSlide.body ? 'na-muted' : ''}">
												{selectedSlide.body || 'Write your question here…'}
											</h2>
											<div class="na-q-choices">
												{#each ['A', 'B', 'C', 'D'] as letter}
													<div class="na-q-choice">
														<span class="na-q-letter">{letter}</span>
														<span class="na-muted" style="font-style:italic;font-size:0.9em">
															Answer option {letter}
														</span>
													</div>
												{/each}
											</div>
										</div>
									{:else}
										<!-- Content slide preview -->
										<div class="na-slide-inner">
											<div class="na-slide-text">
												<div class="na-slide-eyebrow">{selectedSlide.subtitle || 'Content'}</div>
												<h1 class="na-slide-title">
													{selectedSlide.title || 'Untitled slide'}
												</h1>
												{#if selectedSlide.body}
													<div class="na-slide-body">
														{selectedSlide.body}
													</div>
												{/if}
											</div>
											<div class="na-slide-image">
												{#if selectedSlide.imageUrl}
													<img
														class="na-slide-image-media"
														src={selectedSlide.imageUrl}
														alt={selectedSlide.imageDescription || selectedSlide.imageName || 'Slide image'}
													/>
												{:else}
													<div class="na-slide-image-label na-mono">
														{selectedSlide.imageDescription || 'Image placeholder'}
													</div>
												{/if}
											</div>
										</div>
									{/if}

									<div class="na-slide-footer">
										<span>{course.title}</span>
										<span>{selectedSlideIndex + 1} / {activeTopic.slides.length}</span>
									</div>
								</div>
							</div>

							<!-- Alert blocks -->
							{#if form?.slideCreationError && form?.slideValues?.topicId === activeTopic.topicId}
								<Alert variant="destructive">
									<AlertDescription>{form.slideCreationError}</AlertDescription>
								</Alert>
							{/if}
							{#if form?.slideUpdateError}
								<Alert variant="destructive">
									<AlertDescription>{form.slideUpdateError}</AlertDescription>
								</Alert>
							{/if}
							{#if form?.slideDeleteError}
								<Alert variant="destructive">
									<AlertDescription>{form.slideDeleteError}</AlertDescription>
								</Alert>
							{/if}
							{#if form?.slideImageUploadError}
								<Alert variant="destructive">
									<AlertDescription>{form.slideImageUploadError}</AlertDescription>
								</Alert>
							{/if}
							{#if slideActionError}
								<Alert variant="destructive">
									<AlertDescription>{slideActionError}</AlertDescription>
								</Alert>
							{/if}

							{#if selectedSlide.type === 'content'}
								<form
									method="POST"
									action="?/uploadSlideImage"
									enctype="multipart/form-data"
									class="na-image-upload-form"
									use:enhance={enhanceUploadSlideImage}
								>
									<input type="hidden" name="slideId" value={selectedSlide.slideId} />
									<div class="na-field">
										<label class="na-field-label" for="slide-image-file-{activeTopic.topicId}">
											Slide image
											{#if selectedSlide.imageName}
												<span class="na-muted" style="font-weight:400">({selectedSlide.imageName})</span>
											{/if}
										</label>
										<div class="na-image-upload-row">
											<Input
												id="slide-image-file-{activeTopic.topicId}"
												name="imageFile"
												type="file"
												accept="image/*"
												disabled={selectedSlide.slideId.startsWith('temp-')}
											/>
											<button
												type="submit"
												class="na-btn"
												disabled={selectedSlide.slideId.startsWith('temp-')}
											>
												Upload image
											</button>
										</div>
									</div>
								</form>
							{/if}

							<!-- Field editor -->
							<form
								method="POST"
								action="?/updateSlide"
								class="na-slide-fields"
								use:enhance={enhanceUpdateSlide}
							>
								<input type="hidden" name="slideId" value={selectedSlide.slideId} />

								{#if selectedSlide.type === 'quiz'}
									<!-- Question fields -->
									<div class="na-field-grid">
										<div class="na-field">
											<label class="na-field-label" for="slide-sub-{activeTopic.topicId}">
												Label <span class="na-muted" style="font-weight:400">(shown above prompt)</span>
											</label>
											<Input
												id="slide-sub-{activeTopic.topicId}"
												name="subtitle"
												placeholder="e.g. Quick check"
												value={slideValue('subtitle')}
												oninput={(event) =>
													updateSelectedSlideField('subtitle', event.currentTarget.value)}
											/>
										</div>
										<div class="na-field">
											<label class="na-field-label" for="slide-pts-{activeTopic.topicId}">
												Points
											</label>
											<Input
												id="slide-pts-{activeTopic.topicId}"
												type="number"
												value="1"
												class="na-mono"
												disabled
											/>
										</div>
									</div>
									<div class="na-field">
										<label class="na-field-label" for="slide-body-{activeTopic.topicId}">
											Question prompt
										</label>
										<Textarea
											id="slide-body-{activeTopic.topicId}"
											name="body"
											rows={2}
											placeholder="Ask your question…"
											value={form?.slideUpdateValues?.slideId === selectedSlide.slideId
												? (form.slideUpdateValues.body ?? '')
												: slideValue('body')}
											oninput={(event) =>
												updateSelectedSlideField('body', event.currentTarget.value)}
										/>
									</div>
									<div class="na-field">
										<div class="na-field-label">
											Answer choices
											<span class="na-muted" style="font-weight:400">(edit in the question builder below)</span>
										</div>
										<div class="na-choices-placeholder">
											Add, edit and reorder questions in the quiz builder below this panel.
										</div>
									</div>
									<div class="na-field">
										<label class="na-field-label" for="slide-quiz-notes-{activeTopic.topicId}">
											Presenter notes
											<span class="na-muted" style="font-weight:400">(only you see these)</span>
										</label>
										<Textarea
											id="slide-quiz-notes-{activeTopic.topicId}"
											name="presenterNotes"
											placeholder="Why this question, what to watch for…"
											rows={3}
											value={slideValue('presenterNotes')}
											oninput={(event) =>
												updateSelectedSlideField('presenterNotes', event.currentTarget.value)}
										/>
									</div>
								{:else}
									<!-- Content fields -->
									<div class="na-field-grid">
										<div class="na-field">
											<label class="na-field-label" for="slide-title-{activeTopic.topicId}">
												Title
											</label>
											<Input
												id="slide-title-{activeTopic.topicId}"
												name="title"
												placeholder="What this slide is about"
												value={slideValue('title')}
												oninput={(event) =>
													updateSelectedSlideField('title', event.currentTarget.value)}
											/>
										</div>
										<div class="na-field">
											<label class="na-field-label" for="slide-eyebrow-{activeTopic.topicId}">
												Eyebrow / subtitle
											</label>
											<Input
												id="slide-eyebrow-{activeTopic.topicId}"
												name="subtitle"
												placeholder="Section or context label"
												value={slideValue('subtitle')}
												oninput={(event) =>
													updateSelectedSlideField('subtitle', event.currentTarget.value)}
											/>
										</div>
									</div>
									<div class="na-field">
										<label class="na-field-label" for="slide-body-{activeTopic.topicId}">
											Body
										</label>
										<Textarea
											id="slide-body-{activeTopic.topicId}"
											name="body"
											rows={4}
											placeholder="The main text shown on the slide…"
											value={form?.slideUpdateValues?.slideId === selectedSlide.slideId
												? (form.slideUpdateValues.body ?? '')
												: slideValue('body')}
											oninput={(event) =>
												updateSelectedSlideField('body', event.currentTarget.value)}
										/>
									</div>
									<div class="na-field">
										<label class="na-field-label" for="slide-image-{activeTopic.topicId}">
											Image description
											<span class="na-muted" style="font-weight:400">(placeholder label)</span>
										</label>
										<Input
											id="slide-image-{activeTopic.topicId}"
											name="imageDescription"
											placeholder="e.g. Diagram of divine simplicity"
											value={slideValue('imageDescription')}
											oninput={(event) =>
												updateSelectedSlideField('imageDescription', event.currentTarget.value)}
										/>
									</div>
									<div class="na-field">
										<label class="na-field-label" for="slide-notes-{activeTopic.topicId}">
											Presenter notes
											<span class="na-muted" style="font-weight:400">(only you see these)</span>
										</label>
										<Textarea
											id="slide-notes-{activeTopic.topicId}"
											name="presenterNotes"
											placeholder="Talking points, timing cues, anticipated questions…"
											rows={4}
											value={slideValue('presenterNotes')}
											oninput={(event) =>
												updateSelectedSlideField('presenterNotes', event.currentTarget.value)}
										/>
									</div>
								{/if}

								<!-- Type selector (hidden, drives Convex) -->
								<input type="hidden" name="type" value={selectedSlide.type === 'quiz' ? 'quiz' : 'content'} />

								<div class="na-save-row">
									{#if slideStatus}
										<span class="na-save-status">{slideStatus}</span>
									{/if}
									<button
										type="submit"
										class="na-btn na-btn-primary"
										disabled={!selectedSlide || selectedSlide.slideId.startsWith('temp-')}
									>
										{selectedSlide.slideId.startsWith('temp-') ? 'Creating...' : 'Save slide'}
									</button>
								</div>
							</form>

							{#if selectedSlide.type === 'quiz'}
								<div class="na-quiz-builder">
									<div class="na-field-label" style="font-size:13px">
										Questions ({selectedSlide.questions.length})
									</div>

									{#if form?.questionError}
										<Alert variant="destructive">
											<AlertDescription>{form.questionError}</AlertDescription>
										</Alert>
									{/if}

									{#if selectedSlide.questions.length}
										<div class="na-q-list">
											{#each selectedSlide.questions as question, qi (question.questionId)}
												<div class="na-q-item">
													<div class="na-q-item-head">
														<span class="na-type-chip question">{QUESTION_TYPE_LABELS[question.type]}</span>
														<div class="na-reorder">
											<form method="POST" action="?/reorderQuestions" use:enhance={enhanceReorderQuestions()}>
																<input type="hidden" name="slideId" value={selectedSlide.slideId} />
																{@render idInputs('questionIds', moved(selectedSlide.questions, qi, -1).map((q) => q.questionId))}
																<button type="submit" class="na-reorder-btn" disabled={qi === 0} aria-label="Move question up">↑</button>
															</form>
											<form method="POST" action="?/reorderQuestions" use:enhance={enhanceReorderQuestions()}>
																<input type="hidden" name="slideId" value={selectedSlide.slideId} />
																{@render idInputs('questionIds', moved(selectedSlide.questions, qi, 1).map((q) => q.questionId))}
																<button type="submit" class="na-reorder-btn" disabled={qi === selectedSlide.questions.length - 1} aria-label="Move question down">↓</button>
															</form>
															<button type="button" class="na-btn na-btn-sm" onclick={() => startEditQuestion(question)}>Edit</button>
														</div>
													</div>
													<div class="na-q-item-prompt">{question.prompt || 'Untitled question'}</div>
													<ul class="na-q-item-opts">
														{#each questionSummary(question) as opt, oi}
															{@const isCorrect =
																question.type === 'fill_in_the_blank' ||
																(question.correctOptions ?? []).includes(oi)}
															<li class:correct={isCorrect}>
																{#if isCorrect && question.type !== 'fill_in_the_blank'}✓ {/if}{opt}
															</li>
														{/each}
													</ul>
												</div>
											{/each}
										</div>
									{:else}
										<p class="na-muted" style="font-size:13px">No questions yet.</p>
									{/if}

									{#if selectedSlide.slideId.startsWith('temp-')}
										<p class="na-muted" style="font-size:13px">Save the slide before adding questions.</p>
									{:else}
										<form
											method="POST"
											action={qEditingId ? '?/updateQuestion' : '?/createQuestion'}
											class="na-q-form"
											use:enhance={enhanceQuestion}
										>
											<input type="hidden" name="slideId" value={selectedSlide.slideId} />
											{#if qEditingId}
												<input type="hidden" name="questionId" value={qEditingId} />
											{/if}
											<input type="hidden" name="type" value={qType} />

											<div class="na-field">
												<label class="na-field-label" for="q-type-{selectedSlide.slideId}">Question type</label>
												<select
													id="q-type-{selectedSlide.slideId}"
													class="na-input"
													value={qType}
													onchange={(event) => changeType(event.currentTarget.value)}
												>
													{#each Object.entries(QUESTION_TYPE_LABELS) as [value, label]}
														<option {value}>{label}</option>
													{/each}
												</select>
											</div>

											<div class="na-field">
												<label class="na-field-label" for="q-prompt-{selectedSlide.slideId}">Prompt</label>
												<textarea
													id="q-prompt-{selectedSlide.slideId}"
													class="na-input"
													name="prompt"
													rows={2}
													placeholder="Ask your question…"
													bind:value={qPrompt}
												></textarea>
											</div>

											{#if qType === 'fill_in_the_blank'}
												<div class="na-field">
													<div class="na-field-label">Accepted answers</div>
													{#each qAnswers as _, i}
														<div class="na-q-row">
															<input
																class="na-input"
																name="acceptedAnswers"
																placeholder="Accepted answer {i + 1}"
																bind:value={qAnswers[i]}
															/>
															{#if qAnswers.length > 1}
																<button
																	type="button"
																	class="na-reorder-btn"
																	aria-label="Remove answer"
																	onclick={() => (qAnswers = qAnswers.filter((_, idx) => idx !== i))}
																>×</button>
															{/if}
														</div>
													{/each}
													<button
														type="button"
														class="na-btn na-btn-sm"
														onclick={() => (qAnswers = [...qAnswers, ''])}
													>+ Add answer</button>
												</div>
											{:else if qType === 'true_false'}
												<div class="na-field">
													<div class="na-field-label">Correct answer</div>
													{#each ['True', 'False'] as label, i}
														<label class="na-q-row">
															<input
																type="radio"
																name="correctOptions"
																value={i}
																checked={qCorrect.includes(i)}
																onchange={() => toggleCorrect(i)}
															/>
															{label}
														</label>
													{/each}
												</div>
											{:else}
												<div class="na-field">
													<div class="na-field-label">
														Options
														<span class="na-muted" style="font-weight:400">
															({singleCorrect ? 'pick one correct' : 'check all correct'})
														</span>
													</div>
													{#each qOptions as _, i}
														<div class="na-q-row">
															<input
																type={singleCorrect ? 'radio' : 'checkbox'}
																name="correctOptions"
																value={i}
																checked={qCorrect.includes(i)}
																onchange={() => toggleCorrect(i)}
																aria-label="Mark option {i + 1} correct"
															/>
															<input
																class="na-input"
																name="options"
																placeholder="Option {i + 1}"
																bind:value={qOptions[i]}
															/>
															{#if qOptions.length > 2}
																<button
																	type="button"
																	class="na-reorder-btn"
																	aria-label="Remove option"
																	onclick={() => removeOption(i)}
																>×</button>
															{/if}
														</div>
													{/each}
													<button
														type="button"
														class="na-btn na-btn-sm"
														onclick={() => (qOptions = [...qOptions, ''])}
													>+ Add option</button>
												</div>
											{/if}

											<div class="na-save-row">
												{#if qEditingId}
													<button type="button" class="na-btn na-btn-sm" onclick={resetQuestionForm}>Cancel edit</button>
												{/if}
												<button type="submit" class="na-btn na-btn-primary">
													{qEditingId ? 'Save question' : 'Add question'}
												</button>
											</div>
										</form>
									{/if}
								</div>
							{/if}
						</div>
					{:else}
						<div class="na-editor-empty">
							<h3 class="na-editor-empty-title" style="font-size:20px">No slides in this topic</h3>
							<p class="na-muted" style="max-width:40ch;text-align:center">
								Choose what kind of slide to start with.
							</p>
							<div class="na-hstack" style="gap:8px">
								<form
									method="POST"
									action="?/createSlide"
									style="display:contents"
									use:enhance={enhanceCreateSlide(activeTopic.topicId, 'content')}
								>
									<input type="hidden" name="topicId" value={activeTopic.topicId} />
									<input type="hidden" name="type" value="content" />
									<button type="submit" class="na-btn">¶ Content</button>
								</form>
								<form
									method="POST"
									action="?/createSlide"
									style="display:contents"
									use:enhance={enhanceCreateSlide(activeTopic.topicId, 'quiz')}
								>
									<input type="hidden" name="topicId" value={activeTopic.topicId} />
									<input type="hidden" name="type" value="quiz" />
									<button type="submit" class="na-btn">? Question</button>
								</form>
							</div>
						</div>
					{/if}

				</div>
			{/if}
		</main>
	</div>
</div>

<style>
	:global(body) {
		background: var(--na-bg);
		color: var(--na-ink);
		font-family: var(--na-font-sans);
	}

	/* Editor shell */
	.na-editor {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--na-bg);
		color: var(--na-ink);
		font-family: var(--na-font-sans);
		font-size: 15px;
	}

	/* Topbar */
	.na-topbar {
		height: 56px;
		padding: 0 24px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		border-bottom: 1px solid var(--na-line);
		background: var(--na-bg-elevated);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.na-topbar-left,
	.na-hstack {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.na-vstack {
		display: flex;
		flex-direction: column;
	}

	.na-topbar-sep { color: var(--na-line-strong); }

	.na-topbar-title {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.na-topbar-main-label {
		font-size: 13px;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.na-topbar-sublabel {
		font-size: 12px;
		color: var(--na-ink-3);
	}

	/* Editor body */
	.na-editor-body {
		flex: 1;
		display: grid;
		grid-template-columns: 320px 1fr;
		min-height: 0;
	}

	/* Left rail */
	.na-editor-rail {
		border-right: 1px solid var(--na-line);
		background: var(--na-bg);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.na-rail-section {
		padding: 18px;
		display: flex;
		flex-direction: column;
		gap: 9px;
		border-bottom: 1px solid var(--na-line);
	}

	.na-rail-section-topics {
		flex: 1;
		min-height: 0;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.na-rail-section-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 4px;
	}

	.na-rail-label {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--na-ink-3);
	}

	.na-rail-input-title {
		font-family: var(--na-font-serif) !important;
		font-size: 17px !important;
		font-weight: 500;
		padding: 9px 11px;
	}

	.na-rail-topic-list {
		display: flex;
		flex-direction: column;
		gap: 3px;
		overflow-y: auto;
		flex: 1;
		min-height: 0;
	}

	.na-rail-topic {
		padding: 9px 11px;
		border-radius: 6px;
		cursor: pointer;
		transition: background-color var(--motion-fast) var(--motion-ease);
		display: flex;
		flex-direction: column;
		gap: 4px;
		border: 1px solid transparent;
		background: transparent;
		text-align: left;
		width: 100%;
		font-family: var(--na-font-sans);
		color: var(--na-ink);
	}
	.na-rail-topic:hover { background: var(--na-bg-subtle); }
	.na-rail-topic.active {
		background: var(--na-bg-elevated);
		border-color: var(--na-line-strong);
		box-shadow: var(--na-shadow-sm);
	}

	.na-rail-topic-title {
		font-size: 13.5px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.na-rail-topic-title.active-text { font-weight: 500; }

	.na-rail-topic-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11.5px;
		color: var(--na-ink-3);
		padding-left: 20px;
	}

	.na-dot-sep-inline {
		display: inline-block;
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: var(--na-ink-4);
	}

	.na-rail-empty {
		padding: 24px 10px;
		text-align: center;
		font-size: 13px;
		line-height: 1.6;
	}

	/* Canvas */
	.na-editor-canvas {
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow-y: auto;
	}

	.na-editor-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 14px;
		flex: 1;
		text-align: center;
		padding: 60px;
		min-height: 400px;
	}

	.na-editor-empty-glyph {
		width: 56px;
		height: 56px;
		border-radius: 12px;
		background: var(--na-bg-subtle);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--na-font-serif);
		font-size: 26px;
		color: var(--na-ink-3);
	}

	.na-editor-empty-title {
		font-family: var(--na-font-serif);
		font-size: 22px;
		font-weight: 500;
		margin: 0;
		letter-spacing: -0.01em;
	}

	/* Canvas head */
	.na-canvas-head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 24px;
		padding: 22px 30px 0;
		border-bottom: 1px solid var(--na-line);
	}

	.na-canvas-topic-input {
		flex: 1;
		border: none;
		outline: none;
		background: transparent;
		font-family: var(--na-font-serif);
		font-size: 28px;
		font-weight: 500;
		letter-spacing: -0.02em;
		color: var(--na-ink);
		padding: 4px 0 12px;
		border-bottom: 2px solid transparent;
		transition: border-color var(--motion-ui) var(--motion-ease);
		min-width: 0;
		width: 100%;
	}
	.na-canvas-topic-input:hover { border-bottom-color: var(--na-line); }
	.na-canvas-topic-input:focus { border-bottom-color: var(--na-ink); }

	/* Slides editor */
	.na-slides-editor {
		display: grid;
		grid-template-columns: 220px 1fr;
		flex: 1;
		min-height: 0;
	}

	/* Thumbnail rail */
	.na-slides-thumb-rail {
		border-right: 1px solid var(--na-line);
		padding: 18px 13px;
		display: flex;
		flex-direction: column;
		gap: 7px;
		background: var(--na-bg);
		overflow-y: auto;
	}

	.na-thumb {
		position: relative;
		border: 1px solid var(--na-line);
		border-radius: 6px;
		background: var(--na-bg-elevated);
		padding: 7px 9px 9px;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 5px;
		border-left-width: 3px;
	}
	.na-thumb:hover { border-color: var(--na-line-strong); }
	.na-thumb.active { border-color: var(--na-ink); box-shadow: 0 0 0 3px var(--na-bg-hover); }
	.na-thumb-question { border-left-color: #d5a23d; }
	.na-thumb:not(.na-thumb-question) { border-left-color: #4d6f90; }

	.na-thumb-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 5px;
	}

	.na-thumb-preview-title {
		font-family: var(--na-font-serif);
		font-size: 12.5px;
		font-weight: 500;
		line-height: 1.3;
		overflow: hidden;
		line-clamp: 2;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.na-thumb-preview-sub {
		font-size: 10.5px;
		color: var(--na-ink-3);
		font-style: italic;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.na-thumb-remove-wrap {
		position: absolute;
		top: 5px;
		right: 5px;
	}

	.na-thumb-remove {
		width: 18px;
		height: 18px;
		border: none;
		background: var(--na-bg-elevated);
		border-radius: 4px;
		color: var(--na-ink-4);
		cursor: pointer;
		font-size: 13px;
		line-height: 1;
		opacity: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--na-font-sans);
		padding: 0;
	}
	.na-thumb:hover .na-thumb-remove { opacity: 1; }
	.na-thumb-remove:hover { background: var(--na-bg-hover); color: var(--na-ink-2); }

	.na-thumb-add {
		width: 100%;
		border: 1px dashed var(--na-line-strong);
		background: transparent;
		color: var(--na-ink-3);
		padding: 11px;
		border-radius: 6px;
		cursor: pointer;
		font-family: var(--na-font-sans);
		font-size: 13px;
	}
	.na-thumb-add:hover { border-style: solid; color: var(--na-ink); }

	/* Add slide menu */
	.na-add-menu {
		position: absolute;
		left: 0;
		right: 0;
		top: calc(100% + 6px);
		background: var(--na-bg-elevated);
		border: 1px solid var(--na-line-strong);
		border-radius: 8px;
		box-shadow: var(--na-shadow-md);
		z-index: 10;
		padding: 5px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.na-add-menu-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 7px 9px;
		border: none;
		background: transparent;
		border-radius: 5px;
		cursor: pointer;
		text-align: left;
		font-family: var(--na-font-sans);
		color: var(--na-ink);
		width: 100%;
	}
	.na-add-menu-item:hover { background: var(--na-bg-subtle); }
	.na-add-menu-item:disabled { opacity: 0.45; cursor: default; }

	.na-add-menu-glyph {
		width: 28px;
		height: 28px;
		border-radius: 6px;
		background: var(--na-bg-subtle);
		font-family: var(--na-font-serif);
		font-size: 15px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	/* Slide edit area */
	.na-slide-edit-area {
		padding: 26px 30px;
		display: flex;
		flex-direction: column;
		gap: 26px;
		overflow-y: auto;
	}

	/* Slide preview */
	.na-slide-preview-wrap {
		box-shadow: var(--na-shadow-md);
		border-radius: var(--na-radius-lg);
		overflow: hidden;
	}

	/* slide canvas — uses global .na-slide* classes from layout.css */
	.na-slide {
		width: 100%;
		aspect-ratio: 16 / 9;
		background: var(--na-bg-elevated);
		border: 1px solid var(--na-line);
		border-radius: 0;
		overflow: hidden;
		position: relative;
		display: flex;
		flex-direction: column;
		font-family: var(--na-font-serif);
	}

	/* Slide fields */
	.na-slide-fields {
		display: flex;
		flex-direction: column;
		gap: 14px;
		max-width: 880px;
	}

	.na-image-upload-form {
		max-width: 880px;
	}

	.na-image-upload-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 8px;
		align-items: center;
	}

	.na-field-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 13px;
	}

	.na-field {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.na-field-label {
		font-size: 12.5px;
		font-weight: 500;
		color: var(--na-ink-2);
	}

	.na-choices-placeholder {
		padding: 14px 16px;
		border: 1px solid var(--na-line);
		border-radius: var(--na-radius);
		font-size: 13px;
		color: var(--na-ink-3);
		font-style: italic;
		background: var(--na-bg-subtle);
	}

	.na-save-row {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
		min-height: 32px;
	}

	.na-save-status {
		font-size: 12px;
		color: var(--na-ink-3);
	}

	/* Buttons */
	.na-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 13px;
		border-radius: var(--na-radius);
		border: 1px solid var(--na-line-strong);
		background: var(--na-bg-elevated);
		color: var(--na-ink);
		font-size: 13.5px;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color var(--motion-fast) var(--motion-ease),
			border-color var(--motion-fast) var(--motion-ease),
			color var(--motion-fast) var(--motion-ease),
			transform var(--motion-ui) var(--motion-ease-out);
		text-decoration: none;
		white-space: nowrap;
		font-family: var(--na-font-sans);
		line-height: 1;
	}
	.na-btn:hover { background: var(--na-bg-hover); }
	.na-btn:active:not(:disabled) { transform: translateY(1px); }
	.na-btn:disabled { opacity: 0.45; cursor: default; }
	.na-btn:disabled:hover { background: var(--na-bg-elevated); }

	.na-btn-primary {
		background: var(--na-ink);
		color: var(--na-bg);
		border-color: var(--na-ink);
	}
	.na-btn-primary:hover:not(:disabled) { background: var(--na-ink-2); border-color: var(--na-ink-2); }

	.na-btn-ghost {
		background: transparent;
		border-color: transparent;
	}
	.na-btn-ghost:hover:not(:disabled) { background: var(--na-bg-hover); }

	.na-btn-sm { padding: 5px 10px; font-size: 12.5px; }

	/* Input */
	.na-input {
		width: 100%;
		padding: 9px 11px;
		border-radius: var(--na-radius);
		border: 1px solid var(--na-line-strong);
		background: var(--na-bg-elevated);
		font-family: var(--na-font-sans);
		font-size: 14px;
		color: var(--na-ink);
		transition:
			border-color var(--motion-fast) var(--motion-ease),
			box-shadow var(--motion-fast) var(--motion-ease),
			background-color var(--motion-fast) var(--motion-ease);
		outline: none;
	}
	.na-input:focus {
		border-color: var(--na-ink);
		box-shadow: 0 0 0 3px rgba(26,26,25,0.08);
	}

	/* Type chip */
	.na-type-chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 7px;
		border-radius: 3px;
		font-family: var(--na-font-mono);
		font-size: 9.5px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.na-type-chip.content { background: var(--na-bg-subtle); color: var(--na-ink-3); }
	.na-type-chip.question { background: #fdecd0; color: #7a4e12; }

	/* Utilities */
	.na-muted { color: var(--na-ink-3); }
	.na-mono { font-family: var(--na-font-mono); }

	/* Slide canvas elements (local copies for encapsulation) */
	.na-slide-inner {
		flex: 1;
		min-height: 0;
		display: grid;
		grid-template-columns: 1.1fr 1fr;
	}

	.na-slide-text {
		padding: 7% 6%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 14px;
	}

	.na-slide-eyebrow {
		font-family: var(--na-font-sans);
		font-size: 0.78em;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--na-accent-ink);
	}

	.na-slide-title {
		margin: 0;
		font-size: clamp(22px, 3vw, 46px);
		font-weight: 600;
		line-height: 1.05;
		letter-spacing: -0.02em;
	}

	.na-slide-body {
		font-size: clamp(11px, 1.1vw, 16px);
		line-height: 1.65;
		color: var(--na-ink-2);
		white-space: pre-wrap;
	}

	.na-slide-image {
		background:
			repeating-linear-gradient(135deg,
				var(--na-bg-subtle) 0px, var(--na-bg-subtle) 8px,
				var(--na-bg-hover) 8px, var(--na-bg-hover) 16px);
		display: flex;
		align-items: center;
		justify-content: center;
		border-left: 1px solid var(--na-line);
		overflow: hidden;
	}

	.na-slide-image-media {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.na-slide-image-label {
		font-size: 11px;
		color: var(--na-ink-3);
		background: var(--na-bg-elevated);
		padding: 6px 10px;
		border-radius: 4px;
		border: 1px solid var(--na-line);
		max-width: 70%;
		text-align: center;
	}

	.na-slide-footer {
		padding: 10px 22px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		border-top: 1px solid var(--na-line);
		font-family: var(--na-font-sans);
		font-size: 11px;
		color: var(--na-ink-3);
		background: var(--na-bg);
	}

	.na-slide-question {
		padding: 6% 7% 5%;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.na-q-eyebrow {
		font-family: var(--na-font-sans);
		font-size: 0.78em;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--na-accent-ink);
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.na-q-points {
		font-size: 0.72em;
		padding: 2px 6px;
		border-radius: 4px;
		background: var(--na-bg-subtle);
		color: var(--na-ink-3);
	}

	.na-q-prompt {
		font-family: var(--na-font-serif);
		font-size: clamp(16px, 2.2vw, 28px);
		font-weight: 500;
		letter-spacing: -0.015em;
		line-height: 1.2;
		margin: 0;
		max-width: 22ch;
	}

	.na-q-choices {
		display: flex;
		flex-direction: column;
		gap: 7px;
	}

	.na-q-choice {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 13px;
		background: var(--na-bg-elevated);
		border: 1px solid var(--na-line);
		border-radius: var(--na-radius);
		font-family: var(--na-font-sans);
		font-size: clamp(11px, 1vw, 14px);
		color: var(--na-ink);
		min-height: 40px;
	}

	.na-q-letter {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--na-bg-subtle);
		border: 1px solid var(--na-line-strong);
		font-family: var(--na-font-mono);
		font-size: 10px;
		font-weight: 600;
		color: var(--na-ink-2);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	/* Reorder controls */
	.na-rail-topic-row {
		display: flex;
		align-items: stretch;
		gap: 3px;
	}
	.na-rail-topic-row .na-rail-topic { flex: 1; min-width: 0; }

	.na-reorder {
		display: flex;
		align-items: center;
		gap: 3px;
	}
	.na-rail-topic-row .na-reorder {
		flex-direction: column;
		justify-content: center;
	}
	.na-reorder form { display: flex; margin: 0; }

	.na-reorder-btn {
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--na-line-strong);
		background: var(--na-bg-elevated);
		border-radius: 4px;
		cursor: pointer;
		font-size: 11px;
		line-height: 1;
		color: var(--na-ink-2);
		padding: 0;
		font-family: var(--na-font-sans);
		transition:
			background-color var(--motion-fast) var(--motion-ease),
			border-color var(--motion-fast) var(--motion-ease),
			transform var(--motion-ui) var(--motion-ease-out);
	}
	.na-reorder-btn:hover:not(:disabled) { background: var(--na-bg-hover); }
	.na-reorder-btn:active:not(:disabled) { transform: translateY(1px); }
	.na-reorder-btn:disabled { opacity: 0.35; cursor: default; }

	@media (prefers-reduced-motion: reduce) {
		.na-btn,
		.na-input,
		.na-reorder-btn { transition: none; }

		.na-btn:active:not(:disabled),
		.na-reorder-btn:active:not(:disabled) { transform: none; }
	}

	.na-thumb-reorder {
		position: absolute;
		bottom: 5px;
		right: 5px;
		opacity: 0;
	}
	.na-thumb:hover .na-thumb-reorder { opacity: 1; }

	/* Quiz builder */
	.na-quiz-builder {
		display: flex;
		flex-direction: column;
		gap: 14px;
		max-width: 880px;
		border-top: 1px solid var(--na-line);
		padding-top: 20px;
	}

	.na-q-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.na-q-item {
		border: 1px solid var(--na-line);
		border-radius: var(--na-radius);
		padding: 12px 14px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		background: var(--na-bg-elevated);
	}

	.na-q-item-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}
	.na-q-item-head .na-reorder { gap: 6px; }

	.na-q-item-prompt { font-size: 14px; font-weight: 500; }

	.na-q-item-opts {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 13px;
		color: var(--na-ink-3);
	}
	.na-q-item-opts li.correct { color: var(--na-ink); font-weight: 500; }

	.na-q-form {
		display: flex;
		flex-direction: column;
		gap: 12px;
		border: 1px solid var(--na-line);
		border-radius: var(--na-radius);
		padding: 14px;
	}

	.na-q-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.na-q-row .na-input { flex: 1; }

	select.na-input { cursor: pointer; }

	/* Responsive */
	@media (max-width: 1000px) {
		.na-editor-body { grid-template-columns: 280px 1fr; }
		.na-slides-editor { grid-template-columns: 180px 1fr; }
		.na-field-grid { grid-template-columns: 1fr; }
	}

	@media (max-width: 720px) {
		.na-editor-body { grid-template-columns: 1fr; }
		.na-editor-rail { display: none; }
		.na-slides-editor { grid-template-columns: 1fr; }
	}
</style>
