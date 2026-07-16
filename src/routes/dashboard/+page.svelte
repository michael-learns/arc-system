<script lang="ts">
	import { resolve } from '$app/paths';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Avatar } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select } from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';

	let { data, form } = $props();

	const roles = $derived(data.convexContext?.membership?.roles ?? []);
	const dashboardCourses = $derived(data.dashboard?.courses ?? []);
	const dashboardClassrooms = $derived(data.dashboard?.classrooms ?? []);
	const activeOrganizationName = $derived(
		data.dashboard?.organization.name ??
			data.convexContext?.organization?.name ??
			'No organization'
	);
	const totalStudents = $derived(
		dashboardClassrooms.reduce((count, classroom) => count + classroom.activeStudentCount, 0)
	);

	function getInitials(name: string) {
		return name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('');
	}

	function formatStatusLabel(studentCount: number) {
		return studentCount > 0 ? 'Live' : 'Ready';
	}

	function courseCodeLabel(title: string, index: number) {
		return (
			(title || '')
				.split(/\s+/)
				.slice(0, 2)
				.join('')
				.slice(0, 4)
				.toUpperCase() || `C${index + 1}`
		);
	}

	// gradient per course index
	const coverGradients = [
		'linear-gradient(135deg, oklch(0.92 0.04 60), oklch(0.86 0.06 50))',
		'linear-gradient(135deg, oklch(0.92 0.04 120), oklch(0.86 0.06 110))',
		'linear-gradient(135deg, oklch(0.92 0.04 200), oklch(0.86 0.06 190))',
		'linear-gradient(135deg, oklch(0.92 0.04 280), oklch(0.86 0.06 270))',
	];
</script>

<svelte:head>
	<title>Teacher Workspace · New Adam</title>
</svelte:head>

<div class="na-shell">

	<!-- ── Topbar ───────────────────────────────────────────── -->
	<header class="na-topbar">
		<div class="na-topbar-left">
			<div class="na-brand-mark">A</div>
			<span class="na-brand-name">New Adam</span>
			<span class="na-topbar-sep">/</span>
			<span class="na-topbar-role">Teacher</span>
		</div>
		<div class="na-topbar-right">
			{#if data.session?.organizationId}
				<span class="na-topbar-org">{activeOrganizationName}</span>
			{/if}
			<div class="na-avatar">{getInitials(data.user.firstName ?? data.user.email)}</div>
			<form method="POST" action="/logout">
				<button type="submit" class="na-btn na-btn-ghost na-btn-sm">Sign out</button>
			</form>
		</div>
	</header>

	<!-- ── Main ─────────────────────────────────────────────── -->
	<main class="na-main">

		<!-- State gates -->
		{#if !data.session?.organizationId}
			<div class="na-state-card na-card">
				<div class="na-state-glyph">+</div>
				<div>
					<h2 class="na-state-title">Pick an organization to continue</h2>
					<p class="na-state-copy">Select an organization below to unlock courses and classrooms.</p>
				</div>
			</div>
		{:else if !data.hasFacilitatorAccess}
			<div class="na-state-card na-card">
				<div class="na-state-glyph">!</div>
				<div>
					<h2 class="na-state-title">Facilitator access required</h2>
					<p class="na-state-copy">
						Switch to an admin or facilitator organization below to unlock the teaching workspace.
					</p>
				</div>
			</div>
		{:else}

			<!-- ── Courses ───────────────────────────────────── -->
			<section class="na-section">
				<div class="na-section-head">
					<div>
						<div class="na-eyebrow">
							{data.dashboard?.organization.name ?? 'Workspace'}
						</div>
						<h1 class="na-dash-title">My courses</h1>
					</div>
					<div class="na-hstack">
						<button class="na-btn" disabled>Import deck</button>
					</div>
				</div>

				<div class="na-course-list">
					{#each dashboardCourses as course, ci}
						<div class="na-card na-course-card">
							<div
								class="na-course-cover"
								style="background: {coverGradients[ci % coverGradients.length]}"
							>
								<div class="na-cover-stripe"></div>
								<div class="na-cover-label na-mono">{courseCodeLabel(course.title, ci)}</div>
							</div>
							<div class="na-course-body">
								<div class="na-course-header">
									<div style="min-width:0">
										<h3 class="na-course-title">{course.title}</h3>
										{#if course.description}
											<div class="na-course-desc">{course.description}</div>
										{/if}
									</div>
									<span class="na-badge">{course.status}</span>
								</div>
								<div class="na-course-meta">
									<span>{activeOrganizationName}</span>
									<span class="na-dot-sep"></span>
									<span>{course.topicCount} topics</span>
									<span class="na-dot-sep"></span>
									<span>{course.slideCount} slides</span>
									<span class="na-dot-sep"></span>
									<span>{course.questionCount} questions</span>
								</div>
								<div class="na-topics-row">
									<span class="na-topic-chip">
										<span class="na-mono" style="color:var(--na-ink-4);font-size:11px">01</span>
										{course.topicCount} sections
									</span>
									<span class="na-topic-chip">{course.classroomCount} classrooms</span>
								</div>
								<div class="na-course-actions">
									<a href={resolve(`/dashboard/courses/${course.courseId}`)} class="na-btn">
										Edit course
									</a>
									<button class="na-btn na-btn-accent" disabled title="Live present mode coming soon">
										<span style="font-size:10px;margin-right:2px">●</span> Start live session
									</button>
								</div>
							</div>
						</div>
					{/each}

					<!-- ── Create course ─── -->
					<div class="na-card na-course-composer">
						<div class="na-composer-glyph">+</div>
						<div class="na-composer-body">
							<h3 class="na-composer-title">New course</h3>
							<p class="na-composer-copy">Add topics, slides, and embedded quizzes.</p>

							{#if form?.courseCreationError}
								<Alert variant="destructive">
									<AlertDescription>{form.courseCreationError}</AlertDescription>
								</Alert>
							{/if}

							<form method="POST" action="?/createCourse" class="na-form-grid">
								<div class="na-field na-span-2">
									<Label class="na-label" for="course-title">Course title</Label>
									<Input
										id="course-title"
										name="title"
										placeholder="Foundations of Discipleship"
										value={form?.courseValues?.title ?? ''}
										required
									/>
								</div>
								<div class="na-field na-span-2">
									<Label class="na-label" for="course-desc">Short description</Label>
									<Textarea
										id="course-desc"
										name="description"
										placeholder="What is this course about?"
									>{form?.courseValues?.description ?? ''}</Textarea>
								</div>
								<div class="na-form-footer na-span-2">
									<span class="na-form-note">New courses start as drafts.</span>
									<button type="submit" class="na-btn na-btn-primary">Create course</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			</section>

			<!-- ── Classrooms / Roster ───────────────────────── -->
			<section class="na-section na-roster-section">
				<div class="na-section-head">
					<div>
						<h2 class="na-roster-title">My classrooms</h2>
						<div class="na-muted" style="font-size:13px;margin-top:4px">
							Active teaching groups across your courses
						</div>
					</div>
					<div class="na-roster-stats">
						<div class="na-roster-stat">
							<div class="na-roster-stat-num">{dashboardClassrooms.length}</div>
							<div class="na-roster-stat-label">classrooms</div>
						</div>
						<div class="na-roster-stat">
							<div class="na-roster-stat-num">{totalStudents}</div>
							<div class="na-roster-stat-label">students</div>
						</div>
					</div>
				</div>

				<!-- Create classroom composer -->
				<div class="na-card na-classroom-composer">
					<div class="na-composer-glyph na-composer-glyph-sm">+</div>
					<div class="na-composer-body">
						<h3 class="na-composer-title na-composer-title-sm">Create a classroom</h3>

						{#if form?.classroomCreationError}
							<Alert variant="destructive">
								<AlertDescription>{form.classroomCreationError}</AlertDescription>
							</Alert>
						{/if}

						<form method="POST" action="?/createClassroom" class="na-form-grid na-form-grid-2">
							<div class="na-field">
								<Label class="na-label" for="classroom-name">Name</Label>
								<Input
									id="classroom-name"
									name="name"
									placeholder="Tuesday Cohort"
									value={form?.classroomValues?.name ?? ''}
									required
								/>
							</div>
							<div class="na-field">
								<Label class="na-label" for="classroom-course">Course</Label>
								<Select
									id="classroom-course"
									name="courseId"
									disabled={!dashboardCourses.length}
									required
								>
									<option value="">Choose a course</option>
									{#each dashboardCourses as course}
										<option
											value={course.courseId}
											selected={form?.classroomValues?.courseId === course.courseId}
										>
											{course.title}
										</option>
									{/each}
								</Select>
							</div>
							<div class="na-form-footer na-span-2">
								<span class="na-form-note">
									{#if dashboardCourses.length}
										Links a course to a learner group.
									{:else}
										Create a course first.
									{/if}
								</span>
								<button
									type="submit"
									class="na-btn na-btn-primary"
									disabled={!dashboardCourses.length}
								>
									Create classroom
								</button>
							</div>
						</form>
					</div>
				</div>

				<!-- Classroom table -->
				<div class="na-card na-roster-card">
					<div class="na-roster-head-row">
						<div>Classroom</div>
						<div>Course</div>
						<div>Students</div>
						<div>Status</div>
					</div>
					{#if dashboardClassrooms.length}
						{#each dashboardClassrooms as classroom}
							<div class="na-roster-row">
								<div class="na-hstack" style="gap:10px;min-width:0">
									<div class="na-roster-avatar">
										{getInitials(classroom.name)}
									</div>
									<div class="na-vstack" style="gap:1px;min-width:0">
										<span style="font-weight:500;font-size:14px">{classroom.name}</span>
										<span class="na-mono na-muted" style="font-size:11px">classroom</span>
									</div>
								</div>
								<div class="na-muted" style="font-size:13px">{classroom.courseTitle}</div>
								<div class="na-mono" style="font-size:13px">{classroom.activeStudentCount}</div>
								<div>
									<span class="na-badge {classroom.activeStudentCount > 0 ? 'na-badge-live' : ''}">
										{formatStatusLabel(classroom.activeStudentCount)}
									</span>
								</div>
							</div>
						{/each}
					{:else}
						<div class="na-roster-empty na-muted">
							No classrooms yet — create the first one above.
						</div>
					{/if}
				</div>
			</section>

		{/if}

		<!-- ── Organizations ─────────────────────────────────── -->
		<section class="na-section na-org-section">
			<div class="na-section-head-sm">
				<h2 class="na-org-title">Organizations</h2>
			</div>

			<div class="na-org-layout">
				<!-- Org list -->
				<div class="na-card na-org-list-card">
					<div class="na-card-section-head">
						<span class="na-eyebrow" style="margin:0">Switch workspace</span>
					</div>
					{#if form?.selectionError}
						<Alert variant="destructive" class="mb-3">
							<AlertDescription>{form.selectionError}</AlertDescription>
						</Alert>
					{/if}
					<div class="na-org-list">
						{#each data.organizationOptions as org}
							<div class="na-org-row {org.isActive ? 'active' : ''}">
								<div>
									<div class="na-org-name">{org.organizationName}</div>
									<div class="na-org-role">
										{org.roles.length ? org.roles.join(' · ') : org.role ?? 'Member'}
									</div>
								</div>
								<form method="POST" action="?/selectOrganization">
									<input type="hidden" name="organizationId" value={org.organizationId} />
									<button
										type="submit"
										class="na-btn na-btn-sm {org.isActive ? 'na-btn-ghost' : ''}"
										disabled={org.isActive}
									>
										{org.isActive ? 'Current' : 'Use'}
									</button>
								</form>
							</div>
						{/each}
						{#if !data.organizationOptions.length}
							<div class="na-muted" style="font-size:13px;padding:8px 0">
								No organizations yet.
							</div>
						{/if}
					</div>
				</div>

				<!-- Create org -->
				<div class="na-card na-org-create-card">
					<div class="na-card-section-head">
						<span class="na-eyebrow" style="margin:0">New organization</span>
					</div>
					{#if form?.creationError}
						<Alert variant="destructive" class="mb-3">
							<AlertDescription>{form.creationError}</AlertDescription>
						</Alert>
					{/if}
					<form method="POST" action="?/createOrganization" class="na-vstack" style="gap:10px">
						<div class="na-field">
							<Label class="na-label" for="org-name">Name</Label>
							<Input id="org-name" name="name" placeholder="Grace Seminary" />
						</div>
						<button type="submit" class="na-btn na-btn-primary" style="align-self:flex-start">
							Create organization
						</button>
					</form>
				</div>
			</div>
		</section>

		<div class="na-dash-foot na-muted">
			New Adam · Discipleship course platform
		</div>

	</main>
</div>

<style>
	:global(body) {
		background: var(--na-bg);
		color: var(--na-ink);
		font-family: var(--na-font-sans);
	}

	/* Shell */
	.na-shell {
		min-height: 100vh;
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
		background: var(--na-bg);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.na-topbar-left,
	.na-topbar-right,
	.na-hstack {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.na-vstack {
		display: flex;
		flex-direction: column;
	}

	.na-brand-mark {
		width: 24px;
		height: 24px;
		border-radius: 5px;
		background: var(--na-ink);
		color: var(--na-bg);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--na-font-serif);
		font-weight: 600;
		font-size: 14px;
	}

	.na-brand-name {
		font-family: var(--na-font-serif);
		font-size: 16px;
		font-weight: 500;
		letter-spacing: -0.01em;
	}

	.na-topbar-sep {
		color: var(--na-line-strong);
	}

	.na-topbar-role {
		color: var(--na-ink-3);
		font-size: 14px;
	}

	.na-topbar-org {
		color: var(--na-ink-3);
		font-size: 13px;
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.na-avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--na-accent-soft);
		color: var(--na-accent-ink);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		font-weight: 600;
		border: 1px solid var(--na-line);
	}

	/* Main */
	.na-main {
		max-width: 1100px;
		margin: 0 auto;
		padding: 56px 32px 80px;
	}

	/* Sections */
	.na-section {
		margin-bottom: 56px;
	}

	.na-roster-section {
		margin-top: 56px;
	}

	.na-org-section {
		margin-top: 56px;
		padding-top: 20px;
		border-top: 1px solid var(--na-line);
	}

	.na-section-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		margin-bottom: 28px;
	}

	.na-section-head-sm {
		margin-bottom: 16px;
	}

	.na-eyebrow {
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--na-ink-3);
		margin-bottom: 4px;
	}

	.na-dash-title {
		font-family: var(--na-font-serif);
		font-size: 38px;
		font-weight: 500;
		margin: 0;
		letter-spacing: -0.02em;
	}

	.na-roster-title,
	.na-org-title {
		font-family: var(--na-font-serif);
		font-size: 28px;
		font-weight: 500;
		margin: 0;
		letter-spacing: -0.02em;
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

	.na-btn-accent {
		background: oklch(0.62 0.13 60);
		color: white;
		border-color: oklch(0.62 0.13 60);
	}
	.na-btn-accent:hover:not(:disabled) { filter: brightness(0.95); }

	.na-btn-ghost {
		background: transparent;
		border-color: transparent;
	}
	.na-btn-ghost:hover:not(:disabled) { background: var(--na-bg-hover); }

	.na-btn-sm { padding: 5px 10px; font-size: 12.5px; }

	/* Cards */
	.na-card {
		background: var(--na-bg-elevated);
		border: 1px solid var(--na-line);
		border-radius: var(--na-radius-lg);
		transition: all 0.15s ease;
	}

	/* Course cards */
	.na-course-list { display: grid; gap: 16px; }

	.na-course-card {
		display: grid;
		grid-template-columns: 220px 1fr;
		overflow: hidden;
	}

	.na-course-cover {
		position: relative;
		display: flex;
		align-items: flex-end;
		padding: 20px;
	}

	.na-cover-stripe {
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(45deg, transparent 0 18px, rgba(0,0,0,0.03) 18px 19px);
	}

	.na-cover-label {
		position: relative;
		color: var(--na-ink);
		font-size: 12px;
		font-weight: 500;
		letter-spacing: 0.08em;
	}

	.na-course-body {
		padding: 22px 26px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.na-course-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}

	.na-course-title {
		font-family: var(--na-font-serif);
		font-size: 22px;
		font-weight: 500;
		margin: 0;
		letter-spacing: -0.01em;
	}

	.na-course-desc {
		font-size: 13px;
		color: var(--na-ink-3);
		margin-top: 4px;
	}

	.na-badge {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		padding: 3px 8px;
		border-radius: 4px;
		background: var(--na-accent-soft);
		color: var(--na-accent-ink);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.na-badge-live {
		background: oklch(0.92 0.08 145);
		color: oklch(0.35 0.12 145);
	}

	.na-course-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--na-ink-3);
		flex-wrap: wrap;
	}

	.na-dot-sep {
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: var(--na-ink-4);
		flex-shrink: 0;
	}

	.na-topics-row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.na-topic-chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 4px 10px;
		border: 1px solid var(--na-line);
		border-radius: 999px;
		background: var(--na-bg-subtle);
		font-size: 12px;
	}

	.na-course-actions {
		display: flex;
		gap: 8px;
		margin-top: auto;
		padding-top: 4px;
	}

	/* Composer cards */
	.na-course-composer,
	.na-classroom-composer {
		display: flex;
		align-items: flex-start;
		gap: 18px;
		padding: 28px 32px;
	}

	.na-composer-glyph {
		width: 48px;
		height: 48px;
		border-radius: 8px;
		background: var(--na-bg-subtle);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 26px;
		color: var(--na-ink-3);
		flex-shrink: 0;
	}

	.na-composer-glyph-sm {
		width: 38px;
		height: 38px;
		font-size: 20px;
	}

	.na-composer-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.na-composer-title {
		font-family: var(--na-font-serif);
		font-size: 20px;
		font-weight: 500;
		margin: 0;
		letter-spacing: -0.01em;
	}

	.na-composer-title-sm {
		font-size: 17px;
	}

	.na-composer-copy {
		font-size: 13px;
		color: var(--na-ink-3);
		margin: 0;
	}

	/* Form grid */
	.na-form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.na-form-grid-2 {
		grid-template-columns: 1fr 1fr;
		align-items: end;
	}

	.na-span-2 { grid-column: 1 / -1; }

	.na-field {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.na-form-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.na-form-note {
		font-size: 12.5px;
		color: var(--na-ink-3);
	}

	:global(.na-label) {
		font-size: 12.5px;
		font-weight: 500;
		color: var(--na-ink-2);
		display: block;
		margin-bottom: 4px;
	}

	/* Roster stats */
	.na-roster-stats {
		display: flex;
		gap: 32px;
	}

	.na-roster-stat { text-align: right; }

	.na-roster-stat-num {
		font-size: 24px;
		font-weight: 500;
		color: var(--na-ink);
		line-height: 1.1;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.01em;
	}

	.na-roster-stat-label {
		font-size: 11px;
		color: var(--na-ink-3);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		margin-top: 4px;
	}

	/* Roster table */
	.na-roster-card { padding: 0; overflow: hidden; }

	.na-roster-head-row,
	.na-roster-row {
		display: grid;
		grid-template-columns: minmax(180px, 1.6fr) minmax(150px, 1.2fr) 90px 110px;
		gap: 20px;
		align-items: center;
		padding: 13px 22px;
	}

	.na-roster-head-row {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--na-ink-3);
		background: var(--na-bg-subtle);
		border-bottom: 1px solid var(--na-line);
	}

	.na-roster-row {
		border-bottom: 1px solid var(--na-line);
		transition: background 0.12s ease;
	}
	.na-roster-row:last-child { border-bottom: none; }
	.na-roster-row:hover { background: var(--na-bg-subtle); }

	.na-roster-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--na-accent-soft);
		color: var(--na-accent-ink);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11.5px;
		font-weight: 600;
		flex-shrink: 0;
		border: 1px solid var(--na-line);
	}

	.na-roster-empty {
		padding: 32px;
		text-align: center;
		font-size: 14px;
	}

	/* State cards */
	.na-state-card {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 28px 32px;
		margin-bottom: 40px;
	}

	.na-state-glyph {
		width: 44px;
		height: 44px;
		border-radius: 8px;
		background: var(--na-bg-subtle);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 20px;
		color: var(--na-ink-3);
		flex-shrink: 0;
	}

	.na-state-title {
		font-family: var(--na-font-serif);
		font-size: 22px;
		font-weight: 500;
		margin: 0;
		letter-spacing: -0.01em;
	}

	.na-state-copy {
		font-size: 14px;
		color: var(--na-ink-3);
		margin: 4px 0 0;
	}

	/* Org section */
	.na-org-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	.na-org-list-card,
	.na-org-create-card {
		padding: 20px 22px;
	}

	.na-card-section-head {
		margin-bottom: 14px;
	}

	.na-org-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.na-org-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 12px;
		border-radius: var(--na-radius);
		border: 1px solid var(--na-line);
		background: var(--na-bg);
	}
	.na-org-row.active {
		background: var(--na-bg-subtle);
		border-color: var(--na-line-strong);
	}

	.na-org-name {
		font-size: 14px;
		font-weight: 500;
	}

	.na-org-role {
		font-size: 12px;
		color: var(--na-ink-3);
		margin-top: 2px;
	}

	/* Footer */
	.na-dash-foot {
		margin-top: 56px;
		padding-top: 20px;
		border-top: 1px solid var(--na-line);
		font-size: 13px;
	}

	/* Utilities */
	.na-muted { color: var(--na-ink-3); }
	.na-mono { font-family: var(--na-font-mono); }

	/* Responsive */
	@media (max-width: 800px) {
		.na-main { padding: 32px 20px 60px; }
		.na-course-card { grid-template-columns: 1fr; }
		.na-course-cover { min-height: 100px; }
		.na-org-layout { grid-template-columns: 1fr; }
		.na-form-grid { grid-template-columns: 1fr; }
		.na-form-grid-2 { grid-template-columns: 1fr; }
		.na-roster-head-row { display: none; }
		.na-roster-row { grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px 16px; }
		.na-section-head { flex-direction: column; align-items: flex-start; }
		.na-roster-stats { gap: 16px; }
	}
</style>
