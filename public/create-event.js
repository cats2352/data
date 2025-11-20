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

// [NEW] 기존 데이터 불러와서 채우기
async function loadEventData(id) {
    try {
        const res = await fetch(`/api/events/${id}`);
        const evt = await res.json();

        // 기본 정보 채우기
        document.getElementById('evtTitle').value = evt.title;
        // 날짜 형식 변환 (datetime-local용: YYYY-MM-DDTHH:mm)
        if(evt.startDate) document.getElementById('evtStart').value = evt.startDate.slice(0, 16);
        if(evt.endDate) document.getElementById('evtEnd').value = evt.endDate.slice(0, 16);
        
        document.getElementById('evtType').value = evt.eventType;
        document.getElementById('evtDesc').value = evt.desc;

        // 커스텀 타입 정보 채우기
        if (evt.eventType === 'custom') {
            document.getElementById('customTypeName').value = evt.customEventType;
            if(evt.calcStartDate) document.getElementById('calcStart').value = evt.calcStartDate.slice(0, 16);
            if(evt.calcEndDate) document.getElementById('calcEnd').value = evt.calcEndDate.slice(0, 16);
        }
        
        handleTypeChange(); // UI 갱신

        // 상품 목록 채우기 (일반 모드일 때만)
        if (evt.eventType !== 'lotto') {
            const container = document.getElementById('prizeContainer');
            container.innerHTML = '';
            
            if (evt.prizes && evt.prizes.length > 0) {
                // 랭킹인지 추첨인지 라벨로 추측
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

        // 설정값 채우기
        if (evt.settings) {
            document.getElementById('chkFirstCome').checked = evt.settings.isFirstCome;
            toggleFirstCome();
            if(evt.settings.isFirstCome) document.getElementById('maxCount').value = evt.settings.maxParticipants;
            
            document.getElementById('chkCommentAllowed').checked = evt.settings.isCommentAllowed;
            document.getElementById('chkCommentOnce').checked = evt.settings.isCommentOnce;
        }
        
        // *로또 설정값 불러오기는 UI 구조상 복잡하여 생략 (수정 시 재입력 필요 안내가 나음)
        // 여기서는 기존 설정을 덮어쓰지 않게 주의

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
    
    // 수정 모드일 때는 로또 설정을 함부로 초기화하지 않음 (단, 타입이 바뀌면 초기화)
    if (!isEditMode) lottoSettingArea.innerHTML = ''; 

    if (type === 'lotto') {
        if(normalPrizeArea) normalPrizeArea.classList.add('hidden');
        if(customTypeArea) customTypeArea.classList.add('hidden');
        
        // 생성 모드거나, 수정 모드에서 로또를 다시 선택한 경우
        if (typeof renderLottoSettings === 'function') {
             // 수정 모드일 때 값을 채워넣는 건 lotto.js 확장이 필요함.
             // 현재는 폼만 렌더링 (빈 값)
             if(!isEditMode || lottoSettingArea.innerHTML === '') renderLottoSettings();
        }
    } else if (type === 'custom') {
        if(normalPrizeArea) normalPrizeArea.classList.remove('hidden');
        if(customTypeArea) customTypeArea.classList.remove('hidden');
    } else {
        if(normalPrizeArea) normalPrizeArea.classList.remove('hidden');
        if(customTypeArea) customTypeArea.classList.add('hidden');
    }
}

function changePrizeMode(mode) { 
    currentMode = mode; 
    if(!isEditMode) resetPrizeFields(); 
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
            // 수정 모드에서 로또 설정을 건드리지 않았다면 기존 유지 로직이 필요하지만,
            // 현재 구현상 재입력을 유도합니다.
            if(!isEditMode) return alert('로또 설정을 확인해주세요.'); 
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