<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Dashboard</title>
	<meta name="description" content="Authenticated area for arq-system" />
</svelte:head>

<section class="dashboard">
	<div class="eyebrow">Authenticated</div>
	<h1>Welcome back, {data.user.firstName ?? data.user.email}</h1>
	<p class="lead">
		Your WorkOS session is active, so this page is only available after signing in.
	</p>

	<div class="card-grid">
		<article class="card">
			<h2>User</h2>
			<p>{data.user.email}</p>
		</article>

		<article class="card">
			<h2>Session ID</h2>
			<p>{data.session?.sessionId ?? 'Unavailable'}</p>
		</article>

		<article class="card">
			<h2>Organization</h2>
			<p>{data.session?.organizationId ?? 'No organization selected'}</p>
		</article>

		<article class="card">
			<h2>Convex User</h2>
			<p>{data.convexContext?.user?.name ?? 'Not bootstrapped yet'}</p>
		</article>

		<article class="card">
			<h2>Membership Roles</h2>
			<p>{data.convexContext?.membership?.roles.join(', ') || 'No domain roles assigned yet'}</p>
		</article>
	</div>
</section>

<style>
	.dashboard {
		width: 100%;
		padding: 3rem 0 4rem;
	}

	.eyebrow {
		margin-bottom: 0.75rem;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-theme-2);
	}

	h1 {
		margin: 0 0 1rem;
		text-align: left;
	}

	.lead {
		max-width: 38rem;
		margin: 0 0 2rem;
		font-size: 1.05rem;
	}

	.card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 1rem;
	}

	.card {
		padding: 1.25rem;
		border: 1px solid rgba(18, 42, 66, 0.12);
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(12px);
	}

	.card h2 {
		margin: 0 0 0.5rem;
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-theme-2);
	}

	.card p {
		margin: 0;
		word-break: break-word;
	}
</style>
