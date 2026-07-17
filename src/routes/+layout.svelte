<script lang="ts">
	import Header from './Header.svelte';
	import './layout.css';
	import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { setupAuth, setupConvex } from 'convex-svelte';
	import { page } from '$app/state';
	import { untrack } from 'svelte';

	let { children, data } = $props();

	setupConvex(PUBLIC_CONVEX_URL);
	const initiallyAuthenticated = untrack(() => Boolean(data.user));
	setupAuth(
		() => ({
			isLoading: false,
			isAuthenticated: Boolean(data.user),
			fetchAccessToken: async ({ forceRefreshToken }) => {
				if (!data.user) return null;
				const response = await fetch(
					`/auth/convex-token${forceRefreshToken ? '?refresh=1' : ''}`,
					{ credentials: 'same-origin', cache: 'no-store' }
				);
				if (!response.ok) return null;
				const payload = (await response.json()) as { token: string | null };
				return payload.token;
			}
		}),
		{ initialState: { isAuthenticated: initiallyAuthenticated } }
	);

	// The landing page (/) is a full-bleed marketing page with its own nav and
	// footer, so it opts out of the shared app chrome and width constraint.
	const isLanding = $derived(page.url.pathname === '/');
	const isDashboardWorkspace = $derived(page.url.pathname.startsWith('/dashboard'));
	const useCustomShell = $derived(isLanding || isDashboardWorkspace);
</script>

<div class="app" class:landing={isLanding} class:workspace={isDashboardWorkspace}>
	{#if !useCustomShell}
		<Header {data} />
	{/if}

	<main class:full-bleed={useCustomShell}>{@render children()}</main>

	{#if !useCustomShell}
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
