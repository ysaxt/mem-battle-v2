<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Мем Битва – Отправить мем</title>
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
    <a href="submit.html" class="tab-btn active">📤 Отправить мем</a>
    <a href="admin.html" class="tab-btn" id="adminTab">🛡️ Админ</a>
  </div>

  <div class="submit-card">
    <h2>📤 Отправить свой мем</h2>
    <p style="color:#aaa; margin-bottom:16px;">Введите прямую ссылку на картинку (можно с Imgur, Discord и т.п.). После модерации мем появится в битвах.</p>
    <input type="text" id="memeUrl" placeholder="https://example.com/meme.jpg" />
    <button onclick="submitMeme()">Отправить на модерацию</button>
    <div id="submitMessage" style="margin-top:12px; color:#88ff88;"></div>
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
  if (!isAdmin()) {
    document.getElementById('adminTab').style.display = 'none';
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
    }
  }
  })();
</script>
</body>
</html>