// 전역 변수 설정
let token = localStorage.getItem('token');
let user = localStorage.getItem('user');
let nickname = localStorage.getItem('nickname');
let isAdmin = localStorage.getItem('isAdmin') === 'true';
let isLoginMode = true; 
let allEvents = []; 

// ★ [NEW] 이미지가 없거나 깨졌을 때 보여줄 기본 이미지 (회색 박스)
const NO_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 300 160'%3E%3Crect fill='%231e293b' width='300' height='160'/%3E%3Ctext fill='%2394a3b8' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='sans-serif' font-size='20'%3ENo Image%3C/text%3E%3C/svg%3E";

// 시작 시 실행
checkLoginStatus();
loadEvents();

// --- 1. 화면 상태 관리 ---
function checkLoginStatus() {
    const loginView = document.getElementById('login-view');
    const mainView = document.getElementById('main-view');
    const navActions = document.getElementById('nav-actions');
    const createBtn = document.getElementById('createEventBtn');
    const adminBtn = document.getElementById('adminUserBtn');

    if (token) {
        loginView.classList.add('hidden');
        mainView.classList.remove('hidden');
        navActions.innerHTML = `
            <span style="margin-right:15px; font-weight:bold; color:var(--primary); cursor:pointer;" onclick="location.href='profile/my-profile.html'">${nickname}님</span>
            <button class="apply-btn" style="width:auto; padding:5px 15px; background:#ef4444;" onclick="logout()">로그아웃</button>
        `;
        loadMyApps();
        if (isAdmin) {
            createBtn.classList.remove('hidden');
            adminBtn.classList.remove('hidden');
        }
    } else {
        loginView.classList.remove('hidden');
        mainView.classList.add('hidden');
    }
}

// --- 2. 인증 관련 ---
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('authTitle');
    const nickInput = document.getElementById('nickname');
    const msg = document.getElementById('toggleMsg');

    if (isLoginMode) {
        title.innerText = "로그인";
        nickInput.classList.add('hidden'); 
        msg.innerText = "계정이 없으신가요? 회원가입하기";
    } else {
        title.innerText = "회원가입";
        nickInput.classList.remove('hidden'); 
        msg.innerText = "이미 계정이 있으신가요? 로그인하기";
    }
}

async function handleAuth() {
    const id = document.getElementById('username').value;
    const pw = document.getElementById('password').value;
    const nick = document.getElementById('nickname').value;

    if(!id || !pw) return alert('필수 정보 입력');
    if(!isLoginMode && !nick) return alert('닉네임 입력');

    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    const payload = { username: id, password: pw };
    if (!isLoginMode) payload.nickname = nick;

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            if (isLoginMode) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', data.username);
                localStorage.setItem('nickname', data.nickname);
                localStorage.setItem('isAdmin', data.isAdmin);
                location.reload(); 
            } else {
                alert(data.message); toggleAuthMode();
            }
        } else { alert(data.message); }
    } catch (err) { alert('오류'); }
}

function logout() { localStorage.clear(); location.reload(); }

// --- 3. 이벤트 목록 ---
async function loadEvents() {
    try {
        const res = await fetch('/api/events');
        allEvents = await res.json();
        
        const activeGrid = document.getElementById('eventList');
        const calcGrid = document.getElementById('calculatingList');
        const endedGrid = document.getElementById('endedList');
        const calcSection = document.getElementById('calcSection');
        
        activeGrid.innerHTML = '';
        calcGrid.innerHTML = '';
        endedGrid.innerHTML = '';

        const now = new Date();

        allEvents.forEach(evt => {
            const endDate = new Date(evt.endDate);
            const calcStart = evt.calcStartDate ? new Date(evt.calcStartDate) : null;
            const calcEnd = evt.calcEndDate ? new Date(evt.calcEndDate) : null;

            let status = 'active';
            let badgeHtml = '';

            if (now > endDate) {
                if (calcStart && calcEnd && now >= calcStart && now <= calcEnd) {
                    status = 'calculating'; 
                    badgeHtml = '<div class="ended-badge" style="border-color:#f39c12; color:#f39c12;">집계 중</div>';
                } else if (calcEnd && now > calcEnd) {
                    status = 'ended'; 
                    badgeHtml = '<div class="ended-badge">종료됨</div>';
                } else if (!calcStart) {
                    status = 'ended'; 
                    badgeHtml = '<div class="ended-badge">종료됨</div>';
                } else {
                     status = 'calculating';
                     badgeHtml = '<div class="ended-badge" style="border-color:#f39c12; color:#f39c12;">집계 대기</div>';
                }
            }

            let adminBtn = isAdmin ? `<button class="delete-btn" onclick="deleteEvent('${evt._id}')">🗑</button>` : '';
            let cardClass = 'event-card';
            if (status === 'ended') cardClass += ' ended-card';
            
            let btnHtml = '';
            if (status === 'active') {
                btnHtml = `<button class="apply-btn" onclick="joinEvent('${evt._id}', '${evt.title}')">참여하기</button>`;
            } else if (status === 'calculating') {
                btnHtml = `<button class="apply-btn" disabled style="background:#f39c12; color:black; font-weight:bold; cursor:default;">⏳ 결과 집계 중</button>`;
            } else {
                btnHtml = `<button class="apply-btn" disabled style="background:#475569; cursor:not-allowed;">마감되었습니다</button>`;
            }

            // ★ [수정됨] 이미지 처리 로직 (DB에 주소가 없으면 기본 이미지 사용)
            const imgSrc = evt.imgUrl ? `/img/${evt.imgUrl}` : NO_IMAGE;

            const html = `
                <div class="${cardClass}">
                    <div style="position:relative;">
                        <img src="${imgSrc}" class="card-img" onerror="this.src='${NO_IMAGE}'">
                        ${adminBtn} ${badgeHtml}
                    </div>
                    <div class="card-body">
                        <div class="card-date">${evt.startDate.substring(0,10)} ~ ${evt.endDate.substring(0,10)}</div>
                        <div class="card-title">${evt.title}</div>
                        <button class="info-btn" style="pointer-events:auto;" onclick="location.href='event-detail.html?id=${evt._id}'">📄 상세 정보</button>
                        <div style="pointer-events:auto;">${btnHtml}</div>
                    </div>
                </div>
            `;

            if (status === 'active') activeGrid.innerHTML += html;
            else if (status === 'calculating') calcGrid.innerHTML += html;
            else endedGrid.innerHTML += html;
        });

        if (calcGrid.innerHTML !== '') calcSection.classList.remove('hidden');
        else calcSection.classList.add('hidden');

    } catch (err) { console.error(err); }
}

async function loadMyApps() {
    if (!token) return;
    try {
        const res = await fetch('/api/my-apps', { headers: { 'Authorization': `Bearer ${token}` } });
        const apps = await res.json();
        const grid = document.getElementById('myAppList');
        grid.innerHTML = '';
        if (apps.length === 0) grid.innerHTML = '<p style="color:#666;">신청 내역이 없습니다.</p>';
        apps.forEach(app => {
            grid.innerHTML += `
                <div class="event-card" style="border-color:var(--primary);">
                    <div class="card-body">
                        <div class="card-date">신청완료</div>
                        <div class="card-title">${app.eventTitle}</div>
                        <div class="card-desc" style="color:var(--primary);">✅ 참여 확정</div>
                    </div>
                </div>
            `;
        });
    } catch (err) { console.error(err); }
}

async function joinEvent(id, title) {
    if(!confirm('참여하시겠습니까?')) return;
    try {
        const res = await fetch('/api/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ eventId: id, eventTitle: title })
        });
        const d = await res.json();
        if(res.ok) { alert(d.message); loadMyApps(); }
        else alert(d.message);
    } catch(e) { alert('오류'); }
}

async function deleteEvent(id) {
    event.stopPropagation();
    if(!confirm('삭제하시겠습니까?')) return;
    try {
        const res = await fetch(`/api/events/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if(res.ok) { loadEvents(); } else { alert('실패'); }
    } catch(e) { alert('오류'); }
}

function openAdminModal() {
    document.getElementById('adminModal').classList.remove('hidden');
    loadPendingUsers();
}
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

async function loadPendingUsers() {
    const res = await fetch('/api/admin/pending-users', { headers: { 'Authorization': `Bearer ${token}` } });
    const users = await res.json();
    const list = document.getElementById('pendingList');
    list.innerHTML = '';
    users.forEach(u => {
        list.innerHTML += `<div style="margin-bottom:10px;">${u.nickname} (${u.username}) <button onclick="approveUser('${u._id}')">승인</button></div>`;
    });
}
async function approveUser(id) {
    await fetch('/api/admin/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ targetUserId: id })
    });
    loadPendingUsers();
}