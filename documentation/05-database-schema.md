# Database schema

## Collaborative plan source of truth

| Object | Purpose |
| --- | --- |
| `plans` | Owner, encounter, pinned timeline version, route, metadata, schema version, and ordered revision |
| `plan_access` / `plan_members` | Owner, editor, and authenticated viewer membership |
| `party_slots` | Ordered party jobs, player identity, and tank roles |
| `plan_assignments` | Event-keyed ability, caster, target, timing, notes, and entity revision |
| `plan_timeline_overrides` | Phase anchors and plan-local custom-event overlays |
| `plan_changes` | Idempotent operation IDs, contiguous revisions, canonical deltas, inverses, and audit metadata |
| `user_plan_preferences` | Per-user focus, filters, panel ratio, density, and last-opened time |
| `plan_share_links` | Hashed, revocable, optionally expiring anonymous view tokens |
| `plan_invite_links` | Hashed, revocable authenticated edit-invite tokens |
| `timeline_versions` | Immutable published timeline documents, evidence, validation reports, and content hashes |
| `plan_backfill_reports` | Per-plan migration reconciliation and unresolved mappings |

Every exposed table has explicit Data API grants and RLS. Authorization predicates check plan membership. Share and invite token tables are not directly readable by browser roles.

## Plan operation API

- `load_plan_workspace(plan_id, after_revision)` returns the authoritative snapshot and optional missing changes.
- `apply_plan_operation(plan_id, operation_id, base_revision, operation)` serializes mutations under a plan lock and returns the canonical committed delta.
- `undo_plan_change(plan_id, change_id, operation_id)` commits a new inverse operation when its entity is still current.
- `list_published_timeline_versions(encounter_key)` supplies evidence-approved upgrade and route choices.
- `preview_timeline_upgrade(plan_id, target_version_id)` classifies the version diff without mutating the plan.
- `save_plan_preferences(plan_id, preferences)` persists account-scoped workspace state.
- `redeem_plan_invite(token)` grants authenticated edit membership.
- `get_shared_plan(token)` is the only anonymous plan interface and returns a sanitized saved snapshot.

Plan revision and data schema version are independent. Replayed operation IDs return their prior result instead of duplicating a mutation.

## Realtime

A trigger on `plan_changes` sends canonical commits with `realtime.broadcast_changes()`. Private Broadcast and Presence policies on `realtime.messages` call helpers in the private application schema; no custom functions are created in `realtime`.

Presence is ephemeral and excludes email. Optional cursors are broadcast-only and not persisted. The public share endpoint never authorizes a private channel subscription.

## Legacy recovery data

`public.app_documents` retains the Firebase-era export during the 30-day recovery window. The normalized plan backfill reads it, but the collaborative plan runtime does not. Remove it from realtime publication at cutover, export and verify it, and delete the table plus unused compatibility/Yjs infrastructure only after the recovery window.

## Schema changes

Always add a forward migration; never rewrite an applied migration:

```bash
supabase migration new descriptive_change_name
supabase db push --dry-run --include-all
supabase db push
supabase migration list
```
