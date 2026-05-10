<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="WorkOS-powered auth setup for arq-system" />
</svelte:head>

<section class="hero">
	<div class="hero-copy">
		<div class="eyebrow">Authentication</div>
		<h1>WorkOS is now the auth provider for arq-system.</h1>
		<p class="lead">
			This app uses WorkOS AuthKit on the backend, stores an encrypted session cookie, and
			refreshes sessions automatically in a SvelteKit server hook.
		</p>

		{#if data.workosConfigured}
			{#if data.user}
				<div class="status-card">
					<p class="status-label">Signed in as</p>
					<p class="status-value">{data.user.email}</p>
					<a class="primary-link" href="/dashboard">Open dashboard</a>
				</div>
			{:else}
				<div class="actions">
					<a class="primary-link" href="/login">Continue with WorkOS</a>
					<p class="helper-text">Use your hosted WorkOS sign-in flow to create or access an account.</p>
				</div>
			{/if}
		{:else}
			<div class="status-card status-card-warning">
				<p class="status-label">WorkOS config missing</p>
				<p class="status-value">Add the three env vars from <code>.env.example</code> to enable login.</p>
			</div>
		{/if}
	</div>

	<div class="hero-panel">
		<div class="panel-shell">
			<div class="panel-header">
				<span class="dot"></span>
				<span class="dot"></span>
				<span class="dot"></span>
			</div>

			<div class="panel-body">
				<div>
					<p class="panel-label">Flow</p>
					<p>Hosted sign-in -> callback exchange -> sealed cookie -> protected dashboard</p>
				</div>

				<div>
					<p class="panel-label">Routes</p>
					<p><code>/login</code>, <code>/auth/callback</code>, <code>/logout</code>, <code>/dashboard</code></p>
				</div>

				<div>
					<p class="panel-label">Session model</p>
					<p>HTTP-only cookie, same-site lax, auto-refresh in <code>hooks.server.ts</code></p>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.hero {
		display: flex;
		flex: 1;
		align-items: center;
		gap: 2rem;
		padding: 3rem 0 4rem;
	}

	h1 {
		margin: 0 0 1rem;
		text-align: left;
	}

	.hero-copy,
	.hero-panel {
		flex: 1;
	}

	.eyebrow {
		margin-bottom: 0.75rem;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-theme-2);
	}

	.lead {
		max-width: 34rem;
		margin: 0 0 1.5rem;
		font-size: 1.05rem;
	}

	.actions,
	.status-card {
		max-width: 32rem;
		padding: 1.25rem;
		border: 1px solid rgba(18, 42, 66, 0.12);
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.78);
		backdrop-filter: blur(12px);
	}

	.status-card-warning {
		border-color: rgba(255, 122, 0, 0.25);
	}

	.status-label,
	.panel-label {
		margin: 0 0 0.35rem;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-theme-2);
	}

	.status-value {
		margin: 0 0 1rem;
		font-size: 1.05rem;
		word-break: break-word;
	}

	.helper-text {
		margin: 0.85rem 0 0;
		color: rgba(18, 42, 66, 0.72);
	}

	.primary-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.8rem 1.1rem;
		border-radius: 999px;
		background: var(--color-theme-1);
		color: white;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.primary-link:hover {
		color: white;
		text-decoration: none;
		filter: brightness(0.96);
	}

	.panel-shell {
		border: 1px solid rgba(18, 42, 66, 0.12);
		border-radius: 1.25rem;
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(237, 243, 248, 0.88)),
			radial-gradient(circle at top right, rgba(64, 117, 166, 0.16), transparent 45%);
		box-shadow: 0 24px 80px rgba(39, 61, 82, 0.12);
		overflow: hidden;
	}

	.panel-header {
		display: flex;
		gap: 0.45rem;
		padding: 1rem 1rem 0;
	}

	.dot {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 999px;
		background: rgba(18, 42, 66, 0.2);
	}

	.panel-body {
		display: grid;
		gap: 1rem;
		padding: 1.2rem 1rem 1.4rem;
	}

	.panel-body p {
		margin: 0;
	}

	@media (max-width: 900px) {
		.hero {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
