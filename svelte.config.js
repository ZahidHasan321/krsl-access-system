import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
		csrf: {
			// Disabled because ZKTeco devices use POST with text/plain
			// and don't send browser Origin headers — CSRF rejects them.
			// This is safe for an internal single-company app behind nginx.
			checkOrigin: false
		}
	}
};

export default config;
