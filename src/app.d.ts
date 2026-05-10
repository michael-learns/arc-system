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
			convexContext: {
				user: {
					_id: string;
					name: string;
					email: string;
					tokenIdentifier: string;
				} | null;
				organization: {
					_id: string;
					name: string;
					workosOrgId: string;
					enrollmentPolicy: 'org_controlled' | 'facilitator_open';
				} | null;
				membership: {
					_id: string;
					roles: ('admin' | 'facilitator' | 'student')[];
				} | null;
			} | null;
		}
		interface PageData {
			user: User | null;
			session: App.Locals['session'];
			workosConfigured: boolean;
			convexContext: App.Locals['convexContext'];
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
