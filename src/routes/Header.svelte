<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let { data } = $props();
</script>

<header>
	<div class="brand">
		<a href={resolve('/')}>arq-system</a>
	</div>

	<nav>
		<svg viewBox="0 0 2 3" aria-hidden="true">
			<path d="M0,0 L1,2 C1.5,3 1.5,3 2,3 L2,0 Z" />
		</svg>
		<ul>
			<li aria-current={page.url.pathname === '/' ? 'page' : undefined}>
				<a href={resolve('/')}>Home</a>
			</li>
			<li aria-current={page.url.pathname === '/about' ? 'page' : undefined}>
				<a href={resolve('/about')}>About</a>
			</li>
			<li aria-current={page.url.pathname === '/dashboard' ? 'page' : undefined}>
				<a href={resolve('/dashboard')}>Dashboard</a>
			</li>
		</ul>
		<svg viewBox="0 0 2 3" aria-hidden="true">
			<path d="M0,0 L0,3 C0.5,3 0.5,3 1,2 L2,0 Z" />
		</svg>
	</nav>

	<div class="actions">
		{#if data.user}
			<form method="POST" action="/logout">
				<button type="submit" class="action-button action-button-secondary">Sign out</button>
			</form>
		{:else}
			<a class="action-button" href="/login">Sign in</a>
		{/if}
	</div>
</header>

<style>
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1rem 0;
	}

	.brand,
	.actions {
		min-width: 8rem;
	}

	.brand a {
		color: var(--color-text);
		font-size: 1.05rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	nav {
		display: flex;
		justify-content: center;
		--background: rgba(255, 255, 255, 0.7);
	}

	svg {
		width: 2em;
		height: 3em;
		display: block;
	}

	path {
		fill: var(--background);
	}

	ul {
		position: relative;
		padding: 0;
		margin: 0;
		height: 3em;
		display: flex;
		justify-content: center;
		align-items: center;
		list-style: none;
		background: var(--background);
		background-size: contain;
	}

	li {
		position: relative;
		height: 100%;
	}

	li[aria-current='page']::before {
		--size: 6px;
		content: '';
		width: 0;
		height: 0;
		position: absolute;
		top: 0;
		left: calc(50% - var(--size));
		border: var(--size) solid transparent;
		border-top: var(--size) solid var(--color-theme-1);
	}

	nav a {
		display: flex;
		height: 100%;
		align-items: center;
		padding: 0 0.5rem;
		color: var(--color-text);
		font-weight: 700;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		text-decoration: none;
		transition: color 0.2s linear;
	}

	a:hover {
		color: var(--color-theme-1);
	}

	.actions {
		display: flex;
		justify-content: flex-end;
	}

	form {
		margin: 0;
	}

	.action-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.7rem 1rem;
		border: none;
		border-radius: 999px;
		background: var(--color-theme-1);
		color: white;
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.action-button:hover {
		color: white;
		text-decoration: none;
		filter: brightness(0.96);
	}

	.action-button-secondary {
		background: rgba(18, 42, 66, 0.9);
	}

	@media (max-width: 700px) {
		header {
			flex-direction: column;
		}

		.brand,
		.actions {
			min-width: 0;
		}
	}
</style>
