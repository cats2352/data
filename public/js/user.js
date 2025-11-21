// 유저 기능 (내 참여 내역, 참여 버튼)
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
            } else {
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
                        <div class="card-desc" style="color:var(--primary); font-weight:bold;">${statusText}${subText}</div>
                    </div>
                </div>`;
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