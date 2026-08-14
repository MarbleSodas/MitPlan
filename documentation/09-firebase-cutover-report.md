# Firebase cutover report

Cutover executed on July 14, 2026 from Firebase project `xivmit` to Supabase project `lbagljsyffezsoaewxcl`. A final catch-up reconciliation was applied on July 15, 2026 at 11:05 UTC.

## Authentication

| Measure | Result |
| --- | ---: |
| Firebase Auth users | 1,997 |
| Firebase users mapped to Supabase UUIDs | 1,997 |
| Unmapped Firebase Auth users | 0 |
| Pre-existing target-only Auth users | 1 |
| Missing accounts created across cutover runs | 7 |
| Accounts currently requiring password recovery | 0 |

Three of the four accounts created during the initial run were Google-only accounts. One password-backed account completed Supabase password setup and its stale recovery flag was cleared without changing the working password. The migration utility now supplies Firebase SCRYPT hashes through Supabase Admin Auth for any future missing password-backed accounts, so recovery is not required. The three accounts added by the catch-up run did not require password recovery. Five owner/user IDs found in historical documents have no corresponding source Auth account or email-bearing profile. Those orphan references were preserved, but RLS does not grant them access.

## Application documents

Final reconciliation was exact:

| Collection | Firebase | Supabase |
| --- | ---: | ---: |
| `planCollaboration` | 190 | 190 |
| `planShareViewTracking` | 18 | 18 |
| `planShareViews` | 21 | 21 |
| `plans` | 1,495 | 1,495 |
| `timelines` | 75 | 75 |
| `userProfiles` | 1,968 | 1,968 |
| **Total** | **3,767** | **3,767** |

Identity values in document fields and identity-keyed maps were rewritten to Supabase UUIDs. Remapped top-level profile keys were removed before the final idempotent reimport, preventing stale Firebase UID duplicates.

## Backend validation

- All local migrations through `20260714221531` match remote migration history.
- A live RLS smoke user created a private plan through `app_documents_mutate`.
- The owner could read the plan and an anonymous request returned zero rows.
- `app_documents_compare_and_set` committed a nested update under a row lock.
- A signed-in share viewer recorded access through the field-safe tracking RPC without gaining read access to other viewer IDs; the plan owner could read the aggregate row.
- A signed-in user could like a public timeline through the dedicated RPC, while a direct content mutation returned `42501` and left the timeline unchanged.
- `delete_legacy_app_account` removed both the plan and the Auth user.
- The temporary smoke account and data were removed.

## Repeatability

`migrate-firebase-to-supabase.mjs` is safe to dry-run repeatedly. Apply mode creates missing email-address Auth accounts, removes only obsolete remapped identity-root keys, upserts documents on `(collection,key)`, and requires exact per-collection reconciliation. Source writes should be paused for a future production re-run so a live Firebase mutation cannot change counts during export.
