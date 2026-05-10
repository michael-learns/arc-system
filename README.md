# arq-system

SvelteKit app with WorkOS AuthKit wired in as the authentication provider.

## Local setup

1. Copy `.env.example` to `.env`.
2. Fill in your WorkOS values:

```sh
WORKOS_API_KEY=sk_test_...
WORKOS_CLIENT_ID=client_...
WORKOS_COOKIE_PASSWORD=a-long-random-string-with-at-least-32-characters
```

3. Install dependencies and start the app:

```sh
bun install
bun run dev
```

## WorkOS dashboard setup

Add these URLs in the WorkOS dashboard for your environment:

- Redirect URI: `http://localhost:5173/auth/callback`
- Sign-out redirect: `http://localhost:5173/`
- Sign-in endpoint: `http://localhost:5173/login`

For production, add your real domain versions of those same routes too.

## Included auth routes

- `GET /login`: starts the WorkOS hosted auth flow
- `GET /auth/callback`: exchanges the auth code for a sealed session
- `POST /logout`: clears the session and sends the user through WorkOS logout
- `GET /dashboard`: protected example page

## Development

```sh
bun run check
bun run build
```
