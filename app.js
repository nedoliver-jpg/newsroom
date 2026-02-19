const STORAGE_KEY = "newsroomStoriesV1";
const REMINDER_KEY = "newsroomRemindersEnabled";
const STATUSES = ["In reporting", "Editing", "Ready", "Published"];

const els = {
  calendar: document.getElementById("calendar"),
  storyList: document.getElementById("storyList"),
  dueSoonList: document.getElementById("dueSoonList"),
  reporterFilter: document.getElementById("reporterFilter"),
  statusFilter: document.getElementById("statusFilter"),
  budgetFilter: document.getElementById("budgetFilter"),
  clearFiltersBtn: document.getElementById("clearFiltersBtn"),
  newStoryBtn: document.getElementById("newStoryBtn"),
  remindersToggle: document.getElementById("remindersToggle"),
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
let calendar;
let reminderTimer;

init();

function init() {
  els.remindersToggle.checked = localStorage.getItem(REMINDER_KEY) === "true";

  calendar = new FullCalendar.Calendar(els.calendar, {
    initialView: "dayGridMonth",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "timeGridDay,timeGridWeek,listWeek"
    },
    buttonText: {
      timeGridDay: "Daily",
      timeGridWeek: "Week",
      listWeek: "List"
    },
    editable: true,
    eventDrop: onEventDrop,
    eventClick: (info) => openDetail(info.event.id),
    events: makeFilteredEvents()
  });
  calendar.render();

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
    const newActivity = [
      ...existing.activity,
      logItem(`Story updated by shared newsroom user`),
      ...(statusChanged ? [logItem(`Status changed: ${existing.status} → ${data.status}`)] : [])
    ];
    data.comments = existing.comments;
    data.activity = newActivity;
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

function onEventDrop(info) {
  const story = stories.find((s) => s.id === info.event.id);
  if (!story) return;
  story.expectedFileTime = info.event.start.toISOString();
  story.activity.push(logItem("Expected file time rescheduled via drag/drop"));
  persistStories();
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
  els.detailArtNotes.textContent = story.artNotes || "—";

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
  calendar.removeAllEvents();
  calendar.addEventSource(makeFilteredEvents());
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

function makeFilteredEvents() {
  return filteredStories().map((s) => ({
    id: s.id,
    title: `${s.title} (${s.reporter})`,
    start: s.expectedFileTime,
    allDay: false
  }));
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

function logItem(text) {
  return { text, at: new Date().toISOString() };
}

function formatDate(iso) {
  return new Date(iso).toLocaleString();
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
