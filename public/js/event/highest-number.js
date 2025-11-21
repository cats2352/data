// [제일 높은 숫자 뽑기] 이벤트 전용 로직

/**
 * 1. 숫자 뽑기 애니메이션 실행
 * @param {number} targetNumber - 서버에서 받은 최종 숫자
 * @param {function} onFinish - 확인 버튼 클릭 시 실행할 콜백
 */
function playNumberAnimation(targetNumber, onFinish) {
    // 모달 HTML 동적 생성 (없을 경우)
    if (!document.getElementById('numberAnimModal')) {
        const modalHtml = `
        <div id="numberAnimModal" class="modal-overlay">
            <div class="modal-box" style="max-width:400px; text-align:center;">
                <h2 style="color:#f39c12; margin-bottom:10px;">🎲 행운의 숫자 뽑기!</h2>
                <div id="animNumberDisplay" style="font-size:3.5rem; font-weight:900; color:white; margin:30px 0; font-family:'Courier New', monospace;">00000</div>
                <div id="animMessage" style="color:#94a3b8; min-height:20px;">숫자가 돌아가는 중...</div>
                <button id="animConfirmBtn" class="apply-btn hidden" style="background:var(--primary); margin-top:20px;">확인</button>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    const modal = document.getElementById('numberAnimModal');
    const display = document.getElementById('animNumberDisplay');
    const msg = document.getElementById('animMessage');
    const btn = document.getElementById('animConfirmBtn');

    modal.classList.remove('hidden');
    btn.classList.add('hidden');
    msg.innerText = "숫자가 돌아가는 중...";
    
    // 애니메이션 로직
    let current = 0;
    const duration = 2000; // 2초 동안 돌아감
    const intervalTime = 30;
    const steps = duration / intervalTime;
    let step = 0;

    const timer = setInterval(() => {
        step++;
        // 랜덤 숫자 보여주기 효과
        const tempNum = Math.floor(Math.random() * 99999) + 1;
        display.innerText = tempNum.toString().padStart(5, '0');
        display.style.color = '#cbd5e1';

        if (step >= steps) {
            clearInterval(timer);
            // 최종 결과 보여주기
            display.innerText = targetNumber.toString().padStart(5, '0');
            display.style.color = '#f39c12'; // 결과 색상 강조
            display.style.transform = 'scale(1.2)';
            display.style.transition = 'transform 0.3s';
            
            msg.innerText = `축하합니다! 당신의 숫자는 ${targetNumber}입니다!`;
            btn.classList.remove('hidden');

            // 확인 버튼 이벤트 연결
            btn.onclick = () => {
                modal.classList.add('hidden');
                display.style.transform = 'scale(1)';
                if (onFinish) onFinish();
            };
        }
    }, intervalTime);
}

/**
 * 2. 순위표 렌더링 (높은 숫자 순서대로) + [수정됨] 관리자 기능 추가
 */
function renderHighestRanking(participants) {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const container = document.getElementById('customRankingArea');
    if (!container) return;

    container.innerHTML = '';
    container.classList.remove('hidden');
    
    const title = document.createElement('div');
    title.className = 'section-label';
    title.style.borderColor = '#f39c12';
    title.innerText = '🏆 숫자 랭킹 (Top 10)';
    container.appendChild(title);

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';
    
    // ★ 관리자 여부에 따라 헤더 추가
    const actionHeader = isAdmin ? '<th style="text-align:center; color:#f43f5e;">관리</th>' : '';

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th style="color:#f39c12;">순위</th>
                <th>닉네임</th>
                <th style="text-align:right;">뽑은 숫자</th>
                ${actionHeader}
            </tr>
        </thead>
        <tbody id="rankingTbody"></tbody>
    `;
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);

    const tbody = table.querySelector('#rankingTbody');
    const sorted = [...participants].sort((a, b) => b.ticketCount - a.ticketCount);
    
    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">아직 랭킹이 없습니다.</td></tr>';
        return;
    }

    sorted.slice(0, 20).forEach((p, index) => {
        const rank = index + 1;
        let rankStyle = 'color:white;';
        if (rank === 1) rankStyle = 'color:#f39c12; font-weight:bold; font-size:1.2rem;';
        else if (rank === 2) rankStyle = 'color:#95a5a6; font-weight:bold;';
        else if (rank === 3) rankStyle = 'color:#cd7f32; font-weight:bold;';

        let isWinner = false;
        let winItem = '';
        
        if (p.drawResults && p.drawResults.length > 0) {
            isWinner = true;
            winItem = p.drawResults[0];
        } else if (currentEvent && currentEvent.manualWinners) {
            const mw = currentEvent.manualWinners.find(w => w.userId === p.userId);
            if (mw) {
                isWinner = true;
                winItem = mw.reward;
            }
        }

        let actionBtn = '';
        if (isAdmin) {
            // 1. 지급 버튼
            if (isWinner) {
                actionBtn += `<span style="color:#2ecc71; font-size:0.8rem; border:1px solid #2ecc71; padding:2px 6px; border-radius:4px; margin-right:5px;">지급완료</span>`;
            } else {
                actionBtn += `<button onclick="openPrizeModal('${p.userId}', '${p.userName}')" style="background:none; border:1px solid #f43f5e; color:#f43f5e; cursor:pointer; border-radius:5px; padding:4px 8px; font-size:0.8rem; margin-right:5px;">🎁 지급</button>`;
            }
            
            // 2. 쪽지 버튼 (본인 제외)
            // localStorage의 'nickname'이 내 닉네임입니다.
            const myNick = localStorage.getItem('nickname');
            if (p.userName !== myNick) {
                actionBtn += `<button onclick="openSendMailModal('${p.userId}', '${p.userName}')" style="background:none; border:1px solid #3b82f6; color:#3b82f6; cursor:pointer; border-radius:5px; padding:4px 8px; font-size:0.8rem;">📩 쪽지</button>`;
            }
        }

        const actionCol = isAdmin ? `<td style="text-align:center;">${actionBtn}</td>` : '';
        const winnerBadge = isWinner ? `<span style="margin-left:5px; font-size:0.8rem; color:#f39c12;">👑 ${winItem}</span>` : '';

        tbody.innerHTML += `
            <tr>
                <td style="${rankStyle}">${rank}위</td>
                <td>${p.userName} ${winnerBadge}</td>
                <td style="text-align:right; font-weight:bold; color:#2ecc71;">${p.ticketCount.toLocaleString()}</td>
                ${actionCol}
            </tr>
        `;
    });
}