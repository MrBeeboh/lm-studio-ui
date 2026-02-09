# ATOM Dynamic UI – Undo marker

**Created:** So you can revert all "dynamic UI" changes in one go if they cause problems.

## Before making any changes: create a safety tag

From the repo root (`lm-studio-ui`), run:

```bash
git add -A
git status
git tag before-atom-dynamic-ui
```

This tag marks the state **before** the dynamic UI work. You can always return to it.

---

## How to undo (revert everything from this feature set)

### Option A – Restore all tracked files to the tagged state

```bash
git checkout before-atom-dynamic-ui -- .
```

Then restart the app. Any new files added for this feature will remain; delete them if you want a full revert (see "Files added" below).

### Option B – Restore only specific files

Check out the tagged version of just the files that are causing issues, for example:

```bash
git checkout before-atom-dynamic-ui -- src/app.css src/App.svelte
```

---

## Files modified by this feature set

(List updated as changes are made.)

- `src/app.css` – Theme/layout transitions, animations, gradient, reduced-motion, performance mode
- `src/App.svelte` – Gradient wrapper, floating dashboard, '/' for command palette, sidebar behavior
- `src/lib/stores.js` – performanceMode, arenaPanelCount, floatingMetrics*, responseCompleteFlash
- `src/lib/components/CommandPalette.svelte` – '/' key to open, "Show metrics dashboard" action
- `src/lib/components/SettingsPanel.svelte` – Performance mode toggle (UI & performance section)
- `src/lib/components/DashboardArena.svelte` – Adaptive 1–3 panels, layout transition, panel count from store
- `src/lib/components/ChatView.svelte` – Streaming glow, complete flash, error shake (responseCompleteFlash local state)

## Files added

- `src/lib/components/FloatingMetricsDashboard.svelte` – Draggable tok/s dashboard
- `docs/ATOM-DYNAMIC-UI-UNDO.md` – This file

---

## Disabling without reverting

- **Performance mode** (Settings): turns off gradient background and heavy effects.
- **Reduced motion**: system preference `prefers-reduced-motion: reduce` is respected; animations are toned down.

If something still misbehaves, use Option A or B above to revert.
