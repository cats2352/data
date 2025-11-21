// 전역 변수 설정
let token = localStorage.getItem('token');
let user = localStorage.getItem('user'); // nickname
let nickname = localStorage.getItem('nickname');
let isAdmin = localStorage.getItem('isAdmin') === 'true';
let isLoginMode = true;
let allEvents = [];
let countdownInterval = null;

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

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('authTitle');
    const msg = document.getElementById('toggleMsg');
    const rememberArea = document.getElementById('rememberMe').parentElement.parentElement;

    if (isLoginMode) {
        title.innerText = "로그인";
        msg.innerText = "계정이 없으신가요? 회원가입하기";
        rememberArea.classList.remove('hidden'); 
    } else {
        title.innerText = "회원가입";
        msg.innerText = "이미 계정이 있으신가요? 로그인하기";
        rememberArea.classList.add('hidden'); 
    }
}

async function handleAuth() {
    const nick = document.getElementById('nickname').value;
    const pw = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    if(!nick || !pw) return alert('닉네임과 비밀번호를 입력해주세요.');
    
    if (!isLoginMode) {
        if (nick.length > 10) return alert('닉네임은 10글자 이내로 입력해주세요.');
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

function logout() { localStorage.clear(); location.href = '/'; }

// --- 3. 이벤트 목록 ---
async function loadEvents() {
    try {
        const res = await fetch('/api/events');
        if (!res.ok) throw new Error(`서버 에러 (${res.status})`);

        allEvents = await res.json();
        const activeGrid = document.getElementById('eventList');
        const calcGrid = document.getElementById('calculatingList');
        const endedGrid = document.getElementById('endedList');
        const calcSection = document.getElementById('calcSection');
        
        activeGrid.innerHTML = '';
        calcGrid.innerHTML = '';
        endedGrid.innerHTML = '';

        const now = new Date();

        if (countdownInterval) clearInterval(countdownInterval);

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

            // ★ [수정됨] 이미지 처리 로직
            let imgHtml = '';
            if (evt.imgUrl) {
                // 이미지가 있으면 표시하되, 에러(404 등) 발생 시 숨기고 텍스트 박스를 보여줌
                imgHtml = `
                    <img src="/img/${evt.imgUrl}" class="card-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="card-img-placeholder" style="display:none;">${evt.title}</div>
                `;
            } else {
                // 이미지가 없으면 바로 텍스트 박스 표시
                imgHtml = `<div class="card-img-placeholder">${evt.title}</div>`;
            }
            
            let adminBtn = '';
            if (isAdmin) {
                adminBtn = `
                    <div style="position:absolute; top:10px; right:10px; z-index:10; display:flex; gap:5px;">
                        <button class="delete-btn" style="background:#3498db;" onclick="editEvent(event, '${evt._id}')">✏️</button>
                        <button class="delete-btn" onclick="deleteEvent('${evt._id}')">🗑</button>
                    </div>
                `;
            }
            
            let cardClass = 'event-card';
            if (status === 'ended') cardClass += ' ended-card';
            
            let btnHtml = '';
            let dateDisplayHtml = '';

            if (status === 'active') {
                btnHtml = `<button class="apply-btn" onclick="joinEvent('${evt._id}', '${evt.title}')">참여하기</button>`;
                dateDisplayHtml = `<div class="card-date countdown-timer" data-end="${evt.endDate}" style="color:#2ecc71; font-weight:bold;">⏳ 계산 중...</div>`;
            } else {
                if (status === 'calculating') btnHtml = `<button class="apply-btn" disabled style="background:#f39c12; color:black; font-weight:bold; cursor:default;">⏳ 결과 집계 중</button>`;
                else btnHtml = `<button class="apply-btn" disabled style="background:#475569; cursor:not-allowed;">마감되었습니다</button>`;
                
                const startStr = formatDateShort(evt.startDate);
                const endStr = formatDateShort(evt.endDate);
                dateDisplayHtml = `<div class="card-date">${startStr} ~ ${endStr}</div>`;
            }

            const html = `
                <div class="${cardClass}">
                    <div style="position:relative;">
                        ${imgHtml}
                        ${adminBtn} 
                        ${badgeHtml}
                    </div>
                    <div class="card-body">
                        ${dateDisplayHtml}
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

        startCountdownTimer();

    } catch (err) { 
        console.error("이벤트 로드 실패:", err);
        const grid = document.getElementById('eventList');
        if(grid) grid.innerHTML = `<p style="color:#f43f5e; padding:20px;">데이터를 불러오지 못했습니다.</p>`;
    }
}

function startCountdownTimer() {
    const updateTimers = () => {
        const timers = document.querySelectorAll('.countdown-timer');
        const now = new Date();

        timers.forEach(timer => {
            const endDate = new Date(timer.dataset.end);
            const diff = endDate - now;

            if (diff <= 0) {
                timer.innerText = "마감되었습니다";
                timer.style.color = "#f43f5e";
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            timer.innerText = `⏳ 남은 시간: ${days}일 ${hours}시간 ${minutes}분 ${seconds}초`;
        });
    };

    updateTimers(); 
    countdownInterval = setInterval(updateTimers, 1000); 
}

async function loadMyApps() {
    if (!token) return;
    try {
        const res = await fetch('/api/my-apps', { headers: { 'Authorization': `Bearer ${token}` } });
        
        if (!res.ok) {
            if (res.status === 403 || res.status === 401) {
                console.warn("토큰이 만료되어 로그아웃합니다.");
                logout();
                return;
            }
            throw new Error("내역 불러오기 실패");
        }

        const apps = await res.json();
        const grid = document.getElementById('myAppList');
        grid.innerHTML = '';
        
        if (!Array.isArray(apps) || apps.length === 0) {
            grid.innerHTML = '<p style="color:#666;">아직 참여한 내역이 없습니다.</p>';
            return;
        }

        const now = new Date();
        
        apps.forEach(app => {
            const endDate = new Date(app.eventEndDate); 
            const calcStart = app.calcStartDate ? new Date(app.calcStartDate) : null;
            const calcEnd = app.calcEndDate ? new Date(app.calcEndDate) : null;

            let badgeHtml = '';
            let statusText = '';
            let subText = '';

            // 1. 로또 이벤트
            if (app.eventType === 'lotto') {
                const hasChecked = app.drawResults && app.drawResults.length > 0;

                if (hasChecked) {
                    badgeHtml = `<span style="color:#94a3b8; border:1px solid #94a3b8; padding:1px 5px; border-radius:4px; font-size:0.75rem; margin-right:5px;">종료</span>`;
                    statusText = '📜 결과 확인 완료';
                } else {
                    if (now <= endDate) {
                        badgeHtml = `<span style="color:#2ecc71; border:1px solid #2ecc71; padding:1px 5px; border-radius:4px; font-size:0.75rem; margin-right:5px;">진행중</span>`;
                        statusText = `🎰 로또 ${app.ticketCount}개 보유`;
                        subText = `<div style="color:#94a3b8; font-size:0.85rem; margin-top:5px;">종료 후 결과를 확인하세요.</div>`;
                    } else {
                        badgeHtml = `<span style="color:#f39c12; border:1px solid #f39c12; padding:1px 5px; border-radius:4px; font-size:0.75rem; font-weight:bold; margin-right:5px;">결과확인</span>`;
                        statusText = `🎰 로또 ${app.ticketCount}개`;
                        subText = `<div style="color:#f39c12; font-weight:bold; font-size:0.85rem; margin-top:5px;">👉 결과를 확인해보세요!</div>`;
                    }
                }
            } 
            // 2. 그 외 이벤트
            else {
                let isEnded = false;
                let isCalculating = false;

                if (now > endDate) {
                    if (calcStart && calcEnd) {
                        if (now >= calcStart && now <= calcEnd) isCalculating = true;
                        else if (now > calcEnd) isEnded = true;
                        else isEnded = true; 
                    } else {
                        isEnded = true;
                    }
                }

                if (isCalculating) {
                    badgeHtml = `<span style="color:#f39c12; border:1px solid #f39c12; padding:1px 5px; border-radius:4px; font-size:0.75rem; margin-right:5px;">집계중</span>`;
                    statusText = '⏳ 결과 집계 중';
                } else if (isEnded) {
                    badgeHtml = `<span style="color:#94a3b8; border:1px solid #94a3b8; padding:1px 5px; border-radius:4px; font-size:0.75rem; margin-right:5px;">종료</span>`;
                    if (app.drawResults && app.drawResults.length > 0) {
                        statusText = `🎉 당첨! [${app.drawResults.join(', ')}]`;
                        subText = `<div style="color:#2ecc71; font-size:0.85rem; margin-top:5px;">축하합니다!</div>`;
                    } else {
                        statusText = '🏁 이벤트 종료';
                        subText = `<div style="color:#94a3b8; font-size:0.85rem; margin-top:5px;">참여해주셔서 감사합니다.</div>`;
                    }
                } else {
                    badgeHtml = `<span style="color:#2ecc71; border:1px solid #2ecc71; padding:1px 5px; border-radius:4px; font-size:0.75rem; margin-right:5px;">진행중</span>`;
                    statusText = '✅ 참여 완료';
                }
            }

            grid.innerHTML += `
                <div class="event-card" style="border-color:var(--primary); cursor:pointer;" onclick="location.href='event-detail.html?id=${app.eventId}'">
                    <div class="card-body">
                        <div class="card-date" style="display:flex; align-items:center;">
                            ${badgeHtml} 
                            <span>참여일: ${formatDateShort(app.appliedAt)}</span>
                        </div>
                        <div class="card-title" style="margin-top:8px;">${app.eventTitle}</div>
                        <div class="card-desc" style="color:var(--primary); font-weight:bold;">
                            ${statusText}
                            ${subText}
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (err) { 
        console.error("내역 로드 중 오류:", err);
        const grid = document.getElementById('myAppList');
        if(grid) grid.innerHTML = `<p style="color:#f43f5e;">정보를 불러올 수 없습니다.</p>`;
    }
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

function editEvent(event, eventId) {
    event.stopPropagation();
    location.href = `create-event.html?id=${eventId}`;
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
    loadAdminUsers();
}
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

async function loadAdminUsers() {
    const pendingList = document.getElementById('pendingList');
    const approvedList = document.getElementById('approvedList');
    
    try {
        const resP = await fetch('/api/admin/pending-users', { headers: { 'Authorization': `Bearer ${token}` } });
        const pendingUsers = await resP.json();
        pendingList.innerHTML = '';
        
        if (pendingUsers.length === 0) {
            pendingList.innerHTML = '<p style="color:#666; font-size:0.9rem;">대기 중인 요청이 없습니다.</p>';
        } else {
            pendingUsers.forEach(u => {
                pendingList.innerHTML += `
                    <div style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                        <span>${u.nickname}</span>
                        <div style="display:flex; gap:5px;">
                            <button onclick="approveUser('${u._id}')" style="background:#2ecc71; border:none; color:white; padding:5px 10px; border-radius:5px; cursor:pointer;">승인</button>
                            <button onclick="rejectUser('${u._id}')" style="background:#ef4444; border:none; color:white; padding:5px 10px; border-radius:5px; cursor:pointer;">거절</button>
                        </div>
                    </div>`;
            });
        }
    } catch(e) { console.error(e); }

    try {
        const resA = await fetch('/api/admin/approved-users', { headers: { 'Authorization': `Bearer ${token}` } });
        const approvedUsers = await resA.json();
        approvedList.innerHTML = '';

        if (approvedUsers.length === 0) {
            approvedList.innerHTML = '<p style="color:#666; font-size:0.9rem;">승인된 유저가 없습니다.</p>';
        } else {
            approvedUsers.forEach(u => {
                const isMe = (u.nickname === user); 
                const btnHtml = isMe 
                    ? `<span style="color:#666; font-size:0.8rem;">(나)</span>` 
                    : `<button onclick="unapproveUser('${u._id}')" style="background:#ef4444; border:none; color:white; padding:5px 10px; border-radius:5px; cursor:pointer;">취소</button>`;

                approvedList.innerHTML += `
                    <div style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                        <span>${u.nickname}</span>
                        ${btnHtml}
                    </div>`;
            });
        }
    } catch(e) { console.error(e); }
}

async function approveUser(id) {
    if(!confirm('이 유저를 승인하시겠습니까?')) return;
    await fetch('/api/admin/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ targetUserId: id })
    });
    loadAdminUsers(); 
}

async function unapproveUser(id) {
    if(!confirm('승인을 취소하시겠습니까?\n해당 유저는 다시 승인받기 전까지 로그인이 차단됩니다.')) return;
    await fetch('/api/admin/unapprove', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ targetUserId: id })
    });
    loadAdminUsers(); 
}

async function rejectUser(id) {
    if(!confirm('정말 가입 요청을 거절(삭제)하시겠습니까?\n삭제된 계정은 복구할 수 없습니다.')) return;
    try {
        const res = await fetch(`/api/admin/user/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            loadAdminUsers();
        } else {
            alert('삭제 실패');
        }
    } catch(e) { console.error(e); }
}

function formatDateShort(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return `${date.getFullYear()}.${date.getMonth()+1}.${date.getDate()}`;
}