// ============================================================
// ОБЩИЕ ДАННЫЕ — SUPABASE (общая БД для нескольких пользователей)
// ============================================================
const MEMES_LIST = [
  'mems/0f5ce2392fc603d02638edea09a70031.jpg','mems/12d0d46bd80e742144041c2c7f11301c.jpg','mems/65723f34069914a6f45e69251ae28cc7.jpg','mems/6d24d268bd764a1831c6256b76f0ceb8.png','mems/7e81fdd4ff4f47c3b57a2adf44ca8f4b.jpg','mems/afaafda54bb6a0ed582a6fe108119a93.jpg','mems/i.webp','mems/mem1.jpg','mems/mem2.jpg','mems/mem3.jpg','mems/mem4.jpg','mems/mem5.jpg','mems/mem6.jpg','mems/oar2.jpg'
];

let supabase = null;
let currentUser = null;
let currentUserData = null;
let usersCache = {};
let appInitialized = false;

function technicalEmail(login) { return `${login.toLowerCase()}@mem-battle.local`; }
function defaultProfile(login) {
  return { login, balance: 1000, history: [], memes: MEMES_LIST.map(path => ({path, wins:0})), pending: [], is_admin: false };
}
function rowToData(row) {
  return { login: row.login, balance: Number(row.balance), history: row.history || [], memes: row.memes || [], pending: row.pending || [], is_admin: !!row.is_admin, id: row.id };
}

async function initializeApp() {
  if (appInitialized) return;
  if (!window.supabase || !window.SUPABASE_URL || window.SUPABASE_URL.includes('PASTE_')) {
    console.error('Supabase не настроен. Откройте supabase-config.js');
    appInitialized = true;
    return;
  }
  supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) await loadCurrentProfile(session.user.id);
  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) await loadCurrentProfile(session.user.id);
    else { currentUser = null; currentUserData = null; }
  });
  appInitialized = true;
}

async function loadCurrentProfile(id) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (error || !data) {
    console.error('Не удалось загрузить профиль', error);
    currentUser = null;
    currentUserData = null;
    // Сессию без профиля не оставляем: иначе сайт выглядит как будто вошёл неизвестный пользователь.
    try { await supabase.auth.signOut(); } catch (_) {}
    return null;
  }
  currentUserData = rowToData(data);
  currentUser = currentUserData.login;
  usersCache[currentUser] = currentUserData;

  // Старые/новые аккаунты могли получить пустой список мемов из триггера.
  // Засеиваем его штатным набором один раз.
  if (!Array.isArray(currentUserData.memes) || currentUserData.memes.length === 0) {
    currentUserData.memes = MEMES_LIST.map(path => ({path, wins: 0}));
    const { data: updated, error: seedError } = await supabase
      .from('profiles')
      .update({ memes: currentUserData.memes })
      .eq('id', id)
      .select('*')
      .single();
    if (!seedError && updated) currentUserData = rowToData(updated);
    usersCache[currentUser] = currentUserData;
  }
  return currentUserData;
}

function getCurrentUser() { return currentUser; }
function getCurrentUserData() { return currentUserData; }
function isAdmin() { return !!currentUserData?.is_admin; }

async function loginUser(login, password) {
  if (!supabase) return {success:false, message:'Supabase не настроен'};
  const { data, error } = await supabase.auth.signInWithPassword({email: technicalEmail(login), password});
  if (error) return {success:false, message:'Неверный логин или пароль'};
  await loadCurrentProfile(data.user.id);
  return {success:true};
}

async function registerUser(login, password) {
  if (!supabase) return {success:false, message:'Supabase не настроен'};
  if (login.length < 3 || password.length < 4) return {success:false, message:'Логин (мин. 3 символа) и пароль (мин. 4 символа)'};
  const { data, error } = await supabase.auth.signUp({
    email: technicalEmail(login), password,
    options: { data: { login } }
  });
  if (error) return {success:false, message:error.message.includes('already') ? 'Логин уже занят' : error.message};
  if (!data.user) return {success:false, message:'Регистрация создана, но вход не выполнен. Проверьте настройки Confirm email.'};
  await loadCurrentProfile(data.user.id);
  return {success:true};
}

async function logoutUser() { if (supabase) { try { await supabase.auth.signOut(); } catch (e) { console.error(e); } } currentUser=null; currentUserData=null; }

async function saveCurrentUserData() {
  if (!supabase || !currentUserData?.id) return {success:false};
  const payload = {balance: currentUserData.balance, history: currentUserData.history || [], memes: currentUserData.memes || [], pending: currentUserData.pending || []};
  const {data,error} = await supabase.from('profiles').update(payload).eq('id', currentUserData.id).select('*').single();
  if (!error && data) { currentUserData = rowToData(data); usersCache[currentUser] = currentUserData; return {success:true}; }
  console.error(error); return {success:false, message:error?.message};
}

async function getUsersDataAsync() {
  if (!supabase) return {};
  const {data,error} = await supabase.from('profiles').select('*').order('created_at');
  if (error) { console.error(error); return {}; }
  usersCache = Object.fromEntries((data||[]).map(r => [r.login, rowToData(r)]));
  if (currentUser && usersCache[currentUser]) currentUserData = usersCache[currentUser];
  return usersCache;
}
function getUsersData() { return usersCache; }
async function saveUsersData(usersData) {
  if (!supabase || !isAdmin()) return {success:false};
  for (const [login,data] of Object.entries(usersData)) {
    if (!data.id) continue;
    await supabase.from('profiles').update({balance:data.balance,history:data.history||[],memes:data.memes||[],pending:data.pending||[]}).eq('id',data.id);
  }
  await getUsersDataAsync();
  return {success:true};
}

function updateBalanceHeader() { const el=document.getElementById('headerBalance'); if(el) el.textContent=`🪙 ${currentUserData ? currentUserData.balance : 0}`; }

function getMemesByTier(data,tier){const sorted=[...(data?.memes||[])].sort((a,b)=>a.wins-b.wins);const total=sorted.length;if(!total)return[];const q=Math.floor(total/4);if(!q)return sorted;const ranges={low:[0,q],mid:[q,q*2],high:[q*2,q*3],top:[q*3,total]};const r=ranges[tier]||[0,total];return sorted.slice(r[0],r[1]);}
function getRandomMemeFromTier(data,tier){const p=getMemesByTier(data,tier);return p.length?p[Math.floor(Math.random()*p.length)]:data.memes[Math.floor(Math.random()*data.memes.length)];}

function renderHistory(history){const list=document.getElementById('historyList');if(!list)return;if(!history?.length){list.innerHTML='<p style="color:#666;">Пока нет операций</p>';return;}list.innerHTML=history.map(text=>{let cls=text.includes('Выигрыш')?'win':text.includes('Возврат')||text.includes('ничья')?'info':text.includes('Ставка')?'lose':'';return `<p class="${cls}">${text}</p>`}).join('');list.scrollTop=list.scrollHeight;}

async function renderTop(balance){const tbody=document.getElementById('topBody');if(!tbody)return;const users=await getUsersDataAsync();const all=Object.values(users).map(u=>({name:u.login,balance:Number(u.balance)})).sort((a,b)=>b.balance-a.balance);tbody.innerHTML=all.map((p,i)=>`<tr><td class="rank">${i+1}</td><td class="name">${p.name}</td><td class="score">🪙 ${p.balance}</td></tr>`).join('');}

function renderPending(data){const c=document.getElementById('pendingList');if(!c)return;if(!data?.pending?.length){c.innerHTML='<p style="color:#666;">Нет мемов на модерации.</p>';return;}c.innerHTML='';data.pending.forEach((item,index)=>{const d=document.createElement('div');d.className='pending-item';d.innerHTML=`<img src="${item.path}" alt="мем" onerror="this.src='https://via.placeholder.com/60/22224a/ffffff?text=?'"><span style="flex:1;word-break:break-all;">${item.path}</span><div class="actions"><button class="accept" onclick="acceptMeme(${index})">✅ Принять</button><button class="reject" onclick="rejectMeme(${index})">❌ Отклонить</button></div>`;c.appendChild(d);});}
async function acceptMeme(index){if(!isAdmin())return;const data=currentUserData;const item=data?.pending?.[index];if(!item)return;data.memes.push({path:item.path,wins:0});data.pending.splice(index,1);await saveCurrentUserData();renderPending(data);window.dispatchEvent(new Event('memeAccepted'));}
async function rejectMeme(index){if(!isAdmin())return;const data=currentUserData;if(!data?.pending?.[index])return;data.pending.splice(index,1);await saveCurrentUserData();renderPending(data);}

async function submitMeme(){const url=document.getElementById('memeUrl').value.trim(),msg=document.getElementById('submitMessage'),data=currentUserData;if(!data){msg.textContent='⚠️ Вы не авторизованы.';return;}if(!url){msg.textContent='⚠️ Введите ссылку на картинку.';return;}if(data.memes.some(m=>m.path===url)||data.pending.some(p=>p.path===url)){msg.textContent='⚠️ Такой мем уже есть или он уже на модерации.';return;}data.pending.push({path:url});await saveCurrentUserData();msg.textContent='✅ Мем отправлен на модерацию!';msg.style.color='#88ff88';document.getElementById('memeUrl').value='';if(document.getElementById('pendingList'))renderPending(data);}

let pendingBet=null;function showConfirmModal(battleIdx,memeId,amount){if(isNaN(amount)||amount<=0){alert('Введите положительную сумму.');return;}pendingBet={battleIdx,memeId,amount};const o=document.getElementById('confirmModal');if(!o)return;document.getElementById('modalMessage').textContent=`Вы собираетесь поставить ${amount} монет на ${memeId==='meme1'?'МЕМ 1':'МЕМ 2'}. Подтвердить?`;o.classList.add('active');}function confirmBet(){if(!pendingBet)return;const{x}=pendingBet;const{battleIdx,memeId,amount}=pendingBet;if(typeof window.placeBetConfirmed==='function')window.placeBetConfirmed(battleIdx,memeId,amount);closeModal();}function closeModal(){document.getElementById('confirmModal')?.classList.remove('active');pendingBet=null;}
function getPlayerBetInfo(battle,playerId){const all=battle.bets.meme1.concat(battle.bets.meme2),p=all.filter(b=>b.playerId===playerId);if(!p.length)return null;return{meme1:battle.bets.meme1.filter(b=>b.playerId===playerId).reduce((s,b)=>s+b.amount,0),meme2:battle.bets.meme2.filter(b=>b.playerId===playerId).reduce((s,b)=>s+b.amount,0)};}

// Админка: общая таблица пользователей из БД
async function renderUserManagement(){const c=document.getElementById('userManagement');if(!c)return;if(!isAdmin()){c.innerHTML='<p style="color:#ff6666;">Доступ запрещен.</p>';return;}const users=await getUsersDataAsync();let html='<div style="background:#1a1a2e;border-radius:10px;padding:20px;margin:20px 0;"><h3 style="color:#ffd700;">👥 Управление пользователями</h3><div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;color:#fff;"><thead><tr style="background:#2a2a4e;"><th style="padding:12px;border:1px solid #333;text-align:left;">Логин</th><th style="padding:12px;border:1px solid #333;text-align:left;">Баланс</th><th style="padding:12px;border:1px solid #333;text-align:left;">Мемов</th><th style="padding:12px;border:1px solid #333;text-align:left;">На модерации</th><th style="padding:12px;border:1px solid #333;text-align:left;">История</th><th style="padding:12px;border:1px solid #333;">Роль</th></tr></thead><tbody>';
for(const [login,d] of Object.entries(users))html+=`<tr><td style="padding:10px;border:1px solid #333;">${login}</td><td style="padding:10px;border:1px solid #333;">🪙 ${d.balance}</td><td style="padding:10px;border:1px solid #333;">${d.memes.length}</td><td style="padding:10px;border:1px solid #333;">${d.pending.length}</td><td style="padding:10px;border:1px solid #333;">${d.history.length}</td><td style="padding:10px;border:1px solid #333;">${d.is_admin?'👑 Админ':'👤 Пользователь'}</td></tr>`;
html+='</tbody></table></div></div>';c.innerHTML=html;}
function getUsersList(){return Object.values(usersCache).map(d=>({login:d.login,balance:d.balance,memesCount:d.memes.length,pendingCount:d.pending.length,historyCount:d.history.length,hasPassword:true}));}
async function resetUserPassword(){alert('Сброс пароля администратора требует Supabase Edge Function. Для безопасности пароль нельзя менять из публичного JavaScript.');return{success:false};}
function getAllLogins(){return Object.keys(usersCache);}
function getUserPassword(){return null;}
function showAllUserPasswords(){alert('Пароли больше не хранятся в открытом виде. Их просмотр отключён специально.');}
function debugShowAllPasswords(){console.table(getUsersList());}
async function clearAllUserData(){alert('Массовое удаление пользователей отключено в клиентской версии, чтобы не дать публичному сайту опасную операцию.');}
async function addUserByAdmin(){alert('Создание пользователя из админки требует Edge Function с service_role. Пока используйте регистрацию на странице входа.');return{success:false};}
function addUserForm(){const f=document.getElementById('addUserForm');if(f)f.style.display=f.style.display==='none'?'block':'none';}
async function addUserFromForm(){alert('Для безопасного создания пользователей администратором подключим Edge Function после публикации проекта.');}
async function changeUserBalance(login,amount){if(!isAdmin())return{success:false};const d=usersCache[login];if(!d)return{success:false,message:'Пользователь не найден'};d.balance=Math.max(0,d.balance+amount);await supabase.from('profiles').update({balance:d.balance}).eq('id',d.id);await renderUserManagement();return{success:true};}
async function exportUsersData(){if(!isAdmin())return;const users=await getUsersDataAsync();const blob=new Blob([JSON.stringify(users,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`users_backup_${new Date().toISOString().slice(0,10)}.json`;a.click();}
function importUsersData(){alert('Импорт пользователей отключён: в БД нельзя безопасно импортировать пароли через браузер.');}
function showSimpleUserTable(){renderUserManagement();}
function showAllLogins(){alert(Object.keys(usersCache).join('\n'));}
function showUserWithPassword(){alert('Пароли не доступны администратору в открытом виде.');}
function copyUserPassword(){alert('Пароли не доступны в открытом виде.');}
function autoShowAdminPanel(){if(isAdmin()){document.getElementById('adminPanel')?.style.setProperty('display','block');renderUserManagement();}}
function getAdminsList(){return Object.values(usersCache).filter(u=>u.is_admin).map(u=>u.login);}
async function renderAdminManagement(){const c=document.getElementById('adminManagement');if(!c||!isAdmin())return;const users=await getUsersDataAsync();c.innerHTML=`<div style="background:#1a1a2e;border-radius:10px;padding:15px;margin:10px 0;"><h3 style="color:#ffd700;">👑 Управление администраторами</h3><p style="color:#aaa;">Текущие администраторы: ${Object.values(users).filter(u=>u.is_admin).map(u=>u.login).join(', ')||'нет'}</p><p style="color:#888;">Назначение роли из браузера отключено для безопасности. Админа можно назначить SQL-командой из инструкции.</p></div>`;}
function addAdmin(){alert('Назначение администратора выполняется через SQL в Supabase, чтобы обычный посетитель не мог выдать себе права.');return{success:false};}
function removeAdmin(){return{success:false,message:'Операция доступна только через безопасную серверную настройку.'};}
function isUserAdmin(login){return !!usersCache[login]?.is_admin;}
function updateNavigation(){document.querySelectorAll('.admin-only').forEach(el=>el.style.display=isAdmin()?'block':'none');}

window.addEventListener('DOMContentLoaded',()=>initializeApp());
