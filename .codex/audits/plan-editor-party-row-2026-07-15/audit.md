# Expanded party setup follow-up

## Scope

- Surface: expanded party job selector in the plan editor.
- User goal: compare and select jobs without pushing the planning workspace far down the page.
- Evidence: authenticated desktop state at 1440×900 and 1024×768.

## Steps

1. Existing expanded party setup — needs improvement.
   - Compact mode placed all five role groups in one column.
   - The role grid measured 1,897px tall and the page grew to 3,029px.
   - Evidence: `01-before-expanded-party.png`.

2. Revised five-role party row — healthy.
   - Tanks, healers, melee, physical ranged, and magic ranged share one row at desktop widths.
   - The role grid measures 404px tall at both 1440px and 1024px wide, with no horizontal document overflow.
   - Evidence: `02-after-expanded-party-row.png`, `03-after-expanded-party-1024.png`.

3. Supporting settings — healthy.
   - Tank HP, Party HP, and Healing / 100 now share the same compact health-settings row below the party selector.
   - The tank fields stay inline at wide desktop widths; at 1024px the toolbar intentionally wraps into a second full-width settings row so numeric inputs retain usable widths.
   - The expanded selector no longer owns a second health-settings block, keeping the role grid focused on party composition.
   - Evidence: `05-after-health-row-1024.png` (desktop capture for 1440px was also reviewed live; the saved image is affected by the browser capture renderer).

## Accessibility and evidence limits

- Job tiles retain button semantics, pressed state, keyboard activation, visible focus styling, and descriptive add/remove labels.
- Screenshots do not prove screen-reader announcement quality, contrast ratios, or behavior under browser zoom.
