# Whiteboard

Simple browser-based newsroom budget + editorial planning app for `nedoliver.com/newsroom`.

## Features
- Shared story board with equal edit permissions (no role gating).
- Story fields: title, reporter, budget line, art notes, expected file date/time, expected publish date/time, priority (1-3), length (short/medium/long), workflow status.
- Workflow statuses: In reporting -> Editing -> Ready -> Published.
- Rolling, scrollable week agenda: Monday-Friday columns and a weekend column with separate Saturday and Sunday boxes stacked vertically.
- Stories are placed on the agenda by expected publish date/time.
- Drag/drop day rescheduling and inline publish-time edits on cards.
- Configurable story card fields so each user can choose which details are shown.
- Add day-level notes/reminders from the left sidebar (holidays, schedule changes, coverage notes) that appear on matching days.
- Filters by reporter, status, and budget line.
- Story detail modal with comments and activity log.
- Dashboard widget for in-progress stories filing today, ordered by planned file time (excludes Ready/Published).

## Run locally
Open `index.html` directly, or run:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Veerotech deployment
1. Upload all files in this folder to the document root for `nedoliver.com/newsroom` (or `public_html/newsroom`).
2. Ensure `index.html` is present in that directory.
3. No server-side runtime is required.

Data is stored in each browser's `localStorage`.
