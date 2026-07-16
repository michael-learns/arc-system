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
	import { toast } from 'svelte-sonner';

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

	let activeTopicId = $state(initialTopics[0]?.topicId ?? '');
	let selectedSlideId = $state('');
	let addMenuOpen = $state(false);
	let slideStatus = $state('');
	let slideActionError = $state('');

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
			questionCount: 0
		};

		updateTopicSlides(topicId, (slides) => [...slides, tempSlide]);
		selectedSlideId = tempSlide.slideId;
		addMenuOpen = false;
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
		return () => {
			const snapshot = cloneTopics(topics);
			const tempSlideId = addOptimisticSlide(topicId, type);
			slideActionError = '';
			slideStatus = 'Saving...';
			const toastId = toast.loading('Adding slide...');

			return async ({ result }) => {
				if (result.type === 'success') {
					const payload = result.data as { slideCreated?: { slide?: EditorSlide | null } };
					if (payload.slideCreated?.slide) {
						replaceOptimisticSlide(tempSlideId, payload.slideCreated.slide);
					}
					markSaved('Slide ready', toastId);
					return;
				}

				handleSlideFailure(snapshot, result, toastId);
			};
		};
	}

	const enhanceUpdateSlide: SubmitFunction = (submit) => {
		if (!submit?.formData) {
			return;
		}

		const { cancel, formData } = submit;
		const slideId = String(formData.get('slideId') ?? '');
		if (!slideId) {
			cancel();
			slideActionError = 'Choose a slide before saving it.';
			return;
		}

		if (slideId.startsWith('temp-')) {
			cancel();
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

		return async ({ result }) => {
			if (result.type === 'success') {
				const payload = result.data as { slideUpdated?: { slide?: EditorSlide | null } };
				if (payload.slideUpdated?.slide) {
					replaceSlide(slideId, {
						...payload.slideUpdated.slide,
						questionCount: submittedQuestionCount
					});
				}
				markSaved('Slide saved', toastId);
				return;
			}

			handleSlideFailure(snapshot, result, toastId);
		};
	};

	const enhanceUploadSlideImage: SubmitFunction = (submit) => {
		if (!submit?.formData) {
			return;
		}

		const { cancel, formData } = submit;
		const slideId = String(formData.get('slideId') ?? '');
		const file = formData.get('imageFile');

		if (!slideId || slideId.startsWith('temp-')) {
			cancel();
			slideActionError = 'Save the slide before uploading an image.';
			return;
		}

		if (!(file instanceof File) || file.size === 0) {
			cancel();
			slideActionError = 'Choose an image file first.';
			return;
		}

		if (!file.type.startsWith('image/')) {
			cancel();
			slideActionError = 'Slide images must be image files.';
			return;
		}

		slideActionError = '';
		slideStatus = 'Uploading image...';
		const toastId = toast.loading('Uploading image...');

		return async ({ result }) => {
			if (result.type === 'success') {
				const payload = result.data as { slideImageUploaded?: { slide?: EditorSlide | null } };
				if (payload.slideImageUploaded?.slide) {
					replaceSlide(slideId, payload.slideImageUploaded.slide);
				}
				markSaved('Image uploaded', toastId);
				return;
			}

			handleSlideImageFailure(result, toastId);
		};
	};

	const enhanceDeleteSlide: SubmitFunction = (submit) => {
		if (!submit?.formData) {
			return;
		}

		const { cancel, formData } = submit;
		const slideId = String(formData.get('slideId') ?? '');
		if (!slideId) {
			cancel();
			slideActionError = 'Choose a slide before deleting it.';
			return;
		}

			const snapshot = cloneTopics(topics);
			deleteOptimisticSlide(slideId);
			slideActionError = '';
			slideStatus = 'Deleting...';

			if (slideId.startsWith('temp-')) {
				cancel();
				markSaved('Slide removed');
				return;
			}

			const toastId = toast.loading('Deleting slide...');

			return async ({ result }) => {
				if (result.type === 'success') {
					markSaved('Slide deleted', toastId);
					return;
				}

				handleSlideFailure(snapshot, result, toastId);
			};
	};

	function selectTopic(topic: EditorTopic) {
		activeTopicId = topic.topicId;
		selectedSlideId = topic.slides[0]?.slideId ?? '';
		addMenuOpen = false;
	}

	function selectSlide(slide: EditorSlide) {
		selectedSlideId = slide.slideId;
		addMenuOpen = false;
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
					<form method="POST" action="?/createSection" class="na-hstack" style="gap:6px">
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

				<div class="na-rail-topic-list">
					{#each topics as topic, i}
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
								<span class="na-rail-remove-glyph">×</span>
							</div>
							<div class="na-rail-topic-meta">
								<span>{topic.slideCount} slides</span>
								{#if topic.questionCount > 0}
									<span class="na-dot-sep-inline"></span>
									<span>{topic.questionCount} Q</span>
								{/if}
							</div>
						</button>
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
							</div>
						{/each}

						<!-- Add slide -->
						<div style="position:relative">
							<button
								type="button"
								class="na-thumb-add"
								onclick={() => (addMenuOpen = !addMenuOpen)}
							>+ Add slide</button>

							{#if addMenuOpen}
								<div class="na-add-menu">
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
											<span class="na-muted" style="font-weight:400">(managed separately)</span>
										</div>
										<div class="na-choices-placeholder">
											Question choices are managed in the quiz builder.
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
		transition: background 0.12s ease;
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

	.na-rail-remove-glyph {
		font-size: 17px;
		color: var(--na-ink-4);
		flex-shrink: 0;
	}

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
		transition: border-color 0.15s ease;
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
		transition: all 0.12s ease;
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
		transition: background 0.12s ease;
		text-decoration: none;
		white-space: nowrap;
		font-family: var(--na-font-sans);
		line-height: 1;
	}
	.na-btn:hover { background: var(--na-bg-hover); }
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
		transition: all 0.12s ease;
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
