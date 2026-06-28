/* =========================================================
   DAYKEEPER — app.js
   Полностью рабочее приложение поверх дизайна Codex.
   Хранилище: localStorage (ключ DAYKEEPER_DB). Структура
   спроектирована так, чтобы её было легко перелить в Supabase
   (см. комментарий SUPABASE MIGRATION внизу файла).
   ========================================================= */

/* ---------- УТИЛИТЫ ---------- */
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const todayISO = () => new Date().toISOString().split("T")[0];
const offsetISO = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().split("T")[0]; };
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const RU_MONTHS = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const RU_DAYS = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];
const RU_DAYS_SHORT = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];

function fmtHuman(dateISO) {
  if (!dateISO) return "";
  const d = new Date(dateISO + "T00:00:00");
  return `${d.getDate()} ${RU_MONTHS[d.getMonth()]}`;
}
function fmtRelative(dateISO, time) {
  if (!dateISO) return "";
  const d = new Date(dateISO + "T00:00:00");
  const t = new Date(); t.setHours(0,0,0,0);
  const diff = Math.round((d - t) / 86400000);
  let label = diff === 0 ? "сегодня" : diff === 1 ? "завтра" : diff === -1 ? "вчера"
    : diff < -1 ? `просрочено · ${Math.abs(diff)}д` : fmtHuman(dateISO);
  return time ? `${label} · ${time}` : label;
}
function daysUntilBirthday(mmdd) {
  const [mm, dd] = mmdd.split("-").map(Number);
  const now = new Date(); now.setHours(0,0,0,0);
  let next = new Date(now.getFullYear(), mm - 1, dd);
  if (next < now) next = new Date(now.getFullYear() + 1, mm - 1, dd);
  return Math.round((next - now) / 86400000);
}
function initials(name) {
  return name.trim().split(/\s+/).slice(0,2).map(w => w[0]?.toUpperCase() || "").join("");
}
function plural(n, one, few, many) {
  n = Math.abs(n) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}

/* ---------- ХРАНИЛИЩЕ ---------- */
const DB_KEY = "DAYKEEPER_DB_V1";

function defaultDB() {
  const t = todayISO(), y = offsetISO(-1), w3 = offsetISO(3), w6 = offsetISO(6);
  return {
    tasks: [
      { id: uid(), title: "Собрать мягкий план на неделю", desc: "", date: t, time: "09:30", tag: "Работа", done: true, created: Date.now() - 5000 },
      { id: uid(), title: "Ответить на важные сообщения", desc: "", date: t, time: "18:00", tag: "Связь", done: false, created: Date.now() - 4000 },
      { id: uid(), title: "Подготовить идеи для интерфейса", desc: "", date: w3, time: "", tag: "Дизайн", done: false, created: Date.now() - 3000 },
      { id: uid(), title: "Разобрать входящие заметки", desc: "", date: t, time: "", tag: "Дом", done: false, created: Date.now() - 2000 },
      { id: uid(), title: "Выбрать подарок для Ани", desc: "", date: w6, time: "", tag: "Люди", done: false, created: Date.now() - 1000 },
      { id: uid(), title: "Собрать список идей на месяц", desc: "", date: offsetISO(20), time: "", tag: "Планы", done: false, created: Date.now() },
    ],
    habits: [
      { id: uid(), name: "Вода", icon: "💧", log: {}, created: Date.now() },
      { id: uid(), name: "Чтение", icon: "📖", log: {}, created: Date.now() },
      { id: uid(), name: "Растяжка", icon: "🧘", log: {}, created: Date.now() },
      { id: uid(), name: "Дневник", icon: "✎", log: {}, created: Date.now() },
    ],
    routines: [
      { id: uid(), title: "Тренировка", type: "weekly-time", weekdays: [1,3,5], time: "19:00", lastDone: null },
      { id: uid(), title: "Витамины", type: "daily-time", time: "09:00", lastDone: null },
      { id: uid(), title: "Вечерний уход", type: "daily-time", time: "22:30", lastDone: null },
      { id: uid(), title: "Стирка", type: "weekly-time", weekdays: [6], daypart: "день", time: "", lastDone: null },
      { id: uid(), title: "Планирование", type: "weekly-time", weekdays: [0], daypart: "вечер", time: "", lastDone: null },
      { id: uid(), title: "Разбор сумки", type: "weekly-time", weekdays: [5], daypart: "вечер", time: "", lastDone: null },
      { id: uid(), title: "Уборка ванной", type: "interval", everyDays: 7, lastDone: offsetISO(-3) },
      { id: uid(), title: "Пылесос", type: "interval", everyDays: 3, lastDone: offsetISO(-2) },
      { id: uid(), title: "Мытьё полов", type: "interval", everyDays: 5, lastDone: offsetISO(-4) },
      { id: uid(), title: "Генеральная уборка", type: "interval", everyDays: 30, lastDone: offsetISO(-10) },
    ],
    moodEntries: [],
    bodyMetrics: [
      { id: uid(), date: offsetISO(-28), weight: 63.0, waist: 70, chest: 90, hips: 97 },
      { id: uid(), date: offsetISO(-14), weight: 62.7, waist: 69, chest: 90, hips: 96.5 },
      { id: uid(), date: offsetISO(-1),  weight: 62.4, waist: 68, chest: 90, hips: 96 },
    ],
    calorieLog: {
      [t]:  { eaten: 1420, burned: 1890, meals: [] },
      [y]:  { eaten: 1880, burned: 2160, meals: [] },
      [offsetISO(-2)]: { eaten: 1680, burned: 2050, meals: [] },
      [offsetISO(-3)]: { eaten: 1930, burned: 2210, meals: [] },
      [offsetISO(-4)]: { eaten: 1760, burned: 2010, meals: [] },
      [offsetISO(-5)]: { eaten: 1820, burned: 2140, meals: [] },
    },
    shopping: [
      { id: uid(), group: "Продукты", items: [
        { id: uid(), name: "Творог", done: false },
        { id: uid(), name: "Ягоды", done: false },
        { id: uid(), name: "Овощи для салата", done: false },
        { id: uid(), name: "Кофе", done: false },
      ]},
      { id: uid(), group: "Дом", items: [
        { id: uid(), name: "Средство для ванной", done: false },
        { id: uid(), name: "Салфетки", done: false },
        { id: uid(), name: "Свеча", done: false },
      ]},
      { id: uid(), group: "Для себя", items: [
        { id: uid(), name: "Блокнот", done: false },
        { id: uid(), name: "Крем для рук", done: false },
        { id: uid(), name: "Открытка", done: false },
      ]},
    ],
    diary: [
      { id: uid(), title: "После спокойной прогулки", text: "Поймала ощущение, что день стал тише. Хочу чаще оставлять себе такие маленькие окна.", tags: ["прогулка","тишина"], photos: [], created: Date.now() - 86400000 },
      { id: uid(), title: "Мысли о работе", text: "Было много входящих задач, но список помог не распасться на мелочи.", tags: ["работа","фокус"], photos: [], created: Date.now() - 2*86400000 },
    ],
    birthdays: [
      { id: uid(), name: "Аня", mmdd: (()=>{const d=new Date();d.setDate(d.getDate()+1);return String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")})(), note: "Подобрать открытку и тёплые слова" },
      { id: uid(), name: "Мама", mmdd: (()=>{const d=new Date();d.setDate(d.getDate()+12);return String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")})(), note: "Заказать цветы заранее" },
      { id: uid(), name: "Ира", mmdd: (()=>{const d=new Date();d.setDate(d.getDate()+29);return String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")})(), note: "Идея подарка: красивая книга" },
    ],
    settings: { notifDismissed: false },
  };
}

let DB = loadDB();

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) { const fresh = defaultDB(); localStorage.setItem(DB_KEY, JSON.stringify(fresh)); return fresh; }
    return JSON.parse(raw);
  } catch (e) {
    console.error("DayKeeper: ошибка чтения хранилища, создаю заново", e);
    const fresh = defaultDB();
    localStorage.setItem(DB_KEY, JSON.stringify(fresh));
    return fresh;
  }
}
function saveDB(syncType) {
  localStorage.setItem(DB_KEY, JSON.stringify(DB));
  // Синхронизируем с Supabase если пользователь авторизован
  if (syncType && typeof window.__sbQueueSync === "function") {
    window.__sbQueueSync(syncType);
  }
}

/* ---------- ВКЛАДКИ / НАВИГАЦИЯ ---------- */
const setSection = (id) => {
  document.querySelectorAll(".section").forEach((s) => s.classList.toggle("is-visible", s.id === id));
  document.querySelectorAll("[data-section]").forEach((b) => b.classList.toggle("is-active", b.dataset.section === id));
  window.scrollTo(0, 0);
};
document.querySelectorAll("[data-section]").forEach((b) => b.addEventListener("click", () => setSection(b.dataset.section)));

/* =========================================================
   ЗАДАЧИ
   ========================================================= */
let taskFilter = "today";
let taskView = "cards";

const TAG_OPTIONS = ["Работа","Дом","Личное","Связь","Дизайн","Люди","Планы","Здоровье"];

function taskInRange(task, range) {
  if (!task.date) return range === "all";
  const t = todayISO();
  if (range === "today") return task.date === t;
  if (range === "week") {
    const d = new Date(task.date + "T00:00:00"), now = new Date(); now.setHours(0,0,0,0);
    const diff = Math.round((d - now) / 86400000);
    return diff >= 0 && diff <= 6;
  }
  if (range === "month") {
    const d = new Date(task.date + "T00:00:00"), now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  return true;
}

function taskRowHTML(task) {
  return `
  <div class="task-row ${task.done ? "done" : ""}" data-task-id="${task.id}">
    <button class="check task-check" aria-label="Отметить задачу">${task.done ? "✓" : ""}</button>
    <div style="flex:1;min-width:0">
      <strong>${esc(task.title)}</strong>
      <div class="meta">${[task.tag, fmtRelative(task.date, task.time)].filter(Boolean).join(" · ")}</div>
    </div>
    <button class="icon-action task-edit" aria-label="Изменить" style="width:34px;height:34px;font-size:14px">✎</button>
    <button class="icon-action task-del" aria-label="Удалить" style="width:34px;height:34px;font-size:14px">✕</button>
  </div>`;
}
function taskCardHTML(task) {
  return `
  <article class="task-card ${task.done ? "done" : ""}" data-task-id="${task.id}">
    <header>
      <span class="tag">${esc(task.tag || "Без тега")}</span>
      <button class="check task-check" aria-label="Отметить задачу">${task.done ? "✓" : ""}</button>
    </header>
    <div>
      <h3>${esc(task.title)}</h3>
      <p class="meta">${fmtRelative(task.date, task.time) || "Без даты"}</p>
    </div>
    <div class="attachment-row" style="margin-top:2px">
      <button class="ghost-action task-edit" style="padding:8px 12px;font-size:12px">Изменить</button>
      <button class="ghost-action task-del" style="padding:8px 12px;font-size:12px">Удалить</button>
    </div>
  </article>`;
}

function renderTasks() {
  const todayList = DB.tasks.filter(t => t.date === todayISO())
    .sort((a,b) => (a.done - b.done) || (a.time || "99:99").localeCompare(b.time || "99:99"));
  document.querySelector("#todayTasks").innerHTML = todayList.length
    ? todayList.slice(0, 4).map(taskRowHTML).join("")
    : `<p class="muted-copy">На сегодня пока пусто. Можно добавить первую задачу.</p>`;

  const filtered = DB.tasks
    .filter(t => taskInRange(t, taskFilter))
    .sort((a,b) => (a.done - b.done) || (a.date||"9999").localeCompare(b.date||"9999") || (a.time||"99:99").localeCompare(b.time||"99:99"));

  const board = document.querySelector("#taskBoard");
  board.classList.toggle("list-view", taskView === "list");
  board.innerHTML = filtered.length
    ? filtered.map(t => taskView === "cards" ? taskCardHTML(t) : taskRowHTML(t)).join("")
    : `<p class="muted-copy">Здесь пока пусто. Загляни позже или добавь новую задачу.</p>`;

  bindTaskRowEvents();
}
function bindTaskRowEvents() {
  document.querySelectorAll(".task-check").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.closest("[data-task-id]").dataset.taskId;
      const task = DB.tasks.find(t => t.id === id);
      task.done = !task.done;
      saveDB("tasks"); renderTasks(); renderDashboardMisc();
      if (task.done) confettiBurst(btn);
    });
  });
  document.querySelectorAll(".task-del").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.closest("[data-task-id]").dataset.taskId;
      DB.tasks = DB.tasks.filter(t => t.id !== id);
      saveDB("tasks"); renderTasks();
    });
  });
  document.querySelectorAll(".task-edit").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.closest("[data-task-id]").dataset.taskId;
      openTaskModal(DB.tasks.find(t => t.id === id));
    });
  });
}

document.querySelectorAll("#taskFilters button").forEach((btn) => {
  btn.addEventListener("click", () => {
    taskFilter = btn.dataset.filter;
    document.querySelectorAll("#taskFilters button").forEach(b => b.classList.toggle("is-selected", b === btn));
    renderTasks();
  });
});
document.querySelectorAll("#viewToggle button").forEach((btn) => {
  btn.addEventListener("click", () => {
    taskView = btn.dataset.view;
    document.querySelectorAll("#viewToggle button").forEach(b => b.classList.toggle("is-selected", b === btn));
    renderTasks();
  });
});

/* ---- Модальные окна (динамически создаются, переиспользуют существующие CSS-классы) ---- */
function ensureModalRoot() {
  if (document.getElementById("modalRoot")) return;
  const div = document.createElement("div");
  div.id = "modalRoot";
  document.body.appendChild(div);
  const style = document.createElement("style");
  style.textContent = `
    .gd-backdrop{position:fixed;inset:0;background:rgba(48,41,37,.32);backdrop-filter:blur(6px);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;pointer-events:none;transition:opacity .2s}
    .gd-backdrop.open{opacity:1;pointer-events:all}
    .gd-modal{width:100%;max-width:480px;max-height:88vh;overflow-y:auto;padding:28px;border-radius:var(--radius-xl);border:1px solid rgba(73,55,42,.12);background:linear-gradient(145deg, rgba(255,253,248,.97), rgba(255,247,237,.95)), var(--paper);box-shadow:var(--shadow);transform:translateY(16px);transition:transform .2s}
    .gd-backdrop.open .gd-modal{transform:translateY(0)}
    .gd-modal h3{font-family:'Playfair Display',serif;font-size:22px;margin-bottom:18px}
    .gd-field{margin-bottom:14px}
    .gd-field label{display:block;font-size:11px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
    .gd-field input[type=text],.gd-field input[type=date],.gd-field input[type=time],.gd-field input[type=number],.gd-field select,.gd-field textarea{
      width:100%;padding:11px 14px;border:1px solid var(--line);border-radius:14px;background:rgba(255,253,248,.9);color:var(--ink);font:inherit;font-size:14px;font-weight:600;outline:none;transition:border-color .15s}
    .gd-field input:focus,.gd-field select:focus,.gd-field textarea:focus{border-color:rgba(247,167,184,.8);box-shadow:0 0 0 4px rgba(247,167,184,.14)}
    .gd-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .gd-pills{display:flex;flex-wrap:wrap;gap:7px;margin-top:4px}
    .gd-pill{padding:7px 13px;border-radius:999px;font-size:12px;font-weight:800;cursor:pointer;border:1px solid var(--line);background:rgba(255,253,248,.7);color:var(--soft-ink);transition:all .15s}
    .gd-pill:hover{border-color:var(--rose)}
    .gd-pill.sel{background:linear-gradient(135deg,var(--rose),var(--apricot));border-color:transparent;color:#fff}
    .gd-actions{display:flex;gap:10px;margin-top:20px}
    .gd-actions .secondary-action{flex:1;text-align:center}
    .gd-actions .primary-action{flex:2;text-align:center}
    .gd-weekday-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
    .gd-weekday{width:38px;height:38px;border-radius:12px;border:1px solid var(--line);background:rgba(255,253,248,.7);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;cursor:pointer;color:var(--soft-ink)}
    .gd-weekday.sel{background:linear-gradient(135deg,var(--mint),var(--sky));border-color:transparent;color:#19463a}
    .gd-radio-card{display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid var(--line);border-radius:16px;cursor:pointer;margin-bottom:8px;background:rgba(255,253,248,.6);transition:all .15s}
    .gd-radio-card:hover{border-color:var(--rose)}
    .gd-radio-card.sel{border-color:var(--rose);background:var(--rose-soft)}
    .gd-radio-card input{margin-top:3px}
    .gd-radio-card div strong{display:block;font-size:13px}
    .gd-radio-card div span{display:block;font-size:12px;color:var(--muted);margin-top:2px}
    .gd-hint{font-size:11px;color:var(--muted);margin-top:6px}
    .gd-photo-input{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
    .gd-photo-thumb{position:relative;width:64px;height:64px;border-radius:14px;overflow:hidden;border:1px solid var(--line)}
    .gd-photo-thumb img{width:100%;height:100%;object-fit:cover}
    .gd-photo-thumb button{position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:rgba(48,41,37,.7);color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center;padding:0}
  `;
  document.head.appendChild(style);
}
function openModal(innerHTML, onMount) {
  ensureModalRoot();
  const root = document.getElementById("modalRoot");
  root.innerHTML = `<div class="gd-backdrop" id="gdBackdrop"><div class="gd-modal">${innerHTML}</div></div>`;
  const bd = document.getElementById("gdBackdrop");
  requestAnimationFrame(() => bd.classList.add("open"));
  bd.addEventListener("click", (e) => { if (e.target === bd) closeModal(); });
  document.addEventListener("keydown", escCloseOnce, { once: true });
  if (onMount) onMount(root);
}
function escCloseOnce(e) { if (e.key === "Escape") closeModal(); }
function closeModal() {
  const bd = document.getElementById("gdBackdrop");
  if (!bd) return;
  bd.classList.remove("open");
  setTimeout(() => { const r = document.getElementById("modalRoot"); if (r) r.innerHTML = ""; }, 200);
}

function openTaskModal(task) {
  const editing = !!task;
  const t = task || { title: "", desc: "", date: todayISO(), time: "", tag: "Личное", done: false };
  let selTag = t.tag;
  openModal(`
    <h3>${editing ? "Изменить задачу" : "Новая задача"}</h3>
    <div class="gd-field"><label>Название</label><input type="text" id="ti-title" value="${esc(t.title)}" placeholder="Что нужно сделать?"/></div>
    <div class="gd-field"><label>Описание</label><textarea id="ti-desc" style="min-height:64px">${esc(t.desc||"")}</textarea></div>
    <div class="gd-row2">
      <div class="gd-field"><label>Дата</label><input type="date" id="ti-date" value="${t.date||""}"/></div>
      <div class="gd-field"><label>Время</label><input type="time" id="ti-time" value="${t.time||""}"/></div>
    </div>
    <div class="gd-field"><label>Тег</label>
      <div class="gd-pills" id="ti-tags">${TAG_OPTIONS.map(tag => `<div class="gd-pill ${tag===selTag?"sel":""}" data-tag="${tag}">${tag}</div>`).join("")}</div>
    </div>
    <div class="gd-actions">
      <button class="secondary-action" id="ti-cancel">Отмена</button>
      <button class="primary-action" id="ti-save">${editing ? "Сохранить" : "Добавить"}</button>
    </div>
  `, (root) => {
    root.querySelectorAll("#ti-tags .gd-pill").forEach(p => p.addEventListener("click", () => {
      selTag = p.dataset.tag;
      root.querySelectorAll("#ti-tags .gd-pill").forEach(x => x.classList.toggle("sel", x === p));
    }));
    root.querySelector("#ti-cancel").addEventListener("click", closeModal);
    root.querySelector("#ti-save").addEventListener("click", () => {
      const title = root.querySelector("#ti-title").value.trim();
      if (!title) { root.querySelector("#ti-title").focus(); return; }
      const data = {
        title,
        desc: root.querySelector("#ti-desc").value.trim(),
        date: root.querySelector("#ti-date").value,
        time: root.querySelector("#ti-time").value,
        tag: selTag,
      };
      if (editing) Object.assign(task, data);
      else DB.tasks.unshift({ id: uid(), done: false, created: Date.now(), ...data });
      saveDB("tasks"); renderTasks(); renderDashboardMisc(); closeModal();
    });
    root.querySelector("#ti-title").focus();
  });
}

/* Кнопка "+ Новая запись" в шапке → открывает быстрое создание задачи */
document.querySelectorAll(".topbar .primary-action").forEach(btn => {
  if (btn.textContent.includes("Новая запись")) btn.addEventListener("click", () => openTaskModal(null));
});

// Кнопка "+ Запись" в Дневнике и "+ Запись" в Состоянии через делегирование
document.addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;
  // Дневник — кнопка в шапке секции
  if (btn.closest("#diary .section-head") && btn.classList.contains("secondary-action")) {
    const ta = document.querySelector("#diary textarea");
    if (ta) { ta.focus(); ta.scrollIntoView({ behavior: "smooth", block: "center" }); }
    return;
  }
  // Состояние — кнопка в шапке секции
  if (btn.closest("#health .section-head") && btn.classList.contains("secondary-action")) {
    const firstCard = document.querySelector(".mood-card");
    if (firstCard) firstCard.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
});
/* Кнопка в hero "Открыть дневник" / "Записать состояние" уже работают через data-section */

/* Добавляем кнопку "+ Задача" в шапку секции задач */
(function bindTasksSectionAdd(){
  const tasksSection = document.querySelector("#tasks .section-head");
  if (tasksSection) {
    const addBtn = document.createElement("button");
    addBtn.className = "secondary-action";
    addBtn.textContent = "+ Задача";
    addBtn.style.marginLeft = "8px";
    addBtn.addEventListener("click", () => openTaskModal(null));
    tasksSection.appendChild(addBtn);
  }
})();

/* =========================================================
   ПРИВЫЧКИ
   ========================================================= */
function last7Dates() {
  const arr = [];
  for (let i = 6; i >= 0; i--) arr.push(offsetISO(-i));
  return arr;
}
function habitStreak(habit) {
  let streak = 0;
  let cursor = todayISO();
  while (habit.log[cursor]) {
    streak++;
    const d = new Date(cursor + "T00:00:00"); d.setDate(d.getDate() - 1);
    cursor = d.toISOString().split("T")[0];
  }
  return streak;
}
function praiseFor(streak) {
  if (streak >= 14) return "Это уже стабильный ритм — невероятная серия!";
  if (streak >= 7) return "Целая неделя подряд. Ты держишь курс!";
  if (streak >= 3) return "Хорошее начало серии, продолжай в том же духе";
  if (streak >= 1) return "Первый шаг сделан — это уже считается";
  return "Сегодня отличный день, чтобы начать заново";
}
function renderHabits() {
  const days = last7Dates();
  const dayLabels = days.map(d => RU_DAYS_SHORT[new Date(d + "T00:00:00").getDay()]);

  document.querySelector("#miniHabits").innerHTML = DB.habits.slice(0, 3).map(h => {
    const streak = habitStreak(h);
    return `
    <div class="habit-mini" data-habit-id="${h.id}">
      <div>
        <strong>${h.icon} ${esc(h.name)}</strong>
        <div class="meta">${streak} ${plural(streak,"день","дня","дней")} подряд</div>
      </div>
      <div class="habit-dots">${days.map(d => `<i class="${h.log[d] ? "is-done" : ""}" data-date="${d}"></i>`).join("")}</div>
    </div>`;
  }).join("");

  const top = DB.habits.reduce((best, h) => habitStreak(h) > habitStreak(best || h) ? h : (best || h), null);
  const topStreak = top ? habitStreak(top) : 0;
  const praiseCardStreak = document.querySelector("#dashboard .accent-panel .soft-badge");
  if (praiseCardStreak) praiseCardStreak.textContent = `${topStreak} ${plural(topStreak,"день","дня","дней")}`;
  const praiseCardText = document.querySelector("#dashboard .accent-panel .praise-card");
  if (praiseCardText) praiseCardText.innerHTML = `<strong>${praiseFor(topStreak)}</strong><p>${top ? `Самая длинная серия: ${esc(top.name)}.` : "Начни первую привычку сегодня."}</p>`;

  document.querySelector("#habitTable").innerHTML = `
    <div class="habit-row">
      <strong>Привычка</strong>
      ${dayLabels.map(l => `<span class="day-label">${l}</span>`).join("")}
      <span class="day-label">Серия</span>
    </div>
    ${DB.habits.map(h => {
      const streak = habitStreak(h);
      return `
      <div class="habit-row" data-habit-id="${h.id}">
        <strong>${h.icon} ${esc(h.name)}<small>${praiseFor(streak)}</small></strong>
        ${days.map(d => `<span class="week-dot ${h.log[d] ? "is-done" : ""}" data-date="${d}" title="${fmtHuman(d)}"></span>`).join("")}
        <span class="streak">${streak} дн.</span>
      </div>`;
    }).join("")}
  `;

  const ribbon = document.querySelector("#habits .streak-ribbon");
  const praiseH3 = document.querySelector("#habits .praise-panel h3");
  const praiseP = document.querySelector("#habits .praise-panel p");
  if (praiseH3) praiseH3.textContent = `${topStreak} ${plural(topStreak,"день","дня","дней")} заботы подряд`;
  if (praiseP) praiseP.textContent = praiseFor(topStreak) + " Даже короткая отметка поддерживает серию.";
  if (ribbon) ribbon.textContent = top ? `Самая сильная привычка: ${top.name}` : "Пока нет активных серий";

  bindHabitEvents();
}
function bindHabitEvents() {
  document.querySelectorAll(".habit-dots i, .week-dot").forEach(dot => {
    dot.addEventListener("click", () => {
      const row = dot.closest("[data-habit-id]");
      const id = row.dataset.habitId;
      const date = dot.dataset.date;
      const h = DB.habits.find(x => x.id === id);
      if (h.log[date]) delete h.log[date]; else h.log[date] = true;
      saveDB("habits"); renderHabits();
    });
  });
}
(function bindHabitsAdd(){
  const btn = document.querySelector('#habits .section-head .secondary-action');
  if (btn) btn.addEventListener("click", openHabitModal);
})();
const HABIT_ICONS = ["💧","📖","🧘","✎","🏃","🥗","🌙","☀️","🧴","🪥","🎨","🌿"];
function openHabitModal() {
  let icon = "🌿";
  openModal(`
    <h3>Новая привычка</h3>
    <div class="gd-field"><label>Название</label><input type="text" id="hi-name" placeholder="Например, растяжка"/></div>
    <div class="gd-field"><label>Иконка</label>
      <div class="gd-pills" id="hi-icons">${HABIT_ICONS.map(i => `<div class="gd-pill ${i===icon?"sel":""}" data-icon="${i}" style="font-size:16px;padding:7px 11px">${i}</div>`).join("")}</div>
    </div>
    <div class="gd-actions">
      <button class="secondary-action" id="hi-cancel">Отмена</button>
      <button class="primary-action" id="hi-save">Добавить</button>
    </div>
  `, (root) => {
    root.querySelectorAll("#hi-icons .gd-pill").forEach(p => p.addEventListener("click", () => {
      icon = p.dataset.icon;
      root.querySelectorAll("#hi-icons .gd-pill").forEach(x => x.classList.toggle("sel", x === p));
    }));
    root.querySelector("#hi-cancel").addEventListener("click", closeModal);
    root.querySelector("#hi-save").addEventListener("click", () => {
      const name = root.querySelector("#hi-name").value.trim();
      if (!name) { root.querySelector("#hi-name").focus(); return; }
      DB.habits.push({ id: uid(), name, icon, log: {}, created: Date.now() });
      saveDB("habits"); renderHabits(); closeModal();
    });
    root.querySelector("#hi-name").focus();
  });
}

/* =========================================================
   РУТИНА
   ========================================================= */
function routineIsDueToday(r) {
  const today = new Date();
  const wd = today.getDay();
  if (r.type === "daily-time") return r.lastDone !== todayISO();
  if (r.type === "weekly-time") return r.weekdays.includes(wd) && r.lastDone !== todayISO();
  if (r.type === "interval") {
    if (!r.lastDone) return true;
    const d = new Date(r.lastDone + "T00:00:00");
    const diff = Math.round((today - d) / 86400000);
    return diff >= r.everyDays;
  }
  return false;
}
function routineMetaLabel(r) {
  if (r.type === "daily-time") return `Каждый день · ${r.time}`;
  if (r.type === "weekly-time") {
    const days = r.weekdays.map(w => RU_DAYS_SHORT[w]).join(" · ");
    return r.time ? `${days} · ${r.time}` : `${days} · ${r.daypart || "день"}`;
  }
  if (r.type === "interval") return `каждые ${r.everyDays} ${plural(r.everyDays, "день","дня","дней")}`;
  return "";
}
function renderRoutine() {
  const due = DB.routines.filter(routineIsDueToday);
  const toShow = (due.length ? due : DB.routines).slice(0, 3);
  document.querySelector("#routineStrip").innerHTML = toShow.map(r => `
    <div class="routine-pill" data-routine-id="${r.id}">
      <strong>${esc(r.title)}</strong>
      <span>${routineMetaLabel(r)}</span>
      <button class="check routine-toggle" style="margin-left:auto;width:30px;height:30px;border-radius:11px">${r.lastDone === todayISO() ? "✓" : ""}</button>
    </div>
  `).join("") || `<p class="muted-copy">Все рутины на сегодня выполнены ✨</p>`;

  const groups = [
    { key: "daily-time", title: "Ежедневно по времени", hint: "Для задач вроде тренировки, витаминов, ухода" },
    { key: "weekly-time", title: "Дни недели и время суток", hint: "Когда важно окно дня, но не точная минута" },
    { key: "interval", title: "Регулярность без времени", hint: "Для домашних дел с интервалом" },
  ];
  document.querySelector("#routineBoard").innerHTML = groups.map(g => {
    const items = DB.routines.filter(r => r.type === g.key);
    return `
    <article class="routine-column">
      <p class="card-kicker">${g.hint}</p>
      <h3>${g.title}</h3>
      ${items.length ? items.map(r => `
        <div class="routine-step" data-routine-id="${r.id}" style="display:flex;align-items:center;justify-content:space-between;gap:10px">
          <div>
            <strong>${esc(r.title)}</strong>
            <div class="meta">${routineMetaLabel(r)}${routineIsDueToday(r) ? " · пора сегодня" : ""}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="check routine-toggle" style="width:30px;height:30px;border-radius:11px">${r.lastDone === todayISO() ? "✓" : ""}</button>
            <button class="icon-action routine-del" style="width:30px;height:30px;font-size:13px">✕</button>
          </div>
        </div>
      `).join("") : `<p class="muted-copy">Пока нет задач в этой группе</p>`}
    </article>`;
  }).join("");

  bindRoutineEvents();
}
function bindRoutineEvents() {
  document.querySelectorAll(".routine-toggle").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.closest("[data-routine-id]").dataset.routineId;
      const r = DB.routines.find(x => x.id === id);
      r.lastDone = r.lastDone === todayISO() ? null : todayISO();
      saveDB("routines"); renderRoutine();
      if (r.lastDone) confettiBurst(btn);
    });
  });
  document.querySelectorAll(".routine-del").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.closest("[data-routine-id]").dataset.routineId;
      DB.routines = DB.routines.filter(x => x.id !== id);
      saveDB("routines"); renderRoutine();
    });
  });
}
(function bindRoutineAdd(){
  const btn = document.querySelector('#routine .section-head .secondary-action');
  if (btn) btn.addEventListener("click", openRoutineModal);
})();

function openRoutineModal() {
  let type = "daily-time";
  let weekdays = [];
  openModal(`
    <h3>Новая рутинная задача</h3>
    <div class="gd-field"><label>Название</label><input type="text" id="ri-title" placeholder="Например, уборка ванной"/></div>
    <div class="gd-field"><label>Тип регулярности</label>
      <label class="gd-radio-card sel" data-type="daily-time">
        <input type="radio" name="rtype" checked/>
        <div><strong>Ежедневно в определённое время</strong><span>Тренировка, витамины, вечерний уход</span></div>
      </label>
      <label class="gd-radio-card" data-type="weekly-time">
        <input type="radio" name="rtype"/>
        <div><strong>Дни недели и время суток</strong><span>Например, по субботам днём</span></div>
      </label>
      <label class="gd-radio-card" data-type="interval">
        <input type="radio" name="rtype"/>
        <div><strong>Регулярность без времени</strong><span>Раз в N дней, время суток неважно</span></div>
      </label>
    </div>
    <div id="ri-dynamic"></div>
    <div class="gd-actions">
      <button class="secondary-action" id="ri-cancel">Отмена</button>
      <button class="primary-action" id="ri-save">Добавить</button>
    </div>
  `, (root) => {
    function renderDynamic() {
      const box = root.querySelector("#ri-dynamic");
      if (type === "daily-time") {
        box.innerHTML = `<div class="gd-field"><label>Время</label><input type="time" id="ri-time" value="09:00"/></div>`;
      } else if (type === "weekly-time") {
        box.innerHTML = `
          <div class="gd-field"><label>Дни недели</label>
            <div class="gd-weekday-row" id="ri-weekdays">
              ${RU_DAYS_SHORT.map((l, idx) => `<div class="gd-weekday" data-wd="${idx}">${l}</div>`).join("")}
            </div>
          </div>
          <div class="gd-row2">
            <div class="gd-field"><label>Время (точное, необязательно)</label><input type="time" id="ri-time"/></div>
            <div class="gd-field"><label>Часть дня</label>
              <select id="ri-daypart"><option value="утро">Утро</option><option value="день" selected>День</option><option value="вечер">Вечер</option></select>
            </div>
          </div>
        `;
        box.querySelectorAll(".gd-weekday").forEach(w => w.addEventListener("click", () => {
          const wd = Number(w.dataset.wd);
          if (weekdays.includes(wd)) { weekdays = weekdays.filter(x => x !== wd); w.classList.remove("sel"); }
          else { weekdays.push(wd); w.classList.add("sel"); }
        }));
      } else {
        box.innerHTML = `<div class="gd-field"><label>Повторять каждые (дней)</label><input type="number" id="ri-every" min="1" value="7"/></div>`;
      }
    }
    renderDynamic();
    root.querySelectorAll(".gd-radio-card").forEach(card => card.addEventListener("click", () => {
      type = card.dataset.type;
      root.querySelectorAll(".gd-radio-card").forEach(c => { c.classList.toggle("sel", c === card); c.querySelector("input").checked = c === card; });
      weekdays = [];
      renderDynamic();
    }));
    root.querySelector("#ri-cancel").addEventListener("click", closeModal);
    root.querySelector("#ri-save").addEventListener("click", () => {
      const title = root.querySelector("#ri-title").value.trim();
      if (!title) { root.querySelector("#ri-title").focus(); return; }
      let data = { id: uid(), title, type, lastDone: null };
      if (type === "daily-time") data.time = root.querySelector("#ri-time").value || "09:00";
      if (type === "weekly-time") {
        if (!weekdays.length) { alert("Выбери хотя бы один день недели"); return; }
        data.weekdays = weekdays.sort();
        data.time = root.querySelector("#ri-time").value;
        data.daypart = root.querySelector("#ri-daypart").value;
      }
      if (type === "interval") data.everyDays = Math.max(1, Number(root.querySelector("#ri-every").value) || 7);
      DB.routines.push(data);
      saveDB("routines"); renderRoutine(); closeModal();
    });
    root.querySelector("#ri-title").focus();
  });
}

/* =========================================================
   СОСТОЯНИЕ / ДНЕВНИК ЭМОЦИЙ
   ========================================================= */
const EMOTIONS_BY_TONE = {
  good: ["радость","интерес","лёгкость","надежда","благодарность","вдохновение","спокойствие","нежность"],
  neutral: ["спокойствие","усталость","собранность","тишина","ожидание","задумчивость","нейтральность"],
  bad: ["тревога","грусть","раздражение","одиночество","перегруз","разочарование","обида","апатия"],
};
const LIFE_EVENTS = ["работа","дом","отношения","семья","деньги","тело","еда","погода","новости","отдых","сонливость","личные границы","друзья","спорт","творчество","планы"];
const TONE_LABEL = { good: "Хорошее настроение", neutral: "Нейтральное настроение", bad: "Плохое настроение" };
const TONE_BADGE = { good: "Хорошее", neutral: "Нейтральное", bad: "Плохое" };

function latestMood() {
  return DB.moodEntries.slice().sort((a,b) => b.created - a.created)[0] || null;
}
function renderMood() {
  const last = latestMood();
  const badgeEl = document.querySelector('#dashboard .panel .soft-badge.blush');
  if (badgeEl) badgeEl.textContent = last ? TONE_BADGE[last.tone] : "Нет записей";
  document.querySelector("#moodSummary").innerHTML = last ? `
    <div class="mood-pill ${last.tone}">Сейчас: ${TONE_LABEL[last.tone].toLowerCase()}</div>
    <p class="muted-copy">${last.events.length ? `Влияют: ${last.events.join(", ")}.` : "Событий не отмечено."}</p>
    ${last.note ? `<p class="muted-copy">«${esc(last.note)}»</p>` : ""}
  ` : `
    <div class="mood-pill neutral">Пока нет записей</div>
    <p class="muted-copy">Отметь, как ты сейчас — это займёт минуту.</p>
  `;

  const healthBadge = document.querySelector('#health .soft-badge.blush');
  if (healthBadge) healthBadge.textContent = `${DB.moodEntries.length} ${plural(DB.moodEntries.length, "запись","записи","записей")}`;

  document.querySelector("#moodBoard").innerHTML = ["good","neutral","bad"].map(tone => `
    <div class="mood-card ${tone}" data-tone="${tone}">
      <h3>${TONE_LABEL[tone]}</h3>
      <div class="emotion-tags" data-emotion-box>
        ${EMOTIONS_BY_TONE[tone].map(w => `<span class="mood-emotion" data-word="${w}">${w}</span>`).join("")}
      </div>
      <textarea placeholder="Что я ощущаю? Какие события на это повлияли?" data-mood-note></textarea>
      <button class="primary-action mood-save" style="margin-top:10px;width:100%;text-align:center">Записать состояние</button>
    </div>
  `).join("");

  document.querySelector("#lifeTags").innerHTML = LIFE_EVENTS.map(e => `<button type="button" data-life-event="${e}">${e}</button>`).join("");

  renderMoodHistory();
  bindMoodEvents();
}
let selectedLifeEvents = new Set();
function bindMoodEvents() {
  document.querySelectorAll(".mood-emotion").forEach(tag => {
    tag.style.cursor = "pointer";
    tag.addEventListener("click", () => tag.classList.toggle("sel-emotion"));
  });
  if (!document.getElementById("gd-mood-style")) {
    const s = document.createElement("style"); s.id = "gd-mood-style";
    s.textContent = `.mood-emotion.sel-emotion{background:linear-gradient(135deg,var(--rose),var(--apricot))!important;color:#fff!important}
      [data-life-event].sel-event{background:linear-gradient(135deg,var(--mint),var(--sky))!important;color:#19463a!important;border-color:transparent!important}`;
    document.head.appendChild(s);
  }

  document.querySelectorAll("[data-life-event]").forEach(btn => {
    btn.addEventListener("click", () => {
      const e = btn.dataset.lifeEvent;
      if (selectedLifeEvents.has(e)) { selectedLifeEvents.delete(e); btn.classList.remove("sel-event"); }
      else { selectedLifeEvents.add(e); btn.classList.add("sel-event"); }
    });
  });

  document.querySelectorAll(".mood-save").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".mood-card");
      const tone = card.dataset.tone;
      const emotions = [...card.querySelectorAll(".mood-emotion.sel-emotion")].map(e => e.dataset.word);
      const note = card.querySelector("[data-mood-note]").value.trim();
      DB.moodEntries.push({
        id: uid(), date: todayISO(), time: new Date().toTimeString().slice(0,5),
        tone, emotions, events: [...selectedLifeEvents], note, created: Date.now(),
      });
      saveDB("mood");
      selectedLifeEvents = new Set();
      renderMood();
      const banner = document.createElement("div");
      banner.textContent = "Записала ✨";
      banner.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#342b27;color:#fff;padding:10px 18px;border-radius:999px;font-size:13px;font-weight:800;z-index:400;box-shadow:0 10px 24px rgba(0,0,0,.2)";
      document.body.appendChild(banner);
      setTimeout(() => banner.remove(), 1800);
    });
  });
}
function renderMoodHistory() {
  let box = document.getElementById("moodHistory");
  if (!box) {
    const lifeTagsPanel = document.querySelector("#lifeTags").closest(".panel");
    box = document.createElement("article");
    box.className = "panel span-2";
    box.id = "moodHistory";
    lifeTagsPanel.after(box);
  }

  const list = DB.moodEntries.slice().sort((a,b) => b.created - a.created);
  
  // Динамика за последние 14 дней
  const last14 = [];
  for (let i = 13; i >= 0; i--) {
    const d = offsetISO(-i);
    const entry = list.find(m => m.date === d);
    last14.push({ date: d, tone: entry?.tone || null, day: RU_DAYS_SHORT[new Date(d+"T00:00:00").getDay()] });
  }

  // Топ событий которые влияют
  const eventCounts = {};
  list.forEach(m => (m.events||[]).forEach(e => { eventCounts[e] = (eventCounts[e]||0)+1; }));
  const topEvents = Object.entries(eventCounts).sort((a,b)=>b[1]-a[1]).slice(0,6);

  box.innerHTML = `
    <div class="panel-head"><div><p class="card-kicker">История</p><h3>Динамика состояния</h3></div></div>
    
    <div style="display:flex;gap:4px;margin:16px 0 8px;align-items:flex-end">
      ${last14.map(d => {
        const color = d.tone === 'good' ? 'var(--mint)' : d.tone === 'bad' ? 'var(--rose)' : d.tone === 'neutral' ? 'var(--lemon)' : 'var(--line)';
        const h = d.tone ? '32px' : '8px';
        const emoji = d.tone === 'good' ? '😊' : d.tone === 'bad' ? '😔' : d.tone === 'neutral' ? '😐' : '';
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
          <div style="font-size:12px">${emoji}</div>
          <div style="width:100%;height:${h};border-radius:6px;background:${color};transition:height .3s" title="${fmtHuman(d.date)}${d.tone?' · '+TONE_LABEL[d.tone]:''}"></div>
          <div style="font-size:9px;color:var(--muted);font-weight:700">${d.day}</div>
        </div>`;
      }).join("")}
    </div>

    ${topEvents.length ? `
    <div style="margin-top:14px">
      <p class="card-kicker">Что чаще всего влияет</p>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
        ${topEvents.map(([e,n]) => `<span style="padding:5px 12px;border-radius:999px;background:rgba(221,212,251,.3);border:1px solid rgba(221,212,251,.6);font-size:12px;font-weight:700">${e} <span style="color:var(--muted)">${n}</span></span>`).join("")}
      </div>
    </div>` : ""}

    <div style="display:grid;gap:8px;margin-top:16px" id="moodHistoryList">
      ${list.slice(0,8).map(m => `
        <div class="task-row">
          <span class="tag" style="background:${m.tone==='good'?'var(--mint)':m.tone==='bad'?'var(--rose-soft)':'var(--lemon)'};color:#3a3128;flex-shrink:0">${TONE_BADGE[m.tone]}</span>
          <div style="flex:1;min-width:0">
            <strong>${fmtHuman(m.date)} · ${m.time}</strong>
            <div class="meta">${[...(m.emotions||[]), ...(m.events||[])].join(", ") || "Без деталей"}${m.note ? ` — «${esc(m.note)}»` : ""}</div>
          </div>
          <button class="icon-action mood-del" data-mood-id="${m.id}" style="width:28px;height:28px;font-size:12px;flex-shrink:0">✕</button>
        </div>
      `).join("") || `<p class="muted-copy">Записей пока нет</p>`}
    </div>
  `;

  // Delete mood entries
  box.querySelectorAll(".mood-del").forEach(btn => {
    btn.addEventListener("click", () => {
      DB.moodEntries = DB.moodEntries.filter(m => m.id !== btn.dataset.moodId);
      saveDB("mood"); renderMood();
    });
  });
}

/* =========================================================
   ПАРАМЕТРЫ ТЕЛА
   ========================================================= */
function renderBodyMetrics() {
  const sorted = DB.bodyMetrics.slice().sort((a,b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const fields = [
    { key: "weight", label: "Вес", unit: "кг" },
    { key: "waist", label: "Талия", unit: "см" },
    { key: "chest", label: "Грудь", unit: "см" },
    { key: "hips", label: "Бёдра", unit: "см" },
  ];
  document.querySelector("#bodyMetrics").innerHTML = fields.map(f => {
    if (!latest) return `<div class="metric-card"><span>${f.label}</span><strong>—</strong><small>нет данных</small></div>`;
    const delta = prev ? (latest[f.key] - prev[f.key]) : 0;
    const deltaStr = prev ? (delta === 0 ? "без изменений" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} ${f.unit}`) : "первый замер";
    return `<div class="metric-card"><span>${f.label}</span><strong>${latest[f.key]} ${f.unit}</strong><small>${deltaStr}</small></div>`;
  }).join("");

  const weights = sorted.map(s => s.weight).filter(w => w != null);
  if (weights.length) {
    const min = Math.min(...weights), max = Math.max(...weights);
    const range = Math.max(max - min, 0.5);
    document.querySelector("#bodyChart").innerHTML = sorted.slice(-7).map(s => {
      const h = 24 + ((s.weight - min) / range) * 76;
      return `<i style="height:${h}%" title="${fmtHuman(s.date)}: ${s.weight} кг"></i>`;
    }).join("");
  } else {
    document.querySelector("#bodyChart").innerHTML = `<p class="muted-copy" style="align-self:center">Добавь первый замер, чтобы увидеть график</p>`;
  }
}
(function bindBodyMetricsAdd(){
  const btn = document.querySelector('#health .panel.span-2 .panel-head button');
  if (btn) btn.addEventListener("click", openBodyMetricModal);
})();
function openBodyMetricModal() {
  openModal(`
    <h3>Новый замер</h3>
    <div class="gd-field"><label>Дата</label><input type="date" id="bm-date" value="${todayISO()}"/></div>
    <div class="gd-row2">
      <div class="gd-field"><label>Вес (кг)</label><input type="number" step="0.1" id="bm-weight" placeholder="62.4"/></div>
      <div class="gd-field"><label>Талия (см)</label><input type="number" step="0.5" id="bm-waist" placeholder="68"/></div>
    </div>
    <div class="gd-row2">
      <div class="gd-field"><label>Грудь (см)</label><input type="number" step="0.5" id="bm-chest" placeholder="90"/></div>
      <div class="gd-field"><label>Бёдра (см)</label><input type="number" step="0.5" id="bm-hips" placeholder="96"/></div>
    </div>
    <div class="gd-actions">
      <button class="secondary-action" id="bm-cancel">Отмена</button>
      <button class="primary-action" id="bm-save">Сохранить</button>
    </div>
  `, (root) => {
    root.querySelector("#bm-cancel").addEventListener("click", closeModal);
    root.querySelector("#bm-save").addEventListener("click", () => {
      const date = root.querySelector("#bm-date").value || todayISO();
      const num = (id) => { const v = root.querySelector(id).value; return v === "" ? null : Number(v); };
      const entry = { id: uid(), date, weight: num("#bm-weight"), waist: num("#bm-waist"), chest: num("#bm-chest"), hips: num("#bm-hips") };
      const existingIdx = DB.bodyMetrics.findIndex(m => m.date === date);
      if (existingIdx >= 0) DB.bodyMetrics[existingIdx] = { ...DB.bodyMetrics[existingIdx], ...entry };
      else DB.bodyMetrics.push(entry);
      saveDB("body"); renderBodyMetrics(); closeModal();
    });
  });
}

/* =========================================================
   КАЛОРИИ / ПИТАНИЕ  (готово для интеграции NutriPlan)
   ========================================================= */
function last7CalorieDays() {
  return last7Dates().map(d => ({ day: RU_DAYS_SHORT[new Date(d+"T00:00:00").getDay()], date: d, ...(DB.calorieLog[d] || { eaten: 0, burned: 0 }) }));
}
function renderCalories() {
  const max = 2400;
  const days = last7CalorieDays();
  const barsHTML = days.map(d => `
    <div class="calorie-day">
      <span>${d.day}</span>
      <div class="calorie-bars">
        <i class="eaten" style="height:${Math.min(100,(d.eaten / max) * 100)}%" title="Потреблено: ${d.eaten} ккал"></i>
        <i class="burned" style="height:${Math.min(100,(d.burned / max) * 100)}%" title="Потрачено: ${d.burned} ккал"></i>
      </div>
    </div>
  `).join("");
  document.querySelector("#healthCalories").innerHTML = barsHTML;

  const today = DB.calorieLog[todayISO()] || { eaten: 0, burned: 0, meals: [] };
  const _cm = document.querySelector("#calorieMini"); if(_cm) _cm.innerHTML = `
    <div class="metric">${today.eaten}</div>
    <p class="muted-copy">потреблено · ${today.burned} потрачено</p>
    <div class="progress"><span style="width:${Math.min(100, today.burned ? (today.eaten/today.burned)*100 : 0)}%"></span></div>
  `;

  const _nc = document.querySelector("#nutritionCalories"); if(_nc) _nc.innerHTML = `
    <div class="calorie-total">
      <div><span>Потреблено</span><strong>${today.eaten} ккал</strong></div>
      <div><span>Потрачено</span><strong>${today.burned} ккал</strong></div>
      <div><span>Баланс</span><strong>${today.burned - today.eaten >= 0 ? "-" : "+"}${Math.abs(today.burned - today.eaten)} ккал</strong></div>
    </div>
    <div class="calorie-chart wide">${barsHTML}</div>
    ${today.meals && today.meals.length ? `
      <div style="margin-top:18px;display:grid;gap:8px">
        <p class="card-kicker">Приёмы пищи сегодня</p>
        ${today.meals.map(m => `<div class="task-row"><div style="flex:1"><strong>${esc(m.name)}</strong><div class="meta">${m.time||""}</div></div><span class="tag">${m.kcal} ккал</span></div>`).join("")}
      </div>` : ""}
  `;
}
(function bindNutritionAdd(){
  const btn = document.querySelector('#nutrition .section-head .secondary-action');
  if (btn) { btn.textContent = "+ Приём пищи"; btn.addEventListener("click", openMealModal); }
})();
function openMealModal() {
  openModal(`
    <h3>Новый приём пищи</h3>
    <div class="gd-field"><label>Дата</label><input type="date" id="ml-date" value="${todayISO()}"/></div>
    <div class="gd-row2">
      <div class="gd-field"><label>Название</label><input type="text" id="ml-name" placeholder="Завтрак"/></div>
      <div class="gd-field"><label>Время</label><input type="time" id="ml-time" value="${new Date().toTimeString().slice(0,5)}"/></div>
    </div>
    <div class="gd-field"><label>Калории</label><input type="number" id="ml-kcal" placeholder="450"/></div>
    <p class="gd-hint">Это ручной ввод. В большом приложении сюда подключится NutriPlan по Supabase sync — данные лягут в эту же таблицу.</p>
    <div class="gd-actions">
      <button class="secondary-action" id="ml-cancel">Отмена</button>
      <button class="primary-action" id="ml-save">Добавить</button>
    </div>
  `, (root) => {
    root.querySelector("#ml-cancel").addEventListener("click", closeModal);
    root.querySelector("#ml-save").addEventListener("click", () => {
      const date = root.querySelector("#ml-date").value || todayISO();
      const name = root.querySelector("#ml-name").value.trim() || "Приём пищи";
      const time = root.querySelector("#ml-time").value;
      const kcal = Number(root.querySelector("#ml-kcal").value) || 0;
      if (!DB.calorieLog[date]) DB.calorieLog[date] = { eaten: 0, burned: 0, meals: [] };
      DB.calorieLog[date].meals.push({ name, time, kcal });
      DB.calorieLog[date].eaten += kcal;
      saveDB("nutrition_diary"); renderCalories(); closeModal();
    });
  });
}

/* =========================================================
   СПИСОК ПОКУПОК
   ========================================================= */
function renderShopping() {
  document.querySelector("#shoppingList").innerHTML = DB.shopping.map(group => `
    <article class="panel shopping-card" data-group-id="${group.id}">
      <div class="panel-head">
        <p class="card-kicker">${esc(group.group)}</p>
        <button class="icon-action group-del" style="width:30px;height:30px;font-size:13px">✕</button>
      </div>
      ${group.items.map(item => `
        <label class="shopping-item" data-item-id="${item.id}">
          <input type="checkbox" ${item.done ? "checked" : ""} class="shop-check"/>
          <span>${esc(item.name)}</span>
          <button type="button" class="icon-action item-del" style="margin-left:auto;width:26px;height:26px;font-size:11px">✕</button>
        </label>
      `).join("")}
      <div class="attachment-row" style="margin-top:4px">
        <input type="text" placeholder="Добавить пункт..." class="new-item-input" style="flex:1;padding:10px 12px;border:1px solid var(--line);border-radius:14px;background:rgba(255,253,248,.85);outline:none;font:inherit;font-size:13px"/>
        <button class="ghost-action add-item-btn" style="padding:10px 14px;font-size:12px">+</button>
      </div>
    </article>
  `).join("") + `
    <article class="panel shopping-card" id="newGroupCard" style="align-content:start">
      <p class="card-kicker">Новая категория</p>
      <input type="text" id="new-group-name" placeholder="Например, аптека" style="padding:10px 12px;border:1px solid var(--line);border-radius:14px;background:rgba(255,253,248,.85);outline:none;font:inherit;font-size:13px"/>
      <button class="secondary-action" id="add-group-btn" style="margin-top:6px">+ Добавить категорию</button>
    </article>
  `;
  bindShoppingEvents();
}
function bindShoppingEvents() {
  document.querySelectorAll(".shop-check").forEach(cb => {
    cb.addEventListener("change", () => {
      const groupId = cb.closest("[data-group-id]").dataset.groupId;
      const itemId = cb.closest("[data-item-id]").dataset.itemId;
      const group = DB.shopping.find(g => g.id === groupId);
      const item = group.items.find(i => i.id === itemId);
      item.done = cb.checked;
      saveDB("shopping");
    });
  });
  document.querySelectorAll(".item-del").forEach(btn => {
    btn.addEventListener("click", () => {
      const groupId = btn.closest("[data-group-id]").dataset.groupId;
      const itemId = btn.closest("[data-item-id]").dataset.itemId;
      const group = DB.shopping.find(g => g.id === groupId);
      group.items = group.items.filter(i => i.id !== itemId);
      saveDB("shopping"); renderShopping();
    });
  });
  document.querySelectorAll(".group-del").forEach(btn => {
    btn.addEventListener("click", () => {
      const groupId = btn.closest("[data-group-id]").dataset.groupId;
      if (!confirm("Удалить категорию со всеми пунктами?")) return;
      DB.shopping = DB.shopping.filter(g => g.id !== groupId);
      saveDB('shopping'); renderShopping();
    });
  });
  document.querySelectorAll(".add-item-btn").forEach(btn => {
    const card = btn.closest("[data-group-id]");
    const input = card.querySelector(".new-item-input");
    const submit = () => {
      const name = input.value.trim();
      if (!name) return;
      const group = DB.shopping.find(g => g.id === card.dataset.groupId);
      group.items.push({ id: uid(), name, done: false });
      saveDB('shopping'); renderShopping();
    };
    btn.addEventListener("click", submit);
    input.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
  });
  const addGroupBtn = document.querySelector("#add-group-btn");
  if (addGroupBtn) {
    const submit = () => {
      const input = document.querySelector("#new-group-name");
      const name = input.value.trim();
      if (!name) return;
      DB.shopping.push({ id: uid(), group: name, items: [] });
      saveDB('shopping'); renderShopping();
    };
    addGroupBtn.addEventListener("click", submit);
    document.querySelector("#new-group-name").addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
  }
}

/* =========================================================
   ДНЕВНИК
   ========================================================= */
function renderDiary() {
  document.querySelector("#diaryFeed").innerHTML = DB.diary.slice().sort((a,b) => b.created - a.created).map(entry => `
    <article class="diary-entry" data-entry-id="${entry.id}">
      <div class="tape"></div>
      <h3>${esc(entry.title || "Без названия")}</h3>
      <p>${esc(entry.text).replace(/\n/g, "<br/>")}</p>
      ${entry.photos && entry.photos.length ? `
        <div class="photo-stack" style="margin-top:14px">
          ${entry.photos.slice(0,3).map(p => `<div style="background-image:url(${p});background-size:cover;background-position:center"></div>`).join("")}
        </div>` : ""}
      <div class="emotion-tags">${(entry.tags||[]).map(t => `<span>${esc(t)}</span>`).join("")}</div>
      <div class="attachment-row" style="margin-top:10px">
        <button class="ghost-action diary-del" style="padding:8px 12px;font-size:12px">Удалить</button>
      </div>
    </article>
  `).join("") || `<p class="muted-copy">Записей пока нет — самое время оставить первую мысль</p>`;

  document.querySelectorAll(".diary-del").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.closest("[data-entry-id]").dataset.entryId;
      DB.diary = DB.diary.filter(d => d.id !== id);
      saveDB('diary'); renderDiary();
    });
  });
}
let diaryPhotos = [];
function compressImage(dataURL, maxWidth, quality) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = dataURL;
  });
}

(function bindDiaryEditor(){
  const textarea = document.querySelector("#diary textarea");
  if (!textarea) return;
  const attachRow = textarea.closest(".journal-editor").querySelector(".attachment-row");
  if (!attachRow) return;
  const photoBtns = attachRow.querySelectorAll(".ghost-action");
  const saveBtn = attachRow.querySelector(".primary-action");
  if (!saveBtn) return;

  const fileInput = document.createElement("input");
  fileInput.type = "file"; fileInput.accept = "image/*"; fileInput.multiple = true; fileInput.style.display = "none";
  fileInput.setAttribute("capture", "environment"); // на мобильном открывает камеру/галерею
  document.body.appendChild(fileInput);

  let previewBox = document.createElement("div");
  previewBox.className = "gd-photo-input";
  textarea.after(previewBox);

  function renderPreview() {
    previewBox.innerHTML = diaryPhotos.map((src, i) => `
      <div class="gd-photo-thumb"><img src="${src}"/><button data-idx="${i}">✕</button></div>
    `).join("");
    previewBox.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      diaryPhotos.splice(Number(b.dataset.idx), 1); renderPreview();
    }));
  }

  photoBtns.forEach(b => b.addEventListener("click", (e) => { e.preventDefault(); fileInput.click(); }));

  fileInput.addEventListener("change", async () => {
    const files = [...fileInput.files];
    fileInput.value = "";
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        // Сжимаем до 800px max и качество 0.7 — достаточно для дневника
        const compressed = await compressImage(ev.target.result, 800, 0.7);
        diaryPhotos.push(compressed);
        renderPreview();
      };
      reader.readAsDataURL(file);
    }
  });

  // Сохранение — работает и по клику и по тапу на мобильном
  saveBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const text = textarea.value.trim();
    if (!text) { textarea.focus(); return; }
    const title = text.split("\n")[0].slice(0, 60);
    DB.diary.unshift({ id: uid(), title, text, tags: [], photos: diaryPhotos.slice(), created: Date.now() });
    saveDB("diary");
    textarea.value = ""; diaryPhotos = []; renderPreview();
    renderDiary();
    // Скроллим к записям
    const feed = document.querySelector("#diaryFeed");
    if (feed) setTimeout(() => feed.scrollIntoView({ behavior: "smooth" }), 100);
  });
})();

/* =========================================================
   ДНИ РОЖДЕНИЯ
   ========================================================= */
function renderBirthdays() {
  const sorted = DB.birthdays.slice().sort((a,b) => daysUntilBirthday(a.mmdd) - daysUntilBirthday(b.mmdd));
  document.querySelector("#birthdayCards").innerHTML = sorted.length ? sorted.map(p => {
    const days = daysUntilBirthday(p.mmdd);
    const [mm, dd] = p.mmdd.split("-").map(Number);
    return `
    <article class="birthday-card" data-bday-id="${p.id}">
      <span class="avatar">${esc(initials(p.name))}</span>
      <div>
        <h3>${esc(p.name)}</h3>
        <p class="meta">${dd} ${RU_MONTHS[mm-1]}</p>
      </div>
      <span class="countdown">${days === 0 ? "Сегодня! 🎉" : `Через ${days} ${plural(days,"день","дня","дней")}`}</span>
      ${p.note ? `<p>${esc(p.note)}</p>` : ""}
      <div class="attachment-row">
        <button class="ghost-action bday-del" style="padding:8px 12px;font-size:12px">Удалить</button>
      </div>
    </article>`;
  }).join("") : `<p class="muted-copy">Пока никого нет — добавь первый день рождения</p>`;

  document.querySelectorAll(".bday-del").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.closest("[data-bday-id]").dataset.bdayId;
      DB.birthdays = DB.birthdays.filter(b => b.id !== id);
      saveDB('birthdays'); renderBirthdays();
    });
  });
}
(function bindBirthdayAdd(){
  const btn = document.querySelector('#birthdays .section-head .secondary-action');
  if (btn) btn.addEventListener("click", openBirthdayModal);
})();
function openBirthdayModal(existing) {
  const MONTH_NAMES = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  const selMM = existing ? existing.mmdd.split("-")[0] : "01";
  const selDD = existing ? existing.mmdd.split("-")[1] : "01";

  openModal(`
    <h3>${existing ? "Изменить" : "Новый день рождения"}</h3>
    <div class="gd-field"><label>Имя</label><input type="text" id="bd-name" value="${esc(existing?.name||"")}" placeholder="Имя человека"/></div>
    <div class="gd-row2">
      <div class="gd-field"><label>Месяц</label>
        <select id="bd-month">${MONTH_NAMES.map((m,i)=>`<option value="${String(i+1).padStart(2,"0")}" ${String(i+1).padStart(2,"0")===selMM?"selected":""}>${m}</option>`).join("")}</select>
      </div>
      <div class="gd-field"><label>День</label>
        <input type="number" id="bd-day" min="1" max="31" value="${Number(selDD)}" style="text-align:center"/>
      </div>
    </div>
    <div class="gd-field"><label>Заметка / идея подарка</label><textarea id="bd-note" style="min-height:60px" placeholder="Например: идея подарка...">${esc(existing?.note||"")}</textarea></div>
    <div class="gd-actions">
      <button class="secondary-action" id="bd-cancel">Отмена</button>
      <button class="primary-action" id="bd-save">${existing ? "Сохранить" : "Добавить"}</button>
    </div>
  `, (root) => {
    root.querySelector("#bd-cancel").addEventListener("click", closeModal);
    root.querySelector("#bd-save").addEventListener("click", () => {
      const name = root.querySelector("#bd-name").value.trim();
      const mm = root.querySelector("#bd-month").value;
      const dd = String(Math.min(31, Math.max(1, Number(root.querySelector("#bd-day").value)||1))).padStart(2,"0");
      if (!name) { root.querySelector("#bd-name").focus(); return; }
      const mmdd = mm + "-" + dd;
      const note = root.querySelector("#bd-note").value.trim();
      if (existing) {
        existing.name = name; existing.mmdd = mmdd; existing.note = note;
      } else {
        DB.birthdays.push({ id: uid(), name, mmdd, note });
      }
      saveDB("birthdays"); renderBirthdays(); closeModal();
    });
    root.querySelector("#bd-name").focus();
  });
}

/* =========================================================
   ДАШБОРД: шапка, цитата, прочее
   ========================================================= */
function renderDashboardMisc() {
  const now = new Date();
  const eyebrow = document.querySelector(".topbar .eyebrow");
  if (eyebrow) eyebrow.textContent =
    `${RU_DAYS[now.getDay()].charAt(0).toUpperCase()}${RU_DAYS[now.getDay()].slice(1)}, ${now.getDate()} ${RU_MONTHS[now.getMonth()]}`;

  const top = DB.habits.reduce((best, h) => habitStreak(h) > habitStreak(best || h) ? h : (best || h), null);
  const topStreak = top ? habitStreak(top) : 0;
  const sidebarStrong = document.querySelector(".sidebar-card strong");
  if (sidebarStrong) sidebarStrong.textContent = topStreak > 0 ? `Ты уже держишь ритм ${topStreak} ${plural(topStreak,"день","дня","дней")}` : "Сегодня хороший день для первого шага";

  // Напоминания о ДР
  renderBirthdayReminders();
}

function renderBirthdayReminders() {
  // Find or create reminder block on dashboard
  let box = document.getElementById("bdayReminders");
  if (!box) {
    const grid = document.querySelector("#dashboard .widget-grid");
    if (!grid) return;
    box = document.createElement("div");
    box.id = "bdayReminders";
    box.style.cssText = "grid-column:1/-1;display:flex;flex-direction:column;gap:8px";
    grid.prepend(box);
  }

  const upcoming = DB.birthdays
    .map(b => ({ ...b, days: daysUntilBirthday(b.mmdd) }))
    .filter(b => b.days <= 7)
    .sort((a, b) => a.days - b.days);

  box.innerHTML = upcoming.map(b => {
    const [mm, dd] = b.mmdd.split("-").map(Number);
    const dateStr = `${dd} ${RU_MONTHS[mm-1]}`;
    const isToday = b.days === 0;
    const label = isToday ? "Сегодня! 🎉" : b.days === 1 ? "Завтра" : `Через ${b.days} ${plural(b.days,"день","дня","дней")}`;
    const color = isToday ? "var(--rose)" : b.days <= 3 ? "var(--apricot)" : "var(--lemon)";
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:16px;background:${color}22;border:1px solid ${color}66">
        <span style="font-size:22px">🎂</span>
        <div style="flex:1">
          <strong style="font-size:14px">${esc(b.name)}</strong>
          <div style="font-size:12px;color:var(--muted)">${dateStr} · ${label}</div>
          ${b.note ? `<div style="font-size:12px;color:var(--soft-ink);margin-top:2px">${esc(b.note)}</div>` : ""}
        </div>
      </div>`;
  }).join("");
}

/* ---------- confetti ---------- */
function confettiBurst(el) {
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const colors = ["#f7a7b8","#ffd29f","#f8e6a3","#b9dec7","#bdddf5","#ddd4fb"];
  for (let i = 0; i < 12; i++) {
    const p = document.createElement("div");
    p.style.cssText = `position:fixed;width:7px;height:7px;border-radius:2px;pointer-events:none;z-index:9999;left:${cx+(Math.random()-.5)*60}px;top:${cy+(Math.random()-.5)*40}px;background:${colors[Math.floor(Math.random()*colors.length)]};transform:rotate(${Math.random()*360}deg);animation:gdfall .9s ease-out forwards;animation-delay:${Math.random()*.12}s`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1100);
  }
}
(function injectConfettiKeyframes(){
  const s = document.createElement("style");
  s.textContent = `@keyframes gdfall{0%{transform:translateY(0) rotate(0) scale(1);opacity:1}100%{transform:translateY(90px) rotate(360deg) scale(.2);opacity:0}}`;
  document.head.appendChild(s);
})();


/* =========================================================
   PUSH-УВЕДОМЛЕНИЯ (браузерные Web Notifications)
   ========================================================= */
function requestNotifPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function scheduleNotifications() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const now = new Date();
  const todayStr = todayISO();

  // Задачи на сегодня — уведомление за 30 минут до времени
  DB.tasks.filter(t => !t.done && t.date === todayStr && t.time).forEach(task => {
    const [h, m] = task.time.split(":").map(Number);
    const taskTime = new Date();
    taskTime.setHours(h, m - 30, 0, 0);
    const msUntil = taskTime - now;
    if (msUntil > 0 && msUntil < 86400000) {
      setTimeout(() => {
        new Notification("DayKeeper 🦊", {
          body: `Через 30 мин: ${task.title}`,
          icon: "/DayKeeper/assets/favicon-32.png",
          tag: "task-" + task.id,
        });
      }, msUntil);
    }
  });

  // Дни рождения — уведомление утром если ДР сегодня, через 3 или 7 дней
  DB.birthdays.forEach(b => {
    const days = daysUntilBirthday(b.mmdd);
    if (days === 0 || days === 3 || days === 7) {
      // Уведомить в 9:00 если ещё не было
      const notifTime = new Date();
      notifTime.setHours(9, 0, 0, 0);
      const msUntil = notifTime - now;
      const storageKey = `dk_notif_bday_${b.id}_${todayStr}`;
      if (!localStorage.getItem(storageKey)) {
        const delay = msUntil > 0 ? msUntil : 0;
        setTimeout(() => {
          localStorage.setItem(storageKey, "1");
          const msg = days === 0
            ? `Сегодня день рождения у ${b.name}! 🎉`
            : `День рождения ${b.name} через ${days} ${plural(days,"день","дня","дней")} 🎂`;
          new Notification("DayKeeper 🦊", {
            body: msg,
            icon: "/DayKeeper/assets/favicon-32.png",
            tag: "bday-" + b.id + "-" + days,
          });
        }, delay);
      }
    }
  });
}

// Кнопка разрешения уведомлений — добавляем на дашборд если ещё не разрешено
function renderNotifBanner() {
  if (!("Notification" in window)) return;
  const existing = document.getElementById("notifBanner");
  if (Notification.permission === "granted") {
    if (existing) existing.remove();
    scheduleNotifications();
    return;
  }
  if (Notification.permission === "denied" || existing) return;

  const banner = document.createElement("div");
  banner.id = "notifBanner";
  banner.style.cssText = "grid-column:1/-1;display:flex;align-items:center;gap:12px;padding:14px 18px;border-radius:16px;background:rgba(248,230,163,.3);border:1px solid rgba(248,230,163,.7);margin-bottom:4px";
  banner.innerHTML = `
    <span style="font-size:22px">🔔</span>
    <div style="flex:1;font-size:13px">
      <strong>Включить уведомления?</strong>
      <div style="color:var(--muted);margin-top:2px">Буду напоминать о задачах и днях рождения</div>
    </div>
    <button class="primary-action" id="notifAllow" style="padding:9px 16px;font-size:12px;white-space:nowrap">Включить</button>
    <button class="secondary-action" id="notifDismiss" style="padding:9px 14px;font-size:12px">✕</button>
  `;
  const grid = document.querySelector("#dashboard .widget-grid");
  if (grid) grid.prepend(banner);

  document.getElementById("notifAllow").addEventListener("click", async () => {
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      banner.remove();
      scheduleNotifications();
    }
  });
  document.getElementById("notifDismiss").addEventListener("click", () => banner.remove());
}

/* =========================================================
   INIT
   ========================================================= */
renderTasks();
renderHabits();
renderMood();
renderRoutine();
renderBodyMetrics();
renderCalories();
renderShopping();
renderDiary();
renderBirthdays();
renderDashboardMisc();
renderNotifBanner();

/* =========================================================
   SUPABASE MIGRATION (заготовка на будущее)
   ---------------------------------------------------------
   Структура DB здесь 1-в-1 ложится на таблицы:
     tasks(id, title, desc, date, time, tag, done, created)
     habits(id, name, icon, created) + habit_logs(habit_id, date)
     routines(id, title, type, time, weekdays[], daypart, every_days, last_done)
     mood_entries(id, date, time, tone, emotions[], events[], note, created)
     body_metrics(id, date, weight, waist, chest, hips)
     calorie_log(date, eaten, burned) + meals(date, name, kcal, time)
     shopping_groups(id, name) + shopping_items(id, group_id, name, done)
     diary(id, title, text, tags[], created) + diary_photos(diary_id, url)
     birthdays(id, name, mmdd, note)

   Когда будут готовы CSV-экспорты NutriPlan — calorie_log/meals
   заменятся реальными данными, форма "+ Приём пищи" будет писать
   напрямую в Supabase вместо DB.calorieLog.
   ========================================================= */

/* =========================================================
   МОДУЛЬ ПИТАНИЯ (NutriPlan inside DayKeeper)
   ========================================================= */

/* ---------- Встроенная база продуктов ---------- */
const BUILTIN_PRODUCTS = [
  { id:"bp1",  name:"Куриная грудка",    kcal:113, protein:23.6, carbs:0.4,  fat:1.9,  builtin:true },
  { id:"bp2",  name:"Яйцо куриное",      kcal:157, protein:12.7, carbs:0.7,  fat:11.5, builtin:true },
  { id:"bp3",  name:"Творог 5%",         kcal:121, protein:17,   carbs:3,    fat:5,    builtin:true },
  { id:"bp4",  name:"Греческий йогурт",  kcal:66,  protein:6,    carbs:4,    fat:3.8,  builtin:true },
  { id:"bp5",  name:"Овсяные хлопья",    kcal:342, protein:12,   carbs:60,   fat:6,    builtin:true },
  { id:"bp6",  name:"Гречка варёная",    kcal:110, protein:4.2,  carbs:21.3, fat:1.1,  builtin:true },
  { id:"bp7",  name:"Рис варёный",       kcal:130, protein:2.7,  carbs:28.2, fat:0.3,  builtin:true },
  { id:"bp8",  name:"Макароны варёные",  kcal:158, protein:5.5,  carbs:30.9, fat:0.9,  builtin:true },
  { id:"bp9",  name:"Банан",             kcal:89,  protein:1.1,  carbs:22.8, fat:0.3,  builtin:true },
  { id:"bp10", name:"Яблоко",            kcal:52,  protein:0.3,  carbs:13.8, fat:0.2,  builtin:true },
  { id:"bp11", name:"Авокадо",           kcal:160, protein:2,    carbs:9,    fat:14.7, builtin:true },
  { id:"bp12", name:"Лосось",            kcal:208, protein:20,   carbs:0,    fat:13,   builtin:true },
  { id:"bp13", name:"Тунец в с/с",       kcal:96,  protein:21.5, carbs:0,    fat:0.8,  builtin:true },
  { id:"bp14", name:"Молоко 2.5%",       kcal:52,  protein:2.8,  carbs:4.7,  fat:2.5,  builtin:true },
  { id:"bp15", name:"Сыр твёрдый",       kcal:350, protein:25,   carbs:0,    fat:27,   builtin:true },
  { id:"bp16", name:"Орехи грецкие",     kcal:654, protein:15.2, carbs:13.7, fat:65.2, builtin:true },
  { id:"bp17", name:"Миндаль",           kcal:575, protein:21.2, carbs:21.7, fat:49.9, builtin:true },
  { id:"bp18", name:"Оливковое масло",   kcal:884, protein:0,    carbs:0,    fat:100,  builtin:true },
  { id:"bp19", name:"Чёрный хлеб",       kcal:213, protein:7,    carbs:41,   fat:1.1,  builtin:true },
  { id:"bp20", name:"Картофель варёный", kcal:86,  protein:2,    carbs:18.6, fat:0.1,  builtin:true },
  { id:"bp21", name:"Огурец",            kcal:15,  protein:0.7,  carbs:3.1,  fat:0.1,  builtin:true },
  { id:"bp22", name:"Помидор",           kcal:18,  protein:0.9,  carbs:3.7,  fat:0.2,  builtin:true },
  { id:"bp23", name:"Морковь",           kcal:41,  protein:0.9,  carbs:9.6,  fat:0.2,  builtin:true },
  { id:"bp24", name:"Брокколи",          kcal:34,  protein:2.8,  carbs:6.6,  fat:0.4,  builtin:true },
  { id:"bp25", name:"Клубника",          kcal:33,  protein:0.7,  carbs:7.7,  fat:0.3,  builtin:true },
  { id:"bp26", name:"Черника",           kcal:57,  protein:0.7,  carbs:14.5, fat:0.3,  builtin:true },
  { id:"bp27", name:"Мёд",               kcal:304, protein:0.3,  carbs:82.4, fat:0,    builtin:true },
  { id:"bp28", name:"Протеин (порошок)", kcal:380, protein:75,   carbs:7,    fat:5,    builtin:true },
  { id:"bp29", name:"Финики",            kcal:277, protein:1.8,  carbs:74.9, fat:0.2,  builtin:true },
  { id:"bp30", name:"Шоколад тёмный",    kcal:539, protein:4.9,  carbs:60,   fat:30,   builtin:true },
];

/* ---------- Структура данных питания в DB ---------- */
// DB.nutrition = {
//   goal: { kcal:1500, protein:120, carbs:150, fat:50 },
//   apiKey: "",
//   preferences: "",  // для ассистента
//   diary: { dateISO: { meals:[{mealType,name,grams,kcal,protein,carbs,fat,dishId?,productId?}], activity:[{name,kcal}] } }
//   dishes: [{id, name, emoji, totalGrams, portionGrams, ingredients:[{productId,name,grams}]}]
//   products: [{id, name, kcal, protein, carbs, fat, builtin:false}]  // только свои
// }

function getNutrDB() {
  if (!DB.nutrition) {
    DB.nutrition = {
      goal: { kcal: 1500, protein: 105, carbs: 160, fat: 55 },
      apiKey: "",
      preferences: "",
      diary: {},
      dishes: [],
      products: [],
    };
    saveDB("shopping");
  }
  return DB.nutrition;
}

function getTodayNutr() {
  const n = getNutrDB();
  if (!n.diary[todayISO()]) n.diary[todayISO()] = { meals: [], activity: [] };
  return n.diary[todayISO()];
}

function calcDayTotals(dayData) {
  const totals = { kcal:0, protein:0, carbs:0, fat:0, burned:0 };
  (dayData.meals || []).forEach(m => {
    totals.kcal    += m.kcal    || 0;
    totals.protein += m.protein || 0;
    totals.carbs   += m.carbs   || 0;
    totals.fat     += m.fat     || 0;
  });
  (dayData.activity || []).forEach(a => { totals.burned += a.kcal || 0; });
  return totals;
}

function allProducts() {
  return [...BUILTIN_PRODUCTS, ...(getNutrDB().products || [])];
}

function findProduct(id) {
  return allProducts().find(p => p.id === id);
}

/* ---------- Вкладки питания ---------- */
let nutrActiveTab = "diary";
let nutrProductFilter = "all";
let nutrDynRange = "week";

// Вкладки питания — делегирование на document
document.addEventListener("click", e => {
  const btn = e.target.closest(".nutr-tab[data-nutr-tab]");
  if (!btn) return;
  nutrActiveTab = btn.dataset.nutrTab;
  console.log("[DK] tab click:", nutrActiveTab);

  // Скрываем все панели
  document.querySelectorAll(".nutr-pane").forEach(p => {
    p.style.cssText = "display:none!important";
  });

  // Показываем нужную
  const pane = document.getElementById("nutrPane-" + nutrActiveTab);
  console.log("[DK] pane found:", pane ? pane.id : "NOT FOUND");
  if (pane) {
    pane.style.cssText = "display:grid!important;gap:16px";
  }

  // Активная кнопка
  document.querySelectorAll(".nutr-tab[data-nutr-tab]").forEach(b => {
    b.classList.toggle("is-active", b === btn);
  });

  renderNutrTab(nutrActiveTab);
  console.log("[DK] renderNutrTab done:", nutrActiveTab);
});

function renderNutrTab(tab) {
  if (tab === "diary")    { renderNutrDiary(); }
  if (tab === "dishes")   { renderNutrDishes(); }
  if (tab === "products") { renderNutrProducts(); }
  if (tab === "dynamics") { renderNutrDynamics(); }
}

/* ---------- Дневник питания ---------- */
const MEAL_TYPES = ["Завтрак","Второй завтрак","Обед","Перекус","Ужин","Поздний перекус"];

let nutrDiaryDate = todayISO(); // текущая дата дневника (можно менять)

function renderNutrDiary() {
  const n = getNutrDB();
  if (!n.diary[nutrDiaryDate]) n.diary[nutrDiaryDate] = { meals: [], activity: [] };
  const day = n.diary[nutrDiaryDate];
  const totals = calcDayTotals(day);
  const goal = n.goal;
  const pct = Math.min(100, Math.round((totals.kcal / goal.kcal) * 100));
  const deficit = goal.kcal - totals.kcal + totals.burned;

  const isToday = nutrDiaryDate === todayISO();
  const displayDate = isToday ? "Сегодня" : fmtHuman(nutrDiaryDate);
  document.getElementById("nutrDaySummary").innerHTML = `
    <div class="panel-head">
      <div>
        <p class="card-kicker" style="display:flex;align-items:center;gap:8px">
          <button id="nutrPrevDay" style="width:28px;height:28px;border-radius:9px;border:1px solid var(--line);background:rgba(255,253,248,.8);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center">‹</button>
          <input type="date" id="nutrDatePicker" value="${nutrDiaryDate}" style="border:none;background:transparent;font:inherit;font-size:13px;font-weight:800;color:var(--soft-ink);cursor:pointer;padding:0"/>
          <button id="nutrNextDay" style="width:28px;height:28px;border-radius:9px;border:1px solid var(--line);background:rgba(255,253,248,.8);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center">›</button>
          ${!isToday ? `<button id="nutrGoToday" style="padding:4px 10px;border-radius:9px;border:1px solid var(--line);background:rgba(255,253,248,.8);font-size:11px;font-weight:800;cursor:pointer">сегодня</button>` : ""}
        </p>
        <h3>🎯 ${goal.kcal} ккал цель</h3>
      </div>
      <span class="soft-badge ${pct >= 100 ? 'rose' : 'mint'}">${pct}% от нормы</span>
    </div>
    <div class="nutr-day-summary" style="margin-top:16px">
      <div class="nutr-macro-card">
        <div class="val">${totals.kcal}</div>
        <div class="lbl">Съедено</div>
        <div class="sub">из ${goal.kcal} ккал</div>
      </div>
      <div class="nutr-macro-card">
        <div class="val" style="color:var(--mint-deep)">${totals.burned}</div>
        <div class="lbl">Сожжено</div>
        <div class="sub">активность</div>
      </div>
      <div class="nutr-macro-card">
        <div class="val" style="color:${deficit>=0?'var(--mint-deep)':'var(--rose)'}">${Math.abs(deficit)}</div>
        <div class="lbl">${deficit >= 0 ? 'Дефицит' : 'Профицит'}</div>
        <div class="sub">ккал</div>
      </div>
      <div class="nutr-macro-card">
        <div class="val" style="font-size:14px">${Math.round(totals.protein)}б / ${Math.round(totals.carbs)}у / ${Math.round(totals.fat)}ж</div>
        <div class="lbl">БУЖ (г)</div>
        <div class="sub">из ${goal.protein}/${goal.carbs}/${goal.fat}</div>
      </div>
    </div>
    <div class="nutr-progress-bar"><span style="width:${pct}%"></span></div>
  `;

  // Группируем по типу приёма
  const byType = {};
  (day.meals || []).forEach((m, idx) => {
    const t = m.mealType || "Прочее";
    if (!byType[t]) byType[t] = [];
    byType[t].push({ ...m, _idx: idx });
  });
  document.getElementById("nutrMealsList").innerHTML = Object.entries(byType).map(([type, items]) => `
    <div class="nutr-meal-group">
      <div class="nutr-meal-group-title">${type}</div>
      ${items.map(m => `
        <div class="nutr-meal-item" data-meal-idx="${m._idx}">
          <div style="flex:1">
            <div class="name">${esc(m.name)}</div>
            <div class="macro-row">${m.grams}г · Б${Math.round(m.protein)}г У${Math.round(m.carbs)}г Ж${Math.round(m.fat)}г</div>
          </div>
          <div class="kcal">${Math.round(m.kcal)} ккал</div>
          <button class="icon-action del-btn nutr-meal-del">✕</button>
        </div>
      `).join("")}
    </div>
  `).join("") || `<p class="muted-copy" style="padding:12px 0">Приёмов пищи пока нет. Нажми «+ Добавить».</p>`;

  // Активность
  document.getElementById("nutrActivityList").innerHTML = (day.activity || []).length
    ? day.activity.map((a, idx) => `
      <div class="nutr-activity-item" data-act-idx="${idx}">
        <span class="name">🏃 ${esc(a.name)}</span>
        <span class="kcal">−${a.kcal} ккал</span>
        <button class="icon-action nutr-act-del" style="width:26px;height:26px;font-size:12px">✕</button>
      </div>
    `).join("")
    : `<p class="muted-copy" style="padding:8px 0">Активности нет</p>`;

  // Навигация по датам
  const datePicker = document.getElementById("nutrDatePicker");
  if (datePicker) {
    datePicker.addEventListener("change", e => { nutrDiaryDate = e.target.value; renderNutrDiary(); });
  }
  const prevBtn = document.getElementById("nutrPrevDay");
  if (prevBtn) prevBtn.addEventListener("click", () => {
    const d = new Date(nutrDiaryDate + "T00:00:00"); d.setDate(d.getDate()-1);
    nutrDiaryDate = d.toISOString().split("T")[0]; renderNutrDiary();
  });
  const nextBtn = document.getElementById("nutrNextDay");
  if (nextBtn) nextBtn.addEventListener("click", () => {
    const d = new Date(nutrDiaryDate + "T00:00:00"); d.setDate(d.getDate()+1);
    nutrDiaryDate = d.toISOString().split("T")[0]; renderNutrDiary();
  });
  const todayBtn = document.getElementById("nutrGoToday");
  if (todayBtn) todayBtn.addEventListener("click", () => { nutrDiaryDate = todayISO(); renderNutrDiary(); });

  // Калории на дашборде
  const _cm = document.querySelector("#calorieMini"); if(_cm) _cm.innerHTML = `
    <div class="metric">${totals.kcal}</div>
    <p class="muted-copy">потреблено · ${totals.burned} сожжено</p>
    <div class="progress"><span style="width:${pct}%"></span></div>
  `;

  bindNutrDiaryEvents();
  checkNutrApiKey();
}

function bindNutrDiaryEvents() {
  document.querySelectorAll(".nutr-meal-del").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.closest("[data-meal-idx]").dataset.mealIdx);
      const dayData = getNutrDB().diary[nutrDiaryDate];
      if (dayData) { dayData.meals.splice(idx, 1); saveDB("nutrition_diary"); renderNutrDiary(); }
    });
  });
  document.querySelectorAll(".nutr-act-del").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.closest("[data-act-idx]").dataset.actIdx);
      const dayData = getNutrDB().diary[nutrDiaryDate];
      if (dayData) { dayData.activity.splice(idx, 1); saveDB("nutrition_diary"); renderNutrDiary(); }
    });
  });
}

/* ---------- Кнопка "+ Добавить" ---------- */
document.addEventListener("click", e => { if (e.target.closest("#nutrAddMealBtn")) openNutrAddMealModal(); });

function openNutrAddMealModal(prefillProduct) {
  const products = allProducts();
  const dishes = getNutrDB().dishes;
  let selectedType = "Завтрак";
  let selectedItem = prefillProduct || null; // {type:'product'|'dish', data:...}
  let searchQ = "";

  const itemListHTML = () => {
    const q = searchQ.toLowerCase();
    const matchedProducts = products.filter(p => p.name.toLowerCase().includes(q)).slice(0, 20);
    const matchedDishes = dishes.filter(d => d.name.toLowerCase().includes(q)).slice(0, 10);
    return [
      ...matchedDishes.map(d => {
        const kcalPer = calcDishKcalPer100(d);
        return `<div class="nutr-product-row" data-item-type="dish" data-item-id="${d.id}" style="cursor:pointer">
          <div style="flex:1"><div class="pname">${d.emoji || "🍽"} ${esc(d.name)}</div><div class="pmacros">блюдо · порция ${d.portionGrams}г</div></div>
          <div class="pkcal">${Math.round(kcalPer*d.portionGrams/100)} ккал</div>
        </div>`;
      }),
      ...matchedProducts.map(p => `
        <div class="nutr-product-row" data-item-type="product" data-item-id="${p.id}" style="cursor:pointer">
          <div style="flex:1"><div class="pname">${esc(p.name)}</div><div class="pmacros">на 100г: Б${p.protein}г У${p.carbs}г Ж${p.fat}г</div></div>
          <div class="pkcal">${p.kcal} ккал</div>
        </div>
      `),
    ].join("") || `<p class="muted-copy">Ничего не найдено</p>`;
  };

  const selectedHTML = () => selectedItem ? `
    <div style="padding:10px 14px;border-radius:14px;background:rgba(185,222,199,.2);border:1px solid rgba(185,222,199,.5);margin-bottom:10px">
      <strong>${selectedItem.data.emoji || ""} ${esc(selectedItem.data.name)}</strong>
      <div style="font-size:12px;color:var(--muted);margin-top:2px">${selectedItem.type === "dish" ? `Порция: ${selectedItem.data.portionGrams}г` : "продукт · укажи граммовку ниже"}</div>
    </div>
  ` : "";

  openModal(`
    <h3>Добавить в дневник</h3>
    <div class="gd-field"><label>Приём пищи</label>
      <div class="gd-pills" id="mealTypePills">${MEAL_TYPES.map(t => `<div class="gd-pill ${t===selectedType?"sel":""}" data-mtype="${t}">${t}</div>`).join("")}</div>
    </div>
    <div id="selectedItemWrap">${selectedHTML()}</div>
    <div class="gd-field">
      <label>Поиск продукта или блюда</label>
      <input type="text" id="nutrItemSearch" placeholder="Курица, овсянка, мой салат..."/>
    </div>
    <div id="nutrItemList" style="max-height:200px;overflow-y:auto;display:grid;gap:6px;margin-bottom:12px">${itemListHTML()}</div>
    <div class="gd-row2" id="gramsRow" style="${selectedItem && selectedItem.type==='dish' ? 'display:none' : ''}">
      <div class="gd-field"><label>Граммовка</label><input type="number" id="nutrGrams" value="100" min="1"/></div>
      <div class="gd-field"><label>Ккал (авто или вручную)</label><input type="number" id="nutrKcalManual" placeholder="авто"/></div>
    </div>
    <div class="gd-actions">
      <button class="secondary-action" id="nutrMealCancel">Отмена</button>
      <button class="primary-action" id="nutrMealSave">Добавить</button>
    </div>
  `, (root) => {
    root.querySelectorAll("#mealTypePills .gd-pill").forEach(p => p.addEventListener("click", () => {
      selectedType = p.dataset.mtype;
      root.querySelectorAll("#mealTypePills .gd-pill").forEach(x => x.classList.toggle("sel", x === p));
    }));

    const searchInput = root.querySelector("#nutrItemSearch");
    searchInput.addEventListener("input", () => {
      searchQ = searchInput.value;
      root.querySelector("#nutrItemList").innerHTML = itemListHTML();
      bindItemClick();
    });

    function bindItemClick() {
      root.querySelectorAll("#nutrItemList [data-item-id]").forEach(row => {
        row.addEventListener("click", () => {
          const type = row.dataset.itemType;
          const id = row.dataset.itemId;
          selectedItem = type === "dish"
            ? { type, data: dishes.find(d => d.id === id) }
            : { type, data: products.find(p => p.id === id) };
          root.querySelector("#selectedItemWrap").innerHTML = selectedHTML();
          root.querySelector("#gramsRow").style.display = type === "dish" ? "none" : "";
          if (type === "product") {
            const grams = root.querySelector("#nutrGrams");
            if (grams) grams.focus();
          }
        });
      });
    }
    bindItemClick();

    root.querySelector("#nutrMealCancel").addEventListener("click", closeModal);
    root.querySelector("#nutrMealSave").addEventListener("click", () => {
      if (!selectedItem) { searchInput.focus(); return; }
      const day = getTodayNutr();
      let entry;
      if (selectedItem.type === "dish") {
        const d = selectedItem.data;
        const portion = d.portionGrams;
        const per100 = calcDishKcalPer100(d);
        entry = {
          mealType: selectedType,
          name: d.name,
          grams: portion,
          kcal: Math.round(per100 * portion / 100),
          protein: Math.round(calcDishMacro(d, "protein") * portion / 100 * 10) / 10,
          carbs:   Math.round(calcDishMacro(d, "carbs")   * portion / 100 * 10) / 10,
          fat:     Math.round(calcDishMacro(d, "fat")     * portion / 100 * 10) / 10,
          dishId: d.id,
        };
      } else {
        const p = selectedItem.data;
        const grams = Number(root.querySelector("#nutrGrams").value) || 100;
        const manualKcal = root.querySelector("#nutrKcalManual").value;
        const kcal = manualKcal ? Number(manualKcal) : Math.round(p.kcal * grams / 100);
        entry = {
          mealType: selectedType,
          name: p.name,
          grams,
          kcal,
          protein: Math.round(p.protein * grams / 100 * 10) / 10,
          carbs:   Math.round(p.carbs   * grams / 100 * 10) / 10,
          fat:     Math.round(p.fat     * grams / 100 * 10) / 10,
          productId: p.id,
        };
      }
      day.meals.push(entry);
      saveDB("nutrition_diary"); renderNutrDiary(); closeModal();
    });
  });
}

/* ---------- Активность ---------- */
document.addEventListener("click", e => { if (e.target.closest("#nutrAddActivityBtn")) openNutrActivityModal(); });
function openNutrActivityModal() {
  openModal(`
    <h3>Добавить активность</h3>
    <div class="gd-field"><label>Название</label><input type="text" id="act-name" placeholder="Бег, йога, прогулка..."/></div>
    <div class="gd-field"><label>Сожжено ккал</label><input type="number" id="act-kcal" placeholder="200"/></div>
    <div class="gd-actions">
      <button class="secondary-action" id="act-cancel">Отмена</button>
      <button class="primary-action" id="act-save">Добавить</button>
    </div>
  `, (root) => {
    root.querySelector("#act-cancel").addEventListener("click", closeModal);
    root.querySelector("#act-save").addEventListener("click", () => {
      const name = root.querySelector("#act-name").value.trim() || "Активность";
      const kcal = Number(root.querySelector("#act-kcal").value) || 0;
      if (!getNutrDB().diary[nutrDiaryDate]) getNutrDB().diary[nutrDiaryDate] = { meals: [], activity: [] };
      getNutrDB().diary[nutrDiaryDate].activity.push({ name, kcal });
      saveDB("nutrition_diary"); renderNutrDiary(); closeModal();
    });
    root.querySelector("#act-name").focus();
  });
}

/* ---------- Настройки / Цель ---------- */
document.addEventListener("click", e => { if (e.target.closest("#nutrSettingsBtn")) openNutrSettingsModal(); });
function openNutrSettingsModal() {
  const g = getNutrDB().goal;
  openModal(`
    <h3>Цель по питанию</h3>
    <div class="gd-row2">
      <div class="gd-field"><label>Калории (ккал/день)</label><input type="number" id="gs-kcal" value="${g.kcal}"/></div>
      <div class="gd-field"><label>Белок (г)</label><input type="number" id="gs-protein" value="${g.protein}"/></div>
    </div>
    <div class="gd-row2">
      <div class="gd-field"><label>Углеводы (г)</label><input type="number" id="gs-carbs" value="${g.carbs}"/></div>
      <div class="gd-field"><label>Жиры (г)</label><input type="number" id="gs-fat" value="${g.fat}"/></div>
    </div>
    <div class="gd-field"><label>Предпочтения / ограничения (для ассистента)</label>
      <textarea id="gs-prefs" style="min-height:70px" placeholder="Например: без молочки, без яиц, вегетарианство...">${esc(getNutrDB().preferences||"")}</textarea>
    </div>
    <div class="gd-actions">
      <button class="secondary-action" id="gs-cancel">Отмена</button>
      <button class="primary-action" id="gs-save">Сохранить</button>
    </div>
  `, (root) => {
    root.querySelector("#gs-cancel").addEventListener("click", closeModal);
    root.querySelector("#gs-save").addEventListener("click", () => {
      const n = getNutrDB();
      n.goal = {
        kcal:    Number(root.querySelector("#gs-kcal").value)    || 1500,
        protein: Number(root.querySelector("#gs-protein").value) || 105,
        carbs:   Number(root.querySelector("#gs-carbs").value)   || 160,
        fat:     Number(root.querySelector("#gs-fat").value)     || 55,
      };
      n.preferences = root.querySelector("#gs-prefs").value.trim();
      saveDB("nutrition_goal"); renderNutrDiary(); closeModal();
    });
  });
}

/* ---------- Кнопка "Мне плохо" ---------- */
document.addEventListener("click", e => { if (!e.target.closest("#nutrHelpBtn")) return;
  openModal(`
    <h3>🍫 Плохо? Вот что поможет</h3>
    <p class="muted-copy" style="margin-bottom:16px">Похоже на гипогликемию или просто нужна быстрая энергия. Что есть рядом?</p>
    <div style="display:grid;gap:8px" id="helpItems">
      ${[
        {e:"🍫", name:"Кусочек тёмного шоколада", kcal:80, hint:"Быстрый подъём настроения"},
        {e:"🌴", name:"5 фиников", kcal:100, hint:"Плавный подъём сахара"},
        {e:"🍌", name:"Банан", kcal:90, hint:"Калий + быстрые углеводы"},
        {e:"🟠", name:"Курага 5 шт.", kcal:60, hint:"Мягко и быстро"},
        {e:"🍯", name:"Ложка мёда", kcal:60, hint:"Самый быстрый источник глюкозы"},
      ].map(item => `
        <div class="nutr-meal-item" style="cursor:pointer" data-help-name="${esc(item.name)}" data-help-kcal="${item.kcal}">
          <div style="font-size:22px">${item.e}</div>
          <div style="flex:1"><div class="name">${item.name}</div><div class="macro-row">${item.hint}</div></div>
          <div class="kcal">~${item.kcal} ккал</div>
        </div>
      `).join("")}
    </div>
    <div class="gd-actions" style="margin-top:16px">
      <button class="secondary-action" id="help-cancel">Закрыть</button>
    </div>
  `, (root) => {
    root.querySelector("#help-cancel").addEventListener("click", closeModal);
    root.querySelectorAll("[data-help-name]").forEach(row => {
      row.addEventListener("click", () => {
        const name = row.dataset.helpName;
        const kcal = Number(row.dataset.helpKcal);
        getTodayNutr().meals.push({ mealType:"Перекус", name, grams:0, kcal, protein:0, carbs:kcal*0.8/4, fat:kcal*0.2/9 });
        saveDB('nutrition_diary'); renderNutrDiary(); closeModal();
      });
    });
  });
});

/* ---------- Блюда ---------- */
function calcDishKcalPer100(dish) {
  let total = 0, totalGrams = 0;
  (dish.ingredients || []).forEach(ing => {
    const p = findProduct(ing.productId);
    if (p) { total += p.kcal * ing.grams / 100; totalGrams += ing.grams; }
    else { total += (ing.kcalManual || 0) * ing.grams / 100; totalGrams += ing.grams; }
  });
  if (!totalGrams || !dish.totalGrams) return 0;
  const factor = dish.totalGrams / totalGrams;
  return Math.round((total / dish.totalGrams) * 100 * factor);
}
function calcDishMacro(dish, macro) {
  let total = 0, totalGrams = 0;
  (dish.ingredients || []).forEach(ing => {
    const p = findProduct(ing.productId);
    if (p) { total += p[macro] * ing.grams / 100; totalGrams += ing.grams; }
  });
  if (!totalGrams || !dish.totalGrams) return 0;
  const factor = dish.totalGrams / totalGrams;
  return (total / dish.totalGrams) * 100 * factor;
}

function renderNutrDishes() {
  const dishes = getNutrDB().dishes;
  document.getElementById("nutrDishesList").innerHTML = dishes.length
    ? dishes.map(d => {
        const kcalPer = calcDishKcalPer100(d);
        const kcalPortion = Math.round(kcalPer * d.portionGrams / 100);
        return `
        <article class="nutr-dish-card" data-dish-id="${d.id}">
          <div class="emoji">${d.emoji || "🍽"}</div>
          <h4>${esc(d.name)}</h4>
          <div class="macros">Порция ${d.portionGrams}г · ${kcalPortion} ккал · ${d.ingredients.length} ингр.</div>
          <div class="dish-actions">
            <button class="ghost-action dish-add-btn" style="font-size:12px;padding:8px 12px">+ В дневник</button>
            <button class="ghost-action dish-del-btn" style="font-size:12px;padding:8px 12px">Удалить</button>
          </div>
        </article>`;
      }).join("")
    : `<p class="muted-copy" style="padding:20px 0">Блюд пока нет. Создай первое!</p>`;

  document.querySelectorAll(".dish-add-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.closest("[data-dish-id]").dataset.dishId;
      const dish = getNutrDB().dishes.find(d => d.id === id);
      setSection("nutrition");
      document.querySelector("[data-nutr-tab='diary']").click();
      openNutrAddMealModal({ type: "dish", data: dish });
    });
  });
  document.querySelectorAll(".dish-del-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.closest("[data-dish-id]").dataset.dishId;
      if (!confirm("Удалить блюдо?")) return;
      getNutrDB().dishes = getNutrDB().dishes.filter(d => d.id !== id);
      saveDB('nutrition_dishes'); renderNutrDishes();
    });
  });
}

document.addEventListener("click", e => { if (e.target.closest("#nutrAddDishBtn")) openNutrAddDishModal(); });
function openNutrAddDishModal() {
  const products = allProducts();
  let ingredients = []; // [{productId, name, grams}]
  let searchQ = "";

  const ingListHTML = () => ingredients.map((ing, i) => `
    <div class="nutr-meal-item" data-ing-idx="${i}">
      <div style="flex:1"><div class="name">${esc(ing.name)}</div></div>
      <input type="number" value="${ing.grams}" min="1" class="ing-grams" data-ing-idx="${i}" style="width:70px;padding:7px 10px;border:1px solid var(--line);border-radius:10px;font:inherit;font-size:13px;text-align:center"/>
      <div style="font-size:12px;color:var(--muted);min-width:40px;text-align:right">${Math.round(findProduct(ing.productId)?.kcal * ing.grams / 100 || 0)} кк</div>
      <button class="icon-action ing-del" style="width:26px;height:26px;font-size:12px">✕</button>
    </div>
  `).join("") || `<p class="muted-copy">Добавь ингредиенты поиском ниже</p>`;

  const prodSearchHTML = () => {
    const q = searchQ.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q)).slice(0, 10).map(p => `
      <div class="nutr-product-row" data-pid="${p.id}" style="cursor:pointer">
        <div style="flex:1"><div class="pname">${esc(p.name)}</div></div>
        <div class="pkcal">${p.kcal} ккал</div>
      </div>
    `).join("") || `<p class="muted-copy">Не найдено</p>`;
  };

  openModal(`
    <h3>Новое блюдо</h3>
    <div class="gd-row2">
      <div class="gd-field"><label>Название</label><input type="text" id="dish-name" placeholder="Мой салат"/></div>
      <div class="gd-field"><label>Эмодзи</label><input type="text" id="dish-emoji" value="🍽" maxlength="2" style="font-size:22px;text-align:center"/></div>
    </div>
    <div class="gd-row2">
      <div class="gd-field"><label>Выход блюда (г)</label><input type="number" id="dish-total" placeholder="400"/></div>
      <div class="gd-field"><label>Размер порции (г)</label><input type="number" id="dish-portion" placeholder="200"/></div>
    </div>
    <div class="gd-field"><label>Ингредиенты</label>
      <div id="dish-ing-list" style="display:grid;gap:6px;margin-bottom:8px">${ingListHTML()}</div>
      <input type="text" id="dish-ing-search" placeholder="Найти продукт..."/>
      <div id="dish-prod-list" style="max-height:160px;overflow-y:auto;display:grid;gap:4px;margin-top:6px">${prodSearchHTML()}</div>
    </div>
    <div class="gd-actions">
      <button class="secondary-action" id="dish-cancel">Отмена</button>
      <button class="primary-action" id="dish-save">Сохранить блюдо</button>
    </div>
  `, (root) => {
    function refresh() {
      root.querySelector("#dish-ing-list").innerHTML = ingListHTML();
      bindIngEvents();
    }
    function bindIngEvents() {
      root.querySelectorAll(".ing-del").forEach(b => b.addEventListener("click", () => {
        ingredients.splice(Number(b.dataset.ingIdx), 1); refresh();
      }));
      root.querySelectorAll(".ing-grams").forEach(inp => inp.addEventListener("change", () => {
        ingredients[Number(inp.dataset.ingIdx)].grams = Number(inp.value) || 100; refresh();
      }));
    }
    function refreshProdList() {
      root.querySelector("#dish-prod-list").innerHTML = prodSearchHTML();
      root.querySelectorAll("[data-pid]").forEach(row => row.addEventListener("click", () => {
        const p = products.find(x => x.id === row.dataset.pid);
        if (p) { ingredients.push({ productId: p.id, name: p.name, grams: 100 }); refresh(); }
      }));
    }
    root.querySelector("#dish-ing-search").addEventListener("input", e => { searchQ = e.target.value; refreshProdList(); });
    refreshProdList();
    root.querySelector("#dish-cancel").addEventListener("click", closeModal);
    root.querySelector("#dish-save").addEventListener("click", () => {
      const name = root.querySelector("#dish-name").value.trim();
      if (!name) { root.querySelector("#dish-name").focus(); return; }
      if (!ingredients.length) { alert("Добавь хотя бы один ингредиент"); return; }
      getNutrDB().dishes.push({
        id: uid(), name,
        emoji: root.querySelector("#dish-emoji").value || "🍽",
        totalGrams: Number(root.querySelector("#dish-total").value) || 400,
        portionGrams: Number(root.querySelector("#dish-portion").value) || 200,
        ingredients: [...ingredients],
      });
      saveDB("nutrition_dishes"); renderNutrDishes(); closeModal();
    });
    bindIngEvents();
    root.querySelector("#dish-name").focus();
  });
}

/* ---------- Продукты ---------- */
let nutrProductSearchQ = "";
document.addEventListener("input", e => {
  if (e.target.id === "nutrProductSearch") {
    nutrProductSearchQ = e.target.value.toLowerCase();
    renderNutrProducts();
  }
});
// Фильтры продуктов — делегирование, т.к. панель скрыта при загрузке
document.addEventListener("click", e => {
  const pfBtn = e.target.closest("#nutrProductFilter [data-pf]");
  if (!pfBtn) return;
  nutrProductFilter = pfBtn.dataset.pf;
  document.querySelectorAll("#nutrProductFilter [data-pf]").forEach(b => b.classList.toggle("is-active", b === pfBtn));
  renderNutrProducts();
});

function renderNutrProducts() {
  let list = allProducts();
  if (nutrProductFilter === "my") list = list.filter(p => !p.builtin);
  if (nutrProductFilter === "builtin") list = list.filter(p => p.builtin);
  if (nutrProductSearchQ) list = list.filter(p => p.name.toLowerCase().includes(nutrProductSearchQ));

  document.getElementById("nutrProductsList").innerHTML = list.map(p => `
    <div class="nutr-product-row" data-prod-id="${p.id}">
      <div style="flex:1">
        <div class="pname">${esc(p.name)} ${p.builtin ? "" : "<span style='font-size:10px;color:var(--muted)'>(мой)</span>"}</div>
        <div class="pmacros">Б${p.protein}г · У${p.carbs}г · Ж${p.fat}г на 100г</div>
      </div>
      <div class="pkcal">${p.kcal} ккал</div>
      <button class="ghost-action add-btn" data-prod-id="${p.id}" style="font-size:12px;padding:8px 12px">+ В дневник</button>
      ${!p.builtin ? `<button class="icon-action prod-del-btn" style="width:28px;height:28px;font-size:12px">✕</button>` : ""}
    </div>
  `).join("") || `<p class="muted-copy" style="padding:16px 0">Ничего не найдено</p>`;

  document.querySelectorAll(".add-btn[data-prod-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = allProducts().find(x => x.id === btn.dataset.prodId);
      setSection("nutrition");
      document.querySelector("[data-nutr-tab='diary']").click();
      openNutrAddMealModal({ type: "product", data: p });
    });
  });
  document.querySelectorAll(".prod-del-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.closest("[data-prod-id]").dataset.prodId;
      getNutrDB().products = getNutrDB().products.filter(p => p.id !== id);
      saveDB('nutrition_products'); renderNutrProducts();
    });
  });
}

document.addEventListener("click", e => { if (e.target.closest("#nutrAddProductBtn")) openNutrAddProductModal(); });
function openNutrAddProductModal() {
  openModal(`
    <h3>Новый продукт</h3>
    <div class="gd-field"><label>Название</label><input type="text" id="prod-name" placeholder="Название продукта"/></div>
    <div class="gd-row2">
      <div class="gd-field"><label>Калории (на 100г)</label><input type="number" id="prod-kcal" placeholder="200"/></div>
      <div class="gd-field"><label>Белки (г)</label><input type="number" step="0.1" id="prod-protein" placeholder="10"/></div>
    </div>
    <div class="gd-row2">
      <div class="gd-field"><label>Углеводы (г)</label><input type="number" step="0.1" id="prod-carbs" placeholder="20"/></div>
      <div class="gd-field"><label>Жиры (г)</label><input type="number" step="0.1" id="prod-fat" placeholder="5"/></div>
    </div>
    <div class="gd-actions">
      <button class="secondary-action" id="prod-cancel">Отмена</button>
      <button class="primary-action" id="prod-save">Сохранить</button>
    </div>
  `, (root) => {
    root.querySelector("#prod-cancel").addEventListener("click", closeModal);
    root.querySelector("#prod-save").addEventListener("click", () => {
      const name = root.querySelector("#prod-name").value.trim();
      if (!name) { root.querySelector("#prod-name").focus(); return; }
      getNutrDB().products.push({
        id: uid(), name, builtin: false,
        kcal:    Number(root.querySelector("#prod-kcal").value)    || 0,
        protein: Number(root.querySelector("#prod-protein").value) || 0,
        carbs:   Number(root.querySelector("#prod-carbs").value)   || 0,
        fat:     Number(root.querySelector("#prod-fat").value)     || 0,
      });
      saveDB("nutrition_products"); renderNutrProducts(); closeModal();
    });
    root.querySelector("#prod-name").focus();
  });
}

/* ---------- Динамика ---------- */
// Диапазон динамики — делегирование, т.к. панель скрыта при загрузке
document.addEventListener("click", e => {
  const drBtn = e.target.closest("[data-dynrange]");
  if (!drBtn) return;
  nutrDynRange = drBtn.dataset.dynrange;
  document.querySelectorAll("[data-dynrange]").forEach(b => b.classList.toggle("is-active", b === drBtn));
  renderNutrDynamics();
});

function renderNutrDynamics() {
  const diary = getNutrDB().diary;
  const now = new Date(); now.setHours(0,0,0,0);
  const days = Object.keys(diary).filter(d => {
    const diff = Math.round((now - new Date(d + "T00:00:00")) / 86400000);
    if (nutrDynRange === "week")  return diff >= 0 && diff <= 6;
    if (nutrDynRange === "month") return diff >= 0 && diff <= 29;
    return diff >= 0;
  }).sort();

  const maxKcal = 2400;
  const calorieHTML = days.length ? days.map(d => {
    const t = calcDayTotals(diary[d]);
    return `
      <div class="calorie-day">
        <span>${RU_DAYS_SHORT[new Date(d+"T00:00:00").getDay()]}</span>
        <div class="calorie-bars">
          <i class="eaten" style="height:${Math.min(100,(t.kcal/maxKcal)*100)}%" title="${Math.round(t.kcal)} ккал"></i>
          <i class="burned" style="height:${Math.min(100,(t.burned/maxKcal)*100)}%" title="${Math.round(t.burned)} сожжено"></i>
        </div>
      </div>`;
  }).join("") : `<p class="muted-copy">Данных за период нет</p>`;

  document.getElementById("nutrDynCaloriesChart").innerHTML = calorieHTML;

  // Среднее КБЖУ
  if (days.length) {
    const avg = { kcal:0, protein:0, carbs:0, fat:0 };
    days.forEach(d => { const t = calcDayTotals(diary[d]); avg.kcal+=t.kcal; avg.protein+=t.protein; avg.carbs+=t.carbs; avg.fat+=t.fat; });
    const n = days.length;
    document.getElementById("nutrDynMacros").innerHTML = [
      { l:"Калории", v: Math.round(avg.kcal/n) + " ккал", c:"var(--rose)" },
      { l:"Белок",   v: Math.round(avg.protein/n) + " г",  c:"var(--mint-deep)" },
      { l:"Углеводы",v: Math.round(avg.carbs/n) + " г",   c:"var(--apricot)" },
      { l:"Жиры",    v: Math.round(avg.fat/n) + " г",     c:"var(--lavender)" },
    ].map(m => `
      <div class="nutr-dyn-macro">
        <span class="label">${m.l}</span>
        <span class="value" style="color:${m.c}">${m.v}</span>
      </div>
    `).join("");
  } else {
    document.getElementById("nutrDynMacros").innerHTML = `<p class="muted-copy">Нет данных</p>`;
  }

  document.getElementById("nutrDynStats").innerHTML = `
    <div class="nutr-macro-card" style="text-align:left;padding:16px">
      <div class="val">${days.length}</div>
      <div class="lbl">Дней с записями</div>
      <div class="sub" style="margin-top:8px">за выбранный период</div>
    </div>
  `;
}

/* ---------- Нутри-ассистент ---------- */
let nutrChatHistory = [];

function checkNutrApiKey() {
  const key = getNutrDB().apiKey;
  const wrap = document.getElementById("nutrApiKeyWrap");
  if (wrap) wrap.style.display = key ? "none" : "block";
}

document.addEventListener("click", e => { if (!e.target.closest("#nutrApiKeySave")) return;
  const key = document.getElementById("nutrApiKeyInput").value.trim();
  if (!key.startsWith("sk-ant-")) { alert("Ключ должен начинаться с sk-ant-"); return; }
  getNutrDB().apiKey = key;
  saveDB();
  document.getElementById("nutrApiKeyWrap").style.display = "none";
});

document.addEventListener("click", e => { if (e.target.closest("#nutrChatSend")) sendNutrChat(); });
document.getElementById("nutrChatInput").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendNutrChat(); } });

document.querySelectorAll("#nutrQuickPrompts button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.getElementById("nutrChatInput").value = btn.textContent;
    sendNutrChat();
  });
});

async function sendNutrChat() {
  const input = document.getElementById("nutrChatInput");
  const text = input.value.trim();
  if (!text) return;

  const key = getNutrDB().apiKey;
  if (!key) { document.getElementById("nutrApiKeyWrap").style.display = "block"; return; }

  input.value = "";
  nutrChatHistory.push({ role: "user", content: text });
  renderNutrChat();

  const today = getTodayNutr();
  const totals = calcDayTotals(today);
  const goal = getNutrDB().goal;
  const prefs = getNutrDB().preferences;

  const systemPrompt = `Ты нутри-ассистент в приложении DayKeeper. Говоришь дружелюбно, без давления. 
Сегодня съедено ${Math.round(totals.kcal)} из ${goal.kcal} ккал. БЖУ: Б${Math.round(totals.protein)}г У${Math.round(totals.carbs)}г Ж${Math.round(totals.fat)}г.
${prefs ? `Предпочтения пользователя: ${prefs}.` : ""}
Отвечай кратко (3-5 предложений), на русском языке, без лишних списков.`;

  const loadingEl = addNutrMsg("loading", "Думаю...");

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        system: systemPrompt,
        messages: nutrChatHistory,
      }),
    });
    const data = await resp.json();
    loadingEl.remove();
    if (data.error) { addNutrMsg("assistant", "Ошибка API: " + data.error.message); return; }
    const reply = data.content?.[0]?.text || "Не получила ответ, попробуй ещё раз.";
    nutrChatHistory.push({ role: "assistant", content: reply });
    addNutrMsg("assistant", reply);
  } catch (e) {
    loadingEl.remove();
    addNutrMsg("assistant", "Ошибка соединения. Проверь API-ключ и интернет.");
  }
}

function addNutrMsg(role, text) {
  const chat = document.getElementById("nutrChat");
  const el = document.createElement("div");
  el.className = `nutr-msg ${role}`;
  el.textContent = text;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
  return el;
}

function renderNutrChat() {
  const chat = document.getElementById("nutrChat");
  chat.innerHTML = "";
  nutrChatHistory.forEach(m => addNutrMsg(m.role, m.content));
}

/* ---------- Первичная инициализация питания ---------- */
getNutrDB(); // создать структуру если нет
renderNutrDiary();
