// [이벤트 생성 페이지용] 로또 설정 UI 그리기
function renderLottoSettings() {
    const container = document.getElementById('lottoSettingArea');
    if (!container) return;

    container.innerHTML = `
        <div class="settings-box" style="margin-top:20px; border:1px solid var(--primary);">
            <h3 style="color:var(--primary);">🎰 로또 이벤트 설정</h3>
            
            <div class="form-section">
                <label>설정 1. 당첨 확률 및 인원 (합계 100%)</label>
                <p style="color:#94a3b8; font-size:0.9rem; margin-bottom:10px;">* '꽝'은 인원 제한이 없습니다 (0 입력).</p>
                <div id="winRateList"></div>
                <button type="button" class="add-btn" onclick="addWinRateField()">+ 당첨 항목 추가</button>
            </div>

            <div class="form-section">
                <label>설정 2. 복권 지급 확률 (참여 시 지급량)</label>
                <div id="ticketRateList"></div>
                <button type="button" class="add-btn" onclick="addTicketRateField()">+ 지급 항목 추가</button>
            </div>

            <div class="form-section">
                <label>설정 4. 참여 빈도</label>
                <div class="radio-group">
                    <label><input type="radio" name="freq" value="once" checked> 1회만 참여</label>
                    <label><input type="radio" name="freq" value="daily"> 매일 참여 (자정 초기화)</label>
                </div>
            </div>

            <div class="form-section">
                <label class="checkbox-label">
                    <input type="checkbox" id="chkShowDetails">
                    설정 5. 세부 설정 내용 공개 (체크 시 유저에게 확률 공개)
                </label>
            </div>
        </div>
    `;
    
    // 초기 필드 추가 (수정 모드가 아닐 때만 기본값으로 추가하게 할 수도 있지만, 
    // populate 함수에서 초기화를 다시 해주므로 여기선 기본 동작 유지)
    addWinRateField('1등', 1, 1); // 이름, 확률, 인원수
    addWinRateField('꽝', 99, 0);
    addTicketRateField(1, 100);
}

// 당첨 확률 입력칸 (인원수 추가됨)
function addWinRateField(name='', rate='', count='') {
    const div = document.createElement('div');
    div.className = 'prize-item win-rate-item';
    
    // 꽝인 경우 인원수 입력 불가 처리
    const isLose = name === '꽝';
    const disabled = isLose ? 'disabled style="background:#334155;"' : '';
    const placeholder = isLose ? '제한없음' : '최대 인원';

    div.innerHTML = `
        <input type="text" class="prize-input w-name" placeholder="결과명" value="${name}" onchange="toggleCountInput(this)">
        <input type="number" class="prize-input w-rate" placeholder="확률(%)" value="${rate}">
        <input type="number" class="prize-input w-count" placeholder="${placeholder}" value="${count}" ${disabled}>
        <button type="button" class="del-btn" onclick="this.parentElement.remove()">삭제</button>
    `;
    
    const list = document.getElementById('winRateList');
    if(list) list.appendChild(div);
}

// '꽝' 입력 시 인원수 칸 비활성화 기능
function toggleCountInput(input) {
    const row = input.parentElement;
    const countInput = row.querySelector('.w-count');
    if (input.value === '꽝') {
        countInput.value = 0;
        countInput.disabled = true;
        countInput.placeholder = '제한없음';
        countInput.style.background = '#334155';
    } else {
        countInput.disabled = false;
        countInput.placeholder = '최대 인원';
        countInput.style.background = '#0f172a';
    }
}

// 티켓 지급 확률 입력칸
function addTicketRateField(count='', rate='') {
    const div = document.createElement('div');
    div.className = 'prize-item ticket-rate-item';
    div.innerHTML = `
        <input type="number" class="prize-input t-count" placeholder="지급 장수" value="${count}">
        <input type="number" class="prize-input t-rate" placeholder="확률(%)" value="${rate}">
        <button type="button" class="del-btn" onclick="this.parentElement.remove()">삭제</button>
    `;
    const list = document.getElementById('ticketRateList');
    if(list) list.appendChild(div);
}

// 데이터 수집 (인원수 포함)
function getLottoConfig() {
    const winRates = [];
    document.querySelectorAll('.win-rate-item').forEach(el => {
        winRates.push({
            name: el.querySelector('.w-name').value,
            rate: Number(el.querySelector('.w-rate').value),
            maxCount: Number(el.querySelector('.w-count').value)
        });
    });

    const ticketRates = [];
    document.querySelectorAll('.ticket-rate-item').forEach(el => {
        ticketRates.push({
            count: Number(el.querySelector('.t-count').value),
            rate: Number(el.querySelector('.t-rate').value)
        });
    });

    const freqEl = document.querySelector('input[name="freq"]:checked');
    const frequency = freqEl ? freqEl.value : 'once';
    
    const chkShow = document.getElementById('chkShowDetails');
    const showDetails = chkShow ? chkShow.checked : false;

    return { winRates, ticketRates, frequency, showDetails };
}

// ★ [NEW] 수정 모드일 때 기존 설정값 채워넣기
function populateLottoSettings(config) {
    if (!config) return;

    // 1. 기본으로 생성된 필드들 초기화 (renderLottoSettings가 만든 기본값 제거)
    const winList = document.getElementById('winRateList');
    const ticketList = document.getElementById('ticketRateList');
    if (winList) winList.innerHTML = '';
    if (ticketList) ticketList.innerHTML = '';

    // 2. 당첨 확률 및 인원 복구
    if (config.winRates && Array.isArray(config.winRates)) {
        config.winRates.forEach(r => {
            // addWinRateField(이름, 확률, 최대인원)
            addWinRateField(r.name, r.rate, r.maxCount);
        });
    }

    // 3. 티켓 지급 확률 복구
    if (config.ticketRates && Array.isArray(config.ticketRates)) {
        config.ticketRates.forEach(r => {
            // addTicketRateField(장수, 확률)
            addTicketRateField(r.count, r.rate);
        });
    }

    // 4. 참여 빈도(frequency) 복구
    if (config.frequency) {
        const radio = document.querySelector(`input[name="freq"][value="${config.frequency}"]`);
        if (radio) radio.checked = true;
    }

    // 5. 확률 공개 여부(showDetails) 복구
    if (config.showDetails !== undefined) {
        const chk = document.getElementById('chkShowDetails');
        if (chk) chk.checked = config.showDetails;
    }
}