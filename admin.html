<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Мем Битва – Админ</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
<div class="app">
  <header class="header">
    <div class="logo">
      <h1>⚡ Мем Битва</h1>
      <span id="userGreeting">рейтинг + модерация</span>
    </div>
    <div style="display:flex; align-items:center; gap:16px;">
      <div class="balance-box" id="headerBalance">🪙 500</div>
      <button id="logoutBtn" style="background:#cc3333; border:none; padding:6px 16px; border-radius:40px; font-weight:700; color:#fff; cursor:pointer;">Выйти</button>
    </div>
  </header>

  <div class="tabs">
    <a href="index.html" class="tab-btn">🏆 Битвы</a>
    <a href="profile.html" class="tab-btn">👤 Профиль</a>
    <a href="top.html" class="tab-btn">📊 Топ</a>
    <a href="submit.html" class="tab-btn">📤 Отправить мем</a>
    <a href="admin.html" class="tab-btn active">🛡️ Админ</a>
  </div>


  <!-- Админ-панель управления пользователями -->
  <div id="adminPanel" style="display: none; margin: 20px 0; padding: 20px; background: #1a1a2e; border-radius: 10px; border: 2px solid #ffd700;">
    <h2 style="color: #ffd700;">👑 Админ-панель</h2>

    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin: 15px 0;">
      <button onclick="renderUserManagement()" style="background: #4a4a8a; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">📊 Показать всех пользователей</button>
      <button onclick="showAllUserPasswords()" style="background: #8a2a2a; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">🔓 Показать все пароли</button>
      <button onclick="showSimpleUserTable()" style="background: #6a4a8a; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">📋 Простая таблица с паролями</button>
      <button onclick="renderAdminManagement()" style="background: #6a4a8a; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">👑 Управление администраторами</button>
      <button onclick="exportUsersData()" style="background: #2a6a4a; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">💾 Скачать данные пользователей</button>
      <button onclick="importUsersData()" style="background: #6a4a2a; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">📤 Загрузить данные пользователей</button>
      <button onclick="addUserForm()" style="background: #2a8a4a; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">➕ Добавить пользователя</button>
      <button onclick="clearAllUserData()" style="background: #8a2a2a; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">🗑️ Очистить всех пользователей</button>
      <button onclick="debugShowAllPasswords()" style="background: #2a2a6a; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">🖥️ Показать в консоли (F12)</button>
    </div>

    <div id="userManagement"></div>
    <div id="adminManagement"></div>

    <div id="addUserForm" style="display: none; margin: 15px 0; padding: 20px; background: #2a2a4e; border-radius: 8px;">
      <h4 style="color: #88ff88;">Добавление нового пользователя</h4>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <input type="text" id="newUserLogin" placeholder="Логин" style="padding: 8px; border-radius: 5px; border: 1px solid #666; background: #1a1a2e; color: white;">
        <input type="text" id="newUserPassword" placeholder="Пароль" style="padding: 8px; border-radius: 5px; border: 1px solid #666; background: #1a1a2e; color: white;">
        <input type="number" id="newUserBalance" placeholder="Баланс" value="1000" style="padding: 8px; border-radius: 5px; border: 1px solid #666; background: #1a1a2e; color: white; width: 100px;">
        <button onclick="addUserFromForm()" style="background: #2a8a4a; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">✅ Добавить</button>
        <button onclick="document.getElementById('addUserForm').style.display='none'" style="background: #666; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">❌ Отмена</button>
      </div>
      <div id="addUserMessage" style="margin-top: 10px;"></div>
    </div>
  </div>

  <div class="admin-card">
    <h2>🛡️ Модерация мемов</h2>
    <div id="pendingList"><p style="color:#666;">Нет мемов на модерации.</p></div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase-config.js"></script>
<script src="common.js"></script>
<script>
(async function(){
  await initializeApp();
  if (!getCurrentUser()) {
    window.location.replace('login.html');
    return;
  }
  // Проверяем права
  if (!isAdmin()) {
    document.getElementById('adminPanel').style.display = 'none';
    document.querySelector('.admin-card').innerHTML = '<h2 style="color:#ff6666;">⛔ Доступ запрещён</h2><p>Только администраторы могут просматривать эту страницу.</p>';
  }

  document.getElementById('userGreeting').textContent = `привет, ${getCurrentUser()}`;
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await logoutUser();
    window.location.replace('login.html');
  });

  {
    const data = getCurrentUserData();
    if (data) {
      document.getElementById('headerBalance').textContent = `🪙 ${data.balance}`;
      renderPending(data);
      if (isAdmin()) {
        document.getElementById('adminPanel').style.display = 'block';
        await renderUserManagement();
        await renderAdminManagement();
      }
    }
  }

  // Обновление при изменении данных (например, при добавлении мема)
  window.addEventListener('storage', (e) => {
    if (e.key === 'membattle_users') {
      const data = getCurrentUserData();
      if (data) renderPending(data);
    }
  });
})();
</script>
</body>
</html>