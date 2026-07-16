<script lang="ts">
	import { page } from '$app/state';

	let { data } = $props();

	let scrollY = $state(0);

	// In the prototype every CTA opened a fake auth modal that wrote a session to
	// localStorage and routed to index.html. This app has real auth via the WorkOS
	// hosted flow, so the CTAs route into /login (or /dashboard once signed in).
	const signedIn = $derived(Boolean(data.user));
	const primaryHref = $derived(signedIn ? '/dashboard' : '/login');
	const primaryLabel = $derived(signedIn ? 'Open dashboard' : 'Start teaching free');
	const authError = $derived(page.url.searchParams.get('authError'));
	const authErrorMessage = $derived.by(() => {
		switch (authError) {
			case 'login_unavailable':
				return 'Login is temporarily unavailable on this environment. Add the WorkOS settings to enable sign-in.';
			case 'login_failed':
				return 'We could not finish signing you in. Please try again.';
			default:
				return null;
		}
	});
</script>

<svelte:head>
	<title>New Adam — Live lectures, in sync</title>
	<meta
		name="description"
		content="New Adam keeps your slides in lockstep with every student in the room — questions, reflections and all."
	/>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap"
	/>
</svelte:head>

<svelte:window bind:scrollY />

<div class="na-landing">
	{#if authErrorMessage}
		<div class="auth-alert" role="alert">
			{authErrorMessage}
		</div>
	{/if}

	<nav class="nav" class:scrolled={scrollY > 8}>
		<div class="brand">
			<div class="brand-mark">N</div>
			<span class="brand-name">New Adam</span>
		</div>
		<div class="nav-links">
			<a class="nav-link" href="#features">Features</a>
			<a class="nav-link" href="#how">How it works</a>
			{#if signedIn}
				<a class="nav-link nav-cta btn btn-primary" href="/dashboard">Open dashboard</a>
			{:else}
				<a class="nav-link" href="/login">Log in</a>
				<a class="nav-link nav-cta btn btn-primary" href="/login">Get started</a>
			{/if}
		</div>
	</nav>

	<header class="hero">
		<div class="hero-copy">
			<span class="eyebrow"><span class="live-dot"></span> Live lectures, perfectly in sync</span>
			<h1>Teach the room. <em>Reach</em> every screen.</h1>
			<p class="lede">
				New Adam keeps your slides in lockstep with every student in the room — questions,
				reflections and all. You present from one screen; they follow, answer, and take notes from
				theirs.
			</p>
			<div class="hero-cta">
				<a class="btn btn-primary btn-lg" href={primaryHref}>{primaryLabel}</a>
				<a class="btn btn-lg" href="/login">I have a class code</a>
			</div>
			<div class="hero-note">
				<span>No setup for students</span><span class="sep"></span>
				<span>Works on any device</span><span class="sep"></span>
				<span>Free for educators</span>
			</div>
		</div>

		<div class="stage" aria-hidden="true">
			<div class="panel">
				<div class="panel-bar">
					<span class="tl"></span><span class="tl"></span><span class="tl"></span>
					<span class="tag">Teacher · presenting</span>
				</div>
				<div class="mini-slide">
					<div class="mini-body">
						<div class="mini-text">
							<div class="mini-eyebrow">God from Himself</div>
							<h3 class="mini-title">Aseity</h3>
							<div class="mini-line" style="width:90%"></div>
							<div class="mini-line" style="width:78%"></div>
							<div class="mini-line" style="width:84%"></div>
						</div>
						<div class="mini-img"><span>Burning bush — Moses</span></div>
					</div>
					<div class="mini-foot"><span>Theology 101</span><span>03 / 16</span></div>
				</div>
			</div>

			<div class="panel student-panel">
				<div class="panel-bar">
					<span class="live-dot"></span><span style="font-weight:500;color:var(--ink-2)">Student</span
					><span class="tag">following</span>
				</div>
				<div class="sp-head">
					<div class="sp-course">Theology 101</div>
					<div class="sp-meta">THEO-101 · Maria C.</div>
				</div>
				<div class="sp-progress">
					<div class="sp-track">
						<div class="sp-fill"></div>
						<div class="sp-tick seen" style="left:6%"></div>
						<div class="sp-tick seen" style="left:28%"></div>
						<div class="sp-tick cur" style="left:50%"></div>
						<div class="sp-tick" style="left:72%"></div>
						<div class="sp-tick" style="left:94%"></div>
					</div>
				</div>
				<div class="sp-card">
					<div class="sp-q-eyebrow">Quick check <span class="sp-q-pts">2 PTS</span></div>
					<h4 class="sp-q-title">Which attribute names God's self-existence?</h4>
					<div class="sp-choice"><span class="sp-letter">A</span><span>Omnipotence</span></div>
					<div class="sp-choice correct">
						<span class="sp-letter">B</span><span>Aseity</span><span class="sp-mark">Correct</span>
					</div>
					<div class="sp-choice"><span class="sp-letter">C</span><span>Omniscience</span></div>
				</div>
			</div>

			<div class="sync-wire"><span class="live-dot"></span> Synced live</div>
		</div>
	</header>

	<section class="proof">
		<div class="proof-label">Built for classrooms, seminaries &amp; study groups</div>
		<div class="proof-row">
			<span class="proof-item">St. Aldate's College</span>
			<span class="proof-item">Wheaton Divinity</span>
			<span class="proof-item">Grace Seminary</span>
			<span class="proof-item">Trinity House</span>
			<span class="proof-item">Cornerstone Univ.</span>
		</div>
	</section>

	<section class="features" id="features">
		<div class="features-head">
			<h2>Everything a live lecture needs — nothing it doesn't.</h2>
			<p>
				Slides, questions and reflections in a single flow. You stay in control of the pace; students
				never lose their place.
			</p>
		</div>
		<div class="feature-grid">
			<div class="feature">
				<div class="feature-glyph">↔</div>
				<h3>Real-time sync</h3>
				<p>
					Advance a slide and every student's screen moves with you — instantly, with a gentle cue so
					no one's left behind.
				</p>
			</div>
			<div class="feature">
				<div class="feature-glyph">?</div>
				<h3>Questions inline</h3>
				<p>
					Drop multiple-choice checks right into the slide flow. Students answer on their device;
					correct answers reveal on cue.
				</p>
			</div>
			<div class="feature">
				<div class="feature-glyph">✎</div>
				<h3>Guided notes</h3>
				<p>
					Give students a reflection prompt with starter text they can build on. Their notes save to
					their device, per slide.
				</p>
			</div>
			<div class="feature">
				<div class="feature-glyph">⊞</div>
				<h3>Private presenter view</h3>
				<p>
					Your talking points, timing cues and what's-next sit below the slide — visible only to you,
					on stage or on mobile.
				</p>
			</div>
			<div class="feature">
				<div class="feature-glyph">▤</div>
				<h3>Progress at a glance</h3>
				<p>
					See who's keeping up. Every student's progress through the course rolls up to your dashboard
					automatically.
				</p>
			</div>
			<div class="feature">
				<div class="feature-glyph">◐</div>
				<h3>Any screen, anywhere</h3>
				<p>
					Teach from a laptop, follow from a phone. The room joins with a short code — no installs, no
					accounts required.
				</p>
			</div>
		</div>
	</section>

	<section class="steps" id="how">
		<div class="steps-inner">
			<div>
				<h2>From slide deck to live class in minutes.</h2>
				<p class="steps-lede">
					Build your course once. Run it live as many times as you like — the room just needs the
					code.
				</p>
			</div>
			<div class="step-list">
				<div class="step">
					<div class="step-num">1</div>
					<div>
						<h4>Create a course</h4>
						<p>Add topics, then build a flowing deck of content, question and notes slides.</p>
					</div>
				</div>
				<div class="step">
					<div class="step-num">2</div>
					<div>
						<h4>Go live</h4>
						<p>Open present mode and hit broadcast. Share the class code with your students.</p>
					</div>
				</div>
				<div class="step">
					<div class="step-num">3</div>
					<div>
						<h4>Teach in sync</h4>
						<p>Students follow every slide, answer questions and take notes — all in real time.</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="cta">
		<h2>Your next lecture, <em>in sync</em>.</h2>
		<p>Join the educators running calmer, more connected live classes with New Adam.</p>
		<a class="btn btn-primary btn-lg" href={primaryHref}>Get started — it's free</a>
	</section>

	<footer class="na-footer">
		<div class="footer-inner">
			<div class="brand">
				<div class="brand-mark" style="width:22px;height:22px;font-size:13px;border-radius:6px;">N</div>
				<span style="font-family:var(--font-serif);font-size:15px;">New Adam</span>
			</div>
			<div>© Spring 2026 · <a href="/login">Log in</a></div>
		</div>
	</footer>
</div>

<style>
	/* ——— New Adam design tokens (scoped to the landing) ——— */
	.na-landing {
		--bg: #fafaf7;
		--bg-elevated: #ffffff;
		--bg-subtle: #f4f3ee;
		--bg-hover: #efeee8;
		--ink: #1a1a19;
		--ink-2: #45433e;
		--ink-3: #807d74;
		--ink-4: #b8b5ac;
		--line: #e8e6de;
		--line-strong: #d4d1c7;
		--accent: oklch(0.62 0.13 60);
		--accent-soft: oklch(0.94 0.04 60);
		--accent-ink: oklch(0.42 0.13 60);
		--live: oklch(0.58 0.18 25);
		--radius: 6px;
		--radius-lg: 10px;
		--shadow-sm: 0 1px 2px rgba(20, 18, 12, 0.04), 0 0 0 1px rgba(20, 18, 12, 0.04);
		--shadow-md: 0 2px 8px rgba(20, 18, 12, 0.06), 0 0 0 1px rgba(20, 18, 12, 0.05);
		--shadow-lg: 0 12px 32px rgba(20, 18, 12, 0.1), 0 0 0 1px rgba(20, 18, 12, 0.06);
		--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
		--font-serif: 'Lora', Georgia, serif;
		--font-mono: 'JetBrains Mono', ui-monospace, monospace;

		min-height: 100vh;
		background: var(--bg);
		color: var(--ink);
		font-family: var(--font-sans);
		font-size: 15px;
		line-height: 1.5;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}
	.na-landing :global(*) {
		box-sizing: border-box;
	}
	.na-landing a {
		color: inherit;
		text-decoration: none;
	}

	/* ——— Buttons (from shared styles.css) ——— */
	.btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		border-radius: var(--radius);
		border: 1px solid var(--line-strong);
		background: var(--bg-elevated);
		color: var(--ink);
		font-size: 13.5px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.12s ease;
		text-decoration: none;
		white-space: nowrap;
	}
	.btn:hover {
		background: var(--bg-hover);
	}
	.btn-primary {
		background: var(--ink);
		color: var(--bg-elevated);
		border-color: var(--ink);
	}
	.btn-primary:hover {
		background: var(--ink-2);
		border-color: var(--ink-2);
		color: var(--bg-elevated);
	}
	.na-landing a.btn-primary,
	.na-landing a.btn-primary:hover,
	.na-landing a.btn-primary:visited,
	.nav-link.btn-primary,
	.nav-link.btn-primary:hover,
	.nav-link.btn-primary:visited {
		color: var(--bg-elevated);
	}
	.btn-lg {
		padding: 11px 18px;
		font-size: 14.5px;
	}

	/* ——— Nav ——— */
	.nav {
		position: sticky;
		top: 0;
		z-index: 40;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 18px 40px;
		background: color-mix(in srgb, var(--bg) 82%, transparent);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		border-bottom: 1px solid transparent;
		transition: border-color 0.2s ease;
	}
	.auth-alert {
		width: min(960px, calc(100% - 32px));
		margin: 24px auto 0;
		padding: 14px 18px;
		border: 1px solid rgba(215, 38, 61, 0.24);
		border-radius: 16px;
		background: rgba(255, 244, 230, 0.92);
		color: #7a1f2c;
		font-size: 0.95rem;
		font-weight: 600;
		line-height: 1.5;
		box-shadow: 0 12px 32px rgba(100, 40, 24, 0.08);
	}
	.nav.scrolled {
		border-bottom-color: var(--line);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.brand-mark {
		width: 28px;
		height: 28px;
		border-radius: 7px;
		background: var(--ink);
		color: var(--bg);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-serif);
		font-weight: 600;
		font-size: 16px;
	}
	.brand-name {
		font-family: var(--font-serif);
		font-size: 19px;
		font-weight: 500;
		letter-spacing: -0.01em;
	}
	.nav-links {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.nav-link {
		font-size: 14px;
		color: var(--ink-2);
		padding: 8px 12px;
		border-radius: var(--radius);
		transition: background 0.12s ease;
	}
	.nav-link:hover {
		background: var(--bg-hover);
	}
	.nav-cta:hover {
		background: var(--ink-2);
	}

	/* ——— Hero ——— */
	.hero {
		max-width: 1180px;
		margin: 0 auto;
		padding: 70px 40px 44px;
		display: grid;
		grid-template-columns: 1.02fr 1.12fr;
		gap: 56px;
		align-items: center;
	}
	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		font-size: 12.5px;
		font-weight: 500;
		color: var(--ink-3);
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 5px 13px 5px 9px;
		margin-bottom: 26px;
		background: var(--bg-elevated);
	}
	.live-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--live);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--live) 22%, transparent);
		animation: blip 1.8s ease-in-out infinite;
	}
	@keyframes blip {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.4;
		}
	}
	.hero h1 {
		font-family: var(--font-serif);
		font-size: clamp(40px, 5.2vw, 64px);
		font-weight: 500;
		letter-spacing: -0.025em;
		line-height: 1.03;
		margin: 0 0 22px;
		text-wrap: balance;
	}
	.hero h1 em {
		font-style: italic;
		color: var(--accent-ink);
	}
	.hero .lede {
		font-size: 18px;
		line-height: 1.6;
		color: var(--ink-2);
		max-width: 46ch;
		margin: 0 0 32px;
		text-wrap: pretty;
	}
	.hero-cta {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}
	.hero-note {
		margin-top: 20px;
		font-size: 13px;
		color: var(--ink-3);
		display: flex;
		align-items: center;
		gap: 9px;
	}
	.hero-note .sep {
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: var(--ink-4);
	}

	/* ——— Product visual ——— */
	.stage {
		position: relative;
		display: grid;
		grid-template-columns: 1.38fr 1fr;
		gap: 16px;
		align-items: stretch;
	}
	.panel {
		background: var(--bg-elevated);
		border: 1px solid var(--line);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
	.panel-bar {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 10px 14px;
		border-bottom: 1px solid var(--line);
		font-size: 11px;
		color: var(--ink-3);
	}
	.panel-bar .tag {
		margin-left: auto;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.tl {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--line-strong);
	}
	.mini-slide {
		flex: 1;
		display: flex;
		flex-direction: column;
	}
	.mini-body {
		flex: 1;
		display: grid;
		grid-template-columns: 1.1fr 0.9fr;
	}
	.mini-text {
		padding: 20px 18px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		justify-content: center;
	}
	.mini-eyebrow {
		font-size: 9px;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--accent-ink);
	}
	.mini-title {
		font-family: var(--font-serif);
		font-size: 23px;
		font-weight: 600;
		line-height: 1.08;
		letter-spacing: -0.02em;
		margin: 0;
	}
	.mini-line {
		height: 6px;
		border-radius: 4px;
		background: var(--bg-hover);
	}
	.mini-img {
		background: repeating-linear-gradient(
			135deg,
			var(--bg-subtle) 0 7px,
			var(--bg-hover) 7px 14px
		);
		border-left: 1px solid var(--line);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.mini-img span {
		font-family: var(--font-mono);
		font-size: 8.5px;
		color: var(--ink-3);
		background: var(--bg-elevated);
		border: 1px solid var(--line);
		padding: 4px 7px;
		border-radius: 4px;
		text-align: center;
		max-width: 80%;
	}
	.mini-foot {
		padding: 8px 15px;
		border-top: 1px solid var(--line);
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-family: var(--font-sans);
		font-size: 10px;
		color: var(--ink-3);
	}

	.student-panel {
		background: var(--bg);
	}
	.sp-head {
		padding: 13px 15px;
		border-bottom: 1px solid var(--line);
	}
	.sp-course {
		font-family: var(--font-serif);
		font-size: 14px;
		font-weight: 500;
		letter-spacing: -0.01em;
	}
	.sp-meta {
		font-size: 10.5px;
		color: var(--ink-3);
		margin-top: 2px;
	}
	.sp-progress {
		padding: 12px 15px;
	}
	.sp-track {
		position: relative;
		height: 4px;
		background: var(--line);
		border-radius: 999px;
	}
	.sp-fill {
		position: absolute;
		inset: 0 auto 0 0;
		width: 62%;
		background: var(--accent);
		border-radius: 999px;
	}
	.sp-tick {
		position: absolute;
		top: 50%;
		width: 6px;
		height: 6px;
		margin: -3px 0 0 -3px;
		border-radius: 50%;
		background: var(--bg-elevated);
		border: 1.5px solid var(--line-strong);
	}
	.sp-tick.seen {
		background: var(--accent);
		border-color: var(--accent);
	}
	.sp-tick.cur {
		background: var(--ink);
		border-color: var(--ink);
		width: 9px;
		height: 9px;
		margin: -4.5px 0 0 -4.5px;
		box-shadow: 0 0 0 2px var(--bg);
	}
	.sp-card {
		margin: 0 15px 14px;
		border: 1px solid var(--line);
		border-radius: 9px;
		background: var(--bg-elevated);
		padding: 14px;
	}
	.sp-q-eyebrow {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 8.5px;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #b07d1e;
		margin-bottom: 8px;
	}
	.sp-q-pts {
		font-family: var(--font-mono);
		font-size: 8px;
		padding: 1px 5px;
		border-radius: 3px;
		background: #fdf1d7;
		color: #7a4e12;
	}
	.sp-q-title {
		font-family: var(--font-serif);
		font-size: 15px;
		font-weight: 500;
		line-height: 1.2;
		margin: 0 0 11px;
	}
	.sp-choice {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		border: 1px solid var(--line);
		border-radius: 8px;
		font-size: 11px;
		margin-bottom: 6px;
		background: var(--bg);
	}
	.sp-choice.correct {
		border-color: #1f7a5a;
		background: #ebf4f0;
	}
	.sp-letter {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--bg-elevated);
		border: 1px solid var(--line-strong);
		font-family: var(--font-mono);
		font-size: 9px;
		font-weight: 600;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--ink-2);
	}
	.sp-choice.correct .sp-letter {
		background: #1f7a5a;
		border-color: #1f7a5a;
		color: #fff;
	}
	.sp-choice .sp-mark {
		margin-left: auto;
		font-family: var(--font-mono);
		font-size: 8px;
		color: var(--ink-3);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.sync-wire {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		z-index: 5;
		background: var(--bg-elevated);
		border: 1px solid var(--line-strong);
		border-radius: 999px;
		padding: 6px 11px;
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: 11px;
		font-weight: 500;
		color: var(--ink-2);
		box-shadow: var(--shadow-md);
		white-space: nowrap;
	}
	.sync-wire .live-dot {
		width: 6px;
		height: 6px;
	}

	/* ——— Logos / proof ——— */
	.proof {
		max-width: 1180px;
		margin: 0 auto;
		padding: 18px 40px 8px;
	}
	.proof-label {
		text-align: center;
		font-size: 12px;
		color: var(--ink-4);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		margin-bottom: 18px;
	}
	.proof-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 14px 40px;
		opacity: 0.72;
	}
	.proof-item {
		font-family: var(--font-serif);
		font-size: 19px;
		font-weight: 500;
		color: var(--ink-3);
		font-style: italic;
	}

	/* ——— Features ——— */
	.features {
		max-width: 1180px;
		margin: 0 auto;
		padding: 64px 40px;
	}
	.features-head {
		max-width: 56ch;
		margin: 0 auto 44px;
		text-align: center;
	}
	.features-head h2 {
		font-family: var(--font-serif);
		font-size: clamp(28px, 3.4vw, 40px);
		font-weight: 500;
		letter-spacing: -0.02em;
		margin: 0 0 12px;
		text-wrap: balance;
	}
	.features-head p {
		font-size: 16px;
		color: var(--ink-2);
		margin: 0;
		line-height: 1.6;
	}
	.feature-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 18px;
	}
	.feature {
		background: var(--bg-elevated);
		border: 1px solid var(--line);
		border-radius: var(--radius-lg);
		padding: 26px 24px;
		transition: all 0.15s ease;
	}
	.feature:hover {
		border-color: var(--line-strong);
		box-shadow: var(--shadow-md);
		transform: translateY(-2px);
	}
	.feature-glyph {
		width: 38px;
		height: 38px;
		border-radius: 9px;
		background: var(--accent-soft);
		color: var(--accent-ink);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-serif);
		font-size: 19px;
		margin-bottom: 16px;
	}
	.feature h3 {
		font-family: var(--font-serif);
		font-size: 19px;
		font-weight: 500;
		letter-spacing: -0.01em;
		margin: 0 0 8px;
	}
	.feature p {
		font-size: 14px;
		color: var(--ink-2);
		line-height: 1.55;
		margin: 0;
		text-wrap: pretty;
	}

	/* ——— Steps ——— */
	.steps {
		background: var(--bg-subtle);
		border-top: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
	}
	.steps-inner {
		max-width: 1180px;
		margin: 0 auto;
		padding: 60px 40px;
		display: grid;
		grid-template-columns: 0.8fr 1.2fr;
		gap: 48px;
		align-items: center;
	}
	.steps h2 {
		font-family: var(--font-serif);
		font-size: clamp(26px, 3vw, 36px);
		font-weight: 500;
		letter-spacing: -0.02em;
		margin: 0 0 14px;
		text-wrap: balance;
	}
	.steps-lede {
		font-size: 15.5px;
		color: var(--ink-2);
		line-height: 1.6;
		margin: 0;
	}
	.step-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.step {
		display: flex;
		gap: 18px;
		padding: 18px;
		border-radius: var(--radius-lg);
		transition: background 0.12s ease;
	}
	.step:hover {
		background: var(--bg-elevated);
	}
	.step-num {
		width: 30px;
		height: 30px;
		flex-shrink: 0;
		border-radius: 50%;
		border: 1px solid var(--line-strong);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--ink-2);
		background: var(--bg-elevated);
	}
	.step h4 {
		font-size: 15px;
		font-weight: 600;
		margin: 4px 0 4px;
	}
	.step p {
		font-size: 13.5px;
		color: var(--ink-3);
		margin: 0;
		line-height: 1.5;
	}

	/* ——— CTA ——— */
	.cta {
		max-width: 1180px;
		margin: 0 auto;
		padding: 76px 40px;
		text-align: center;
	}
	.cta h2 {
		font-family: var(--font-serif);
		font-size: clamp(32px, 4vw, 52px);
		font-weight: 500;
		letter-spacing: -0.025em;
		margin: 0 0 18px;
		text-wrap: balance;
	}
	.cta h2 em {
		font-style: italic;
		color: var(--accent-ink);
	}
	.cta p {
		font-size: 17px;
		color: var(--ink-2);
		margin: 0 auto 32px;
		max-width: 44ch;
		line-height: 1.6;
	}

	/* ——— Footer ——— */
	.na-footer {
		border-top: 1px solid var(--line);
	}
	.footer-inner {
		max-width: 1180px;
		margin: 0 auto;
		padding: 28px 40px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		font-size: 13px;
		color: var(--ink-3);
	}
	.footer-inner a {
		color: var(--ink-3);
	}
	.footer-inner a:hover {
		color: var(--ink);
	}

	@media (max-width: 920px) {
		.hero {
			grid-template-columns: 1fr;
			gap: 36px;
			padding-top: 48px;
		}
		.stage {
			max-width: 560px;
		}
		.feature-grid {
			grid-template-columns: 1fr;
		}
		.steps-inner {
			grid-template-columns: 1fr;
			gap: 28px;
		}
		.nav {
			padding: 16px 22px;
		}
		.hero,
		.features,
		.cta,
		.proof {
			padding-left: 22px;
			padding-right: 22px;
		}
	}
	@media (max-width: 560px) {
		.nav-links .nav-link:not(.nav-cta) {
			display: none;
		}
	}
</style>
