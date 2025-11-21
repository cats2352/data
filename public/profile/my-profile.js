const token = localStorage.getItem('token');
if (!token) {
    alert('로그인이 필요합니다.');
    location.href = '/';
}

let myApps = []; 

// 초기 실행
loadProfile();
loadHistory();

async function loadProfile() {
    try {
        // 내 정보 가져오기
        const res = await fetch('/api/me', { headers: { 'Authorization': `Bearer ${token}` } });
        const user = await res.json();

        // 프로필 렌더링
        document.getElementById('profileName').innerText = user.nickname;
        document.getElementById('profileInitial').innerText = user.nickname.charAt(0).toUpperCase();
        document.getElementById('profileDate').innerText = `가입일: ${new Date(user.createdAt).toLocaleDateString()}`;
        
        const badge = document.getElementById('profileBadge');
        if (user.isAdmin) badge.innerHTML = '<span class="badge admin">👑 관리자</span>';
        else badge.innerHTML = '<span class="badge">🐣 일반 회원</span>';

    } catch (err) { console.error(err); }
}

async function loadHistory() {
    try {
        // 내 신청 내역 가져오기
        const res = await fetch('/api/my-apps', { headers: { 'Authorization': `Bearer ${token}` } });
        myApps = await res.json();

        // 통계 계산 (당첨 횟수만 카운트)
        let winCount = 0;

        myApps.forEach(app => {
            if (app.drawResults && app.drawResults.length > 0) {
                const wins = app.drawResults.filter(r => r !== '꽝');
                if (wins.length > 0) {
                    winCount++;
                }
            }
        });

        // 통계 표시
        document.getElementById('statTotal').innerText = myApps.length;
        document.getElementById('statWin').innerText = winCount;

        // ★ 명예의 전당 렌더링 로직 삭제됨

        // 초기 리스트 렌더링 (전체)
        renderHistoryList(myApps);

    } catch (err) { console.error(err); }
}

// 리스트 렌더링 (필터링 지원)
function renderHistoryList(list) {
    const container = document.getElementById('historyList');
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">기록이 없습니다.</p>';
        return;
    }

    list.forEach(app => {
        let statusHtml = '<span class="hist-status st-ongoing">참여중</span>';
        let isWin = false;

        if (app.drawResults && app.drawResults.length > 0) {
            const wins = app.drawResults.filter(r => r !== '꽝');
            if (wins.length > 0) {
                statusHtml = `<span class="hist-status st-win">🎉 당첨: ${wins.join(', ')}</span>`;
                isWin = true;
            } else {
                statusHtml = '<span class="hist-status st-ended">꽝 (낙첨)</span>';
            }
        }

        const itemDiv = document.createElement('div');
        itemDiv.className = 'history-item';
        itemDiv.dataset.status = isWin ? 'win' : (app.drawResults.length > 0 ? 'ended' : 'ongoing');

        itemDiv.innerHTML = `
            <div>
                <span class="hist-title">${app.eventTitle}</span>
                <span class="hist-date">${new Date(app.appliedAt).toLocaleDateString()} 참여</span>
            </div>
            ${statusHtml}
        `;
        container.appendChild(itemDiv);
    });
}

// 탭 필터링 기능
function filterHistory(mode) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    const container = document.getElementById('historyList');
    container.innerHTML = ''; 

    let filtered = [];
    if (mode === 'all') {
        filtered = myApps;
    } else if (mode === 'ongoing') {
        filtered = myApps.filter(app => !app.drawResults || app.drawResults.length === 0);
    } else if (mode === 'ended') {
        filtered = myApps.filter(app => app.drawResults && app.drawResults.length > 0);
    }

    renderHistoryList(filtered);
}

function logout() {
    localStorage.clear();
    location.href = '/';
}