/* =========================================================
   DAYKEEPER — supabase-layer.js  v2
   Авторизация + синхронизация с Supabase.
   Подключается ПЕРЕД app.js.
   ========================================================= */

const SUPABASE_URL  = "https://cnzhzycjcndktcmlprky.supabase.co";
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

  if (!document.getElementById("topbarUser")) {
    const topbar = document.querySelector(".topbar");
    if (topbar) {
      const el = document.createElement("div");
      el.className = "topbar-user"; el.id = "topbarUser";
      el.innerHTML = `<span class="topbar-email">${user.email}</span><button class="topbar-logout" id="logoutBtn">Выйти</button>`;
      topbar.appendChild(el);
      document.getElementById("logoutBtn").addEventListener("click", async () => {
        // Убедимся что всё сохранено перед выходом
        await flushSync();
        await sb.auth.signOut();
        currentUser = null;
        document.getElementById("topbarUser").remove();
        showAuthScreen();
      });
    }
  }
}

document.getElementById("authLoginBtn").addEventListener("click", async () => {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const errEl = document.getElementById("authError");
  errEl.style.display = "none";
  if (!email || !password) { errEl.textContent = "Введи email и пароль"; errEl.style.display = "block"; return; }
  const btn = document.getElementById("authLoginBtn");
  btn.textContent = "Входим..."; btn.disabled = true;
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  btn.textContent = "Войти"; btn.disabled = false;
  if (error) {
    errEl.textContent = error.message === "Invalid login credentials" ? "Неверный email или пароль" : error.message;
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
  if (!email || !password) { errEl.textContent = "Введи email и пароль"; errEl.style.display = "block"; return; }
  if (password.length < 6) { errEl.textContent = "Пароль минимум 6 символов"; errEl.style.display = "block"; return; }
  const btn = document.getElementById("authRegisterBtn");
  btn.textContent = "Создаём..."; btn.disabled = true;
  const { data, error } = await sb.auth.signUp({ email, password });
  btn.textContent = "Создать аккаунт"; btn.disabled = false;
  if (error) { errEl.textContent = error.message; errEl.style.display = "block"; return; }
  if (data.user && !data.session) {
    errEl.style.cssText = "display:block;background:rgba(185,222,199,.25);border-color:rgba(185,222,199,.6);color:#19463a";
    errEl.textContent = "Проверь email — пришло письмо для подтверждения";
    return;
  }
  showAppScreen(data.user);
  await loadAllDataFromSupabase();
});

document.getElementById("authPassword").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("authLoginBtn").click();
});

/* =========================================================
   ЗАГРУЗКА ИЗ SUPABASE
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

    // Задачи
    if (tasks.data) DB.tasks = tasks.data.map(t => ({
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
    if (habits.data) DB.habits = habits.data.map(h => ({
      id: h.id, name: h.name, icon: h.icon || "🌿",
      log: logsByHabit[h.id] || {}, created: new Date(h.created_at).getTime(),
    }));

    // Рутина
    if (routines.data) DB.routines = routines.data.map(r => ({
      id: r.id, title: r.title, type: r.type,
      time: r.time || "", weekdays: r.weekdays || [],
      daypart: r.daypart || "", everyDays: r.every_days || 1,
      lastDone: r.last_done || null,
    }));

    // Эмоции
    if (moods.data) DB.moodEntries = moods.data.map(m => ({
      id: m.id, date: m.entry_date, time: m.entry_time || "",
      tone: m.tone, emotions: m.emotions || [], events: m.events || [],
      note: m.note || "", created: new Date(m.created_at).getTime(),
    }));

    // Параметры тела
    if (body.data) DB.bodyMetrics = body.data.map(b => ({
      id: b.id, date: b.metric_date,
      weight: b.weight, waist: b.waist, chest: b.chest, hips: b.hips,
    }));

    // Питание
    if (!DB.nutrition) DB.nutrition = { goal: {kcal:1500,protein:105,carbs:160,fat:55}, apiKey: "", preferences: "", diary: {}, dishes: [], products: [] };
    DB.nutrition.diary = {};
    DB.calorieLog = {};
    (nutritionDiary.data || []).forEach(d => {
      const meals = Array.isArray(d.meals) ? d.meals : (d.meals ? Object.values(d.meals) : []);
      const activity = Array.isArray(d.activity) ? d.activity : (d.activity ? Object.values(d.activity) : []);
      DB.nutrition.diary[d.diary_date] = { meals, activity };
      const kcal = meals.reduce((s, m) => s + (Number(m.kcal)||0), 0);
      const burned = activity.reduce((s, a) => s + (Number(a.kcal)||0), 0);
      DB.calorieLog[d.diary_date] = { eaten: kcal, burned, meals };
    });

    if (nutritionProducts.data) DB.nutrition.products = nutritionProducts.data.map(p => ({
      id: p.id, name: p.name, kcal: p.kcal, protein: p.protein,
      carbs: p.carbs, fat: p.fat, emoji: p.emoji || "", builtin: false,
    }));

    if (nutritionDishes.data) DB.nutrition.dishes = nutritionDishes.data.map(d => ({
      id: d.id, name: d.name, emoji: d.emoji || "🍽",
      totalGrams: d.total_grams, portionGrams: d.portion_grams,
      ingredients: d.ingredients || [],
    }));

    if (nutritionGoal.data) {
      DB.nutrition.goal = { kcal: nutritionGoal.data.kcal, protein: nutritionGoal.data.protein, carbs: nutritionGoal.data.carbs, fat: nutritionGoal.data.fat };
      DB.nutrition.preferences = nutritionGoal.data.preferences || "";
    }

    // Покупки
    if (shopping.data) DB.shopping = shopping.data.map(g => ({
      id: g.id, group: g.group_name, items: g.items || [],
    }));

    // Дневник
    if (diary.data) DB.diary = diary.data.map(e => ({
      id: e.id, title: e.title || "", text: e.body,
      tags: e.tags || [], photos: e.photos || [],
      created: new Date(e.created_at).getTime(),
    }));

    // Дни рождения
    if (birthdays.data) DB.birthdays = birthdays.data.map(b => ({
      id: b.id, name: b.name, mmdd: b.mmdd, note: b.note || "",
    }));

    // Сохраняем как кэш и рендерим
    if (typeof saveDB === "function") saveDB();
    rerenderAll();
    console.log("[DK] Данные загружены из Supabase");

  } catch (err) {
    console.error("[DK] Ошибка загрузки из Supabase:", err);
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
}

/* =========================================================
   СИНХРОНИЗАЦИЯ В SUPABASE — upsert, не delete+insert
   ========================================================= */

const syncQueue = new Set();
let syncTimer = null;
let isSyncing = false;

// Экспортируем для app.js
window.__sbQueueSync = function(type) {
  if (!currentUser) return;
  syncQueue.add(type);
  clearTimeout(syncTimer);
  syncTimer = setTimeout(flushSync, 1000);
};

async function flushSync() {
  if (!currentUser || isSyncing) return;
  isSyncing = true;
  const uid = currentUser.id;
  const types = [...syncQueue];
  syncQueue.clear();

  for (const type of types) {
    try {
      console.log("[DK] syncing:", type);
      if (type === "tasks")              await syncTasks(uid);
      if (type === "habits")             await syncHabits(uid);
      if (type === "routines")           await syncRoutines(uid);
      if (type === "mood")               await syncMood(uid);
      if (type === "body")               await syncBody(uid);
      if (type === "nutrition_diary")    await syncNutritionDiary(uid);
      if (type === "nutrition_products") await syncNutritionProducts(uid);
      if (type === "nutrition_dishes")   await syncNutritionDishes(uid);
      if (type === "nutrition_goal")     await syncNutritionGoal(uid);
      if (type === "shopping")           await syncShopping(uid);
      if (type === "diary")              await syncDiaryEntries(uid);
      if (type === "birthdays")          await syncBirthdays(uid);
      console.log("[DK] synced:", type);
    } catch (e) {
      console.error("[DK] sync error " + type + ":", e);
      // Вернуть в очередь при ошибке
      syncQueue.add(type);
    }
  }
  isSyncing = false;

  // Если в очереди появились новые — повторим
  if (syncQueue.size > 0) {
    syncTimer = setTimeout(flushSync, 2000);
  }
}

/* ---- Каждый тип — upsert по id ---- */

async function syncTasks(uid) {
  // Удаляем удалённые, upsert существующие
  const { data: existing } = await sb.from("dk_tasks").select("id").eq("user_id", uid);
  const existingIds = new Set((existing||[]).map(r=>r.id));
  const currentIds = new Set(DB.tasks.map(t=>t.id));
  // Удаляем то чего нет в DB
  const toDelete = [...existingIds].filter(id => !currentIds.has(id));
  if (toDelete.length) await sb.from("dk_tasks").delete().in("id", toDelete);
  // Upsert всего что есть
  if (DB.tasks.length) {
    await sb.from("dk_tasks").upsert(DB.tasks.map(t => ({
      id: t.id, user_id: uid, title: t.title, description: t.desc || "",
      date: t.date || null, time: t.time || "", tag: t.tag || "Личное",
      done: t.done, created_at: new Date(t.created || Date.now()).toISOString(),
    })));
  }
}

async function syncHabits(uid) {
  // Upsert habits
  if (DB.habits.length) {
    await sb.from("dk_habits").upsert(DB.habits.map(h => ({
      id: h.id, user_id: uid, name: h.name, icon: h.icon || "🌿",
      created_at: new Date(h.created || Date.now()).toISOString(),
    })));
  }
  // Habit logs: delete all for user then reinsert (logs are small)
  await sb.from("dk_habit_logs").delete().eq("user_id", uid);
  const logs = [];
  DB.habits.forEach(h => {
    Object.keys(h.log || {}).forEach(date => {
      if (h.log[date]) logs.push({ habit_id: h.id, user_id: uid, log_date: date });
    });
  });
  if (logs.length) await sb.from("dk_habit_logs").insert(logs);
}

async function syncRoutines(uid) {
  const { data: existing } = await sb.from("dk_routines").select("id").eq("user_id", uid);
  const existingIds = new Set((existing||[]).map(r=>r.id));
  const currentIds = new Set(DB.routines.map(r=>r.id));
  const toDelete = [...existingIds].filter(id => !currentIds.has(id));
  if (toDelete.length) await sb.from("dk_routines").delete().in("id", toDelete);
  if (DB.routines.length) {
    await sb.from("dk_routines").upsert(DB.routines.map(r => ({
      id: r.id, user_id: uid, title: r.title, type: r.type,
      time: r.time || "", weekdays: r.weekdays || [],
      daypart: r.daypart || "", every_days: r.everyDays || 1,
      last_done: r.lastDone || null,
    })));
  }
}

async function syncMood(uid) {
  const { data: existing } = await sb.from("dk_mood_entries").select("id").eq("user_id", uid);
  const existingIds = new Set((existing||[]).map(r=>r.id));
  const currentIds = new Set(DB.moodEntries.map(m=>m.id));
  const toDelete = [...existingIds].filter(id => !currentIds.has(id));
  if (toDelete.length) await sb.from("dk_mood_entries").delete().in("id", toDelete);
  if (DB.moodEntries.length) {
    await sb.from("dk_mood_entries").upsert(DB.moodEntries.map(m => ({
      id: m.id, user_id: uid, entry_date: m.date, entry_time: m.time || "",
      tone: m.tone, emotions: m.emotions || [], events: m.events || [],
      note: m.note || "", created_at: new Date(m.created || Date.now()).toISOString(),
    })));
  }
}

async function syncBody(uid) {
  if (DB.bodyMetrics.length) {
    await sb.from("dk_body_metrics").upsert(DB.bodyMetrics.map(b => ({
      id: b.id, user_id: uid, metric_date: b.date,
      weight: b.weight, waist: b.waist, chest: b.chest, hips: b.hips,
    })));
  }
}

async function syncNutritionDiary(uid) {
  const n = DB.nutrition;
  if (!n?.diary) return;
  const rows = Object.entries(n.diary).map(([date, day]) => ({
    user_id: uid, diary_date: date,
    meals: day.meals || [], activity: day.activity || [],
  }));
  if (rows.length) {
    await sb.from("dk_nutrition_diary").upsert(rows, { onConflict: "user_id,diary_date" });
  }
}

async function syncNutritionProducts(uid) {
  const products = DB.nutrition?.products?.filter(p => !p.builtin) || [];
  if (!products.length) return;
  const { data: existing } = await sb.from("dk_nutrition_products").select("id").eq("user_id", uid);
  const existingIds = new Set((existing||[]).map(r=>r.id));
  const currentIds = new Set(products.map(p=>p.id));
  const toDelete = [...existingIds].filter(id => !currentIds.has(id));
  if (toDelete.length) await sb.from("dk_nutrition_products").delete().in("id", toDelete);
  await sb.from("dk_nutrition_products").upsert(products.map(p => ({
    id: p.id, user_id: uid, name: p.name,
    kcal: p.kcal, protein: p.protein, carbs: p.carbs, fat: p.fat, emoji: p.emoji || "",
  })));
}

async function syncNutritionDishes(uid) {
  const dishes = DB.nutrition?.dishes || [];
  const { data: existing } = await sb.from("dk_nutrition_dishes").select("id").eq("user_id", uid);
  const existingIds = new Set((existing||[]).map(r=>r.id));
  const currentIds = new Set(dishes.map(d=>d.id));
  const toDelete = [...existingIds].filter(id => !currentIds.has(id));
  if (toDelete.length) await sb.from("dk_nutrition_dishes").delete().in("id", toDelete);
  if (dishes.length) {
    await sb.from("dk_nutrition_dishes").upsert(dishes.map(d => ({
      id: d.id, user_id: uid, name: d.name, emoji: d.emoji || "🍽",
      total_grams: d.totalGrams || 400, portion_grams: d.portionGrams || 200,
      ingredients: d.ingredients || [],
    })));
  }
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
  const { data: existing } = await sb.from("dk_shopping").select("id").eq("user_id", uid);
  const existingIds = new Set((existing||[]).map(r=>r.id));
  const currentIds = new Set(DB.shopping.map(g=>g.id));
  const toDelete = [...existingIds].filter(id => !currentIds.has(id));
  if (toDelete.length) await sb.from("dk_shopping").delete().in("id", toDelete);
  if (DB.shopping.length) {
    await sb.from("dk_shopping").upsert(DB.shopping.map((g, i) => ({
      id: g.id, user_id: uid, group_name: g.group, items: g.items || [], sort_order: i,
    })));
  }
}

async function syncDiaryEntries(uid) {
  const { data: existing } = await sb.from("dk_diary").select("id").eq("user_id", uid);
  const existingIds = new Set((existing||[]).map(r=>r.id));
  const currentIds = new Set(DB.diary.map(e=>e.id));
  const toDelete = [...existingIds].filter(id => !currentIds.has(id));
  if (toDelete.length) await sb.from("dk_diary").delete().in("id", toDelete);
  if (DB.diary.length) {
    await sb.from("dk_diary").upsert(DB.diary.map(e => ({
      id: e.id, user_id: uid, title: e.title || "", body: e.text,
      tags: e.tags || [],
      photos: [], // не храним base64 фото в Supabase — слишком большие
      created_at: new Date(e.created || Date.now()).toISOString(),
    })));
  }
}

async function syncBirthdays(uid) {
  const { data: existing } = await sb.from("dk_birthdays").select("id").eq("user_id", uid);
  const existingIds = new Set((existing||[]).map(r=>r.id));
  const currentIds = new Set(DB.birthdays.map(b=>b.id));
  const toDelete = [...existingIds].filter(id => !currentIds.has(id));
  if (toDelete.length) await sb.from("dk_birthdays").delete().in("id", toDelete);
  if (DB.birthdays.length) {
    await sb.from("dk_birthdays").upsert(DB.birthdays.map(b => ({
      id: b.id, user_id: uid, name: b.name, mmdd: b.mmdd, note: b.note || "",
    })));
  }
}

/* =========================================================
   ЗАПУСК
   ========================================================= */
(async function init() {
  const { data: { session } } = await sb.auth.getSession();

  if (session) {
    showAppScreen(session.user);
    await loadAllDataFromSupabase();
  } else {
    showAuthScreen();
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" && session) {
      showAppScreen(session.user);
      await loadAllDataFromSupabase();
    }
    if (event === "SIGNED_OUT") {
      showAuthScreen();
    }
  });

  // Синхронизировать перед закрытием вкладки
  window.addEventListener("beforeunload", () => {
    if (syncQueue.size > 0) flushSync();
  });

  // Синхронизировать при возврате в вкладку (после сна телефона)
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible" && currentUser) {
      // Сначала дошлём несохранённое, потом обновим из базы
      if (syncQueue.size > 0) await flushSync();
      await loadAllDataFromSupabase();
    }
  });
})();
