const token = localStorage.getItem('token');
if (!token) { alert('로그인이 필요합니다.'); location.href = '/'; }

// URL에서 이벤트 ID 확인 (있으면 수정 모드)
const urlParams = new URLSearchParams(window.location.search);
const editEventId = urlParams.get('id');
const isEditMode = !!editEventId;

let currentMode = 'rank';

window.onload = async () => {
    // 수정 모드라면 데이터 불러오기
    if (isEditMode) {
        document.querySelector('.page-title').innerText = '✏️ 이벤트 수정하기';
        document.querySelector('.submit-btn').innerText = '수정 완료';
        await loadEventData(editEventId);
    } else {
        // 생성 모드면 초기화
        resetPrizeFields();
        handleTypeChange();
    }
};

// ★ [NEW] UTC 시간을 로컬 시간(input datetime-local 포맷)으로 변환하는 함수
function toLocalISOString(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    // 로컬 시간대 오프셋을 적용하여 보정
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    // ISO 문자열에서 앞 16자리(YYYY-MM-DDTHH:mm)만 추출
    return localDate.toISOString().slice(0, 16);
}

// [수정됨] 기존 데이터 불러와서 채우기
async function loadEventData(id) {
    try {
        const res = await fetch(`/api/events/${id}`);
        const evt = await res.json();

        // 1. 기본 정보 채우기
        document.getElementById('evtTitle').value = evt.title;
        
        // ★ [수정됨] 날짜 형식 변환 (단순 slice 대신 로컬 시간 변환 함수 사용)
        if(evt.startDate) document.getElementById('evtStart').value = toLocalISOString(evt.startDate);
        if(evt.endDate) document.getElementById('evtEnd').value = toLocalISOString(evt.endDate);
        
        document.getElementById('evtType').value = evt.eventType;
        document.getElementById('evtDesc').value = evt.desc;

        // 2. 커스텀 타입 정보 채우기
        if (evt.eventType === 'custom') {
            document.getElementById('customTypeName').value = evt.customEventType;
            // ★ [수정됨] 여기도 로컬 시간 변환 적용
            if(evt.calcStartDate) document.getElementById('calcStart').value = toLocalISOString(evt.calcStartDate);
            if(evt.calcEndDate) document.getElementById('calcEnd').value = toLocalISOString(evt.calcEndDate);
        }
        
        // 3. UI 갱신 (입력창들을 먼저 그립니다)
        handleTypeChange(); 

        // 4. 세부 설정 값 채우기 (로또 vs 일반)
        if (evt.eventType === 'lotto' && evt.lottoConfig) {
            if (typeof populateLottoSettings === 'function') {
                populateLottoSettings(evt.lottoConfig);
            }
        }
        else if (evt.eventType !== 'lotto') {
            const container = document.getElementById('prizeContainer');
            container.innerHTML = ''; 
            
            if (evt.prizes && evt.prizes.length > 0) {
                if (evt.prizes[0].label.includes('당첨자')) {
                    document.querySelector('input[value="lottery"]').checked = true;
                    currentMode = 'lottery';
                } else {
                    document.querySelector('input[value="rank"]').checked = true;
                    currentMode = 'rank';
                }

                evt.prizes.forEach((p, idx) => {
                    addPrizeField(idx + 1, p.reward);
                });
            } else {
                addPrizeField(1);
            }
        }

        // 5. 공통 설정값 채우기
        if (evt.settings) {
            document.getElementById('chkFirstCome').checked = evt.settings.isFirstCome;
            toggleFirstCome(); 
            if(evt.settings.isFirstCome) document.getElementById('maxCount').value = evt.settings.maxParticipants;
            
            document.getElementById('chkCommentAllowed').checked = evt.settings.isCommentAllowed;
            document.getElementById('chkCommentOnce').checked = evt.settings.isCommentOnce;
        }

    } catch (e) {
        console.error(e);
        alert('데이터를 불러오는데 실패했습니다.');
    }
}

function handleTypeChange() {
    const type = document.getElementById('evtType').value;
    const normalPrizeArea = document.getElementById('normalPrizeArea');
    const lottoSettingArea = document.getElementById('lottoSettingArea');
    const customTypeArea = document.getElementById('customTypeArea');
    
    if (!isEditMode) lottoSettingArea.innerHTML = ''; 

    if (type === 'lotto') {
        if(normalPrizeArea) normalPrizeArea.classList.add('hidden');
        if(customTypeArea) customTypeArea.classList.add('hidden');
        
        if (typeof renderLottoSettings === 'function') {
             if(lottoSettingArea.innerHTML === '') renderLottoSettings();
        }
    } else if (type === 'custom') {
        if(normalPrizeArea) normalPrizeArea.classList.remove('hidden');
        if(customTypeArea) customTypeArea.classList.remove('hidden');
        if(lottoSettingArea) lottoSettingArea.innerHTML = ''; 
    } else {
        if(normalPrizeArea) normalPrizeArea.classList.remove('hidden');
        if(customTypeArea) customTypeArea.classList.add('hidden');
        if(lottoSettingArea) lottoSettingArea.innerHTML = '';
    }
}

function changePrizeMode(mode) { 
    currentMode = mode; 
    if(!isEditMode) resetPrizeFields();
    else reorderPrizes();
}

function resetPrizeFields() { 
    const container = document.getElementById('prizeContainer'); 
    if(!container) return; 
    container.innerHTML = ''; 
    addPrizeField(1); 
}

function addPrizeField(index, value = '') {
    const container = document.getElementById('prizeContainer'); 
    const count = container.children.length + 1; 
    const num = index || count;
    const div = document.createElement('div'); 
    div.className = 'prize-item';
    
    let labelText = currentMode === 'rank' ? `${num}위` : `당첨자 ${num}`;
    
    div.innerHTML = `
        <div class="prize-label">${labelText}</div>
        <input type="text" class="prize-input" placeholder="상품명" value="${value}">
        ${num > 1 ? '<button class="del-btn" onclick="removePrizeField(this)">삭제</button>' : ''}
    `;
    container.appendChild(div);
}

function removePrizeField(btn) { 
    btn.parentElement.remove(); 
    reorderPrizes(); 
}

function reorderPrizes() {
    const items = document.getElementById('prizeContainer').children;
    for (let i = 0; i < items.length; i++) {
        items[i].querySelector('.prize-label').innerText = currentMode === 'rank' ? (i + 1) + '위' : '당첨자 ' + (i + 1);
    }
}

function toggleFirstCome() { 
    const chk = document.getElementById('chkFirstCome'); 
    const input = document.getElementById('maxCount'); 
    if (chk.checked) { input.classList.remove('hidden'); input.focus(); } 
    else { input.classList.add('hidden'); input.value = ''; } 
}

async function submitEvent() {
    const title = document.getElementById('evtTitle').value;
    const start = document.getElementById('evtStart').value;
    const end = document.getElementById('evtEnd').value;
    const type = document.getElementById('evtType').value;
    const desc = document.getElementById('evtDesc').value;

    if(!title || !start || !end || !type) return alert('필수 항목 입력 필요');
    if (new Date(start) >= new Date(end)) return alert('종료 시간이 시작 시간보다 빨라야 합니다.');

    let prizes = [];
    let lottoConfig = null;
    let customTypeName = null;
    let calcStart = null;
    let calcEnd = null;

    if (type === 'lotto') {
        try { lottoConfig = getLottoConfig(); } 
        catch (e) { 
            return alert('로또 설정을 확인해주세요.'); 
        }
    } else {
        document.querySelectorAll('#prizeContainer .prize-item').forEach(item => {
            const l = item.querySelector('.prize-label').innerText;
            const r = item.querySelector('.prize-input').value;
            if(r) prizes.push({ label: l, reward: r });
        });
        
        if (type === 'custom') {
            customTypeName = document.getElementById('customTypeName').value;
            calcStart = document.getElementById('calcStart').value;
            calcEnd = document.getElementById('calcEnd').value;
            if(!customTypeName || !calcStart || !calcEnd) return alert('직접 입력 정보를 모두 입력해주세요.');
        }
    }

    const isFirstCome = document.getElementById('chkFirstCome').checked;
    const maxParticipants = document.getElementById('maxCount').value || 0;
    const isCommentAllowed = document.getElementById('chkCommentAllowed').checked;
    const isCommentOnce = document.getElementById('chkCommentOnce').checked;

    const payload = {
        title, startDate: start, endDate: end, eventType: type, desc,
        prizes, lottoConfig, 
        customEventType: customTypeName, calcStartDate: calcStart, calcEndDate: calcEnd,
        settings: { isFirstCome, maxParticipants: Number(maxParticipants), isCommentAllowed, isCommentOnce }
    };

    try {
        const url = isEditMode ? `/api/events/${editEventId}` : '/api/events';
        const method = isEditMode ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        if(res.ok) {
            alert(isEditMode ? '수정되었습니다!' : '생성되었습니다!');
            location.href = '/';
        } else { 
            const d = await res.json(); 
            alert('실패: ' + d.message); 
        }
    } catch(e) { alert('오류'); }
}