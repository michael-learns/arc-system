import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		// Bind all interfaces so the dev server is reachable over Tailscale, not
		// just localhost. allowedHosts lets Vite accept requests on *.ts.net hosts.
		host: true,
		allowedHosts: ['.ts.net']
	},
	ssr: {
		noExternal: ['svelte-sonner', 'mode-watcher']
	}
});
