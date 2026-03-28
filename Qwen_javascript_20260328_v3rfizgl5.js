// === ДАННЫЕ ===
let leagues = JSON.parse(localStorage.getItem('gkx_leagues')) || [];
let matches = JSON.parse(localStorage.getItem('gkx_matches')) || [];
let standings = JSON.parse(localStorage.getItem('gkx_standings')) || [];
let news = JSON.parse(localStorage.getItem('gkx_news')) || [];
let socials = JSON.parse(localStorage.getItem('gkx_socials')) || [
    { id: 1, name: 'Telegram', handle: '@gkxtgchannel', url: 'https://t.me/gkxtgchannel', icon: 'telegram' }
];
let users = JSON.parse(localStorage.getItem('gkx_users')) || [{ id: 1, nick: 'Admin', email: '', phone: '', avatar: 'https://cdn-icons-png.flaticon.com/512/149/149071.png', isAdmin: true, registeredAt: '2024-01-01' }];
let currentUser = JSON.parse(localStorage.getItem('gkx_currentUser')) || null;
let userLikes = JSON.parse(localStorage.getItem('gkx_userLikes')) || {};
let tempImageData = null, confirmCallback = null, selectedDate = null, selectedLeague = null, eventCounter = 0;

function getLeagueClass(league) {
    const l = league.toLowerCase();
    if (l.includes('бундес')) return 'league-bundesliga';
    if (l.includes('рпл') || l.includes('премьер')) return 'league-rpl';
    if (l.includes('апл') || l.includes('англи')) return 'league-epl';
    if (l.includes('ла лига') || l.includes('испан')) return 'league-laliga';
    if (l.includes('серия') || l.includes('итали')) return 'league-seriea';
    return 'league-default';
}

function calculatePoints(s) { return (s.won * 3) + (s.drawn * 1); }
function calculateGD(s) { return s.gf - s.ga; }

function init() { 
    renderAll(); 
    updateUserPanel(); 
    updateAdminNavLink(); 
    renderAdminSocials(); 
    renderSocialsPage(); 
    renderLeagues(); 
    renderAdminLeagues(); 
    renderStandings(); 
    renderAdminStandings();
    populateLeagueSelects();
}

function saveData() {
    localStorage.setItem('gkx_leagues', JSON.stringify(leagues));
    localStorage.setItem('gkx_matches', JSON.stringify(matches));
    localStorage.setItem('gkx_standings', JSON.stringify(standings));
    localStorage.setItem('gkx_news', JSON.stringify(news));
    localStorage.setItem('gkx_socials', JSON.stringify(socials));
    localStorage.setItem('gkx_users', JSON.stringify(users));
    localStorage.setItem('gkx_userLikes', JSON.stringify(userLikes));
    if (currentUser) localStorage.setItem('gkx_currentUser', JSON.stringify(currentUser));
}

function showSection(id) {
    ['home','matches','news','socials','admin'].forEach(s => document.getElementById('section-'+s).classList.add('hidden'));
    document.getElementById('section-'+id).classList.remove('hidden'); window.scrollTo(0,0);
    if (id === 'admin') { renderAdminLeagues(); renderAdminMatches(); renderAdminStandings(); renderAdminNews(); renderAdminSocials(); renderAdminComments(); renderUsersTable(); populateLeagueSelects(); }
    if (id === 'matches') { renderLeagues(); renderDateFilters(); renderAllMatches(); renderStandings(); }
    if (id === 'socials') { renderSocialsPage(); }
}

function showMatchesTab(tab) {
    document.querySelectorAll('#section-matches .match-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#section-matches .match-tab-content').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('matches-tab-'+tab).classList.add('active');
    if (tab === 'standings') renderStandings();
}

function showAdminTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(t => { t.classList.remove('border-gkx-green','text-gkx-green'); t.classList.add('border-transparent','text-gray-400'); });
    event.target.classList.remove('border-transparent','text-gray-400'); event.target.classList.add('border-gkx-green','text-gkx-green');
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById('admin-'+tab).classList.remove('hidden');
}

function checkAdminAccess() { if (!currentUser) { alert('Войдите в аккаунт!'); openModal('login'); return; } const u = users.find(x=>x.id===currentUser.id); if (!u?.isAdmin) { alert('Только для админов!'); return; } showSection('admin'); }
function updateAdminNavLink() { const l=document.getElementById('admin-nav-link'),lm=document.getElementById('admin-nav-link-mobile'); if(currentUser){const u=users.find(x=>x.id===currentUser.id);if(u?.isAdmin){l.classList.remove('hidden');lm?.classList.remove('hidden');}else{l.classList.add('hidden');lm?.classList.add('hidden');}}else{l.classList.add('hidden');lm?.classList.add('hidden');} }

// === ЛИГИ ===
function renderLeagues() {
    const container = document.getElementById('league-filters');
    if (!leagues.length) {
        container.innerHTML = '<p class="text-gray-500 text-sm">Нет доступных лиг</p>';
        return;
    }
    let html = `<button onclick="filterByLeague(null)" class="league-filter-btn px-4 py-2 rounded-lg text-sm ${!selectedLeague?'active':'text-gray-300 bg-gray-800'}">🏆 Все лиги</button>`;
    leagues.forEach(l => {
        const isActive = selectedLeague === l.id;
        html += `<button onclick="filterByLeague(${l.id})" class="league-filter-btn px-4 py-2 rounded-lg text-sm ${isActive?'active':'text-gray-300 bg-gray-800'}">${l.name}</button>`;
    });
    container.innerHTML = html;
}

function filterByLeague(leagueId) {
    selectedLeague = leagueId;
    renderLeagues();
    renderAllMatches();
    renderStandings();
}

function renderAdminLeagues() {
    const list = document.getElementById('admin-leagues-list');
    document.getElementById('leagues-count').textContent = leagues.length;
    if (!leagues.length) {
        list.innerHTML = '<p class="text-gray-500 text-center py-8">Нет добавленных лиг</p>';
        return;
    }
    list.innerHTML = leagues.map(l => `
        <div class="flex items-center justify-between bg-gray-900/50 p-4 rounded-lg admin-row">
            <div>
                <div class="font-bold text-white">${l.name}</div>
                <div class="text-xs text-gray-500">${l.country || 'Страна не указана'}</div>
            </div>
            <div class="flex gap-2">
                <button onclick="openEditLeagueModal(${l.id})" class="text-gkx-green hover:text-white text-xl">✏️</button>
                <button onclick="confirmDelete('league',${l.id})" class="text-red-500 hover:text-red-400 text-xl">🗑️</button>
            </div>
        </div>
    `).join('');
}

function populateLeagueSelects() {
    const selects = ['m-league-select', 'edit-m-league-select', 's-league-select', 'edit-s-league-select'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        if (!leagues.length) {
            select.innerHTML = '<option value="">Нет доступных лиг</option>';
            return;
        }
        select.innerHTML = '<option value="">Выберите лигу</option>' + leagues.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
    });
}

// === ТУРНИРНАЯ ТАБЛИЦА ===
function renderStandings() {
    const tbody = document.getElementById('standings-body');
    const leagueName = document.getElementById('standings-league-name');
    
    let filteredStandings = standings;
    if (selectedLeague) {
        filteredStandings = standings.filter(s => s.leagueId === selectedLeague);
        const league = leagues.find(l => l.id === selectedLeague);
        leagueName.textContent = league ? `Турнирная таблица: ${league.name}` : 'Турнирная таблица';
    } else {
        leagueName.textContent = 'Выберите лигу для просмотра таблицы';
    }

    if (!filteredStandings.length) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-gray-500"><div class="text-4xl mb-2">📊</div>${selectedLeague ? 'В этой лиге пока нет команд' : 'Таблица пуста. Админ ещё не добавил команды.'}</td></tr>`;
        return;
    }
    
    const sorted = [...filteredStandings].sort((a, b) => {
        const pointsA = calculatePoints(a), pointsB = calculatePoints(b);
        if (pointsB !== pointsA) return pointsB - pointsA;
        const gdA = calculateGD(a), gdB = calculateGD(b);
        if (gdB !== gdA) return gdB - gdA;
        return b.gf - a.gf;
    });

    tbody.innerHTML = sorted.map((s, index) => {
        const pos = index + 1;
        const points = calculatePoints(s);
        const gd = calculateGD(s);
        let zoneClass = '';
        let zoneIndicator = '';
        
        if (pos <= 4) { zoneClass = 'pos-ucl'; zoneIndicator = '<div class="zone-indicator zone-ucl"></div>'; }
        else if (pos <= 6) { zoneClass = 'pos-uel'; zoneIndicator = '<div class="zone-indicator zone-uel"></div>'; }
        else if (pos >= 18) { zoneClass = 'pos-relegation'; zoneIndicator = '<div class="zone-indicator zone-relegation"></div>'; }

        return `<tr class="table-row ${zoneClass}">${zoneIndicator}
            <td class="pos-cell pos-${pos <= 4 ? pos : pos >= 18 ? 'relegation' : ''}">${pos}</td>
            <td class="team-cell">${s.team}</td>
            <td>${s.played}</td>
            <td class="hide-mobile">${s.won}</td>
            <td class="hide-mobile">${s.drawn}</td>
            <td class="hide-mobile">${s.lost}</td>
            <td class="hide-mobile">${s.gf}</td>
            <td class="hide-mobile">${s.ga}</td>
            <td>${gd > 0 ? '+' + gd : gd}</td>
            <td class="points-cell">${points}</td>
        </tr>`;
    }).join('');
}

function renderAdminStandings() {
    const tbody = document.getElementById('admin-standings-body');
    if (!standings.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-gray-500"><div class="text-4xl mb-2">📊</div>Нет команд в таблице</td></tr>`;
        return;
    }

    const sorted = [...standings].sort((a, b) => calculatePoints(b) - calculatePoints(a));

    tbody.innerHTML = sorted.map((s, index) => {
        const league = leagues.find(l => l.id === s.leagueId);
        return `
        <tr class="admin-row border-b border-gray-800">
            <td class="p-4 font-bold text-gkx-green">${index + 1}</td>
            <td class="p-4 text-gray-400 text-sm">${league ? league.name : 'Нет лиги'}</td>
            <td class="p-4 font-bold text-white">${s.team}</td>
            <td class="p-4 text-center">${s.played}</td>
            <td class="p-4 text-center">${s.won}</td>
            <td class="p-4 text-center">${s.drawn}</td>
            <td class="p-4 text-center">${s.lost}</td>
            <td class="p-4 text-center font-bold text-gkx-green">${calculatePoints(s)}</td>
            <td class="p-4 text-right">
                <button onclick="openEditStandingsModal(${s.id})" class="text-gkx-green hover:text-white text-sm mr-3">✏️</button>
                <button onclick="confirmDelete('standings',${s.id})" class="text-red-500 hover:text-red-400 text-sm">🗑️</button>
            </td>
        </tr>
    `}).join('');
}

// === ОСТАЛЬНОЙ КОД ===
function renderDateFilters() {
    const c=document.getElementById('date-filters'), dates=[...new Set(matches.map(m=>m.date?.split('T')[0]))].filter(Boolean).sort();
    let h=`<button onclick="filterByDate(null)" class="date-filter-btn px-4 py-2 rounded-lg text-sm ${!selectedDate?'active':'text-gray-300 bg-gray-800'}">📅 Все даты</button>`;
    dates.forEach(d=>{const dt=new Date(d),day=dt.toLocaleDateString('ru-RU',{day:'numeric',month:'short'}),today=d===new Date().toISOString().split('T')[0],lbl=today?`Сегодня (${day})`:day;h+=`<button onclick="filterByDate('${d}')" class="date-filter-btn px-4 py-2 rounded-lg text-sm ${selectedDate===d?'active':'text-gray-300 bg-gray-800'}">${lbl}</button>`;});
    c.innerHTML=h;
}
function filterByDate(d){selectedDate=d;renderDateFilters();renderAllMatches();const lbl=document.getElementById('selected-date-label'),cnt=document.getElementById('matches-on-date');if(d){const dt=new Date(d);lbl.textContent=dt.toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});cnt.textContent=`(${matches.filter(m=>m.date?.split('T')[0]===d).length} матчей)`;}else{lbl.textContent='Все даты';cnt.textContent=`(${matches.length} матчей)`;}}

function renderAll(){renderHomeNews();renderHomeMatches();renderAllMatches();renderAllNews();}
function renderHomeNews(){const g=document.getElementById('home-news-grid');if(!news.length){g.innerHTML=`<div class="col-span-full text-center py-12"><div class="text-6xl mb-4">📰</div><h3 class="text-xl font-bold text-gray-400 mb-2">Нет новостей</h3><p class="text-gray-500">Админ ещё не добавил</p></div>`;return;}g.innerHTML=news.slice(0,3).map(n=>createNewsCard(n)).join('');}
function renderAllNews(){const g=document.getElementById('all-news-grid');if(!news.length){g.innerHTML=`<div class="col-span-full text-center py-12"><div class="text-6xl mb-4">📰</div><h3 class="text-xl font-bold text-gray-400 mb-2">Нет новостей</h3><p class="text-gray-500">Админ ещё не добавил</p></div>`;return;}g.innerHTML=news.map(n=>createNewsCard(n)).join('');}
function createNewsCard(n){return`<div class="bg-gkx-dark rounded-xl overflow-hidden border border-gray-800 hover:border-gkx-green transition cursor-pointer group" onclick="openNewsModal(${n.id})"><div class="h-48 overflow-hidden"><img src="${n.image}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500" alt="${n.title}"></div><div class="p-5"><h3 class="text-xl font-bold mb-2 group-hover:text-gkx-green transition">${n.title}</h3><p class="text-gray-400 text-sm mb-4 line-clamp-2">${n.content}</p><div class="flex justify-between items-center text-xs text-gray-500"><span>${n.date}</span><span>${n.comments?.length||0} комментариев</span></div></div></div>`;}

function renderHomeMatches(){const l=document.getElementById('home-matches-list');if(!matches.length){l.innerHTML=`<div class="text-center py-12"><div class="text-6xl mb-4">⚽</div><h3 class="text-xl font-bold text-gray-400 mb-2">Нет матчей</h3><p class="text-gray-500">Админ ещё не добавил</p></div>`;return;}l.innerHTML=matches.slice(0,5).map(m=>createMatchCard(m,false)).join('');}
function renderAllMatches(){
    const g=document.getElementById('all-matches-grid');
    let f = selectedLeague ? matches.filter(m=>m.leagueId === selectedLeague) : matches;
    if (selectedDate) f = f.filter(m=>m.date?.split('T')[0]===selectedDate);
    if(!f.length){g.innerHTML=`<div class="text-center py-12"><div class="text-6xl mb-4">📅</div><h3 class="text-xl font-bold text-gray-400 mb-2">${matches.length?'Нет на эту дату/в этой лиге':'Нет матчей'}</h3><p class="text-gray-500">${matches.length?'Выберите другую дату или лигу':'Админ ещё не добавил'}</p></div>`;return;}
    g.innerHTML=f.map(m=>createMatchCard(m,true)).join('');
}
function createMatchCard(m,clickable){
    const league = leagues.find(l => l.id === m.leagueId);
    const date=m.date?new Date(m.date).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'',sc=m.status==='Live'?'text-red-500 animate-pulse':m.status==='Finished'?'text-gray-400':'text-gkx-green';
    return`<div ${clickable?`onclick="openMatchModal(${m.id})"`:''} class="${getLeagueClass(league?.name||m.league||'')} p-4 rounded-lg border border-gray-800 ${clickable?'cursor-pointer hover:scale-[1.02]':''} transition shadow-lg"><div class="flex justify-between items-center text-xs text-gray-400 mb-2"><span class="font-bold">${league?.name||m.league||'Лига'}</span><span>${date}</span></div><div class="flex justify-between items-center"><div class="flex-1 text-right font-bold text-lg">${m.home}</div><div class="px-6 font-black text-2xl ${sc}">${m.score||'-'}</div><div class="flex-1 text-left font-bold text-lg">${m.away}</div></div><div class="text-center mt-2 text-xs ${sc} font-bold">${m.status==='Live'?'● LIVE':m.status==='Finished'?'FT':'Запланирован'}</div></div>`;
}

// === СТРАНИЦА СОЦСЕТЕЙ ===
function renderSocialsPage(){
    const grid = document.getElementById('socials-page-grid');
    if(!socials.length){
        grid.innerHTML = `<div class="col-span-full text-center py-12"><div class="text-6xl mb-4">🔗</div><h3 class="text-xl font-bold text-gray-400 mb-2">Нет соцсетей</h3><p class="text-gray-500">Админ ещё не добавил соцсети</p></div>`;
        return;
    }
    grid.innerHTML = socials.map(s => `
        <div class="social-card">
            <div class="social-icon ${s.icon}">${getSocialIcon(s.icon)}</div>
            <div class="social-name">${s.name}</div>
            <div class="social-handle">${s.handle}</div>
            <a href="${s.url}" target="_blank" class="social-btn">
                <span>Перейти</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            </a>
        </div>
    `).join('');
}

// === АДМИНКА: МАТЧИ ===
function renderAdminMatches(){const tb=document.getElementById('admin-matches-body');document.getElementById('matches-count').textContent=matches.length;if(!matches.length){tb.innerHTML=`<tr><td colspan="6" class="p-8 text-center text-gray-500"><div class="text-4xl mb-2">⚽</div>Добавьте первый матч!</td></tr>`;return;}tb.innerHTML=matches.map(m=>{const league = leagues.find(l => l.id === m.leagueId); const date=m.date?new Date(m.date).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';return`<tr class="admin-row border-b border-gray-800"><td class="p-4 text-gray-400 text-sm">${date}</td><td class="p-4 font-bold text-gkx-green">${league?.name||m.league||'Лига'}</td><td class="p-4 text-center"><span class="text-white">${m.home}</span><span class="text-gray-500 mx-2">vs</span><span class="text-white">${m.away}</span></td><td class="p-4 text-center font-bold text-lg">${m.score||'-'}</td><td class="p-4 text-center"><span class="px-2 py-1 rounded text-xs font-bold ${getStatusColor(m.status)}">${m.status}</span></td><td class="p-4 text-right"><button onclick="openEditMatchModal(${m.id})" class="text-gkx-green hover:text-white text-sm mr-3">✏️</button><button onclick="confirmDelete('match',${m.id})" class="text-red-500 hover:text-red-400 text-sm">🗑️</button></td></tr>`;}).join('');}
function getStatusColor(s){return s==='Live'?'bg-red-500/20 text-red-500':s==='Finished'?'bg-gray-700 text-gray-300':'bg-gkx-green/20 text-gkx-green';}

// === АДМИНКА: НОВОСТИ ===
function renderAdminNews(){const l=document.getElementById('admin-news-list');document.getElementById('news-count').textContent=news.length;if(!news.length){l.innerHTML=`<div class="text-center py-12"><div class="text-4xl mb-2">📰</div><p class="text-gray-500">Добавьте первую новость!</p></div>`;return;}l.innerHTML=news.map(n=>`<div class="flex items-center gap-4 bg-gray-900/50 p-4 rounded-lg admin-row"><img src="${n.image}" class="w-20 h-20 object-cover rounded" alt="${n.title}"><div class="flex-1"><h4 class="font-bold text-white mb-1">${n.title}</h4><p class="text-gray-400 text-sm line-clamp-1">${n.content}</p><div class="text-xs text-gray-500 mt-1">${n.date} • ${n.comments?.length||0} комментариев</div></div><div class="flex gap-3"><button onclick="openEditNewsModal(${n.id})" class="text-gkx-green hover:text-white text-xl">✏️</button><button onclick="confirmDelete('news',${n.id})" class="text-red-500 hover:text-red-400 text-xl">🗑️</button></div></div>`).join('');}

// === АДМИНКА: СОЦСЕТИ ===
function renderAdminSocials(){const l=document.getElementById('socials-list');if(!socials.length){l.innerHTML=`<p class="text-gray-500 text-center py-8">Нет добавленных соцсетей</p>`;return;}l.innerHTML=socials.map(s=>`<div class="flex items-center gap-4 bg-gray-900/50 p-4 rounded-lg admin-row"><div class="social-icon ${s.icon}">${getSocialIcon(s.icon)}</div><div class="flex-1 text-left"><div class="font-bold text-white">${s.name}</div><div class="text-gray-400 text-sm">${s.handle}</div><div class="text-xs text-gkx-green mt-1">${s.url}</div></div><div class="flex gap-2"><button onclick="editSocial(${s.id})" class="text-gkx-green hover:text-white text-xl">✏️</button><button onclick="confirmDelete('social',${s.id})" class="text-red-500 hover:text-red-400 text-xl">🗑️</button></div></div>`).join('');}
function getSocialIcon(type){return{telegram:'✈️',vk:'🔵',youtube:'▶️',instagram:'📷',twitter:'🐦'}[type]||'🔗';}

function addSocialField(){const l=document.getElementById('socials-list'),id=`social-${Date.now()}`;l.innerHTML+=`<div id="${id}" class="event-form"><div class="grid grid-cols-2 gap-2 mb-2"><input type="text" class="social-name" placeholder="Название (Telegram)"><select class="social-icon-select bg-black border border-gray-700 rounded p-2 text-white text-sm"><option value="telegram">✈️ Telegram</option><option value="vk">🔵 VK</option><option value="youtube">▶️ YouTube</option><option value="instagram">📷 Instagram</option><option value="twitter">🐦 Twitter</option></select></div><input type="text" class="social-handle" placeholder="@никнейм"><input type="url" class="social-url" placeholder="https://..." class="mt-2"><button type="button" onclick="saveSocial('${id}')" class="mt-3 bg-gkx-green text-gkx-black px-4 py-2 rounded font-bold hover:bg-white transition">Сохранить</button><button type="button" onclick="document.getElementById('${id}').remove()" class="mt-3 text-red-500 text-sm hover:text-red-400">Отмена</button></div>`;}

function editSocial(id){const s=socials.find(x=>x.id===id);if(!s)return;const l=document.getElementById('socials-list'),eid=`edit-social-${id}`;l.innerHTML+=`<div id="${eid}" class="event-form"><div class="grid grid-cols-2 gap-2 mb-2"><input type="text" class="social-name" value="${s.name}" placeholder="Название"><select class="social-icon-select bg-black border border-gray-700 rounded p-2 text-white text-sm">${['telegram','vk','youtube','instagram','twitter'].map(ic=>`<option value="${ic}" ${s.icon===ic?'selected':''}>${getSocialIcon(ic)} ${ic.charAt(0).toUpperCase()+ic.slice(1)}</option>`).join('')}</select></div><input type="text" class="social-handle" value="${s.handle}" placeholder="@никнейм"><input type="url" class="social-url" value="${s.url}" placeholder="https://..." class="mt-2"><button type="button" onclick="updateSocial(${id},'${eid}')" class="mt-3 bg-gkx-green text-gkx-black px-4 py-2 rounded font-bold hover:bg-white transition">Обновить</button><button type="button" onclick="document.getElementById('${eid}').remove()" class="mt-3 text-red-500 text-sm hover:text-red-400">Отмена</button></div>`;}

function saveSocial(containerId){const c=document.getElementById(containerId),name=c.querySelector('.social-name').value,icon=c.querySelector('.social-icon-select').value,handle=c.querySelector('.social-handle').value,url=c.querySelector('.social-url').value;if(!name||!url){alert('Заполните название и URL!');return;}socials.push({id:Date.now(),name,icon,handle,url});saveData();renderAdminSocials();renderSocialsPage();c.remove();alert('Соцсеть добавлена!');}
function updateSocial(id,containerId){const c=document.getElementById(containerId),s=socials.find(x=>x.id===id);if(!s)return;s.name=c.querySelector('.social-name').value;s.icon=c.querySelector('.social-icon-select').value;s.handle=c.querySelector('.social-handle').value;s.url=c.querySelector('.social-url').value;saveData();renderAdminSocials();renderSocialsPage();c.remove();alert('Соцсеть обновлена!');}

// === АДМИНКА: КОММЕНТАРИИ И ПОЛЬЗОВАТЕЛИ ===
function renderAdminComments(){const l=document.getElementById('admin-comments-list');let all=[];news.forEach(n=>n.comments?.forEach(c=>all.push({...c,type:'news',itemId:n.id,itemTitle:n.title})));matches.forEach(m=>m.comments?.forEach(c=>all.push({...c,type:'match',itemId:m.id,itemTitle:`${m.home} vs ${m.away}`})));document.getElementById('comments-count').textContent=all.length;if(!all.length){l.innerHTML=`<div class="text-center py-12"><div class="text-4xl mb-2">💬</div><p class="text-gray-500">Нет комментариев</p></div>`;return;}l.innerHTML=all.map((c,i)=>`<div class="flex items-start gap-4 bg-gray-900/50 p-4 rounded-lg admin-row"><img src="${c.avatar}" class="w-12 h-12 rounded-full border border-gray-700"><div class="flex-1"><div class="flex justify-between items-start mb-2"><div><div class="font-bold text-gkx-green">${c.nick}</div><div class="text-xs text-gray-500">${c.type==='news'?'📰':'⚽'} ${c.itemTitle}</div></div><div class="text-xs text-gray-500">${c.date}</div></div><p class="text-gray-300 mb-2">${c.text}</p><div class="flex items-center gap-4 text-sm"><span class="text-gray-500">❤️ ${c.likes||0}</span></div></div><div class="flex gap-3"><button onclick="openEditCommentModal('${c.type}',${c.itemId},${i})" class="text-gkx-green hover:text-white text-xl">✏️</button><button onclick="confirmDelete('comment','${c.type}',${c.itemId},${i})" class="text-red-500 hover:text-red-400 text-xl">🗑️</button></div></div>`).join('');}
function renderUsersTable(){const tb=document.getElementById('users-table-body'),admins=users.filter(u=>u.isAdmin).length;document.getElementById('users-count').textContent=users.length;document.getElementById('admins-count').textContent=admins;tb.innerHTML=users.map(u=>`<tr class="admin-row border-b border-gray-800"><td class="p-4"><div class="flex items-center gap-3"><img src="${u.avatar}" class="w-10 h-10 rounded-full border border-gray-700"><div><div class="font-bold text-white">${u.nick}</div><div class="text-xs text-gray-500">ID: ${u.id}</div></div></div></td><td class="p-4 text-sm">${u.email?`<div class="text-gray-300">📧 ${u.email}</div>`:''}${u.phone?`<div class="text-gray-300">📱 ${u.phone}</div>`:''}${!u.email&&!u.phone?'<span class="text-gray-500">-</span>':''}</td><td class="p-4"><span class="px-3 py-1 rounded text-xs font-bold ${u.isAdmin?'bg-gkx-green text-gkx-black':'bg-gray-700 text-gray-300'}">${u.isAdmin?'АДМИН':'ПОЛЬЗОВАТЕЛЬ'}</span></td><td class="p-4 text-gray-400 text-sm">${u.registeredAt}</td><td class="p-4 text-right">${u.id!==currentUser?.id?`<button onclick="toggleAdminRole(${u.id})" class="text-sm px-3 py-1 rounded ${u.isAdmin?'bg-red-500/20 text-red-500':'bg-gkx-green/20 text-gkx-green'} transition mr-2">${u.isAdmin?'Снять':'Админ'}</button><button onclick="confirmDelete('user',${u.id})" class="text-red-500 hover:text-red-400 text-sm">🗑️</button>`:'<span class="text-gray-500 text-sm">Вы</span>'}</td></tr>`).join('');}

// === МОДАЛЬНЫЕ ОКНА ===
function openModal(t){document.getElementById('modal-'+t).classList.remove('hidden');document.getElementById('modal-'+t).classList.add('flex');document.body.style.overflow='hidden';}
function closeModal(t){document.getElementById('modal-'+t).classList.add('hidden');document.getElementById('modal-'+t).classList.remove('flex');document.body.style.overflow='auto';}
document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id.replace('modal-',''));}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')['news','match','edit-match','edit-standings','edit-league','edit-news','edit-comment','confirm','login'].forEach(t=>{const m=document.getElementById('modal-'+t);if(m&&!m.classList.contains('hidden'))closeModal(t);});});

function confirmDelete(type,...args){const modal=document.getElementById('modal-confirm'),msg=document.getElementById('confirm-message'),yes=document.getElementById('confirm-yes');let name='';if(type==='match'){const m=matches.find(x=>x.id===args[0]);name=`матч "${m?.home} vs ${m?.away}"`;}else if(type==='news'){const n=news.find(x=>x.id===args[0]);name=`новость "${n?.title}"`;}else if(type==='user'){const u=users.find(x=>x.id===args[0]);name=`пользователя "${u?.nick}"`;}else if(type==='comment')name='комментарий';else if(type==='social'){const s=socials.find(x=>x.id===args[0]);name=`соцсеть "${s?.name}"`;}else if(type==='standings'){const s=standings.find(x=>x.id===args[0]);name=`команду "${s?.team}"`;}else if(type==='league'){const l=leagues.find(x=>x.id===args[0]);name=`лигу "${l?.name}"`;}msg.textContent=`Удалить ${name}? Это нельзя отменить.`;confirmCallback=()=>{if(type==='match'){matches=matches.filter(x=>x.id!==args[0]);renderAdminMatches();renderAll();}else if(type==='news'){news=news.filter(x=>x.id!==args[0]);renderAdminNews();renderAll();}else if(type==='user'){users=users.filter(x=>x.id!==args[0]);renderUsersTable();}else if(type==='comment'){const[ct,id,ci]=args;const col=ct==='news'?news:matches;const it=col.find(x=>x.id===id);if(it?.comments){it.comments.splice(ci,1);renderAdminComments();renderAll();}}else if(type==='social'){socials=socials.filter(x=>x.id!==args[0]);renderAdminSocials();renderSocialsPage();}else if(type==='standings'){standings=standings.filter(x=>x.id!==args[0]);renderAdminStandings();renderStandings();}else if(type==='league'){leagues=leagues.filter(x=>x.id!==args[0]);renderAdminLeagues();renderLeagues();populateLeagueSelects();}saveData();closeModal('confirm');alert('Удалено!');};yes.onclick=confirmCallback;openModal('confirm');}

// === СОБЫТИЯ МАТЧА ===
function addEventField(){const c=document.getElementById('events-container'),id=`event-${eventCounter++}`;c.innerHTML+=`<div id="${id}" class="event-form"><div class="grid grid-cols-2 gap-2 mb-2"><select class="event-type bg-black border border-gray-700 rounded p-2 text-white text-sm"><option value="goal">⚽ Гол</option><option value="yellow">🟨 Жёлтая</option><option value="red">🟥 Красная</option><option value="sub">🔄 Замена</option><option value="penalty">🎯 Пенальти</option></select><input type="number" class="event-minute bg-black border border-gray-700 rounded p-2 text-white text-sm" placeholder="Минута" min="1" max="120"></div><input type="text" class="event-player bg-black border border-gray-700 rounded p-2 text-white text-sm" placeholder="Игрок"><input type="text" class="event-team bg-black border border-gray-700 rounded p-2 text-white text-sm mt-2" placeholder="Команда (Хозяева/Гости)"><input type="text" class="event-extra bg-black border border-gray-700 rounded p-2 text-white text-sm mt-2" placeholder="Доп. информация"><button type="button" onclick="document.getElementById('${id}').remove()" class="mt-2 text-red-500 text-xs hover:text-red-400">✕ Удалить</button></div>`;}
function addEditEventField(){const c=document.getElementById('edit-events-container'),id=`edit-event-${eventCounter++}`;c.innerHTML+=`<div id="${id}" class="event-form"><div class="grid grid-cols-2 gap-2 mb-2"><select class="event-type bg-black border border-gray-700 rounded p-2 text-white text-sm"><option value="goal">⚽ Гол</option><option value="yellow">🟨 Жёлтая</option><option value="red">🟥 Красная</option><option value="sub">🔄 Замена</option><option value="penalty">🎯 Пенальти</option></select><input type="number" class="event-minute bg-black border border-gray-700 rounded p-2 text-white text-sm" placeholder="Минута" min="1" max="120"></div><input type="text" class="event-player bg-black border border-gray-700 rounded p-2 text-white text-sm" placeholder="Игрок"><input type="text" class="event-team bg-black border border-gray-700 rounded p-2 text-white text-sm mt-2" placeholder="Команда"><input type="text" class="event-extra bg-black border border-gray-700 rounded p-2 text-white text-sm mt-2" placeholder="Доп. информация"><button type="button" onclick="document.getElementById('${id}').remove()" class="mt-2 text-red-500 text-xs hover:text-red-400">✕ Удалить</button></div>`;}
function getEventIcon(t){return{goal:'⚽',yellow:'🟨',red:'🟥',sub:'🔄',penalty:'🎯'}[t]||'•';}
function getEventClass(t){return{goal:'goal',yellow:'yellow',red:'red',sub:'sub',penalty:'penalty'}[t]||'';}
function renderEvents(events,home,away){if(!events?.length)return`<p class="text-gray-500 text-center py-8">События не добавлены</p>`;return events.map(e=>`<div class="event-item ${getEventClass(e.type)}"><div class="event-minute">${e.minute}'</div><span class="event-icon">${getEventIcon(e.type)}</span><div><span class="event-player">${e.player}</span>${e.extra?`<span class="event-extra">• ${e.extra}</span>`:''}</div><span class="event-team">${e.team===home?'🏠 Хозяева':e.team===away?'✈️ Гости':e.team}</span></div>`).join('');}

// === ВКЛАДКИ МАТЧА ===
function switchMatchTab(tab){document.querySelectorAll('.match-tab-btn').forEach(b=>b.classList.remove('active'));document.querySelectorAll('.match-tab-content').forEach(c=>c.classList.remove('active'));event.target.classList.add('active');document.getElementById('tab-'+tab).classList.add('active');}

function openMatchModal(id){const m=matches.find(x=>x.id===id);if(!m)return;const league = leagues.find(l => l.id === m.leagueId); const date=m.date?new Date(m.date).toLocaleString('ru-RU',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';const c=document.getElementById('match-full-content');c.innerHTML=`<div class="text-center mb-8"><div class="text-gkx-green font-bold mb-2">${league?.name||m.league||'Лига'}</div><div class="text-2xl md:text-4xl font-black mb-2">${m.home} ${m.score||'-'} ${m.away}</div><div class="text-gray-400">${date}</div><div class="inline-block mt-2 px-4 py-1 rounded ${m.status==='Live'?'bg-red-500/20 text-red-500':'bg-gray-800 text-gray-400'}">${m.status}</div></div><div class="flex gap-2 border-b border-gray-800 mb-6 overflow-x-auto pb-1"><button class="match-tab-btn active" onclick="switchMatchTab('stats')">📊 Статистика</button><button class="match-tab-btn" onclick="switchMatchTab('info')">ℹ️ Информация</button><button class="match-tab-btn" onclick="switchMatchTab('events')">📋 События</button><button class="match-tab-btn" onclick="switchMatchTab('predictions')">🔮 Прогнозы</button></div><div id="tab-stats" class="match-tab-content active">${m.homePossession!=null?`<div class="bg-gray-900/50 rounded-xl p-6 mb-8"><h3 class="text-xl font-bold mb-4 text-center">Статистика</h3><div class="space-y-4"><div><div class="flex justify-between text-sm mb-1"><span class="font-bold">${m.homePossession}%</span><span class="text-gray-400">Владение</span><span class="font-bold">${m.awayPossession}%</span></div><div class="flex h-2 rounded-full overflow-hidden bg-gray-800"><div class="bg-gkx-green" style="width:${m.homePossession}%"></div><div class="bg-gray-600" style="width:${m.awayPossession}%"></div></div></div><div class="grid grid-cols-3 gap-4 text-center text-sm"><div><div class="text-gray-400 mb-1">Удары</div><div class="font-bold text-lg">${m.homeShots||0} - ${m.awayShots||0}</div></div><div><div class="text-gray-400 mb-1">Угловые</div><div class="font-bold text-lg">${m.homeCorners||0} - ${m.awayCorners||0}</div></div></div></div></div>`:''}<div class="grid md:grid-cols-2 gap-6 mb-8"><div class="bg-gray-900/50 rounded-xl p-6"><h3 class="text-lg font-bold mb-4 text-gkx-green text-center">${m.home}</h3><div class="space-y-2 text-sm">${(m.homeLineup||'Состав не указан').split(',').map(p=>`<div class="flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-gkx-green/20 text-gkx-green flex items-center justify-center text-xs font-bold">11</span><span>${p.trim()}</span></div>`).join('')}</div></div><div class="bg-gray-900/50 rounded-xl p-6"><h3 class="text-lg font-bold mb-4 text-gkx-green text-center">${m.away}</h3><div class="space-y-2 text-sm">${(m.awayLineup||'Состав не указан').split(',').map(p=>`<div class="flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-gkx-green/20 text-gkx-green flex items-center justify-center text-xs font-bold">11</span><span>${p.trim()}</span></div>`).join('')}</div></div></div></div><div id="tab-info" class="match-tab-content"><div class="space-y-4"><div class="match-info-card"><div class="match-info-label">🏟️ Стадион</div><div class="match-info-value"><span class="match-info-icon">📍</span>${m.stadium||'Не указан'}</div>${m.city?`<div class="match-info-value mt-2"><span class="match-info-icon">🏙️</span>${m.city}</div>`:''}</div><div class="grid grid-cols-2 gap-4"><div class="coach-card"><div class="coach-icon">👔</div><div class="coach-name">${m.homeCoach||'Не указан'}</div><div class="coach-team">${m.home}</div></div><div class="coach-card"><div class="coach-icon">👔</div><div class="coach-name">${m.awayCoach||'Не указан'}</div><div class="coach-team">${m.away}</div></div></div></div></div><div id="tab-events" class="match-tab-content"><div class="bg-gray-900/50 rounded-xl p-6">${renderEvents(m.events,m.home,m.away)}</div></div><div id="tab-predictions" class="match-tab-content"><div class="coming-soon"><div class="coming-soon-icon">🚧</div><div class="coming-soon-text">В РАЗРАБОТКЕ</div><div class="coming-soon-sub">Прогнозы на матчи скоро появятся!</div></div></div><div class="border-t border-gray-800 pt-6 mt-6"><h3 class="text-xl font-bold mb-4">Комментарии (${m.comments?.length||0})</h3>${currentUser?`<form onsubmit="addComment('match',${m.id},this)" class="mb-6 flex gap-3"><input type="text" name="text" placeholder="Комментарий..." class="flex-1 bg-black border border-gray-700 rounded p-3 text-white focus:border-gkx-green outline-none" required><button type="submit" class="bg-gkx-green text-gkx-black px-6 py-3 rounded font-bold hover:bg-white transition">Отправить</button></form>`:'<p class="text-gray-500 mb-6"><button onclick="openModal(\'login\')" class="text-gkx-green hover:underline">Войдите</button>, чтобы комментировать</p>'}<div class="space-y-4">${m.comments?.length?m.comments.map((c,i)=>createCommentHTML(c,'match',m.id,i)).join(''):'<p class="text-gray-500 text-center py-8">Нет комментариев</p>'}</div></div>`;openModal('match');}

function openNewsModal(id){const n=news.find(x=>x.id===id);if(!n)return;document.getElementById('news-full-content').innerHTML=`<img src="${n.image}" class="w-full h-64 md:h-96 object-cover rounded-t-xl" alt="${n.title}"><div class="p-8"><h2 class="text-3xl md:text-4xl font-black mb-4 text-gkx-green">${n.title}</h2><div class="text-gray-400 text-sm mb-6">${n.date}</div><div class="prose prose-invert max-w-none text-gray-300 leading-relaxed mb-8">${n.content.replace(/\n/g,'<br>')}</div><div class="border-t border-gray-800 pt-6"><h3 class="text-xl font-bold mb-4">Комментарии (${n.comments?.length||0})</h3>${currentUser?`<form onsubmit="addComment('news',${n.id},this)" class="mb-6 flex gap-3"><input type="text" name="text" placeholder="Комментарий..." class="flex-1 bg-black border border-gray-700 rounded p-3 text-white focus:border-gkx-green outline-none" required><button type="submit" class="bg-gkx-green text-gkx-black px-6 py-3 rounded font-bold hover:bg-white transition">Отправить</button></form>`:'<p class="text-gray-500 mb-6"><button onclick="openModal(\'login\')" class="text-gkx-green hover:underline">Войдите</button>, чтобы комментировать</p>'}<div class="space-y-4">${n.comments?.length?n.comments.map((c,i)=>createCommentHTML(c,'news',n.id,i)).join(''):'<p class="text-gray-500 text-center py-8">Нет комментариев</p>'}</div></div></div>`;openModal('news');}

function createCommentHTML(c,type,itemId,index){const owner=currentUser?.nick===c.nick,admin=currentUser&&users.find(u=>u.id===currentUser.id)?.isAdmin,key=`${type}-${itemId}-${index}`,liked=userLikes[key];return`<div class="bg-gray-900/50 p-4 rounded-lg flex gap-4"><img src="${c.avatar}" class="w-10 h-10 rounded-full"><div class="flex-1"><div class="flex justify-between items-center mb-1"><div class="flex items-center gap-2"><span class="font-bold text-gkx-green">${c.nick}</span>${c.edited?'<span class="text-xs text-gray-500">(изм.)</span>':''}</div><span class="text-xs text-gray-500">${c.date}</span></div><p class="text-gray-300 mb-2">${c.text}</p><div class="flex items-center gap-4"><button onclick="toggleLike('${type}',${itemId},${index})" class="like-btn flex items-center gap-1 text-sm ${liked?'liked':'text-gray-400 hover:text-red-400'}"><svg class="w-5 h-5" fill="${liked?'currentColor':'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg><span>${c.likes||0}</span></button>${owner||admin?`<button onclick="openUserEditCommentModal('${type}',${itemId},${index})" class="text-sm text-gray-400 hover:text-gkx-green">✏️</button><button onclick="confirmUserDeleteComment('${type}',${itemId},${index})" class="text-sm text-gray-400 hover:text-red-500">🗑️</button>`:''}</div></div></div>`;}

function toggleLike(type,itemId,ci){if(!currentUser){alert('Войдите!');openModal('login');return;}const col=type==='news'?news:matches,item=col.find(x=>x.id===itemId);if(!item?.comments?.[ci])return;const key=`${type}-${itemId}-${ci}`,c=item.comments[ci];if(userLikes[key]){userLikes[key]=false;c.likes=(c.likes||1)-1;}else{userLikes[key]=true;c.likes=(c.likes||0)+1;}saveData();type==='news'?openNewsModal(itemId):openMatchModal(itemId);}
function openUserEditCommentModal(type,itemId,ci){const col=type==='news'?news:matches,item=col.find(x=>x.id===itemId);if(!item?.comments?.[ci])return;document.getElementById('edit-c-id').value=ci;document.getElementById('edit-c-type').value=type;document.getElementById('edit-c-item-id').value=itemId;document.getElementById('edit-c-text').value=item.comments[ci].text;openModal('edit-comment');}
function confirmUserDeleteComment(type,itemId,ci){const modal=document.getElementById('modal-confirm'),msg=document.getElementById('confirm-message'),yes=document.getElementById('confirm-yes');msg.textContent='Удалить комментарий?';confirmCallback=()=>{const col=type==='news'?news:matches;const it=col.find(x=>x.id===itemId);if(it?.comments){it.comments.splice(ci,1);saveData();type==='news'?openNewsModal(itemId):openMatchModal(itemId);}closeModal('confirm');};yes.onclick=confirmCallback;openModal('confirm');}
function addComment(type,id,form){if(!currentUser){alert('Войдите!');return;}const text=form.querySelector('input[name="text"]').value,col=type==='news'?news:matches,item=col.find(x=>x.id===id);if(item){item.comments=item.comments||[];item.comments.push({nick:currentUser.nick,avatar:currentUser.avatar,text,date:new Date().toLocaleString('ru-RU'),likes:0,edited:false});saveData();type==='news'?(renderAllNews(),renderHomeNews(),openNewsModal(id)):(renderAllMatches(),renderHomeMatches(),openMatchModal(id));}}

// === АВТОРИЗАЦИЯ ===
document.getElementById('login-form').addEventListener('submit',e=>{e.preventDefault();const nick=document.getElementById('auth-nick').value.trim(),email=document.getElementById('auth-email').value.trim(),phone=document.getElementById('auth-phone').value.trim(),avatar=document.getElementById('auth-avatar').value.trim()||'https://cdn-icons-png.flaticon.com/512/149/149071.png';let user=users.find(u=>u.nick.toLowerCase()===nick.toLowerCase());const isAleks=nick.toLowerCase()==='aleks';if(!user){user={id:Date.now(),nick,email,phone,avatar,isAdmin:isAleks,registeredAt:new Date().toISOString().split('T')[0]};users.push(user);}else if(isAleks&&!user.isAdmin)user.isAdmin=true;if(email)user.email=email;if(phone)user.phone=phone;if(avatar)user.avatar=avatar;currentUser={id:user.id,nick:user.nick,avatar:user.avatar};saveData();updateUserPanel();updateAdminNavLink();closeModal('login');alert(isAleks?`Добро пожаловать, ${nick}! 🎉\nВы АДМИН!`:`Добро пожаловать, ${nick}!`);});
function updateUserPanel(){const p=document.getElementById('user-panel');if(currentUser){p.innerHTML=`<div class="flex items-center gap-3 cursor-pointer" onclick="logout()"><span class="text-sm font-bold text-gray-300 hidden md:block">${currentUser.nick}</span><img src="${currentUser.avatar}" class="w-10 h-10 rounded-full border-2 border-gkx-green"></div>`;}else{p.innerHTML='<button onclick="openModal(\'login\')" class="bg-gkx-green text-gkx-black px-5 py-2 rounded font-bold hover:bg-white transition">Войти</button>';}}
function logout(){currentUser=null;localStorage.removeItem('gkx_currentUser');updateUserPanel();updateAdminNavLink();showSection('home');}

// === УПРАВЛЕНИЕ ЛИГАМИ ===
document.getElementById('add-league-form').addEventListener('submit', e => {
    e.preventDefault();
    const league = {
        id: Date.now(),
        name: document.getElementById('l-name').value,
        country: document.getElementById('l-country').value
    };
    leagues.push(league);
    saveData();
    renderAdminLeagues();
    renderLeagues();
    populateLeagueSelects();
    e.target.reset();
    alert('Лига добавлена!');
});

function openEditLeagueModal(id) {
    const l = leagues.find(x => x.id === id);
    if (!l) return;
    document.getElementById('edit-l-id').value = l.id;
    document.getElementById('edit-l-name').value = l.name;
    document.getElementById('edit-l-country').value = l.country || '';
    openModal('edit-league');
}

document.getElementById('edit-league-form').addEventListener('submit', e => {
    e.preventDefault();
    const id = parseInt(document.getElementById('edit-l-id').value);
    const l = leagues.find(x => x.id === id);
    if (l) {
        l.name = document.getElementById('edit-l-name').value;
        l.country = document.getElementById('edit-l-country').value;
        saveData();
        renderAdminLeagues();
        renderLeagues();
        populateLeagueSelects();
        closeModal('edit-league');
        alert('Лига обновлена!');
    }
});

// === ДОБАВЛЕНИЕ/РЕДАКТИРОВАНИЕ МАТЧА ===
document.getElementById('add-match-form').addEventListener('submit',e=>{e.preventDefault();const leagueId = document.getElementById('m-league-select').value; if(!leagueId){alert('Выберите лигу!');return;} const events=[];document.querySelectorAll('#events-container > div').forEach(div=>{const type=div.querySelector('.event-type').value,min=div.querySelector('.event-minute').value,player=div.querySelector('.event-player').value,team=div.querySelector('.event-team').value,extra=div.querySelector('.event-extra').value;if(min&&player)events.push({type,minute:parseInt(min),player,team,extra});});const m={id:Date.now(),leagueId,league:'',date:document.getElementById('m-date').value,home:document.getElementById('m-home').value,away:document.getElementById('m-away').value,score:document.getElementById('m-score').value||'-',status:document.getElementById('m-status').value,stadium:document.getElementById('m-stadium').value||'',city:document.getElementById('m-city').value||'',homeCoach:document.getElementById('m-home-coach').value||'',awayCoach:document.getElementById('m-away-coach').value||'',homeLineup:document.getElementById('m-home-lineup').value,awayLineup:document.getElementById('m-away-lineup').value,homePossession:document.getElementById('m-home-possession').value||null,awayPossession:document.getElementById('m-away-possession').value||null,homeShots:document.getElementById('m-home-shots').value||null,awayShots:document.getElementById('m-away-shots').value||null,homeCorners:document.getElementById('m-home-corners').value||null,awayCorners:document.getElementById('m-away-possession').value||null,events,comments:[]};matches.unshift(m);saveData();renderAdminMatches();renderAll();e.target.reset();document.getElementById('events-container').innerHTML='';alert('Матч добавлен!');});
function openEditMatchModal(id){const m=matches.find(x=>x.id===id);if(!m)return;populateLeagueSelects();document.getElementById('edit-m-id').value=m.id;document.getElementById('edit-m-league-select').value=m.leagueId||'';document.getElementById('edit-m-league').value=m.league||'';document.getElementById('edit-m-date').value=m.date;document.getElementById('edit-m-home').value=m.home;document.getElementById('edit-m-away').value=m.away;document.getElementById('edit-m-score').value=m.score;document.getElementById('edit-m-status').value=m.status;document.getElementById('edit-m-stadium').value=m.stadium||'';document.getElementById('edit-m-city').value=m.city||'';document.getElementById('edit-m-home-coach').value=m.homeCoach||'';document.getElementById('edit-m-away-coach').value=m.awayCoach||'';document.getElementById('edit-m-home-lineup').value=m.homeLineup||'';document.getElementById('edit-m-away-lineup').value=m.awayLineup||'';document.getElementById('edit-m-home-possession').value=m.homePossession||'';document.getElementById('edit-m-away-possession').value=m.awayPossession||'';document.getElementById('edit-m-home-shots').value=m.homeShots||'';document.getElementById('edit-m-away-shots').value=m.awayShots||'';document.getElementById('edit-m-home-corners').value=m.homeCorners||'';const ec=document.getElementById('edit-events-container');ec.innerHTML='';(m.events||[]).forEach(ev=>{const id=`edit-event-${eventCounter++}`;ec.innerHTML+=`<div id="${id}" class="event-form"><div class="grid grid-cols-2 gap-2 mb-2"><select class="event-type bg-black border border-gray-700 rounded p-2 text-white text-sm"><option value="goal" ${ev.type==='goal'?'selected':''}>⚽ Гол</option><option value="yellow" ${ev.type==='yellow'?'selected':''}>🟨 Жёлтая</option><option value="red" ${ev.type==='red'?'selected':''}>🟥 Красная</option><option value="sub" ${ev.type==='sub'?'selected':''}>🔄 Замена</option><option value="penalty" ${ev.type==='penalty'?'selected':''}>🎯 Пенальти</option></select><input type="number" class="event-minute bg-black border border-gray-700 rounded p-2 text-white text-sm" placeholder="Минута" min="1" max="120" value="${ev.minute||''}"></div><input type="text" class="event-player bg-black border border-gray-700 rounded p-2 text-white text-sm" placeholder="Игрок" value="${ev.player||''}"><input type="text" class="event-team bg-black border border-gray-700 rounded p-2 text-white text-sm mt-2" placeholder="Команда" value="${ev.team||''}"><input type="text" class="event-extra bg-black border border-gray-700 rounded p-2 text-white text-sm mt-2" placeholder="Доп. информация" value="${ev.extra||''}"><button type="button" onclick="document.getElementById('${id}').remove()" class="mt-2 text-red-500 text-xs hover:text-red-400">✕ Удалить</button></div>`;});openModal('edit-match');}
document.getElementById('edit-match-form').addEventListener('submit',e=>{e.preventDefault();const id=parseInt(document.getElementById('edit-m-id').value),m=matches.find(x=>x.id===id);if(m){const leagueId = document.getElementById('edit-m-league-select').value; if(leagueId)m.leagueId=leagueId;m.league=document.getElementById('edit-m-league').value;m.date=document.getElementById('edit-m-date').value;m.home=document.getElementById('edit-m-home').value;m.away=document.getElementById('edit-m-away').value;m.score=document.getElementById('edit-m-score').value;m.status=document.getElementById('edit-m-status').value;m.stadium=document.getElementById('edit-m-stadium').value||'';m.city=document.getElementById('edit-m-city').value||'';m.homeCoach=document.getElementById('edit-m-home-coach').value||'';m.awayCoach=document.getElementById('edit-m-away-coach').value||'';m.homeLineup=document.getElementById('edit-m-home-lineup').value;m.awayLineup=document.getElementById('edit-m-away-lineup').value;m.homePossession=document.getElementById('edit-m-home-possession').value||null;m.awayPossession=document.getElementById('edit-m-away-possession').value||null;m.homeShots=document.getElementById('edit-m-home-shots').value||null;m.awayShots=document.getElementById('edit-m-away-shots').value||null;m.homeCorners=document.getElementById('edit-m-home-corners').value||null;const events=[];document.querySelectorAll('#edit-events-container > div').forEach(div=>{const type=div.querySelector('.event-type').value,min=div.querySelector('.event-minute').value,player=div.querySelector('.event-player').value,team=div.querySelector('.event-team').value,extra=div.querySelector('.event-extra').value;if(min&&player)events.push({type,minute:parseInt(min),player,team,extra});});m.events=events;saveData();renderAdminMatches();renderAll();closeModal('edit-match');alert('Матч обновлён!');}});

// === УПРАВЛЕНИЕ ТАБЛИЦЕЙ ===
document.getElementById('add-standings-form').addEventListener('submit', e => {
    e.preventDefault();
    const leagueId = document.getElementById('s-league-select').value;
    if(!leagueId){alert('Выберите лигу!');return;}
    const team = {
        id: Date.now(),
        leagueId,
        team: document.getElementById('s-team').value,
        played: parseInt(document.getElementById('s-played').value) || 0,
        won: parseInt(document.getElementById('s-won').value) || 0,
        drawn: parseInt(document.getElementById('s-drawn').value) || 0,
        lost: parseInt(document.getElementById('s-lost').value) || 0,
        gf: parseInt(document.getElementById('s-gf').value) || 0,
        ga: parseInt(document.getElementById('s-ga').value) || 0
    };
    standings.push(team);
    saveData();
    renderAdminStandings();
    renderStandings();
    e.target.reset();
    alert('Команда добавлена!');
});

function openEditStandingsModal(id) {
    const s = standings.find(x => x.id === id);
    if (!s) return;
    populateLeagueSelects();
    document.getElementById('edit-s-id').value = s.id;
    document.getElementById('edit-s-league-select').value = s.leagueId || '';
    document.getElementById('edit-s-team').value = s.team;
    document.getElementById('edit-s-played').value = s.played;
    document.getElementById('edit-s-won').value = s.won;
    document.getElementById('edit-s-drawn').value = s.drawn;
    document.getElementById('edit-s-lost').value = s.lost;
    document.getElementById('edit-s-gf').value = s.gf;
    document.getElementById('edit-s-ga').value = s.ga;
    openModal('edit-standings');
}

document.getElementById('edit-standings-form').addEventListener('submit', e => {
    e.preventDefault();
    const id = parseInt(document.getElementById('edit-s-id').value);
    const s = standings.find(x => x.id === id);
    if (s) {
        const leagueId = document.getElementById('edit-s-league-select').value;
        if(leagueId) s.leagueId = leagueId;
        s.team = document.getElementById('edit-s-team').value;
        s.played = parseInt(document.getElementById('edit-s-played').value) || 0;
        s.won = parseInt(document.getElementById('edit-s-won').value) || 0;
        s.drawn = parseInt(document.getElementById('edit-s-drawn').value) || 0;
        s.lost = parseInt(document.getElementById('edit-s-lost').value) || 0;
        s.gf = parseInt(document.getElementById('edit-s-gf').value) || 0;
        s.ga = parseInt(document.getElementById('edit-s-ga').value) || 0;
        saveData();
        renderAdminStandings();
        renderStandings();
        closeModal('edit-standings');
        alert('Команда обновлена!');
    }
});

// === НОВОСТИ ===
function previewImage(input){if(input.files?.[0]){const reader=new FileReader();reader.onload=e=>{tempImageData=e.target.result;document.getElementById('image-preview').querySelector('img').src=tempImageData;document.getElementById('image-preview').classList.remove('hidden');};reader.readAsDataURL(input.files[0]);}}
document.getElementById('add-news-form').addEventListener('submit',e=>{e.preventDefault();const n={id:Date.now(),title:document.getElementById('n-title').value,content:document.getElementById('n-content').value,image:tempImageData||document.getElementById('n-image-url').value||'https://via.placeholder.com/800x400',date:new Date().toISOString().split('T')[0],comments:[]};news.unshift(n);saveData();renderAdminNews();renderAll();e.target.reset();document.getElementById('image-preview').classList.add('hidden');tempImageData=null;alert('Новость добавлена!');});
function openEditNewsModal(id){const n=news.find(x=>x.id===id);if(!n)return;document.getElementById('edit-n-id').value=n.id;document.getElementById('edit-n-title').value=n.title;document.getElementById('edit-n-content').value=n.content;document.getElementById('edit-n-image').value=n.image;openModal('edit-news');}
document.getElementById('edit-news-form').addEventListener('submit',e=>{e.preventDefault();const id=parseInt(document.getElementById('edit-n-id').value),n=news.find(x=>x.id===id);if(n){n.title=document.getElementById('edit-n-title').value;n.content=document.getElementById('edit-n-content').value;n.image=document.getElementById('edit-n-image').value;saveData();renderAdminNews();renderAll();closeModal('edit-news');alert('Новость обновлена!');}});

// === КОММЕНТАРИИ ===
function openEditCommentModal(type,itemId,ci){const col=type==='news'?news:matches;const item=col.find(x=>x.id===itemId);if(!item?.comments?.[ci])return;document.getElementById('edit-c-id').value=ci;document.getElementById('edit-c-type').value=type;document.getElementById('edit-c-item-id').value=itemId;document.getElementById('edit-c-text').value=item.comments[ci].text;openModal('edit-comment');}
document.getElementById('edit-comment-form').addEventListener('submit',e=>{e.preventDefault();const ci=parseInt(document.getElementById('edit-c-id').value),type=document.getElementById('edit-c-type').value,itemId=parseInt(document.getElementById('edit-c-item-id').value),text=document.getElementById('edit-c-text').value;const col=type==='news'?news:matches;const item=col.find(x=>x.id===itemId);if(item?.comments?.[ci]){item.comments[ci].text=text;item.comments[ci].edited=true;saveData();renderAdminComments();renderAll();closeModal('edit-comment');alert('Комментарий обновлён!');}});

// === ПОЛЬЗОВАТЕЛИ ===
function toggleAdminRole(userId){const u=users.find(x=>x.id===userId);if(u){u.isAdmin=!u.isAdmin;saveData();renderUsersTable();}}

init();