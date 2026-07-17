const clientId = process.env.WORKOS_CLIENT_ID;
const issuerClientId = process.env.WORKOS_ISSUER_CLIENT_ID ?? clientId;

if (!clientId) {
  throw new Error("WORKOS_CLIENT_ID must be set for Convex authentication.");
}

export default {
  providers: [
    {
      type: "customJwt" as const,
      issuer: "https://api.workos.com/",
      algorithm: "RS256" as const,
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
      applicationID: clientId,
    },
    {
      type: "customJwt" as const,
	  // WorkOS environments with multiple Applications keep the default
	  // Application ID in `iss` while exposing the active app as `client_id`.
      issuer: `https://api.workos.com/user_management/${issuerClientId}`,
      algorithm: "RS256" as const,
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
  ],
};
