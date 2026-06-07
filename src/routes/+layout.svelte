<script lang="ts">
	import Header from './Header.svelte';
	import './layout.css';
	import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { setupConvex } from 'convex-svelte';
	import { page } from '$app/state';

	let { children, data } = $props();

	setupConvex(PUBLIC_CONVEX_URL);

	// The landing page (/) is a full-bleed marketing page with its own nav and
	// footer, so it opts out of the shared app chrome and width constraint.
	const isLanding = $derived(page.url.pathname === '/');
</script>

<div class="app" class:landing={isLanding}>
	{#if !isLanding}
		<Header {data} />
	{/if}

	<main class:full-bleed={isLanding}>{@render children()}</main>

	{#if !isLanding}
		<footer>
			<p>arq-system is using WorkOS AuthKit for authentication.</p>
		</footer>
	{/if}
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		width: 100%;
		max-width: 64rem;
		margin: 0 auto;
		box-sizing: border-box;
	}

	main.full-bleed {
		padding: 0;
		max-width: none;
		display: block;
	}

	footer {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 12px;
	}

	@media (min-width: 480px) {
		footer {
			padding: 12px 0;
		}
	}
</style>
