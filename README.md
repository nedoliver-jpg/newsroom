# Whiteboard

Simple browser-based newsroom budget + editorial planning app for `nedoliver.com/newsroom`.

## Features
- Shared story board with equal edit permissions.
- Story fields: slug (auto-uppercase), reporter, budget line, art notes, optional expected file date/time, optional expected publish date, priority (1-3), length (short/medium/long), status.
- Statuses: Reporting -> Writing -> Editing -> Ready -> Published.
- Top action bar with New Story, New Reminder, and expanding search.
- Filters and agenda-card-field controls are toggled from dropdown buttons above the board.
- In-progress Today panel shows stories filing today, excludes Ready/Published, ordered by planned file time.
- Rolling weekly board for up to 3 active weeks (Mon-Fri + stacked Sat/Sun weekend box), day reminders, and click-to-open story details.
- No empty "No stories scheduled" placeholders in day boxes.
- Extended agenda list after 3 weeks, grouped by date, then Unscheduled buckets (Ready, Editing, Writing), then Investigating (Reporting with no filing date/time).

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
