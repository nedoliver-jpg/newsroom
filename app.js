const STORAGE_KEY = "newsroomStoriesV2";
const REMINDER_KEY = "newsroomRemindersEnabled";
const FIELD_PREFS_KEY = "newsroomAgendaFieldPrefs";
const STATUSES = ["In reporting", "Editing", "Ready", "Published"];
const FIELD_OPTIONS = [
  { key: "reporter", label: "Reporter" },
  { key: "budgetLine", label: "Budget Line" },
  { key: "status", label: "Status" },
  { key: "artNotes", label: "Art Notes" },
  { key: "expectedFileTime", label: "Expected File Time" }
];

const els = {
  storyList: document.getElementById("storyList"),
  dueSoonList: document.getElementById("dueSoonList"),
  reporterFilter: document.getElementById("reporterFilter"),
  statusFilter: document.getElementById("statusFilter"),
  budgetFilter: document.getElementById("budgetFilter"),
  clearFiltersBtn: document.getElementById("clearFiltersBtn"),
  newStoryBtn: document.getElementById("newStoryBtn"),
  remindersToggle: document.getElementById("remindersToggle"),
  fieldToggles: document.getElementById("fieldToggles"),
  agendaBoard: document.getElementById("agendaBoard"),
  agendaRangeLabel: document.getElementById("agendaRangeLabel"),
  prevWeekBtn: document.getElementById("prevWeekBtn"),
  nextWeekBtn: document.getElementById("nextWeekBtn"),
  thisWeekBtn: document.getElementById("thisWeekBtn"),
  storyModal: document.getElementById("storyModal"),
  storyForm: document.getElementById("storyForm"),
  storyId: document.getElementById("storyId"),
  titleInput: document.getElementById("titleInput"),
  reporterInput: document.getElementById("reporterInput"),
  budgetInput: document.getElementById("budgetInput"),
  artNotesInput: document.getElementById("artNotesInput"),
  fileTimeInput: document.getElementById("fileTimeInput"),
  statusInput: document.getElementById("statusInput"),
  cancelModalBtn: document.getElementById("cancelModalBtn"),
  detailModal: document.getElementById("detailModal"),
  detailTitle: document.getElementById("detailTitle"),
  detailReporter: document.getElementById("detailReporter"),
  detailBudget: document.getElementById("detailBudget"),
  detailStatus: document.getElementById("detailStatus"),
  detailFileTime: document.getElementById("detailFileTime"),
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
let activeStoryId = null;
let reminderTimer;
let currentWeekStart = getMonday(new Date());
let fieldPrefs = loadFieldPrefs();

init();

function init() {
  els.remindersToggle.checked = localStorage.getItem(REMINDER_KEY) === "true";
  renderFieldControls();
  bindEvents();
  renderAll();
  scheduleReminderCheck();
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
  els.remindersToggle.addEventListener("change", () => {
    localStorage.setItem(REMINDER_KEY, String(els.remindersToggle.checked));
    scheduleReminderCheck();
  });
  els.prevWeekBtn.addEventListener("click", () => {
    currentWeekStart = addDays(currentWeekStart, -7);
    renderAgenda();
  });
  els.nextWeekBtn.addEventListener("click", () => {
    currentWeekStart = addDays(currentWeekStart, 7);
    renderAgenda();
  });
  els.thisWeekBtn.addEventListener("click", () => {
    currentWeekStart = getMonday(new Date());
    renderAgenda();
  });
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
    .sort((a, b) => new Date(a.expectedFileTime) - new Date(b.expectedFileTime))
    .map(
      (s) => `<li>
      <div class="story-item-top"><strong>${escapeHtml(s.title)}</strong><span class="badge">${escapeHtml(s.status)}</span></div>
      <div>${escapeHtml(s.reporter)} • ${escapeHtml(s.budgetLine)}</div>
      <small>${formatDate(s.expectedFileTime)}</small>
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
    .join("") || "<li>No upcoming deadlines in next 48 hours.</li>";
}

function renderAgenda() {
  const monday = currentWeekStart;
  const friday = addDays(monday, 4);
  const sunday = addDays(monday, 6);
  els.agendaRangeLabel.textContent = `${formatShortDate(monday)} - ${formatShortDate(sunday)}`;

  const columns = [
    { key: "mon", label: `Monday (${formatShortDate(monday)})`, match: (d) => sameDay(d, monday) },
    { key: "tue", label: `Tuesday (${formatShortDate(addDays(monday, 1))})`, match: (d) => sameDay(d, addDays(monday, 1)) },
    { key: "wed", label: `Wednesday (${formatShortDate(addDays(monday, 2))})`, match: (d) => sameDay(d, addDays(monday, 2)) },
    { key: "thu", label: `Thursday (${formatShortDate(addDays(monday, 3))})`, match: (d) => sameDay(d, addDays(monday, 3)) },
    { key: "fri", label: `Friday (${formatShortDate(friday)})`, match: (d) => sameDay(d, friday) },
    {
      key: "weekend",
      label: `Saturday/Sunday (${formatShortDate(addDays(monday, 5))} + ${formatShortDate(sunday)})`,
      match: (d) => sameDay(d, addDays(monday, 5)) || sameDay(d, sunday)
    }
  ];

  els.agendaBoard.innerHTML = columns.map((col) => {
    const colStories = filteredStories()
      .filter((s) => col.match(new Date(s.expectedFileTime)))
      .sort((a, b) => new Date(a.expectedFileTime) - new Date(b.expectedFileTime));

    const cards = colStories.length
      ? colStories.map((s) => buildStoryCardHtml(s)).join("")
      : '<div class="empty-day">No stories scheduled.</div>';

    return `<section class="day-column" data-column="${col.key}">
      <h3 class="day-title">${col.label}</h3>
      ${cards}
    </section>`;
  }).join("");

  wireAgendaInteractions();
}

function buildStoryCardHtml(story) {
  const visibleLines = [];
  if (fieldPrefs.reporter) visibleLines.push(`<div class="card-line"><strong>Reporter:</strong> ${escapeHtml(story.reporter)}</div>`);
  if (fieldPrefs.budgetLine) visibleLines.push(`<div class="card-line"><strong>Budget:</strong> ${escapeHtml(story.budgetLine)}</div>`);
  if (fieldPrefs.status) visibleLines.push(`<div class="card-line"><strong>Status:</strong> ${escapeHtml(story.status)}</div>`);
  if (fieldPrefs.artNotes) visibleLines.push(`<div class="card-line"><strong>Art:</strong> ${escapeHtml(story.artNotes || "-")}</div>`);
  if (fieldPrefs.expectedFileTime) visibleLines.push(`<div class="card-line"><strong>File:</strong> ${formatDate(story.expectedFileTime)}</div>`);

  return `<article class="story-card" draggable="true" data-story="${story.id}">
      <div class="headline">${escapeHtml(story.title)}</div>
      ${visibleLines.join("")}
      <div class="time-editor">
        <label>Time</label>
        <input type="time" data-time-story="${story.id}" value="${toLocalTimeValue(story.expectedFileTime)}" />
      </div>
      <div class="card-actions">
        <button class="secondary" data-open="${story.id}" type="button">Details</button>
        <button data-edit="${story.id}" type="button">Edit</button>
      </div>
    </article>`;
}

function wireAgendaInteractions() {
  els.agendaBoard.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => openDetail(btn.dataset.open));
  });
  els.agendaBoard.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const story = stories.find((s) => s.id === btn.dataset.edit);
      if (story) openStoryModal(story);
    });
  });

  let draggedStoryId = null;
  els.agendaBoard.querySelectorAll(".story-card").forEach((card) => {
    card.addEventListener("dragstart", () => {
      draggedStoryId = card.dataset.story;
    });
    card.addEventListener("dragend", () => {
      draggedStoryId = null;
      els.agendaBoard.querySelectorAll(".day-column").forEach((c) => c.classList.remove("drag-over"));
    });
  });

  els.agendaBoard.querySelectorAll(".day-column").forEach((col) => {
    col.addEventListener("dragover", (e) => {
      e.preventDefault();
      col.classList.add("drag-over");
    });
    col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
    col.addEventListener("drop", () => {
      col.classList.remove("drag-over");
      if (!draggedStoryId) return;
      moveStoryToColumnDay(draggedStoryId, col.dataset.column);
    });
  });

  els.agendaBoard.querySelectorAll("input[data-time-story]").forEach((input) => {
    input.addEventListener("change", () => {
      const story = stories.find((s) => s.id === input.dataset.timeStory);
      if (!story) return;
      const existing = new Date(story.expectedFileTime);
      const [hours, minutes] = input.value.split(":").map((n) => Number(n));
      existing.setHours(hours, minutes, 0, 0);
      story.expectedFileTime = existing.toISOString();
      story.activity.push(logItem("Expected file time adjusted from agenda card"));
      persistStories();
      renderAll();
    });
  });
}

function moveStoryToColumnDay(storyId, columnKey) {
  const story = stories.find((s) => s.id === storyId);
  if (!story) return;

  const current = new Date(story.expectedFileTime);
  const monday = currentWeekStart;
  const targets = {
    mon: addDays(monday, 0),
    tue: addDays(monday, 1),
    wed: addDays(monday, 2),
    thu: addDays(monday, 3),
    fri: addDays(monday, 4),
    weekend: addDays(monday, 5)
  };

  const targetDate = targets[columnKey];
  if (!targetDate) return;

  targetDate.setHours(current.getHours(), current.getMinutes(), 0, 0);
  story.expectedFileTime = targetDate.toISOString();
  story.activity.push(logItem(`Rescheduled via agenda drag/drop to ${columnKey}`));
  persistStories();
  renderAll();
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

function scheduleReminderCheck() {
  clearInterval(reminderTimer);
  if (!els.remindersToggle.checked) return;
  reminderTimer = setInterval(checkUpcomingReminders, 60_000);
  checkUpcomingReminders();
}

function checkUpcomingReminders() {
  if (!els.remindersToggle.checked) return;
  const now = new Date();
  const ahead = new Date(now.getTime() + 60 * 60 * 1000);
  const upcoming = stories.filter((s) => {
    const t = new Date(s.expectedFileTime);
    return t > now && t <= ahead && s.status !== "Published";
  });
  if (!upcoming.length) return;

  const msg = upcoming.map((s) => `${s.title} (${formatDate(s.expectedFileTime)})`).join("\n");
  alert(`Upcoming file deadlines within 1 hour:\n${msg}`);
}

function loadStories() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function persistStories() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
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
