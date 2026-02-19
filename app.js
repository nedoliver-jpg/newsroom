const STORAGE_KEY = "whiteboardStoriesV4";
const DAY_NOTES_KEY = "whiteboardDayNotesV2";
const FIELD_PREFS_KEY = "whiteboardAgendaFieldPrefs";
const STATUSES = ["Reporting", "Writing", "Editing", "Ready", "Published"];
const FIELD_OPTIONS = [
  { key: "reporter", label: "Reporter" },
  { key: "budgetLine", label: "Budget Line" },
  { key: "status", label: "Status" },
  { key: "artNotes", label: "Art Notes" },
  { key: "expectedFile", label: "Expected File" },
  { key: "expectedPublishDate", label: "Expected Publish Date" },
  { key: "priority", label: "Priority" },
  { key: "length", label: "Length" }
];

const els = {
  dueSoonList: document.getElementById("dueSoonList"),
  reporterFilter: document.getElementById("reporterFilter"),
  statusFilter: document.getElementById("statusFilter"),
  budgetFilter: document.getElementById("budgetFilter"),
  searchInput: document.getElementById("searchInput"),
  searchToggleBtn: document.getElementById("searchToggleBtn"),
  clearFiltersBtn: document.getElementById("clearFiltersBtn"),
  filtersToggleBtn: document.getElementById("filtersToggleBtn"),
  fieldsToggleBtn: document.getElementById("fieldsToggleBtn"),
  filtersPanel: document.getElementById("filtersPanel"),
  fieldsPanel: document.getElementById("fieldsPanel"),
  fieldToggles: document.getElementById("fieldToggles"),
  newStoryBtn: document.getElementById("newStoryBtn"),
  newReminderBtn: document.getElementById("newReminderBtn"),
  agendaScroller: document.getElementById("agendaScroller"),
  agendaWeeks: document.getElementById("agendaWeeks"),
  futureAgenda: document.getElementById("futureAgenda"),
  storyModal: document.getElementById("storyModal"),
  storyForm: document.getElementById("storyForm"),
  storyId: document.getElementById("storyId"),
  titleInput: document.getElementById("titleInput"),
  reporterInput: document.getElementById("reporterInput"),
  budgetInput: document.getElementById("budgetInput"),
  artNotesInput: document.getElementById("artNotesInput"),
  fileDateInput: document.getElementById("fileDateInput"),
  fileTimeInput: document.getElementById("fileTimeInput"),
  publishDateInput: document.getElementById("publishDateInput"),
  priorityInput: document.getElementById("priorityInput"),
  lengthInput: document.getElementById("lengthInput"),
  statusInput: document.getElementById("statusInput"),
  cancelModalBtn: document.getElementById("cancelModalBtn"),
  reminderModal: document.getElementById("reminderModal"),
  dayNoteForm: document.getElementById("dayNoteForm"),
  dayNoteDateInput: document.getElementById("dayNoteDateInput"),
  dayNoteTextInput: document.getElementById("dayNoteTextInput"),
  cancelReminderBtn: document.getElementById("cancelReminderBtn"),
  detailModal: document.getElementById("detailModal"),
  detailTitle: document.getElementById("detailTitle"),
  detailReporter: document.getElementById("detailReporter"),
  detailBudget: document.getElementById("detailBudget"),
  detailStatus: document.getElementById("detailStatus"),
  detailPriority: document.getElementById("detailPriority"),
  detailLength: document.getElementById("detailLength"),
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
let fieldPrefs = loadFieldPrefs();
let activeStoryId = null;
let loadedWeekStarts = [];

init();

function init() {
  bootstrapWeeks();
  renderFieldControls();
  els.dayNoteDateInput.value = dayKey(new Date());
  bindEvents();
  renderAll();
}

function bindEvents() {
  els.newStoryBtn.addEventListener("click", () => openStoryModal());
  els.newReminderBtn.addEventListener("click", () => els.reminderModal.showModal());
  els.cancelReminderBtn.addEventListener("click", () => els.reminderModal.close());
  els.dayNoteForm.addEventListener("submit", addReminder);
  els.cancelModalBtn.addEventListener("click", () => els.storyModal.close());
  els.storyForm.addEventListener("submit", saveStoryFromForm);
  els.fileDateInput.addEventListener("change", autoSetFileTimeDefault);
  els.clearFiltersBtn.addEventListener("click", clearFilters);
  [els.reporterFilter, els.statusFilter, els.budgetFilter, els.searchInput].forEach((el) => el.addEventListener("input", renderAll));
  els.searchToggleBtn.addEventListener("click", () => els.searchInput.classList.toggle("expanded-search"));
  els.filtersToggleBtn.addEventListener("click", () => els.filtersPanel.classList.toggle("hidden-panel"));
  els.fieldsToggleBtn.addEventListener("click", () => els.fieldsPanel.classList.toggle("hidden-panel"));
  els.titleInput.addEventListener("input", () => {
    const pos = els.titleInput.selectionStart;
    els.titleInput.value = els.titleInput.value.toUpperCase();
    els.titleInput.setSelectionRange(pos, pos);
  });
  els.commentForm.addEventListener("submit", addComment);
  els.closeDetailBtn.addEventListener("click", () => els.detailModal.close());
  els.editFromDetailBtn.addEventListener("click", () => {
    const story = stories.find((s) => s.id === activeStoryId);
    if (story) openStoryModal(story);
  });
  els.deleteStoryBtn.addEventListener("click", deleteActiveStory);
  els.agendaScroller.addEventListener("scroll", () => {
    if (els.agendaScroller.scrollTop + els.agendaScroller.clientHeight >= els.agendaScroller.scrollHeight - 200) appendWeeks(1);
  });
}

function bootstrapWeeks() {
  const nowMonday = getMonday(new Date());
  loadedWeekStarts = [nowMonday, addDays(nowMonday, 7), addDays(nowMonday, 14)];
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
      renderAll();
    });
  });
}

function autoSetFileTimeDefault() {
  if (els.fileDateInput.value && !els.fileTimeInput.value) els.fileTimeInput.value = "15:00";
}

function saveStoryFromForm(e) {
  e.preventDefault();
  const data = {
    id: els.storyId.value || crypto.randomUUID(),
    title: els.titleInput.value.trim().toUpperCase(),
    reporter: els.reporterInput.value.trim(),
    budgetLine: els.budgetInput.value.trim(),
    artNotes: els.artNotesInput.value.trim(),
    expectedFileDate: els.fileDateInput.value || "",
    expectedFileTime: els.fileTimeInput.value || "",
    expectedPublishDate: els.publishDateInput.value || "",
    priority: Number(els.priorityInput.value),
    length: els.lengthInput.value,
    status: els.statusInput.value,
    comments: [],
    activity: []
  };

  const existing = stories.find((s) => s.id === data.id);
  if (existing) {
    const statusChanged = existing.status !== data.status;
    data.comments = existing.comments;
    data.activity = [...existing.activity, logItem("Story updated"), ...(statusChanged ? [logItem(`Status changed: ${existing.status} -> ${data.status}`)] : [])];
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
  document.getElementById("storyModalTitle").textContent = story ? "Edit Story" : "New Story";
  els.storyId.value = story?.id || "";
  els.titleInput.value = story?.title || "";
  els.reporterInput.value = story?.reporter || "";
  els.budgetInput.value = story?.budgetLine || "";
  els.artNotesInput.value = story?.artNotes || "";
  els.fileDateInput.value = story?.expectedFileDate || "";
  els.fileTimeInput.value = story?.expectedFileTime || "";
  els.publishDateInput.value = story?.expectedPublishDate || "";
  els.priorityInput.value = String(story?.priority || 2);
  els.lengthInput.value = story?.length || "Medium";
  els.statusInput.value = story?.status || "Reporting";
  els.storyModal.showModal();
}

function renderAll() {
  renderInProgressToday();
  renderAgenda();
  renderFutureAgenda();
}

function filteredStories() {
  const reporter = els.reporterFilter.value.trim().toLowerCase();
  const status = els.statusFilter.value;
  const budget = els.budgetFilter.value.trim().toLowerCase();
  const q = els.searchInput.value.trim().toLowerCase();
  return stories.filter((s) => {
    const textBlob = `${s.title} ${s.reporter} ${s.budgetLine} ${s.artNotes}`.toLowerCase();
    return (!reporter || s.reporter.toLowerCase().includes(reporter)) &&
      (!status || s.status === status) &&
      (!budget || s.budgetLine.toLowerCase().includes(budget)) &&
      (!q || textBlob.includes(q));
  });
}

function renderInProgressToday() {
  const today = dayKey(new Date());
  const list = filteredStories()
    .filter((s) => s.expectedFileDate === today && s.status !== "Ready" && s.status !== "Published")
    .sort((a, b) => (a.expectedFileTime || "99:99").localeCompare(b.expectedFileTime || "99:99"));

  els.dueSoonList.innerHTML = list.length
    ? list.map((s) => `<li><strong>${escapeHtml(s.title)}</strong><br/><small>${escapeHtml(s.status)} • ${s.expectedFileTime || "No file time"}</small></li>`).join("")
    : "<li>No in-progress stories filing today.</li>";
}

function renderAgenda() {
  const validWeeks = loadedWeekStarts
    .sort((a, b) => a - b)
    .filter((weekStart) => weekStart >= getMonday(new Date()))
    .filter((weekStart) => hasNonPublishedInWeek(weekStart));

  const firstThree = validWeeks.slice(0, 3);
  els.agendaWeeks.innerHTML = firstThree.map((weekStart) => renderWeekBlockHtml(weekStart)).join("");
  wireAgendaInteractions();
}

function hasNonPublishedInWeek(monday) {
  const end = addDays(monday, 6);
  return filteredStories().some((s) => {
    if (!s.expectedPublishDate) return false;
    const d = new Date(`${s.expectedPublishDate}T00:00:00`);
    return d >= monday && d <= end && s.status !== "Published";
  });
}

function renderWeekBlockHtml(monday) {
  const sunday = addDays(monday, 6);
  const weekdays = [0,1,2,3,4].map((d) => addDays(monday,d));
  return `<section class="week-block">
    <h3 class="week-title">Week of ${formatShortDate(monday)} - ${formatShortDate(sunday)}</h3>
    <div class="week-grid">
      ${weekdays.map((d,i)=>renderDayColumnHtml(d,["Monday","Tuesday","Wednesday","Thursday","Friday"][i])).join("")}
      <section class="day-column weekend-column">
        <h4 class="day-title">Weekend</h4>
        ${renderDayColumnHtml(addDays(monday,5),"Saturday",true)}
        ${renderDayColumnHtml(addDays(monday,6),"Sunday",true)}
      </section>
    </div>
  </section>`;
}

function renderDayColumnHtml(dateObj, label, nested = false) {
  const dateStr = dayKey(dateObj);
  const notes = dayNotes[dateStr] || [];
  const rows = filteredStories()
    .filter((s) => s.expectedPublishDate === dateStr)
    .sort((a,b)=>(a.priority-b.priority)||((a.expectedFileTime||"99:99").localeCompare(b.expectedFileTime||"99:99")));

  const cards = rows.map((s) => buildStoryCardHtml(s)).join("");
  const noteMarkup = notes.length ? `<div class="day-notes">${notes.map((n)=>`<div class="note-item">${escapeHtml(n)}</div>`).join("")}</div>` : "";
  const cls = nested ? "weekend-day" : "day-column";
  return `<section class="${cls}" data-day="${dateStr}"><h5 class="day-title">${label} (${formatShortDate(dateObj)})</h5>${cards}${noteMarkup}</section>`;
}

function buildStoryCardHtml(story) {
  const lines = [];
  if (fieldPrefs.reporter) lines.push(`<div class="card-line"><strong>Reporter:</strong> ${escapeHtml(story.reporter)}</div>`);
  if (fieldPrefs.budgetLine) lines.push(`<div class="card-line"><strong>Budget:</strong> ${escapeHtml(story.budgetLine)}</div>`);
  if (fieldPrefs.status) lines.push(`<div class="card-line"><strong>Status:</strong> ${escapeHtml(story.status)}</div>`);
  if (fieldPrefs.artNotes) lines.push(`<div class="card-line"><strong>Art:</strong> ${escapeHtml(story.artNotes || "-")}</div>`);
  if (fieldPrefs.expectedFile) lines.push(`<div class="card-line"><strong>File:</strong> ${story.expectedFileDate || ""} ${story.expectedFileTime || ""}</div>`);
  if (fieldPrefs.expectedPublishDate) lines.push(`<div class="card-line"><strong>Publish:</strong> ${story.expectedPublishDate || ""}</div>`);
  if (fieldPrefs.priority) lines.push(`<div class="card-line"><strong>Priority:</strong> ${story.priority}</div>`);
  if (fieldPrefs.length) lines.push(`<div class="card-line"><strong>Length:</strong> ${escapeHtml(story.length)}</div>`);
  return `<article class="story-card" data-open="${story.id}"><div class="headline">${escapeHtml(story.title)}</div>${lines.join("")}</article>`;
}

function renderFutureAgenda() {
  const nowMonday = getMonday(new Date());
  const cutoff = addDays(nowMonday, 20); // after 3 weeks
  const withDates = filteredStories()
    .filter((s) => s.expectedPublishDate)
    .map((s) => ({ ...s, d: new Date(`${s.expectedPublishDate}T00:00:00`) }))
    .filter((s) => s.d > cutoff)
    .sort((a,b)=> a.d-b.d || (a.priority-b.priority));

  const grouped = groupBy(withDates, (s) => s.expectedPublishDate);
  const dateSections = Object.keys(grouped).sort().map((date) =>
    `<h4>${date}</h4><div class="list-group">${grouped[date].map((s)=>`<div class="list-item" data-open="${s.id}">${escapeHtml(s.title)} • ${escapeHtml(s.status)} • P${s.priority}</div>`).join("")}</div>`
  ).join("");

  const unscheduled = filteredStories().filter((s) => !s.expectedPublishDate && s.status !== "Reporting");
  const ready = unscheduled.filter((s) => s.status === "Ready");
  const editing = unscheduled.filter((s) => s.status === "Editing");
  const writing = unscheduled.filter((s) => s.status === "Writing");

  const investigating = filteredStories().filter((s) => !s.expectedFileDate && !s.expectedFileTime && s.status === "Reporting");

  els.futureAgenda.innerHTML = `
    <h3>Extended Agenda (after 3 weeks)</h3>
    ${dateSections || ""}
    <h3>Unscheduled</h3>
    ${renderStatusBucket("Ready", ready)}
    ${renderStatusBucket("Editing", editing)}
    ${renderStatusBucket("Writing", writing)}
    <h3>Investigating</h3>
    ${investigating.map((s)=>`<div class="list-item" data-open="${s.id}">${escapeHtml(s.title)}</div>`).join("")}
  `;

  wireAgendaInteractions();
}

function renderStatusBucket(label, list) {
  if (!list.length) return "";
  return `<h4>${label}</h4><div class="list-group">${list.map((s)=>`<div class="list-item" data-open="${s.id}">${escapeHtml(s.title)} • P${s.priority}</div>`).join("")}</div>`;
}

function wireAgendaInteractions() {
  document.querySelectorAll("[data-open]").forEach((el) => {
    el.addEventListener("click", () => openDetail(el.dataset.open));
  });
}

function openDetail(storyId) {
  const story = stories.find((s) => s.id === storyId);
  if (!story) return;
  activeStoryId = storyId;
  els.detailTitle.textContent = story.title;
  els.detailReporter.textContent = story.reporter;
  els.detailBudget.textContent = story.budgetLine;
  els.detailStatus.textContent = story.status;
  els.detailPriority.textContent = String(story.priority);
  els.detailLength.textContent = story.length;
  els.detailFileTime.textContent = `${story.expectedFileDate || "-"} ${story.expectedFileTime || ""}`.trim();
  els.detailPublishTime.textContent = story.expectedPublishDate || "-";
  els.detailArtNotes.textContent = story.artNotes || "-";
  els.commentsList.innerHTML = story.comments.map((c)=>`<li><strong>${escapeHtml(c.author)}:</strong> ${escapeHtml(c.body)}</li>`).join("") || "<li>No comments yet.</li>";
  els.activityList.innerHTML = story.activity.slice().reverse().map((a)=>`<li>${escapeHtml(a.text)} <small>(${formatDate(a.at)})</small></li>`).join("") || "<li>No activity yet.</li>";
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
}

function deleteActiveStory() {
  if (!activeStoryId) return;
  stories = stories.filter((s) => s.id !== activeStoryId);
  persistStories();
  els.detailModal.close();
  renderAll();
}

function addReminder(e) {
  e.preventDefault();
  const dateKey = els.dayNoteDateInput.value;
  const text = els.dayNoteTextInput.value.trim();
  if (!dateKey || !text) return;
  if (!dayNotes[dateKey]) dayNotes[dateKey] = [];
  dayNotes[dateKey].push(text);
  persistDayNotes();
  els.dayNoteTextInput.value = "";
  els.reminderModal.close();
  renderAll();
}

function clearFilters() {
  els.reporterFilter.value = "";
  els.statusFilter.value = "";
  els.budgetFilter.value = "";
  els.searchInput.value = "";
  renderAll();
}

function appendWeeks(count) {
  let last = loadedWeekStarts.sort((a,b)=>a-b)[loadedWeekStarts.length - 1] || getMonday(new Date());
  for (let i=0;i<count;i+=1) {
    last = addDays(last, 7);
    loadedWeekStarts.push(new Date(last));
  }
  renderAll();
}

function loadStories() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return parsed.map((s) => ({
      ...s,
      title: (s.title || "").toUpperCase(),
      expectedFileDate: s.expectedFileDate || "",
      expectedFileTime: s.expectedFileTime || "",
      expectedPublishDate: s.expectedPublishDate || "",
      priority: Number(s.priority || 2),
      length: s.length || "Medium",
      status: s.status || "Reporting",
      comments: s.comments || [],
      activity: s.activity || []
    }));
  } catch {
    return [];
  }
}

function persistStories() { localStorage.setItem(STORAGE_KEY, JSON.stringify(stories)); }
function loadDayNotes() { try { return JSON.parse(localStorage.getItem(DAY_NOTES_KEY) || "{}"); } catch { return {}; } }
function persistDayNotes() { localStorage.setItem(DAY_NOTES_KEY, JSON.stringify(dayNotes)); }
function loadFieldPrefs() {
  const defaults = Object.fromEntries(FIELD_OPTIONS.map((f) => [f.key, true]));
  try { return { ...defaults, ...(JSON.parse(localStorage.getItem(FIELD_PREFS_KEY) || "{}")) }; } catch { return defaults; }
}
function persistFieldPrefs() { localStorage.setItem(FIELD_PREFS_KEY, JSON.stringify(fieldPrefs)); }
function logItem(text) { return { text, at: new Date().toISOString() }; }
function getMonday(date) { const d = new Date(date); const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day; d.setDate(d.getDate()+diff); d.setHours(0,0,0,0); return d; }
function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate()+days); return d; }
function dayKey(date) { return date.toISOString().slice(0,10); }
function formatDate(iso) { return new Date(iso).toLocaleString(); }
function formatShortDate(date) { return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function groupBy(arr, fn) { return arr.reduce((acc, item) => { const k = fn(item); (acc[k] ||= []).push(item); return acc; }, {}); }
function escapeHtml(text) { return String(text).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;"); }
