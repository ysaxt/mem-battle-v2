// ============================================================
// ОБЩИЕ ДАННЫЕ — SUPABASE
// Авторизация и данные пользователей хранятся в Supabase.
// ============================================================

const MEMES_LIST = [
  'mems/0f5ce2392fc603d02638edea09a70031.jpg',
  'mems/12d0d46bd80e742144041c2c7f11301c.jpg',
  'mems/65723f34069914a6f45e69251ae28cc7.jpg',
  'mems/6d24d268bd764a1831c6256b76f0ceb8.png',
  'mems/7e81fdd4ff4f47c3b57a2adf44ca8f4b.jpg',
  'mems/afaafda54bb6a0ed582a6fe108119a93.jpg',
  'mems/i.webp',
  'mems/mem1.jpg',
  'mems/mem2.jpg',
  'mems/mem3.jpg',
  'mems/mem4.jpg',
  'mems/mem5.jpg',
  'mems/mem6.jpg',
  'mems/oar2.jpg'
];

let supabase = null;
let currentUser = null;
let currentUserData = null;
let usersCache = {};
let appInitialized = false;
let authReadyPromise = null;

function technicalEmail(login) {
  return `${String(login).trim().toLowerCase()}@mem-battle.local`;
}

function defaultProfile(login) {
  return {
    login,
    balance: 1000,
    history: [],
    memes: MEMES_LIST.map(path => ({ path, wins: 0 })),
    pending: [],
    is_admin: false
  };
}

function rowToData(row) {
  return {
    id: row.id,
    login: row.login,
    balance: Number(row.balance ?? 1000),
    history: Array.isArray(row.history) ? row.history : [],
    memes: Array.isArray(row.memes) ? row.memes : [],
    pending: Array.isArray(row.pending) ? row.pending : [],
    is_admin: !!row.is_admin
  };
}

async function initializeApp() {
  if (authReadyPromise) return authReadyPromise;

  authReadyPromise = (async () => {
    try {
      if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        console.error('Supabase не настроен: проверьте supabase-config.js');
        appInitialized = true;
        return false;
      }

      supabase = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false
          }
        }
      );

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Ошибка получения сессии:', error);
      }

      if (data?.session?.user) {
        await loadCurrentProfile(data.session.user.id);
      } else {
        currentUser = null;
        currentUserData = null;
      }

      supabase.auth.onAuthStateChange((_event, session) => {
        // Не делаем тяжёлый запрос прямо внутри callback Supabase.
        setTimeout(async () => {
          if (session?.user) {
            await loadCurrentProfile(session.user.id);
          } else {
            currentUser = null;
            currentUserData = null;
            usersCache = {};
          }
        }, 0);
      });

      appInitialized = true;
      return !!currentUser;
    } catch (error) {
      console.error('Ошибка инициализации приложения:', error);
      supabase = null;
      currentUser = null;
      currentUserData = null;
      appInitialized = true;
      return false;
    }
  })();

  return authReadyPromise;
}

async function loadCurrentProfile(id) {
  if (!supabase || !id) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Ошибка загрузки профиля:', error);
    currentUser = null;
    currentUserData = null;
    return null;
  }

  // Сессия есть, но строки profiles нет. Не показываем «неизвестного» пользователя.
  if (!data) {
    console.warn('Для текущего аккаунта профиль не найден. Выполняем выход.');
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.error('Ошибка выхода:', e);
    }
    currentUser = null;
    currentUserData = null;
    usersCache = {};
    return null;
  }

  currentUserData = rowToData(data);
  currentUser = currentUserData.login;
  usersCache[currentUser] = currentUserData;

  // Профили, созданные старой версией триггера, могли иметь пустой список мемов.
  if (currentUserData.memes.length === 0) {
    currentUserData.memes = MEMES_LIST.map(path => ({ path, wins: 0 }));
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({ memes: currentUserData.memes })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (!updateError && updated) {
      currentUserData = rowToData(updated);
      currentUser = currentUserData.login;
    } else if (updateError) {
      console.error('Не удалось добавить стандартные мемы:', updateError);
    }
  }

  usersCache[currentUser] = currentUserData;
  return currentUserData;
}

function getCurrentUser() {
  return currentUser;
}

function getCurrentUserData() {
  return currentUserData;
}

function isAdmin() {
  return !!currentUserData?.is_admin;
}

async function loginUser(login, password) {
  if (!supabase) return { success: false, message: 'Supabase не настроен.' };

  login = String(login).trim();
  if (!login || !password) return { success: false, message: 'Заполните все поля.' };

  const { data, error } = await supabase.auth.signInWithPassword({
    email: technicalEmail(login),
    password
  });

  if (error || !data?.user) {
    console.error('Ошибка входа:', error);
    return { success: false, message: 'Неверный логин или пароль.' };
  }

  const profile = await loadCurrentProfile(data.user.id);
  if (!profile) {
    return { success: false, message: 'Аккаунт найден, но профиль не найден. Выполнен выход.' };
  }

  return { success: true };
}

async function registerUser(login, password) {
  if (!supabase) return { success: false, message: 'Supabase не настроен.' };

  login = String(login).trim();
  if (login.length < 3) return { success: false, message: 'Логин должен содержать минимум 3 символа.' };
  if (password.length < 4) return { success: false, message: 'Пароль должен содержать минимум 4 символа.' };
  if (!/^[a-zA-Z0-9_-]+$/.test(login)) {
    return { success: false, message: 'Логин: только латинские буквы, цифры, _ и -.' };
  }

  const { data, error } = await supabase.auth.signUp({
    email: technicalEmail(login),
    password,
    options: { data: { login } }
  });

  if (error) {
    console.error('Ошибка регистрации:', error);
    const msg = String(error.message || '').toLowerCase();
    if (msg.includes('already') || msg.includes('registered')) {
      return { success: false, message: 'Такой логин уже занят.' };
    }
    return { success: false, message: error.message || 'Ошибка регистрации.' };
  }

  // При выключенном Confirm email Supabase сразу возвращает session.
  if (!data?.user || !data?.session) {
    return {
      success: false,
      message: 'Регистрация создана, но автоматический вход не выполнен. В Supabase выключите Confirm email.'
    };
  }

  const profile = await loadCurrentProfile(data.user.id);
  if (!profile) {
    return { success: false, message: 'Регистрация создана, но профиль не найден.' };
  }

  return { success: true };
}

async function logoutUser() {
  currentUser = null;
  currentUserData = null;
  usersCache = {};

  if (!supabase) return { success: true };

  try {
    // scope: local удаляет локальную сессию именно этого браузера.
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      console.error('Ошибка выхода из Supabase:', error);
      return { success: false, message: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('Ошибка выхода:', error);
    return { success: false, message: error.message || 'Ошибка выхода' };
  }
}

async function requireAuth(redirect = 'login.html') {
  await initializeApp();
  if (!getCurrentUser() || !getCurrentUserData()) {
    window.location.replace(redirect);
    return false;
  }
  return true;
}

function setupLogoutButton(id = 'logoutBtn') {
  const button = document.getElementById(id);
  if (!button || button.dataset.logoutReady === '1') return;
  button.dataset.logoutReady = '1';
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Выходим…';
    await logoutUser();
    // Небольшая задержка позволяет Supabase завершить удаление локальной сессии.
    window.location.replace('login.html?logged_out=1');
  });
}

async function saveCurrentUserData() {
  if (!supabase || !currentUserData?.id) return { success: false };

  const payload = {
    balance: currentUserData.balance,
    history: currentUserData.history || [],
    memes: currentUserData.memes || [],
    pending: currentUserData.pending || []
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', currentUserData.id)
    .select('*')
    .maybeSingle();

  if (!error && data) {
    currentUserData = rowToData(data);
    currentUser = currentUserData.login;
    usersCache[currentUser] = currentUserData;
    return { success: true };
  }

  console.error('Ошибка сохранения профиля:', error);
  return { success: false, message: error?.message };
}

async function getUsersDataAsync() {
  if (!supabase) return {};

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at');

  if (error) {
    console.error('Ошибка загрузки пользователей:', error);
    return {};
  }

  usersCache = Object.fromEntries((data || []).map(row => [row.login, rowToData(row)]));
  if (currentUser && usersCache[currentUser]) currentUserData = usersCache[currentUser];
  return usersCache;
}

function getUsersData() {
  return usersCache;
}

async function saveUsersData(usersData) {
  if (!supabase || !isAdmin()) return { success: false };

  for (const data of Object.values(usersData)) {
    if (!data.id) continue;
    await supabase
      .from('profiles')
      .update({
        balance: data.balance,
        history: data.history || [],
        memes: data.memes || [],
        pending: data.pending || []
      })
      .eq('id', data.id);
  }

  await getUsersDataAsync();
  return { success: true };
}

function updateBalanceHeader() {
  const el = document.getElementById('headerBalance');
  if (el) el.textContent = `🪙 ${currentUserData ? currentUserData.balance : 0}`;
}

function getMemesByTier(data, tier) {
  const sorted = [...(data?.memes || [])].sort((a, b) => Number(a.wins || 0) - Number(b.wins || 0));
  const total = sorted.length;
  if (!total) return [];

  const q = Math.floor(total / 4);
  if (!q) return sorted;

  const ranges = {
    low: [0, q],
    mid: [q, q * 2],
    high: [q * 2, q * 3],
    top: [q * 3, total]
  };
  const r = ranges[tier] || [0, total];
  return sorted.slice(r[0], r[1]);
}

function getRandomMemeFromTier(data, tier) {
  const pool = getMemesByTier(data, tier);
  const source = pool.length ? pool : (data?.memes || []);
  return source.length ? source[Math.floor(Math.random() * source.length)] : null;
}

function renderHistory(history) {
  const list = document.getElementById('historyList');
  if (!list) return;
  if (!history?.length) {
    list.innerHTML = '<p style="color:#666;">Пока нет операций</p>';
    return;
  }
  list.innerHTML = history.map(text => `<p>${String(text)}</p>`).join('');
  list.scrollTop = list.scrollHeight;
}

async function renderTop() {
  const tbody = document.getElementById('topBody');
  if (!tbody) return;
  const users = await getUsersDataAsync();
  const all = Object.values(users)
    .map(u => ({ name: u.login, balance: Number(u.balance) }))
    .sort((a, b) => b.balance - a.balance);
  tbody.innerHTML = all.map((p, i) =>
    `<tr><td class="rank">${i + 1}</td><td class="name">${p.name}</td><td class="score">🪙 ${p.balance}</td></tr>`
  ).join('');
}

function renderPending(data) {
  const c = document.getElementById('pendingList');
  if (!c) return;
  if (!data?.pending?.length) {
    c.innerHTML = '<p style="color:#666;">Нет мемов на модерации.</p>';
    return;
  }
  c.innerHTML = '';
  data.pending.forEach((item, index) => {
    const d = document.createElement('div');
    d.className = 'pending-item';
    d.innerHTML = `
      <img src="${item.path}" alt="мем" onerror="this.style.opacity='0.4'">
      <span style="flex:1;word-break:break-all;">${item.path}</span>
      <div class="actions">
        <button class="accept" onclick="acceptMeme(${index})">✅ Принять</button>
        <button class="reject" onclick="rejectMeme(${index})">❌ Отклонить</button>
      </div>`;
    c.appendChild(d);
  });
}

async function acceptMeme(index) {
  if (!isAdmin()) return;
  const data = currentUserData;
  const item = data?.pending?.[index];
  if (!item) return;
  data.memes.push({ path: item.path, wins: 0 });
  data.pending.splice(index, 1);
  await saveCurrentUserData();
  renderPending(data);
}

async function rejectMeme(index) {
  if (!isAdmin()) return;
  const data = currentUserData;
  if (!data?.pending?.[index]) return;
  data.pending.splice(index, 1);
  await saveCurrentUserData();
  renderPending(data);
}

async function submitMeme() {
  const input = document.getElementById('memeUrl');
  const msg = document.getElementById('submitMessage');
  const data = currentUserData;
  if (!data) {
    msg.textContent = '⚠️ Вы не авторизованы.';
    return;
  }
  const url = input.value.trim();
  if (!url) {
    msg.textContent = '⚠️ Введите ссылку на картинку.';
    return;
  }
  if (data.memes.some(m => m.path === url) || data.pending.some(p => p.path === url)) {
    msg.textContent = '⚠️ Такой мем уже есть или он уже на модерации.';
    return;
  }
  data.pending.push({ path: url });
  const result = await saveCurrentUserData();
  if (!result.success) {
    msg.textContent = '⚠️ Не удалось сохранить мем.';
    return;
  }
  msg.textContent = '✅ Мем отправлен на модерацию!';
  msg.style.color = '#88ff88';
  input.value = '';
  renderPending(data);
}

// Старые функции админки оставлены совместимыми с HTML, но пароли никогда не показываются.
async function renderUserManagement() {
  const c = document.getElementById('userManagement');
  if (!c) return;
  if (!isAdmin()) {
    c.innerHTML = '<p style="color:#ff6666;">Доступ запрещён.</p>';
    return;
  }

  const users = await getUsersDataAsync();
  let html = '<div style="background:#1a1a2e;border-radius:10px;padding:20px;margin:20px 0;overflow-x:auto;">';
  html += '<h3 style="color:#ffd700;">👥 Пользователи</h3>';
  html += '<table style="width:100%;border-collapse:collapse;color:#fff;"><thead><tr style="background:#2a2a4e;">';
  html += '<th style="padding:12px;border:1px solid #333;text-align:left;">Логин</th>';
  html += '<th style="padding:12px;border:1px solid #333;text-align:left;">Баланс</th>';
  html += '<th style="padding:12px;border:1px solid #333;text-align:left;">Мемов</th>';
  html += '<th style="padding:12px;border:1px solid #333;text-align:left;">На модерации</th>';
  html += '<th style="padding:12px;border:1px solid #333;text-align:left;">История</th>';
  html += '<th style="padding:12px;border:1px solid #333;">Роль</th></tr></thead><tbody>';

  for (const [login, d] of Object.entries(users)) {
    html += `<tr>
      <td style="padding:10px;border:1px solid #333;">${login}</td>
      <td style="padding:10px;border:1px solid #333;">🪙 ${d.balance}</td>
      <td style="padding:10px;border:1px solid #333;">${d.memes.length}</td>
      <td style="padding:10px;border:1px solid #333;">${d.pending.length}</td>
      <td style="padding:10px;border:1px solid #333;">${d.history.length}</td>
      <td style="padding:10px;border:1px solid #333;">${d.is_admin ? '👑 Админ' : '👤 Пользователь'}</td>
    </tr>`;
  }

  html += '</tbody></table></div>';
  c.innerHTML = html;
}

function getUsersList() {
  return Object.values(usersCache).map(d => ({
    login: d.login,
    balance: d.balance,
    memesCount: d.memes.length,
    pendingCount: d.pending.length,
    historyCount: d.history.length
  }));
}

function showAllUserPasswords() {
  alert('Пароли не хранятся в открытом виде и не могут быть показаны администратору.');
}

function debugShowAllPasswords() {
  console.table(getUsersList());
}

async function clearAllUserData() {
  alert('Массовое удаление пользователей из публичного JavaScript отключено.');
}

async function addUserByAdmin() {
  alert('Создание пользователей администратором выполняется через безопасный серверный механизм.');
  return { success: false };
}

function addUserForm() {
  const f = document.getElementById('addUserForm');
  if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

async function addUserFromForm() {
  alert('Используйте обычную регистрацию на странице входа.');
}

async function changeUserBalance(login, amount) {
  if (!isAdmin() || !supabase) return { success: false };
  const d = usersCache[login];
  if (!d) return { success: false, message: 'Пользователь не найден' };
  d.balance = Math.max(0, Number(d.balance) + Number(amount));
  const { error } = await supabase.from('profiles').update({ balance: d.balance }).eq('id', d.id);
  if (error) return { success: false, message: error.message };
  await renderUserManagement();
  return { success: true };
}

async function exportUsersData() {
  if (!isAdmin()) return;
  const users = await getUsersDataAsync();
  const blob = new Blob([JSON.stringify(users, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `users_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importUsersData() {
  alert('Импорт пользователей через браузер отключён.');
}

function showSimpleUserTable() {
  renderUserManagement();
}

function showAllLogins() {
  alert(Object.keys(usersCache).join('\n') || 'Нет пользователей');
}

function showUserWithPassword() {
  alert('Пароли недоступны в открытом виде.');
}

function copyUserPassword() {
  alert('Пароли недоступны в открытом виде.');
}

function autoShowAdminPanel() {
  if (isAdmin()) {
    document.getElementById('adminPanel')?.style.setProperty('display', 'block');
    renderUserManagement();
  }
}

function getAdminsList() {
  return Object.values(usersCache).filter(u => u.is_admin).map(u => u.login);
}

async function renderAdminManagement() {
  const c = document.getElementById('adminManagement');
  if (!c || !isAdmin()) return;
  const users = await getUsersDataAsync();
  const admins = Object.values(users).filter(u => u.is_admin).map(u => u.login);
  c.innerHTML = `<div style="background:#1a1a2e;border-radius:10px;padding:15px;margin:10px 0;">
    <h3 style="color:#ffd700;">👑 Администраторы</h3>
    <p style="color:#aaa;">${admins.length ? admins.join(', ') : 'нет'}</p>
    <p style="color:#888;">Роль администратора назначается через SQL в Supabase.</p>
  </div>`;
}

function addAdmin() {
  alert('Назначение администратора выполняется через SQL в Supabase.');
  return { success: false };
}

function removeAdmin() {
  return { success: false, message: 'Операция доступна через безопасную серверную настройку.' };
}

function isUserAdmin(login) {
  return !!usersCache[login]?.is_admin;
}

function updateNavigation() {
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin() ? '' : 'none';
  });
}
