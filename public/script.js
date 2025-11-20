// 전역 변수 설정
let token = localStorage.getItem('token');
let user = localStorage.getItem('user'); // 이제 이건 nickname과 동일
let nickname = localStorage.getItem('nickname');
let isAdmin = localStorage.getItem('isAdmin') === 'true';
let isLoginMode = true;
let allEvents = [];

const NO_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 300 160'%3E%3Crect fill='%231e293b' width='300' height='160'/%3E%3Ctext fill='%2394a3b8' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='sans-serif' font-size='20'%3ENo Image%3C/text%3E%3C/svg%3E";

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

// --- 2. 인증 관련 (수정됨) ---
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('authTitle');
    const msg = document.getElementById('toggleMsg');
    const rememberArea = document.getElementById('rememberMe').parentElement.parentElement;

    // 닉네임과 비밀번호는 둘 다 항상 보임 (닉네임이 ID 역할이므로)
    if (isLoginMode) {
        title.innerText = "로그인";
        msg.innerText = "계정이 없으신가요? 회원가입하기";
        rememberArea.classList.remove('hidden'); // 로그인 유지 체크박스 보이기
    } else {
        title.innerText = "회원가입";
        msg.innerText = "이미 계정이 있으신가요? 로그인하기";
        rememberArea.classList.add('hidden'); // 회원가입 땐 숨기기
    }
}

async function handleAuth() {
    // 아이디(username) 입력값 받지 않음
    const nick = document.getElementById('nickname').value;
    const pw = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    if(!nick || !pw) return alert('닉네임과 비밀번호를 입력해주세요.');
    
    // 클라이언트 측 유효성 검사 (UX 향상)
    if (!isLoginMode) {
        if (nick.length > 10) return alert('닉네임은 10글자 이내로 입력해주세요.');
        // 영문, 숫자, 특수문자 포함 정규식
        const pwRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{4,}$/;
        if (!pwRegex.test(pw)) return alert('비밀번호는 영문, 숫자, 특수문자를 모두 포함해야 합니다.');
    }

    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    const payload = { nickname: nick, password: pw, rememberMe };

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            if (isLoginMode) {
                // user = nickname
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', data.nickname);
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

// --- 3. 이벤트 목록 (기존 동일) ---
async function loadEvents() {
    try {
        const res = await fetch('/api/events');
        if (!res.ok) throw new Error(`서버 에러 (${res.status})`);
        allEvents = await res.json();
        const activeGrid = document.getElementById('eventList');
        const calcGrid = document.getElementById('calculatingList');
        const endedGrid = document.getElementById('endedList');
        const calcSection = document.getElementById('calcSection');
        activeGrid.innerHTML = ''; calcGrid.innerHTML = ''; endedGrid.innerHTML = '';
        const now = new Date();
        allEvents.forEach(evt => {
            const endDate = new Date(evt.endDate);
            const calcStart = evt.calcStartDate ? new Date(evt.calcStartDate) : null;
            const calcEnd = evt.calcEndDate ? new Date(evt.calcEndDate) : null;
            let status = 'active'; let badgeHtml = '';
            if (now > endDate) {
                if (calcStart && calcEnd && now >= calcStart && now <= calcEnd) {
                    status = 'calculating'; badgeHtml = '<div class="ended-badge" style="border-color:#f39c12; color:#f39c12;">집계 중</div>';
                } else if (calcEnd && now > calcEnd) {
                    status = 'ended'; badgeHtml = '<div class="ended-badge">종료됨</div>';
                } else if (!calcStart) {
                    status = 'ended'; badgeHtml = '<div class="ended-badge">종료됨</div>';
                } else {
                     status = 'calculating'; badgeHtml = '<div class="ended-badge" style="border-color:#f39c12; color:#f39c12;">집계 대기</div>';
                }
            }
            const imgSrc = evt.imgUrl ? `/img/${evt.imgUrl}` : (typeof NO_IMAGE !== 'undefined' ? NO_IMAGE : '');
            let adminBtn = '';
            if (isAdmin) {
                adminBtn = `<div style="position:absolute; top:10px; right:10px; z-index:10; display:flex; gap:5px;"><button class="delete-btn" style="background:#3498db;" onclick="editEvent(event, '${evt._id}')">✏️</button><button class="delete-btn" onclick="deleteEvent('${evt._id}')">🗑</button></div>`;
            }
            let cardClass = 'event-card'; if (status === 'ended') cardClass += ' ended-card';
            let btnHtml = '';
            if (status === 'active') btnHtml = `<button class="apply-btn" onclick="joinEvent('${evt._id}', '${evt.title}')">참여하기</button>`;
            else if (status === 'calculating') btnHtml = `<button class="apply-btn" disabled style="background:#f39c12; color:black; font-weight:bold; cursor:default;">⏳ 결과 집계 중</button>`;
            else btnHtml = `<button class="apply-btn" disabled style="background:#475569; cursor:not-allowed;">마감되었습니다</button>`;
            
            const startStr = formatDateShort(evt.startDate); const endStr = formatDateShort(evt.endDate);
            const html = `<div class="${cardClass}"><div style="position:relative;"><img src="${imgSrc}" class="card-img" onerror="this.src='${NO_IMAGE}'">${adminBtn}${badgeHtml}</div><div class="card-body"><div class="card-date">${startStr} ~ ${endStr}</div><div class="card-title">${evt.title}</div><button class="info-btn" style="pointer-events:auto;" onclick="location.href='event-detail.html?id=${evt._id}'">📄 상세 정보</button><div style="pointer-events:auto;">${btnHtml}</div></div></div>`;
            if (status === 'active') activeGrid.innerHTML += html; else if (status === 'calculating') calcGrid.innerHTML += html; else endedGrid.innerHTML += html;
        });
        if (calcGrid.innerHTML !== '') calcSection.classList.remove('hidden'); else calcSection.classList.add('hidden');
    } catch (err) { const grid = document.getElementById('eventList'); if(grid) grid.innerHTML = `<p style="color:#f43f5e; padding:20px;">데이터를 불러오지 못했습니다.</p>`; }
}
async function loadMyApps() {
    if (!token) return;
    try {
        const res = await fetch('/api/my-apps', { headers: { 'Authorization': `Bearer ${token}` } });
        const apps = await res.json();
        const grid = document.getElementById('myAppList'); grid.innerHTML = '';
        if (apps.length === 0) grid.innerHTML = '<p style="color:#666;">신청 내역이 없습니다.</p>';
        apps.forEach(app => { grid.innerHTML += `<div class="event-card" style="border-color:var(--primary);"><div class="card-body"><div class="card-date">신청완료</div><div class="card-title">${app.eventTitle}</div><div class="card-desc" style="color:var(--primary);">✅ 참여 확정</div></div></div>`; });
    } catch (err) { console.error(err); }
}
async function joinEvent(id, title) {
    if(!confirm('참여하시겠습니까?')) return;
    try {
        const res = await fetch('/api/apply', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ eventId: id, eventTitle: title }) });
        const d = await res.json(); if(res.ok) { alert(d.message); loadMyApps(); } else alert(d.message);
    } catch(e) { alert('오류'); }
}
function editEvent(event, eventId) { event.stopPropagation(); location.href = `create-event.html?id=${eventId}`; }
async function deleteEvent(id) {
    event.stopPropagation(); if(!confirm('삭제하시겠습니까?')) return;
    try { const res = await fetch(`/api/events/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); if(res.ok) { loadEvents(); } else { alert('실패'); } } catch(e) { alert('오류'); }
}
function openAdminModal() { document.getElementById('adminModal').classList.remove('hidden'); loadAdminUsers(); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ★ [수정됨] 관리자 모달에서 username 제거하고 nickname만 표시
async function loadAdminUsers() {
    const pendingList = document.getElementById('pendingList');
    const approvedList = document.getElementById('approvedList');
    try {
        const resP = await fetch('/api/admin/pending-users', { headers: { 'Authorization': `Bearer ${token}` } });
        const pendingUsers = await resP.json();
        pendingList.innerHTML = '';
        if (pendingUsers.length === 0) pendingList.innerHTML = '<p style="color:#666; font-size:0.9rem;">대기 중인 요청이 없습니다.</p>';
        else {
            pendingUsers.forEach(u => {
                pendingList.innerHTML += `<div style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;"><span>${u.nickname}</span><div style="display:flex; gap:5px;"><button onclick="approveUser('${u._id}')" style="background:#2ecc71; border:none; color:white; padding:5px 10px; border-radius:5px; cursor:pointer;">승인</button><button onclick="rejectUser('${u._id}')" style="background:#ef4444; border:none; color:white; padding:5px 10px; border-radius:5px; cursor:pointer;">거절</button></div></div>`;
            });
        }
    } catch(e) { console.error(e); }
    try {
        const resA = await fetch('/api/admin/approved-users', { headers: { 'Authorization': `Bearer ${token}` } });
        const approvedUsers = await resA.json();
        approvedList.innerHTML = '';
        if (approvedUsers.length === 0) approvedList.innerHTML = '<p style="color:#666; font-size:0.9rem;">승인된 유저가 없습니다.</p>';
        else {
            approvedUsers.forEach(u => {
                const isMe = (u.nickname === user); // user 변수엔 nickname이 들어감
                const btnHtml = isMe ? `<span style="color:#666; font-size:0.8rem;">(나)</span>` : `<button onclick="unapproveUser('${u._id}')" style="background:#ef4444; border:none; color:white; padding:5px 10px; border-radius:5px; cursor:pointer;">취소</button>`;
                approvedList.innerHTML += `<div style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;"><span>${u.nickname}</span>${btnHtml}</div>`;
            });
        }
    } catch(e) { console.error(e); }
}
async function approveUser(id) {
    if(!confirm('이 유저를 승인하시겠습니까?')) return;
    await fetch('/api/admin/approve', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ targetUserId: id }) });
    loadAdminUsers(); 
}
async function unapproveUser(id) {
    if(!confirm('승인을 취소하시겠습니까?')) return;
    await fetch('/api/admin/unapprove', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ targetUserId: id }) });
    loadAdminUsers(); 
}
async function rejectUser(id) {
    if(!confirm('정말 거절하시겠습니까?')) return;
    const res = await fetch(`/api/admin/user/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) loadAdminUsers(); else alert('실패');
}
function formatDateShort(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return `${date.getFullYear()}.${date.getMonth()+1}.${date.getDate()}`;
}