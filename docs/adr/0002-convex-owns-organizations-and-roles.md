# Convex owns organizations and domain roles

WorkOS is now limited to authentication. arq stores and manages organizations,
active organization context, and domain roles inside Convex.

This supersedes the earlier decision that treated WorkOS organization membership
as the source of truth for application organization access.

## Decision

- WorkOS remains the sign-in seam only.
- Convex `users` stays keyed by the WorkOS-derived `tokenIdentifier`.
- Convex `organizations` is the source of truth for organization lifecycle.
- Convex `memberships` is the source of truth for `admin`, `facilitator`, and
  `student` roles.
- The active organization is selected in the app and stored in an app-owned
  cookie, then used to load Convex organization context.

## Why

- Organization and role behavior is application domain logic, not identity
  plumbing.
- The previous shape forced the runtime seam to bounce between WorkOS session
  state and Convex membership state, which made the interface shallow and
  brittle.
- Local organization ownership gives us better locality for course, classroom,
  enrollment, and role-management work.

## Consequences

- All public Convex organization-facing APIs should accept local Convex
  organization ids, not WorkOS organization ids.
- New organization creation and role management happen in Convex.
- Legacy WorkOS-linked organization data can be migrated away and removed from
  the runtime path.
