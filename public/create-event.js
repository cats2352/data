const token = localStorage.getItem('token');
if (!token) { alert('로그인이 필요합니다.'); location.href = '/'; }

let currentMode = 'rank';
window.onload = () => { resetPrizeFields(); handleTypeChange(); };

function handleTypeChange() {
    const type = document.getElementById('evtType').value;
    const normalPrizeArea = document.getElementById('normalPrizeArea');
    const lottoSettingArea = document.getElementById('lottoSettingArea');
    const customTypeArea = document.getElementById('customTypeArea');
    
    lottoSettingArea.innerHTML = '';

    if (type === 'lotto') {
        if(normalPrizeArea) normalPrizeArea.classList.add('hidden');
        if(customTypeArea) customTypeArea.classList.add('hidden');
        if (typeof renderLottoSettings === 'function') renderLottoSettings();
    } else if (type === 'custom') {
        // ★ [NEW] 직접 입력 모드
        if(normalPrizeArea) normalPrizeArea.classList.remove('hidden');
        if(customTypeArea) customTypeArea.classList.remove('hidden');
    } else {
        // 일반 모드
        if(normalPrizeArea) normalPrizeArea.classList.remove('hidden');
        if(customTypeArea) customTypeArea.classList.add('hidden');
    }
}

function changePrizeMode(mode) { currentMode = mode; resetPrizeFields(); }
function resetPrizeFields() { const c = document.getElementById('prizeContainer'); if(!c)return; c.innerHTML=''; addPrizeField(1); }
function addPrizeField(index) {
    const c = document.getElementById('prizeContainer'); const cnt = c.children.length+1; const num = index||cnt;
    const div = document.createElement('div'); div.className='prize-item';
    div.innerHTML=`<div class="prize-label">${currentMode==='rank'?num+'위':'당첨자 '+num}</div><input type="text" class="prize-input" placeholder="상품명">${num>1?'<button class="del-btn" onclick="removePrizeField(this)">삭제</button>':''}`;
    c.appendChild(div);
}
function removePrizeField(btn) { btn.parentElement.remove(); reorderPrizes(); }
function reorderPrizes() {
    const items = document.getElementById('prizeContainer').children;
    for(let i=0; i<items.length; i++) {
        items[i].querySelector('.prize-label').innerText = currentMode==='rank'?(i+1)+'위':'당첨자 '+(i+1);
    }
}
function toggleFirstCome() { const chk=document.getElementById('chkFirstCome'); const inp=document.getElementById('maxCount'); if(chk.checked){inp.classList.remove('hidden');}else{inp.classList.add('hidden');} }


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
        lottoConfig = getLottoConfig();
    } else {
        // 상품 수집
        document.querySelectorAll('#prizeContainer .prize-item').forEach(item => {
            const l = item.querySelector('.prize-label').innerText;
            const r = item.querySelector('.prize-input').value;
            if(r) prizes.push({ label: l, reward: r });
        });
        
        if (type === 'custom') {
            // ★ [NEW] 커스텀 필드 수집
            customTypeName = document.getElementById('customTypeName').value;
            calcStart = document.getElementById('calcStart').value;
            calcEnd = document.getElementById('calcEnd').value;
            if(!customTypeName) return alert('이벤트 종류 이름을 입력해주세요.');
            if(!calcStart || !calcEnd) return alert('집계 기간을 설정해주세요.');
        }
    }

    const isFirstCome = document.getElementById('chkFirstCome').checked;
    const maxParticipants = document.getElementById('maxCount').value || 0;
    const isCommentAllowed = document.getElementById('chkCommentAllowed').checked;
    const isCommentOnce = document.getElementById('chkCommentOnce').checked;

    const payload = {
        title, startDate: start, endDate: end, eventType: type, desc,
        prizes, lottoConfig,
        customEventType: customTypeName, 
        calcStartDate: calcStart, 
        calcEndDate: calcEnd,
        settings: { isFirstCome, maxParticipants: Number(maxParticipants), isCommentAllowed, isCommentOnce }
    };

    try {
        const res = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        if(res.ok) { alert('생성 완료!'); location.href='/'; }
        else { const d=await res.json(); alert(d.message); }
    } catch(e) { alert('오류'); }
}