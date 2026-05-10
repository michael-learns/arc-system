export const load = ({ locals }) => {
	return {
		user: locals.user,
		session: locals.session,
		workosConfigured: locals.workosConfigured
	};
};
