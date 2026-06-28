/* =========================================================
   DAYKEEPER — supabase-layer.js
   Авторизация + все операции с данными через Supabase.
   Подключается ПЕРЕД app.js в index.html.
   ========================================================= */

const SUPABASE_URL = "https://cnzhzycjcndktcmlprky.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuemh6eWNqY25ka3RjbWxwcmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Mzc1NjMsImV4cCI6MjA5MDExMzU2M30.Zdhen0EO1ce01lWCabBJRmVo2Nxq_So9jh5Ggq_Rx5M";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

let currentUser = null;

/* =========================================================
   АВТОРИЗАЦИЯ
   ========================================================= */

function showAuthScreen() {
  document.getElementById("authScreen").style.display = "block";
  document.querySelector(".app-shell").style.display = "none";
}
function showAppScreen(user) {
  currentUser = user;
  document.getElementById("authScreen").style.display = "none";
  document.querySelector(".app-shell").style.display = "";

  // Показываем email и кнопку выхода в топбаре
  const topbar = document.querySelector(".topbar");
  if (topbar && !document.getElementById("topbarUser")) {
    const userEl = document.createElement("div");
    userEl.className = "topbar-user";
    userEl.id = "topbarUser";
    userEl.innerHTML = `
      <span class="topbar-email">${user.email}</span>
      <button class="topbar-logout" id="logoutBtn">Выйти</button>
    `;
    topbar.appendChild(userEl);
    document.getElementById("logoutBtn").addEventListener("click", async () => {
      await sb.auth.signOut();
      currentUser = null;
      document.getElementById("topbarUser").remove();
      showAuthScreen();
    });
  }
}

// Кнопки авторизации
document.getElementById("authLoginBtn").addEventListener("click", async () => {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const errEl = document.getElementById("authError");
  errEl.style.display = "none";

  if (!email || !password) {
    errEl.textContent = "Введи email и пароль";
    errEl.style.display = "block";
    return;
  }

  const btn = document.getElementById("authLoginBtn");
  btn.textContent = "Входим...";
  btn.disabled = true;

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  btn.textContent = "Войти";
  btn.disabled = false;

  if (error) {
    errEl.textContent = error.message === "Invalid login credentials"
      ? "Неверный email или пароль"
      : error.message;
    errEl.style.display = "block";
    return;
  }
  showAppScreen(data.user);
  await loadAllDataFromSupabase();
});

document.getElementById("authRegisterBtn").addEventListener("click", async () => {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const errEl = document.getElementById("authError");
  errEl.style.display = "none";

  if (!email || !password) {
    errEl.textContent = "Введи email и пароль";
    errEl.style.display = "block";
    return;
  }
  if (password.length < 6) {
    errEl.textContent = "Пароль должен быть минимум 6 символов";
    errEl.style.display = "block";
    return;
  }

  const btn = document.getElementById("authRegisterBtn");
  btn.textContent = "Создаём аккаунт...";
  btn.disabled = true;

  const { data, error } = await sb.auth.signUp({ email, password });
  btn.textContent = "Создать аккаунт";
  btn.disabled = false;

  if (error) {
    errEl.textContent = error.message;
    errEl.style.display = "block";
    return;
  }

  if (data.user && !data.session) {
    errEl.style.background = "rgba(185,222,199,.25)";
    errEl.style.borderColor = "rgba(185,222,199,.6)";
    errEl.style.color = "#19463a";
    errEl.textContent = "Проверь email — пришло письмо для подтверждения";
    errEl.style.display = "block";
    return;
  }

  showAppScreen(data.user);
  await migrateLocalStorageToSupabase();
  await loadAllDataFromSupabase();
});

// Keyboard submit
document.getElementById("authPassword").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("authLoginBtn").click();
});

/* =========================================================
   ЗАГРУЗКА ДАННЫХ ИЗ SUPABASE → DB (localStorage-совместимая структура)
   ========================================================= */

async function loadAllDataFromSupabase() {
  if (!currentUser) return;
  const uid = currentUser.id;

  try {
    const [
      tasks, habits, habitLogs, routines, moods,
      body, nutritionDiary, nutritionProducts, nutritionDishes,
      nutritionGoal, shopping, diary, birthdays
    ] = await Promise.all([
      sb.from("dk_tasks").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      sb.from("dk_habits").select("*").eq("user_id", uid).order("created_at"),
      sb.from("dk_habit_logs").select("*").eq("user_id", uid),
      sb.from("dk_routines").select("*").eq("user_id", uid).order("created_at"),
      sb.from("dk_mood_entries").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      sb.from("dk_body_metrics").select("*").eq("user_id", uid).order("metric_date"),
      sb.from("dk_nutrition_diary").select("*").eq("user_id", uid),
      sb.from("dk_nutrition_products").select("*").eq("user_id", uid).order("name"),
      sb.from("dk_nutrition_dishes").select("*").eq("user_id", uid).order("name"),
      sb.from("dk_nutrition_goal").select("*").eq("user_id", uid).single(),
      sb.from("dk_shopping").select("*").eq("user_id", uid).order("sort_order"),
      sb.from("dk_diary").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      sb.from("dk_birthdays").select("*").eq("user_id", uid).order("name"),
    ]);

    // Конвертируем в формат DB совместимый с app.js

    // Задачи
    DB.tasks = (tasks.data || []).map(t => ({
      id: t.id, title: t.title, desc: t.description || "",
      date: t.date, time: t.time || "", tag: t.tag || "Личное",
      done: t.done, created: new Date(t.created_at).getTime(),
    }));

    // Привычки + логи
    const logsByHabit = {};
    (habitLogs.data || []).forEach(l => {
      if (!logsByHabit[l.habit_id]) logsByHabit[l.habit_id] = {};
      logsByHabit[l.habit_id][l.log_date] = true;
    });
    DB.habits = (habits.data || []).map(h => ({
      id: h.id, name: h.name, icon: h.icon || "🌿",
      log: logsByHabit[h.id] || {}, created: new Date(h.created_at).getTime(),
    }));

    // Рутина
    DB.routines = (routines.data || []).map(r => ({
      id: r.id, title: r.title, type: r.type,
      time: r.time || "", weekdays: r.weekdays || [],
      daypart: r.daypart || "", everyDays: r.every_days || 1,
      lastDone: r.last_done || null,
    }));

    // Состояние
    DB.moodEntries = (moods.data || []).map(m => ({
      id: m.id, date: m.entry_date, time: m.entry_time || "",
      tone: m.tone, emotions: m.emotions || [], events: m.events || [],
      note: m.note || "", created: new Date(m.created_at).getTime(),
    }));

    // Параметры тела
    DB.bodyMetrics = (body.data || []).map(b => ({
      id: b.id, date: b.metric_date,
      weight: b.weight, waist: b.waist, chest: b.chest, hips: b.hips,
    }));

    // Питание — дневник
    DB.calorieLog = {};
    if (!DB.nutrition) DB.nutrition = { goal: {kcal:1500,protein:105,carbs:160,fat:55}, apiKey: "", preferences: "", diary: {}, dishes: [], products: [] };
    DB.nutrition.diary = {};
    (nutritionDiary.data || []).forEach(d => {
      // jsonb из Supabase может прийти как объект или массив — нормализуем
      const meals = Array.isArray(d.meals) ? d.meals : (d.meals ? Object.values(d.meals) : []);
      const activity = Array.isArray(d.activity) ? d.activity : (d.activity ? Object.values(d.activity) : []);
      DB.nutrition.diary[d.diary_date] = { meals, activity };
      // Для совместимости с calorieMini на дашборде
      const kcal = meals.reduce((s, m) => s + (Number(m.kcal) || 0), 0);
      const burned = activity.reduce((s, a) => s + (Number(a.kcal) || 0), 0);
      DB.calorieLog[d.diary_date] = { eaten: kcal, burned, meals };
    });

    // Питание — продукты (свои)
    DB.nutrition.products = (nutritionProducts.data || []).map(p => ({
      id: p.id, name: p.name, kcal: p.kcal, protein: p.protein,
      carbs: p.carbs, fat: p.fat, emoji: p.emoji || "", builtin: false,
    }));

    // Питание — блюда
    DB.nutrition.dishes = (nutritionDishes.data || []).map(d => ({
      id: d.id, name: d.name, emoji: d.emoji || "🍽",
      totalGrams: d.total_grams, portionGrams: d.portion_grams,
      ingredients: d.ingredients || [],
    }));

    // Питание — цель
    if (nutritionGoal.data) {
      DB.nutrition.goal = {
        kcal: nutritionGoal.data.kcal, protein: nutritionGoal.data.protein,
        carbs: nutritionGoal.data.carbs, fat: nutritionGoal.data.fat,
      };
      DB.nutrition.preferences = nutritionGoal.data.preferences || "";
    }

    // Покупки
    DB.shopping = (shopping.data || []).map(g => ({
      id: g.id, group: g.group_name, items: g.items || [],
    }));

    // Дневник
    DB.diary = (diary.data || []).map(e => ({
      id: e.id, title: e.title || "", text: e.body,
      tags: e.tags || [], photos: e.photos || [],
      created: new Date(e.created_at).getTime(),
    }));

    // Дни рождения
    DB.birthdays = (birthdays.data || []).map(b => ({
      id: b.id, name: b.name, mmdd: b.mmdd, note: b.note || "",
    }));

    // Сохраняем в localStorage как кэш и перерендериваем всё
    saveDB();
    rerenderAll();
    console.log("DayKeeper: данные загружены из Supabase");

  } catch (err) {
    console.error("Ошибка загрузки из Supabase:", err);
  }
}

function safeRender(name, fn) {
  try { if (typeof fn === "function") fn(); }
  catch(e) { console.warn("[DK] render error in " + name + ":", e.message); }
}

function rerenderAll() {
  safeRender("tasks",         renderTasks);
  safeRender("habits",        renderHabits);
  safeRender("mood",          renderMood);
  safeRender("routine",       renderRoutine);
  safeRender("bodyMetrics",   renderBodyMetrics);
  safeRender("shopping",      renderShopping);
  safeRender("diary",         renderDiary);
  safeRender("birthdays",     renderBirthdays);
  safeRender("dashboardMisc", renderDashboardMisc);
  safeRender("nutrDiary",     renderNutrDiary);
  // renderCalories вызывается внутри renderNutrDiary — не вызываем отдельно
}

/* =========================================================
   СОХРАНЕНИЕ В SUPABASE (override saveDB)
   ========================================================= */

// Очередь на запись — чтобы не спамить запросами
const syncQueue = new Set();
let syncTimer = null;

function queueSync(type) {
  syncQueue.add(type);
  clearTimeout(syncTimer);
  syncTimer = setTimeout(flushSync, 800);
}

async function flushSync() {
  if (!currentUser) return;
  const uid = currentUser.id;
  const types = [...syncQueue];
  syncQueue.clear();

  for (const type of types) {
    try {
      if (type === "tasks") await syncTasks(uid);
      if (type === "habits") await syncHabits(uid);
      if (type === "routines") await syncRoutines(uid);
      if (type === "mood") await syncMood(uid);
      if (type === "body") await syncBody(uid);
      if (type === "nutrition_diary") await syncNutritionDiary(uid);
      if (type === "nutrition_products") await syncNutritionProducts(uid);
      if (type === "nutrition_dishes") await syncNutritionDishes(uid);
      if (type === "nutrition_goal") await syncNutritionGoal(uid);
      if (type === "shopping") await syncShopping(uid);
      if (type === "diary") await syncDiaryEntries(uid);
      if (type === "birthdays") await syncBirthdays(uid);
    } catch (e) {
      console.error(`Ошибка синхронизации ${type}:`, e);
    }
  }
}

/* ---- Синхронизация каждого типа ---- */

async function syncTasks(uid) {
  // Удаляем все и вставляем заново (простой подход для небольших данных)
  await sb.from("dk_tasks").delete().eq("user_id", uid);
  if (!DB.tasks.length) return;
  await sb.from("dk_tasks").insert(DB.tasks.map(t => ({
    id: t.id, user_id: uid,
    title: t.title, description: t.desc || "",
    date: t.date || null, time: t.time || "",
    tag: t.tag || "Личное", done: t.done,
    created_at: new Date(t.created).toISOString(),
  })));
}

async function syncHabits(uid) {
  await sb.from("dk_habit_logs").delete().eq("user_id", uid);
  await sb.from("dk_habits").delete().eq("user_id", uid);
  if (!DB.habits.length) return;
  await sb.from("dk_habits").insert(DB.habits.map(h => ({
    id: h.id, user_id: uid, name: h.name, icon: h.icon || "🌿",
    created_at: new Date(h.created || Date.now()).toISOString(),
  })));
  const logs = [];
  DB.habits.forEach(h => {
    Object.keys(h.log || {}).forEach(date => {
      logs.push({ habit_id: h.id, user_id: uid, log_date: date });
    });
  });
  if (logs.length) await sb.from("dk_habit_logs").insert(logs);
}

async function syncRoutines(uid) {
  await sb.from("dk_routines").delete().eq("user_id", uid);
  if (!DB.routines.length) return;
  await sb.from("dk_routines").insert(DB.routines.map(r => ({
    id: r.id, user_id: uid, title: r.title, type: r.type,
    time: r.time || "", weekdays: r.weekdays || [],
    daypart: r.daypart || "", every_days: r.everyDays || 1,
    last_done: r.lastDone || null,
  })));
}

async function syncMood(uid) {
  await sb.from("dk_mood_entries").delete().eq("user_id", uid);
  if (!DB.moodEntries.length) return;
  await sb.from("dk_mood_entries").insert(DB.moodEntries.map(m => ({
    id: m.id, user_id: uid,
    entry_date: m.date, entry_time: m.time || "",
    tone: m.tone, emotions: m.emotions || [], events: m.events || [],
    note: m.note || "", created_at: new Date(m.created || Date.now()).toISOString(),
  })));
}

async function syncBody(uid) {
  await sb.from("dk_body_metrics").delete().eq("user_id", uid);
  if (!DB.bodyMetrics.length) return;
  await sb.from("dk_body_metrics").insert(DB.bodyMetrics.map(b => ({
    id: b.id, user_id: uid, metric_date: b.date,
    weight: b.weight, waist: b.waist, chest: b.chest, hips: b.hips,
  })));
}

async function syncNutritionDiary(uid) {
  await sb.from("dk_nutrition_diary").delete().eq("user_id", uid);
  const n = DB.nutrition;
  if (!n || !n.diary) return;
  const rows = Object.entries(n.diary).map(([date, day]) => ({
    user_id: uid, diary_date: date,
    meals: day.meals || [], activity: day.activity || [],
  }));
  if (rows.length) await sb.from("dk_nutrition_diary").insert(rows);
}

async function syncNutritionProducts(uid) {
  await sb.from("dk_nutrition_products").delete().eq("user_id", uid);
  const products = DB.nutrition?.products?.filter(p => !p.builtin) || [];
  if (!products.length) return;
  await sb.from("dk_nutrition_products").insert(products.map(p => ({
    id: p.id, user_id: uid, name: p.name,
    kcal: p.kcal, protein: p.protein, carbs: p.carbs, fat: p.fat,
    emoji: p.emoji || "",
  })));
}

async function syncNutritionDishes(uid) {
  await sb.from("dk_nutrition_dishes").delete().eq("user_id", uid);
  const dishes = DB.nutrition?.dishes || [];
  if (!dishes.length) return;
  await sb.from("dk_nutrition_dishes").insert(dishes.map(d => ({
    id: d.id, user_id: uid, name: d.name, emoji: d.emoji || "🍽",
    total_grams: d.totalGrams || 400, portion_grams: d.portionGrams || 200,
    ingredients: d.ingredients || [],
  })));
}

async function syncNutritionGoal(uid) {
  const g = DB.nutrition?.goal;
  if (!g) return;
  await sb.from("dk_nutrition_goal").upsert({
    user_id: uid, kcal: g.kcal, protein: g.protein, carbs: g.carbs, fat: g.fat,
    preferences: DB.nutrition?.preferences || "",
  });
}

async function syncShopping(uid) {
  await sb.from("dk_shopping").delete().eq("user_id", uid);
  if (!DB.shopping.length) return;
  await sb.from("dk_shopping").insert(DB.shopping.map((g, i) => ({
    id: g.id, user_id: uid, group_name: g.group,
    items: g.items || [], sort_order: i,
  })));
}

async function syncDiaryEntries(uid) {
  await sb.from("dk_diary").delete().eq("user_id", uid);
  if (!DB.diary.length) return;
  await sb.from("dk_diary").insert(DB.diary.map(e => ({
    id: e.id, user_id: uid, title: e.title || "",
    body: e.text, tags: e.tags || [], photos: e.photos || [],
    created_at: new Date(e.created || Date.now()).toISOString(),
  })));
}

async function syncBirthdays(uid) {
  await sb.from("dk_birthdays").delete().eq("user_id", uid);
  if (!DB.birthdays.length) return;
  await sb.from("dk_birthdays").insert(DB.birthdays.map(b => ({
    id: b.id, user_id: uid, name: b.name, mmdd: b.mmdd, note: b.note || "",
  })));
}

/* =========================================================
   ПЕРЕХВАТ saveDB — добавляем синхронизацию с Supabase
   ========================================================= */

const _originalSaveDB = window.saveDB;

// Этот override применится после загрузки app.js
// (supabase-layer.js загружается ДО app.js, поэтому патчим через requestAnimationFrame)
window.__sbQueueSync = queueSync;

/* =========================================================
   МИГРАЦИЯ localStorage → Supabase (для новых пользователей)
   ========================================================= */
async function migrateLocalStorageToSupabase() {
  // Если в localStorage есть реальные данные (не дефолтные) — переносим
  const raw = localStorage.getItem("DAYKEEPER_DB_V1");
  if (!raw) return;
  try {
    const local = JSON.parse(raw);
    // Проверяем что данные не дефолтные (есть хоть одна настоящая задача)
    if (!local.tasks || local.tasks.length === 0) return;
    // Мерджим — данные localStorage становятся данными в Supabase
    Object.assign(DB, local);
    await flushSync();
    console.log("DayKeeper: данные из localStorage перенесены в Supabase");
  } catch (e) {
    console.error("Ошибка миграции:", e);
  }
}

/* =========================================================
   ЗАПУСК — проверяем сессию при загрузке
   ========================================================= */
(async function init() {
  // Сначала показываем приложение из кэша (localStorage) пока грузится Supabase
  const { data: { session } } = await sb.auth.getSession();

  if (session) {
    showAppScreen(session.user);
    await loadAllDataFromSupabase();
  } else {
    showAuthScreen();
  }

  // Слушаем изменения сессии (logout из другой вкладки)
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" && session) {
      showAppScreen(session.user);
      await loadAllDataFromSupabase();
    }
    if (event === "SIGNED_OUT") {
      showAuthScreen();
    }
  });
})();
