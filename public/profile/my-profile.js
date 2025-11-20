const token = localStorage.getItem('token');
if (!token) {
    alert('로그인이 필요합니다.');
    location.href = '/';
}

let myApps = []; // 필터링을 위해 전체 데이터 저장

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

        // 통계 계산
        let totalTickets = 0;
        let winCount = 0;
        const winningItems = []; // 명예의 전당용

        myApps.forEach(app => {
            totalTickets += (app.ticketCount || 0);
            
            // 당첨 여부 확인 (drawResults에 '꽝'이 아닌 게 있으면 당첨)
            if (app.drawResults && app.drawResults.length > 0) {
                const wins = app.drawResults.filter(r => r !== '꽝');
                if (wins.length > 0) {
                    winCount++;
                    wins.forEach(w => winningItems.push({ item: w, event: app.eventTitle }));
                }
            }
        });

        // 통계 표시
        document.getElementById('statTotal').innerText = myApps.length;
        document.getElementById('statWin').innerText = winCount;
        document.getElementById('statTicket').innerText = totalTickets;

        // 명예의 전당 렌더링
        const winGrid = document.getElementById('winningList');
        winGrid.innerHTML = '';
        if (winningItems.length === 0) {
            winGrid.innerHTML = '<p style="color:#666; grid-column:1/-1; text-align:center;">아직 당첨 내역이 없습니다. 도전하세요!</p>';
        } else {
            winningItems.forEach(w => {
                winGrid.innerHTML += `
                    <div class="win-card">
                        <div class="win-item">${w.item}</div>
                        <div class="win-event">${w.event}</div>
                    </div>
                `;
            });
        }

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
        // 상태 판단 로직 (간소화: 결과가 있으면 '종료/당첨', 없으면 '진행중'으로 가정)
        // *서버에서 event 정보를 같이 보내주지 않으면 정확한 '종료' 판단이 어려울 수 있음.
        // *현재 /api/my-apps는 eventId만 줌. 정확도를 위해선 API 수정이 필요하지만,
        // *여기선 drawResults 유무로 1차 판단합니다.
        
        let statusHtml = '<span class="hist-status st-ongoing">진행중</span>';
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

        // 필터링 태그를 DOM 요소에 저장
        const itemDiv = document.createElement('div');
        itemDiv.className = 'history-item';
        // 필터링용 속성
        itemDiv.dataset.status = isWin ? 'win' : (app.drawResults.length > 0 ? 'ended' : 'ongoing');

        itemDiv.innerHTML = `
            <div>
                <span class="hist-title">${app.eventTitle}</span>
                <span class="hist-date">${new Date(app.appliedAt).toLocaleDateString()} 참여 | 티켓 ${app.ticketCount}장</span>
            </div>
            ${statusHtml}
        `;
        container.appendChild(itemDiv);
    });
}

// 탭 필터링 기능
function filterHistory(mode) {
    // 버튼 활성화 스타일
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    const container = document.getElementById('historyList');
    container.innerHTML = ''; // 비우고 다시 그림

    let filtered = [];
    if (mode === 'all') {
        filtered = myApps;
    } else if (mode === 'ongoing') {
        // 결과가 없는 것
        filtered = myApps.filter(app => !app.drawResults || app.drawResults.length === 0);
    } else if (mode === 'ended') {
        // 결과가 있는 것
        filtered = myApps.filter(app => app.drawResults && app.drawResults.length > 0);
    }

    renderHistoryList(filtered);
}

function logout() {
    localStorage.clear();
    location.href = '/';
}