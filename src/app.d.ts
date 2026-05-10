// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { User } from '@workos-inc/node';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: User | null;
			session: {
				sessionId: string;
				organizationId: string | null;
				role: string | null;
			} | null;
			workosConfigured: boolean;
		}
		interface PageData {
			user: User | null;
			session: App.Locals['session'];
			workosConfigured: boolean;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
