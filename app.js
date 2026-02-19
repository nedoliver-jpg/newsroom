const STORAGE_KEY = "whiteboardStoriesV3";
const DAY_NOTES_KEY = "whiteboardDayNotesV1";
const FIELD_PREFS_KEY = "whiteboardAgendaFieldPrefs";
const STATUSES = ["In reporting", "Editing", "Ready", "Published"];
const FIELD_OPTIONS = [
  { key: "reporter", label: "Reporter" },
  { key: "budgetLine", label: "Budget Line" },
  { key: "status", label: "Status" },
  { key: "artNotes", label: "Art Notes" },
  { key: "expectedFileTime", label: "Expected File Time" },
  { key: "expectedPublishTime", label: "Expected Publish Time" }
];

const els = {
  storyList: document.getElementById("storyList"),
  dueSoonList: document.getElementById("dueSoonList"),
  reporterFilter: document.getElementById("reporterFilter"),
  statusFilter: document.getElementById("statusFilter"),
  budgetFilter: document.getElementById("budgetFilter"),
  clearFiltersBtn: document.getElementById("clearFiltersBtn"),
  newStoryBtn: document.getElementById("newStoryBtn"),
  fieldToggles: document.getElementById("fieldToggles"),
  agendaScroller: document.getElementById("agendaScroller"),
  agendaWeeks: document.getElementById("agendaWeeks"),
  storyModal: document.getElementById("storyModal"),
  storyForm: document.getElementById("storyForm"),
  storyId: document.getElementById("storyId"),
  titleInput: document.getElementById("titleInput"),
  reporterInput: document.getElementById("reporterInput"),
  budgetInput: document.getElementById("budgetInput"),
  artNotesInput: document.getElementById("artNotesInput"),
  fileTimeInput: document.getElementById("fileTimeInput"),
  publishTimeInput: document.getElementById("publishTimeInput"),
  statusInput: document.getElementById("statusInput"),
  cancelModalBtn: document.getElementById("cancelModalBtn"),
  detailModal: document.getElementById("detailModal"),
  detailTitle: document.getElementById("detailTitle"),
  detailReporter: document.getElementById("detailReporter"),
  detailBudget: document.getElementById("detailBudget"),
  detailStatus: document.getElementById("detailStatus"),
  detailFileTime: document.getElementById("detailFileTime"),
  detailPublishTime: document.getElementById("detailPublishTime"),
  detailArtNotes: document.getElementById("detailArtNotes"),
  commentsList: document.getElementById("commentsList"),
  commentForm: document.getElementById("commentForm"),
  commentAuthorInput: document.getElementById("commentAuthorInput"),
  commentBodyInput: document.getElementById("commentBodyInput"),
  activityList: document.getElementById("activityList"),
  closeDetailBtn: document.getElementById("closeDetailBtn"),
  editFromDetailBtn: document.getElementById("editFromDetailBtn"),
  deleteStoryBtn: document.getElementById("deleteStoryBtn")
};

let stories = loadStories();
let dayNotes = loadDayNotes();
let activeStoryId = null;
let fieldPrefs = loadFieldPrefs();
let loadedWeekStarts = [];

init();

function init() {
  renderFieldControls();
  bindEvents();
  bootstrapWeeks();
  renderAll();
}

function bindEvents() {
  els.newStoryBtn.addEventListener("click", () => openStoryModal());
  els.cancelModalBtn.addEventListener("click", () => els.storyModal.close());
  els.storyForm.addEventListener("submit", saveStoryFromForm);
  els.clearFiltersBtn.addEventListener("click", clearFilters);
  [els.reporterFilter, els.statusFilter, els.budgetFilter].forEach((el) =>
    el.addEventListener("input", renderAll)
  );
  els.commentForm.addEventListener("submit", addComment);
  els.closeDetailBtn.addEventListener("click", () => els.detailModal.close());
  els.editFromDetailBtn.addEventListener("click", () => {
    const story = stories.find((s) => s.id === activeStoryId);
    if (story) openStoryModal(story);
  });
  els.deleteStoryBtn.addEventListener("click", deleteActiveStory);

  els.agendaScroller.addEventListener("scroll", () => {
    const nearBottom = els.agendaScroller.scrollTop + els.agendaScroller.clientHeight >= els.agendaScroller.scrollHeight - 240;
    if (nearBottom) appendWeeks(2);
  });
}

function bootstrapWeeks() {
  loadedWeekStarts = [];
  const thisWeek = getMonday(new Date());
  for (let i = -1; i <= 2; i += 1) {
    loadedWeekStarts.push(addDays(thisWeek, i * 7));
  }
}

function renderFieldControls() {
  els.fieldToggles.innerHTML = FIELD_OPTIONS.map((f) => {
    const checked = fieldPrefs[f.key] ? "checked" : "";
    return `<label><input type="checkbox" data-field="${f.key}" ${checked} /> ${f.label}</label>`;
  }).join("");

  els.fieldToggles.querySelectorAll("input[data-field]").forEach((input) => {
    input.addEventListener("change", () => {
      fieldPrefs[input.dataset.field] = input.checked;
      persistFieldPrefs();
      renderAgenda();
    });
  });
}

function saveStoryFromForm(e) {
  e.preventDefault();
  const data = {
    id: els.storyId.value || crypto.randomUUID(),
    title: els.titleInput.value.trim(),
    reporter: els.reporterInput.value.trim(),
    budgetLine: els.budgetInput.value.trim(),
    artNotes: els.artNotesInput.value.trim(),
    expectedFileTime: new Date(els.fileTimeInput.value).toISOString(),
    expectedPublishTime: new Date(els.publishTimeInput.value).toISOString(),
    status: els.statusInput.value,
    comments: [],
    activity: []
  };

  const existing = stories.find((s) => s.id === data.id);
  if (existing) {
    const statusChanged = existing.status !== data.status;
    data.comments = existing.comments;
    data.activity = [
      ...existing.activity,
      logItem("Story updated by shared newsroom user"),
      ...(statusChanged ? [logItem(`Status changed: ${existing.status} -> ${data.status}`)] : [])
    ];
    stories = stories.map((s) => (s.id === data.id ? data : s));
  } else {
    data.activity.push(logItem("Story created"));
    stories.push(data);
  }

  persistStories();
  els.storyModal.close();
  renderAll();
}

function openStoryModal(story = null) {
  const isEdit = Boolean(story);
  document.getElementById("storyModalTitle").textContent = isEdit ? "Edit Story" : "New Story";
  els.storyId.value = story?.id || "";
  els.titleInput.value = story?.title || "";
  els.reporterInput.value = story?.reporter || "";
  els.budgetInput.value = story?.budgetLine || "";
  els.artNotesInput.value = story?.artNotes || "";
  els.fileTimeInput.value = story ? story.expectedFileTime.slice(0, 16) : "";
  els.publishTimeInput.value = story ? story.expectedPublishTime.slice(0, 16) : "";
  els.statusInput.value = story?.status || STATUSES[0];
  els.storyModal.showModal();
}

function deleteActiveStory() {
  if (!activeStoryId) return;
  stories = stories.filter((s) => s.id !== activeStoryId);
  persistStories();
  els.detailModal.close();
  renderAll();
}

function openDetail(storyId) {
  const story = stories.find((s) => s.id === storyId);
  if (!story) return;
  activeStoryId = storyId;
  els.detailTitle.textContent = story.title;
  els.detailReporter.textContent = story.reporter;
  els.detailBudget.textContent = story.budgetLine;
  els.detailStatus.textContent = story.status;
  els.detailFileTime.textContent = formatDate(story.expectedFileTime);
  els.detailPublishTime.textContent = formatDate(story.expectedPublishTime);
  els.detailArtNotes.textContent = story.artNotes || "-";

  els.commentsList.innerHTML = story.comments
    .map((c) => `<li><strong>${escapeHtml(c.author)}:</strong> ${escapeHtml(c.body)} <small>(${formatDate(c.at)})</small></li>`)
    .join("") || "<li>No comments yet.</li>";

  els.activityList.innerHTML = story.activity
    .slice()
    .reverse()
    .map((a) => `<li>${escapeHtml(a.text)} <small>(${formatDate(a.at)})</small></li>`)
    .join("") || "<li>No activity yet.</li>";

  els.detailModal.showModal();
}

function addComment(e) {
  e.preventDefault();
  const story = stories.find((s) => s.id === activeStoryId);
  if (!story) return;
  const author = els.commentAuthorInput.value.trim();
  const body = els.commentBodyInput.value.trim();
  if (!author || !body) return;

  story.comments.push({ author, body, at: new Date().toISOString() });
  story.activity.push(logItem(`Comment added by ${author}`));
  persistStories();

  els.commentAuthorInput.value = "";
  els.commentBodyInput.value = "";
  openDetail(story.id);
  renderStoryList();
}

function renderAll() {
  renderStoryList();
  renderDueSoon();
  renderAgenda();
}

function renderStoryList() {
  const filtered = filteredStories();
  els.storyList.innerHTML = filtered
    .sort((a, b) => new Date(a.expectedPublishTime) - new Date(b.expectedPublishTime))
    .map(
      (s) => `<li>
      <div class="story-item-top"><strong>${escapeHtml(s.title)}</strong><span class="badge">${escapeHtml(s.status)}</span></div>
      <div>${escapeHtml(s.reporter)} • ${escapeHtml(s.budgetLine)}</div>
      <small>Publish: ${formatDate(s.expectedPublishTime)}</small>
      <div><button data-open="${s.id}" class="secondary">Details</button></div>
    </li>`
    )
    .join("") || "<li>No stories match your filters.</li>";

  els.storyList.querySelectorAll("[data-open]").forEach((btn) =>
    btn.addEventListener("click", () => openDetail(btn.dataset.open))
  );
}

function renderDueSoon() {
  const now = new Date();
  const cutoff = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const due = filteredStories()
    .filter((s) => {
      const t = new Date(s.expectedFileTime);
      return t >= now && t <= cutoff;
    })
    .sort((a, b) => new Date(a.expectedFileTime) - new Date(b.expectedFileTime));

  els.dueSoonList.innerHTML = due
    .map((s) => `<li><strong>${escapeHtml(s.title)}</strong><br/><small>${formatDate(s.expectedFileTime)} • ${escapeHtml(s.reporter)}</small></li>`)
    .join("") || "<li>No upcoming file deadlines in next 48 hours.</li>";
}

function renderAgenda() {
  els.agendaWeeks.innerHTML = loadedWeekStarts
    .sort((a, b) => a - b)
    .map((weekStart) => renderWeekBlockHtml(weekStart))
    .join("");

  els.agendaWeeks.insertAdjacentHTML("beforeend", '<div class="load-hint">Scroll to load more weeks...</div>');
  wireAgendaInteractions();
}

function renderWeekBlockHtml(monday) {
  const sunday = addDays(monday, 6);
  const days = [
    { key: dayKey(addDays(monday, 0)), label: `Monday (${formatShortDate(addDays(monday, 0))})`, date: addDays(monday, 0) },
    { key: dayKey(addDays(monday, 1)), label: `Tuesday (${formatShortDate(addDays(monday, 1))})`, date: addDays(monday, 1) },
    { key: dayKey(addDays(monday, 2)), label: `Wednesday (${formatShortDate(addDays(monday, 2))})`, date: addDays(monday, 2) },
    { key: dayKey(addDays(monday, 3)), label: `Thursday (${formatShortDate(addDays(monday, 3))})`, date: addDays(monday, 3) },
    { key: dayKey(addDays(monday, 4)), label: `Friday (${formatShortDate(addDays(monday, 4))})`, date: addDays(monday, 4) }
  ];

  const weekdayCols = days.map((day) => renderDayColumnHtml(day.key, day.label, day.date)).join("");
  const saturday = addDays(monday, 5);
  const sundayDate = addDays(monday, 6);

  return `<section class="week-block" data-week="${dayKey(monday)}">
    <h3 class="week-title">Week of ${formatShortDate(monday)} - ${formatShortDate(sunday)}</h3>
    <div class="week-grid">
      ${weekdayCols}
      <section class="day-column weekend-column">
        <h4 class="day-title">Weekend</h4>
        ${renderWeekendDayHtml(saturday, "Saturday")}
        ${renderWeekendDayHtml(sundayDate, "Sunday")}
      </section>
    </div>
  </section>`;
}

function renderDayColumnHtml(dateKey, label, dateObj) {
  const cards = renderStoriesForDay(dateObj);
  const notes = renderNotesForDay(dateKey);
  return `<section class="day-column" data-drop-day="${dateKey}">
    <h4 class="day-title">${label}</h4>
    ${cards}
    <div class="day-notes">
      ${notes}
      ${noteFormHtml(dateKey)}
    </div>
  </section>`;
}

function renderWeekendDayHtml(dateObj, label) {
  const key = dayKey(dateObj);
  const cards = renderStoriesForDay(dateObj);
  const notes = renderNotesForDay(key);
  return `<section class="weekend-day" data-drop-day="${key}">
    <h5 class="day-title">${label} (${formatShortDate(dateObj)})</h5>
    ${cards}
    <div class="day-notes">
      ${notes}
      ${noteFormHtml(key)}
    </div>
  </section>`;
}

function renderStoriesForDay(dateObj) {
  const rows = filteredStories()
    .filter((s) => sameDay(new Date(s.expectedPublishTime), dateObj))
    .sort((a, b) => new Date(a.expectedPublishTime) - new Date(b.expectedPublishTime));

  return rows.length ? rows.map((s) => buildStoryCardHtml(s)).join("") : '<div class="empty-day">No stories scheduled.</div>';
}

function renderNotesForDay(dateKey) {
  const notes = dayNotes[dateKey] || [];
  if (!notes.length) return '<div class="note-item">No day notes.</div>';
  return notes.map((n) => `<div class="note-item">${escapeHtml(n)}</div>`).join("");
}

function noteFormHtml(dateKey) {
  return `<form class="note-form" data-note-form="${dateKey}">
    <input type="text" data-note-input="${dateKey}" placeholder="Add day note (holiday, schedule change...)" />
    <button type="submit" class="secondary">Add Note</button>
  </form>`;
}

function buildStoryCardHtml(story) {
  const visibleLines = [];
  if (fieldPrefs.reporter) visibleLines.push(`<div class="card-line"><strong>Reporter:</strong> ${escapeHtml(story.reporter)}</div>`);
  if (fieldPrefs.budgetLine) visibleLines.push(`<div class="card-line"><strong>Budget:</strong> ${escapeHtml(story.budgetLine)}</div>`);
  if (fieldPrefs.status) visibleLines.push(`<div class="card-line"><strong>Status:</strong> ${escapeHtml(story.status)}</div>`);
  if (fieldPrefs.artNotes) visibleLines.push(`<div class="card-line"><strong>Art:</strong> ${escapeHtml(story.artNotes || "-")}</div>`);
  if (fieldPrefs.expectedFileTime) visibleLines.push(`<div class="card-line"><strong>File:</strong> ${formatDate(story.expectedFileTime)}</div>`);
  if (fieldPrefs.expectedPublishTime) visibleLines.push(`<div class="card-line"><strong>Publish:</strong> ${formatDate(story.expectedPublishTime)}</div>`);

  return `<article class="story-card" draggable="true" data-story="${story.id}">
      <div class="headline">${escapeHtml(story.title)}</div>
      ${visibleLines.join("")}
      <div class="time-editor">
        <label>Publish Time</label>
        <input type="time" data-publish-time-story="${story.id}" value="${toLocalTimeValue(story.expectedPublishTime)}" />
      </div>
      <div class="card-actions">
        <button class="secondary" data-open="${story.id}" type="button">Details</button>
        <button data-edit="${story.id}" type="button">Edit</button>
      </div>
    </article>`;
}

function wireAgendaInteractions() {
  els.agendaWeeks.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => openDetail(btn.dataset.open));
  });

  els.agendaWeeks.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const story = stories.find((s) => s.id === btn.dataset.edit);
      if (story) openStoryModal(story);
    });
  });

  els.agendaWeeks.querySelectorAll("form[data-note-form]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const dateKey = form.dataset.noteForm;
      const input = form.querySelector("input[data-note-input]");
      const text = input.value.trim();
      if (!text) return;
      if (!dayNotes[dateKey]) dayNotes[dateKey] = [];
      dayNotes[dateKey].push(text);
      persistDayNotes();
      renderAgenda();
    });
  });

  let draggedStoryId = null;
  els.agendaWeeks.querySelectorAll(".story-card").forEach((card) => {
    card.addEventListener("dragstart", () => {
      draggedStoryId = card.dataset.story;
    });
    card.addEventListener("dragend", () => {
      draggedStoryId = null;
      els.agendaWeeks.querySelectorAll("[data-drop-day]").forEach((c) => c.classList.remove("drag-over"));
    });
  });

  els.agendaWeeks.querySelectorAll("[data-drop-day]").forEach((zone) => {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("drag-over");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", () => {
      zone.classList.remove("drag-over");
      if (!draggedStoryId) return;
      moveStoryToDate(draggedStoryId, zone.dataset.dropDay);
    });
  });

  els.agendaWeeks.querySelectorAll("input[data-publish-time-story]").forEach((input) => {
    input.addEventListener("change", () => {
      const story = stories.find((s) => s.id === input.dataset.publishTimeStory);
      if (!story) return;
      const existing = new Date(story.expectedPublishTime);
      const [hours, minutes] = input.value.split(":").map((n) => Number(n));
      existing.setHours(hours, minutes, 0, 0);
      story.expectedPublishTime = existing.toISOString();
      story.activity.push(logItem("Expected publish time adjusted from agenda card"));
      persistStories();
      renderAll();
    });
  });
}

function moveStoryToDate(storyId, targetDayKey) {
  const story = stories.find((s) => s.id === storyId);
  if (!story) return;
  const current = new Date(story.expectedPublishTime);
  const target = fromDayKey(targetDayKey);
  target.setHours(current.getHours(), current.getMinutes(), 0, 0);
  story.expectedPublishTime = target.toISOString();
  story.activity.push(logItem(`Rescheduled via agenda drag/drop to ${targetDayKey}`));
  persistStories();
  renderAll();
}

function appendWeeks(count) {
  const sorted = loadedWeekStarts.sort((a, b) => a - b);
  let last = sorted[sorted.length - 1];
  for (let i = 0; i < count; i += 1) {
    last = addDays(last, 7);
    loadedWeekStarts.push(new Date(last));
  }
  renderAgenda();
}

function filteredStories() {
  const reporter = els.reporterFilter.value.trim().toLowerCase();
  const status = els.statusFilter.value;
  const budget = els.budgetFilter.value.trim().toLowerCase();

  return stories.filter((s) => {
    const matchesReporter = !reporter || s.reporter.toLowerCase().includes(reporter);
    const matchesStatus = !status || s.status === status;
    const matchesBudget = !budget || s.budgetLine.toLowerCase().includes(budget);
    return matchesReporter && matchesStatus && matchesBudget;
  });
}

function clearFilters() {
  els.reporterFilter.value = "";
  els.statusFilter.value = "";
  els.budgetFilter.value = "";
  renderAll();
}

function loadStories() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return parsed.map((s) => ({
      ...s,
      expectedPublishTime: s.expectedPublishTime || s.expectedFileTime
    }));
  } catch {
    return [];
  }
}

function persistStories() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
}

function loadDayNotes() {
  try {
    return JSON.parse(localStorage.getItem(DAY_NOTES_KEY) || "{}");
  } catch {
    return {};
  }
}

function persistDayNotes() {
  localStorage.setItem(DAY_NOTES_KEY, JSON.stringify(dayNotes));
}

function loadFieldPrefs() {
  const defaults = Object.fromEntries(FIELD_OPTIONS.map((f) => [f.key, true]));
  try {
    return { ...defaults, ...(JSON.parse(localStorage.getItem(FIELD_PREFS_KEY) || "{}")) };
  } catch {
    return defaults;
  }
}

function persistFieldPrefs() {
  localStorage.setItem(FIELD_PREFS_KEY, JSON.stringify(fieldPrefs));
}

function logItem(text) {
  return { text, at: new Date().toISOString() };
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

function fromDayKey(key) {
  return new Date(`${key}T00:00:00`);
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDate(iso) {
  return new Date(iso).toLocaleString();
}

function formatShortDate(date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function toLocalTimeValue(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
