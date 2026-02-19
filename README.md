# Ned Oliver Newsroom Planner

Simple browser-based newsroom budget + editorial calendar for `nedoliver.com/newsroom`.

## Features
- Shared story board with equal edit permissions (no role gating).
- Story fields: title, reporter, budget line, art notes, expected file date/time, workflow status.
- Workflow statuses: In reporting → Editing → Ready → Published.
- FullCalendar daily, week, and list views.
- Filters by reporter, status, and budget line.
- Drag/drop rescheduling in calendar.
- Story detail modal with comments and activity log.
- Dashboard widget for items due in the next 48 hours.
- Optional in-app reminder alerts for upcoming file times (next 1 hour).

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
