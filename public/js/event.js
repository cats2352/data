// 이벤트 목록 조회, 타이머, 수정/삭제
let allEvents = [];
let countdownInterval = null;

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

            let imgHtml = evt.imgUrl ? 
                `<img src="/img/${evt.imgUrl}" class="card-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="card-img-placeholder" style="display:none;">${evt.title}</div>` : 
                `<div class="card-img-placeholder">${evt.title}</div>`;
            
            let adminBtn = '';
            if (isAdmin) {
                adminBtn = `
                    <div style="position:absolute; top:10px; right:10px; z-index:10; display:flex; gap:5px;">
                        <button class="delete-btn" style="background:#3498db;" onclick="editEvent(event, '${evt._id}')">✏️</button>
                        <button class="delete-btn" onclick="deleteEvent('${evt._id}')">🗑</button>
                    </div>`;
            }
            
            let cardClass = status === 'ended' ? 'event-card ended-card' : 'event-card';
            
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
                    <div style="position:relative;">${imgHtml}${adminBtn}${badgeHtml}</div>
                    <div class="card-body">
                        ${dateDisplayHtml}
                        <div class="card-title">${evt.title}</div>
                        <button class="info-btn" style="pointer-events:auto;" onclick="location.href='event-detail.html?id=${evt._id}'">📄 상세 정보</button>
                        <div style="pointer-events:auto;">${btnHtml}</div>
                    </div>
                </div>`;

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