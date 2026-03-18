# Consolidated Print View — Design Spec

**Date:** 2026-03-18
**Status:** Approved for Implementation

---

## Overview

Add a dedicated, print-optimized consolidated view for MitPlan that displays all mitigation assignments in a readable, multi-page format. The view is read-only, accessible via a shareable link, and designed for both screen reading and physical printing.

---

## Route

**URL:** `/plan/:planId/print`

This is a separate route from the edit view (`/plan/:planId` or `/plan/edit/:planId`). The print view is purely read-only and does not expose any editing UI.

---

## Page Structure

### Header (Repeated on Every Page)

| Field | Value |
|-------|-------|
| Plan Name | e.g., "My FC Raid Plan" |
| Boss Name | e.g., "Statice (M6S)" |
| Date Generated | e.g., "March 18, 2026" |
| Page Number | "Page X of Y" (bottom of page) |

### Timeline-Centric View (Primary Layout)

The page renders all boss actions in chronological order. Each boss action block contains:

1. **Timestamp** — e.g., `0:45` or `1:23`. Displayed prominently, left-aligned or set apart from the action name.

2. **Boss Action** — Icon + Name + Description (e.g., "💥 Primal Roar — Frontal cleave, tank buster")

3. **Mitigations Section** — Each mitigation displayed as an individual card/block:
   - **Job Icon** — FFXIV job icon (16x16 or 24x24 depending on density)
   - **Ability Name** — e.g., "Shelltron", "Sacred Soil"
   - **Timing Label** — e.g., "precast 2.0s", "on-hit", or blank if exact timing not set
   - **Visual Border** — Each mitigation block has a visible border to make it distinct

### Visual Treatment

- **Mitigation Cards:** Light background fill with a border (e.g., light gray or blue border). High contrast for readability.
- **Timestamp:** Bold, larger font size to be scannable.
- **Boss Action Name:** Bold, medium font size.
- **Spacing:** Generous vertical spacing between boss action blocks to avoid crowding.
- **Job Icons:** Displayed inline with ability name.
- **Page Breaks:** Page breaks occur between boss actions, avoiding breaking a mitigation list mid-section.

### Print Optimization (CSS)

- `@media print` styles applied
- No drop shadows or decorative elements that waste ink
- Black-and-white friendly with sufficient contrast
- Font sizes remain readable when printed (minimum 10pt body, 12pt+ for headers)
- Page margins: 0.75in (standard document margin)
- Page numbers at bottom center
- No browser chrome / navigation elements printed

---

## Data Source

The view reads existing data from:

- **Plan Context** (`usePlanContext`) — plan name, boss, assignments
- **Boss Data** (`src/data/bosses/bossActions.ts`) — list of boss actions with timestamps
- **Mitigation Abilities** (`src/data/abilities/mitigationAbilities.ts`) — ability details
- **Selected Jobs** — from plan context

No new data models required. The view is read-only and does not persist any changes.

---

## Components

### New Component

`src/components/consolidated/ConsolidatedView.tsx`

Renders the full consolidated print view. Does not include drag-and-drop, no state for editing.

### Existing Components Reused

- `HealthBar` — for display only (not interactive)
- `TankMitigationDisplay` — for showing mitigation breakdown
- Job icons from existing utils (`getJobIcon`)
- Mitigation ability lookup utilities

### Route Registration

Add to `src/App.tsx`:

```tsx
<Route
  path="/plan/:planId/print"
  element={
    <UnauthenticatedPlanGuard>
      <ConsolidatedView />
    </UnauthenticatedPlanGuard>
  }
/>
```

---

## Implementation Notes

1. **Read-Only** — No editing state, no collaboration indicators, no drag/drop. Pure display.

2. **Shareable Link** — The `/plan/:planId/print` URL can be shared with raid members. No authentication required to view (consistent with existing `isSharedPlan` behavior).

3. **Page Count** — For "Page X of Y", calculate total page count based on boss action count and mitigations per action. This can be done with CSS `counter` or computed at render time.

4. **No Interactive Elements** — Remove all buttons, checkboxes, and hover tooltips that don't make sense on a printed page. Tooltips can remain as `title` attributes for screen-reader accessibility.

5. **Responsive** — The view should render well on screen at various viewport sizes, not just for print. Desktop-first but readable on tablet.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/consolidated/ConsolidatedView.tsx` | Create |
| `src/components/consolidated/index.ts` | Create |
| `src/App.tsx` | Modify — add route |
| `src/components/layout/AppLayout.tsx` | Potentially modify — may need to suppress header/footer for print route |
| `src/styles/globals.css` | Add print styles |

---

## Out of Scope

- Job-centric view (Phase 2, if ever needed — timeline view only for now)
- Real-time updates (view is static for the session; refresh to see latest)
- Export to PDF (CSS print handles this; native browser "Print to PDF" is sufficient)
- Authentication-gated access (view is public like shared plans)
