# Architecture overview

## Runtime shape

MitPlan is a Next.js App Router application deployed as a single web project. Route entry points in `app/` establish the server-rendered shell, metadata, CSS, analytics, and client provider boundary. The feature-complete planner screens remain client components and are loaded on demand by `src/components/routing/AppRouter.tsx`.

```text
Browser
  └─ Next.js App Router
      ├─ server-rendered application shell
      ├─ dynamically loaded feature screens
      └─ React context providers
          ├─ Supabase Auth session
          ├─ planner state
          ├─ collaboration/presence
          └─ theme and notifications

Supabase
  ├─ Auth
  ├─ Postgres + Row Level Security
  ├─ atomic plan-operation RPCs
  └─ Realtime private Broadcast + Presence
```

## Routing

`app/page.tsx` serves the landing route. `app/[...route]/page.tsx` forwards the historical application paths to a compatibility router, so existing plan and timeline links continue to work. Dedicated callback routes handle OAuth and password recovery.

Navigation components use `src/lib/navigation.tsx`, a small Next.js facade that preserves the former screen-level API (`Link`, `Navigate`, `useNavigate`, `useLocation`, and semantic route parameters). This lets route migration remain separate from planner-domain changes.

## Authentication

`src/contexts/AuthContext.tsx` owns the Supabase session. It restores the current session, subscribes to Auth changes, exposes the existing user contract, and stores the profile document. Email/password, Google OAuth, password recovery, profile edits, sign-out, and account deletion all use Supabase.

The browser receives only the public Supabase URL and publishable/anon key. Authorization is enforced in Postgres rather than trusted to client route guards.

## Plan persistence

`plans`, `plan_access`, `party_slots`, `plan_assignments`, `plan_timeline_overrides`, and `user_plan_preferences` are the collaborative plan source of truth. Published timeline versions are immutable and plans pin one version and one route. At runtime, that route is composed with plan-owned phase overrides and custom events. The plan's `CURRENT`, `REBORN`, or `EVOLVED` job-action mode is orthogonal to encounter timing, so Evercold support does not duplicate timeline versions.

Clients submit discriminated operations through `apply_plan_operation`. The database authenticates membership, locks the plan, validates and commits the affected entities, advances `plans.revision`, and records the canonical forward and inverse deltas in `plan_changes`. Operation IDs make retries idempotent. Undo is another server operation and is allowed only while the same entity has not changed again.

The Firebase-shaped `app_documents` table is retained temporarily as a recovery archive and for timeline compatibility. Plan collaboration does not subscribe to or mutate plan documents through it.

## Realtime collaboration

Each signed-in plan workspace joins one private `plan:<uuid>` channel before loading its authoritative snapshot. A `plan_changes` trigger emits committed canonical deltas with database Broadcast. Revision buffering and gap recovery prevent snapshot/subscription races.

Presence contains only low-frequency connected-client state. Cursor positions use client Broadcast at no more than 10 Hz and are never stored. Reopening a plan restores durable content and account-synced preferences, while presence and cursors start fresh. Anonymous share views call `get_shared_plan(token)` on refresh and do not join private channels.

## Authorization

RLS policies delegate the document rules to helper functions. The effective rules are:

- preferences are tied to the signed-in user;
- private plans are available according to owner/editor/viewer membership;
- only owners manage deletion, invites, and anonymous share-link lifecycle;
- anonymous links return only the sanitized snapshot exposed by their RPC;
- anonymous callers cannot read private plan data;
- account deletion is a confirmed, authenticated security-definer RPC.

The service-role key is used only by the offline migration utility. It is never shipped to the browser.

## Static and server work

The landing route can be prerendered, shared layout assets are emitted once, and route screens are split into separate client chunks. Planner state still runs in the browser because it is highly interactive; Next.js provides the delivery, routing, and rendering shell without changing that behavior.

## Deployment

The application build is `next build`. Vercel detects the Next.js framework from `vercel.json`. Backend changes are forward-only SQL migrations applied with `supabase db push`. A deploy should pass security checks, tests, and the production build before frontend release.
