# Plan editor styling and UX audit

## Scope

- Surface: authenticated plan editing page.
- User goal: scan boss actions, select an event, and assign the right mitigation with minimal scrolling or context switching.
- Evidence: current-run captures at 1440×900 and 390×844, plus the fullscreen planning state.

## Flow steps

1. Desktop planning workspace — healthy after revision.
   - Before: the working panes began around 440px down the viewport, so their viewport-height containers extended well below the fold.
   - After: the panes begin around 255px down and end around 875px in a 900px-tall viewport.
   - Evidence: `01-current-desktop.png`, `04-revised-desktop.png`.

2. Mobile timeline entry — healthy after revision.
   - Before: the header, collaborators, party setup, and settings occupied most of the first screen; the healing control overflowed horizontally.
   - After: the timeline starts around 411px down, the controls stay within 390px, and the first two events are visible in the initial viewport.
   - Evidence: `02-current-mobile.png`, `05-revised-mobile.png`.

3. Mobile action selection and mitigation picker — healthy.
   - The bottom sheet preserves timeline context, surfaces current assignments first, and keeps search and job filters directly above the available abilities.
   - Evidence: `03-current-mobile-picker.png`, `06-revised-mobile-picker.png`.

4. Fullscreen planning — healthy after revision.
   - Both panes share one bounded grid, scroll independently, and keep the exit control visible.
   - Evidence: `07-revised-fullscreen.png`.

## Strengths retained

- Clear timeline/mitigation split on desktop and a task-focused bottom sheet on mobile.
- Autosave feedback, collaboration presence, mitigation search, job filters, and assignment summaries are visible where needed.
- Existing card, color, radius, typography, and dark-theme tokens remain unchanged.

## Changes made

- Condensed the planner header and collaborator display.
- Made party setup compact and shortened health-setting labels.
- Reflowed settings into a responsive grid without horizontal overflow.
- Moved desktop timeline actions into the pane header and bounded the entire workspace to the visible viewport.
- Rebuilt pane sizing as a stable three-column grid.
- Added a visible resize grip, arrow-key resizing, value semantics, and double-click reset.
- Kept mitigation search/filter controls fixed while the ability list scrolls.
- Added search labels, clear-button labels, visible toggle focus rings, fullscreen focus containment, Escape handling, and focus restoration.
- Removed an inherited `aria-disabled` state that incorrectly made selectable timeline actions appear disabled to assistive technology.

## Evidence limits

- Screenshots do not prove full WCAG compliance, screen-reader announcement quality, color contrast ratios, browser zoom behavior, or keyboard drag-and-drop behavior.
- Keyboard checks in this run confirmed the pane resizer changes from 66% to 68%, fullscreen focus wraps in both directions, Escape closes the dialog, and focus begins on the exit control.

