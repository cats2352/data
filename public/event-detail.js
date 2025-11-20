const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');
const token = localStorage.getItem('token');
const myNickname = localStorage.getItem('nickname'); // 내 닉네임
const isAdmin = localStorage.getItem('isAdmin') === 'true'; // 관리자 여부

if (!eventId) {
    alert('잘못된 접근입니다.');
    location.href = '/';
}

let currentEvent = null;

// ★ [NEW] 기본 이미지
const NO_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 300 160'%3E%3Crect fill='%231e293b' width='300' height='160'/%3E%3Ctext fill='%2394a3b8' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='sans-serif' font-size='20'%3ENo Image%3C/text%3E%3C/svg%3E";

// 페이지 로드 시 실행
loadEventDetail();
loadParticipants();
loadComments(); 

// --- 1. 이벤트 상세 정보 로드 ---

async function loadEventDetail() {
    try {
        const res = await fetch(`/api/events/${eventId}`);
        if (!res.ok) throw new Error('이벤트 로드 실패');
        
        const evt = await res.json();
        currentEvent = evt;

        // 1. 기본 정보 표시
        document.getElementById('evtTitle').innerText = evt.title;
        document.getElementById('evtAuthor').innerText = `👑 ${evt.author}`;
        
        const start = formatDate(evt.startDate);
        const end = formatDate(evt.endDate);
        document.getElementById('evtDate').innerText = `${start} ~ ${end}`;
        document.getElementById('evtDesc').innerText = evt.desc;

        // 2. [NEW] 집계 기간 표시 (직접 입력 모드인 경우)
        if (evt.eventType === 'custom' && evt.calcStartDate) {
            const calcStart = formatDate(evt.calcStartDate);
            const calcEnd = formatDate(evt.calcEndDate);
            document.getElementById('calcDateInfo').innerText = `⏳ 집계/발표 기간: ${calcStart} ~ ${calcEnd}`;
        }

        // 3. [NEW] 최종 당첨자 목록 표시 (발표된 경우)
        if (evt.manualWinners && evt.manualWinners.length > 0) {
            const box = document.getElementById('manualWinnersBox');
            const list = document.getElementById('manualWinnersList');
            box.classList.remove('hidden');
            
            list.innerHTML = evt.manualWinners.map(w => 
                `<div style="padding:10px; border-bottom:1px solid #444; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <span style="color:#f39c12; font-weight:bold; font-size:1.1rem;">${w.nickname}</span> 
                        <span style="color:#cbd5e1; font-size:0.9rem; margin-left:10px;">(${w.content ? w.content.substring(0,20) + '...' : '참여자'})</span>
                    </div>
                    <span style="color:#2ecc71; font-weight:bold;">🎁 ${w.reward}</span>
                 </div>`
            ).join('');
        }

        // 4. [NEW] 관리자용 당첨자 선정 패널 표시 조건
        // (관리자이고 + 직접입력 모드이고 + 집계 기간이 시작되었을 때)
        const now = new Date();
        const isCalcPeriod = (evt.calcStartDate && new Date(evt.calcStartDate) <= now);
        
        if (isAdmin && evt.eventType === 'custom' && isCalcPeriod) {
            document.getElementById('adminWinnerPanel').classList.remove('hidden');
            loadCandidates(); // 댓글 목록을 후보자로 불러오기
        }

        // 5. UI 분기 처리 (로또 vs 일반)
        handleEventUI(evt, now);

        // 6. 댓글 기능 활성화 여부 체크
        const commentArea = document.getElementById('commentArea');
        if (evt.settings && evt.settings.isCommentAllowed) {
            commentArea.classList.remove('hidden');
        } else {
            commentArea.classList.add('hidden');
        }

    } catch (err) {
        console.error(err);
        alert('정보를 불러오지 못했습니다.');
        location.href = '/';
    }
}

// --- 2. UI 제어 및 참여 로직 ---

function handleEventUI(evt, now) {
    const joinBtn = document.getElementById('joinBtn');
    const normalPrizeBox = document.getElementById('normalPrizeBox');
    const lottoInfoBox = document.getElementById('lottoInfoBox');
    const visibilityBadge = document.getElementById('lottoVisibility');
    
    const isEnded = now > new Date(evt.endDate);

    if (evt.eventType === 'lotto' && evt.lottoConfig) {
        // [로또 모드]
        normalPrizeBox.classList.add('hidden'); 
        visibilityBadge.classList.remove('hidden');

        // 확률 공개 여부
        if (evt.lottoConfig.showDetails) {
            visibilityBadge.innerText = '👁️ 확률 정보 공개됨';
            renderLottoStats(evt.lottoConfig);
            lottoInfoBox.classList.remove('hidden');
        } else {
            visibilityBadge.innerText = '🔒 확률 정보 비공개';
            lottoInfoBox.classList.add('hidden');
        }

        // 버튼 상태
        if (isEnded) {
            joinBtn.innerText = '🎁 당첨 결과 확인하기';
            joinBtn.style.background = '#8e44ad'; 
            joinBtn.onclick = checkLottoResult;
        } else {
            const btnText = evt.lottoConfig.frequency === 'daily' ? '📅 매일 참여하고 티켓 받기' : '🎫 티켓 받기 (1회)';
            joinBtn.innerText = btnText;
            joinBtn.onclick = joinCurrentEvent;
        }

    } else {
        // [일반/직접입력 모드]
        visibilityBadge.classList.add('hidden');
        normalPrizeBox.classList.remove('hidden');
        lottoInfoBox.classList.add('hidden');

        // 상품 목록
        const prizeList = document.getElementById('prizeList');
        prizeList.innerHTML = '';
        if(evt.prizes && evt.prizes.length > 0) {
            evt.prizes.forEach(p => {
                prizeList.innerHTML += `
                    <div class="prize-item">
                        <span class="rank-badge">${p.label}</span>
                        <span>${p.reward}</span>
                    </div>`;
            });
        } else {
            prizeList.innerHTML = '<p style="color:#666;">등록된 상품 정보가 없습니다.</p>';
        }

        // 버튼 상태
        if (isEnded) {
            joinBtn.innerText = '마감되었습니다';
            joinBtn.disabled = true;
            joinBtn.style.background = '#475569';
        } else {
            joinBtn.innerText = '🙋‍♂️ 이벤트 참여 신청하기';
            joinBtn.onclick = joinCurrentEvent;
        }
    }

    // 선착순 메시지
    if(evt.settings && evt.settings.isFirstCome) {
        const limitMsg = document.getElementById('limitMsg');
        limitMsg.innerText = `🚨 선착순 ${evt.settings.maxParticipants}명 제한 이벤트입니다.`;
        limitMsg.style.display = 'block';
    }
}

// 공통 참여 함수
async function handleMainAction() { /* fallback */ }

async function joinCurrentEvent() {
    if (!token) return alert('로그인이 필요합니다.');
    const title = document.getElementById('evtTitle').innerText;
    if (!confirm(`'${title}' 이벤트에 참여하시겠습니까?`)) return;

    try {
        const res = await fetch('/api/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ eventId, eventTitle: title })
        });
        const data = await res.json();
        if (res.ok) {
            if (data.tickets !== undefined) alert(`참여 완료!\n🎫 티켓 ${data.tickets}장을 획득했습니다.`);
            else alert('참여 신청이 완료되었습니다!');
            loadParticipants(); 
        } else {
            alert(data.message);
        }
    } catch (err) { alert('서버 오류 발생'); }
}

// 로또 결과 확인
async function checkLottoResult() {
    if (!token) return alert('로그인이 필요합니다.');
    try {
        const res = await fetch('/api/lotto/draw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ eventId })
        });
        const data = await res.json();
        if(data.results) {
            const winList = data.results.filter(r => r !== '꽝');
            let msg = `🎫 사용한 티켓: ${data.results.length}장\n\n📜 추첨 결과:\n${data.results.join(', ')}`;
            if(winList.length > 0) msg += `\n\n🎉 축하합니다! [${winList.join(', ')}] 당첨!`;
            else msg += `\n\n😭 아쉽게도 모두 꽝입니다.`;
            alert(msg);
            loadParticipants(); 
        } else { alert(data.message); }
    } catch(e) { alert('오류'); }
}

// 참여자 목록 로드
async function loadParticipants() {
    try {
        const res = await fetch(`/api/events/${eventId}/participants`);
        const parts = await res.json();

        document.getElementById('partCount').innerText = parts.length;
        const tbody = document.getElementById('partList');
        tbody.innerHTML = '';

        const myEntry = parts.find(p => p.userName === myNickname);
        const ticketInfoDiv = document.getElementById('myTicketInfo');
        if (myEntry && currentEvent?.eventType === 'lotto') {
            ticketInfoDiv.innerText = `🎫 내 보유 티켓: ${myEntry.ticketCount}장`;
        } else { ticketInfoDiv.innerText = ''; }

        if (parts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">아직 참여자가 없습니다.</td></tr>';
            return;
        }

        parts.forEach((p, index) => {
            let extraInfo = '';
            if (currentEvent?.eventType === 'lotto' && p.drawResults && p.drawResults.length > 0) {
                const wins = p.drawResults.filter(r => r !== '꽝');
                if (wins.length > 0) extraInfo = ` <span style="color:#f43f5e; font-weight:bold;">[🎁 ${wins.join(', ')}]</span>`;
                else extraInfo = ` <span style="color:#64748b; font-size:0.85rem;">(꽝)</span>`;
            }
            tbody.innerHTML += `<tr><td>${index + 1}</td><td><strong>${p.userName}</strong>${extraInfo}</td><td style="color:#94a3b8; font-size:0.9rem;">${formatDate(p.appliedAt)}</td></tr>`;
        });
    } catch (err) { console.error(err); }
}

// --- 3. 관리자 당첨자 선정 기능 ---

// 후보자(댓글 작성자) 불러오기
async function loadCandidates() {
    const res = await fetch(`/api/comments/${eventId}`);
    const comments = await res.json();
    const container = document.getElementById('commentCandidates');
    
    if(comments.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#666;">작성된 댓글이 없습니다.</p>';
        return;
    }

    container.innerHTML = comments.map(c => `
        <div class="comment-select-item">
            <input type="checkbox" class="chk-winner" value="${c.userId._id || c.userId}" data-nick="${c.userNickname}" data-content="${c.content}">
            <div style="width:100%;">
                <strong style="color:#3b82f6;">${c.userNickname}</strong>
                <div style="color:#cbd5e1; font-size:0.9rem;">${c.content}</div>
            </div>
        </div>
    `).join('');
}

// 당첨자 확정 및 전송
async function submitManualWinners() {
    if (!confirm('선택한 인원을 당첨자로 확정하시겠습니까?')) return;
    
    const reward = document.getElementById('rewardName').value;
    if(!reward) return alert('지급할 상품명을 입력해주세요.');

    const checkedBoxes = document.querySelectorAll('.chk-winner:checked');
    if(checkedBoxes.length === 0) return alert('당첨자를 1명 이상 선택하세요.');

    const winners = Array.from(checkedBoxes).map(box => ({
        userId: box.value,
        nickname: box.dataset.nick,
        content: box.dataset.content,
        reward: reward
    }));

    try {
        const res = await fetch(`/api/events/${eventId}/winners`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ winners })
        });
        if (res.ok) {
            alert('당첨자 발표가 완료되었습니다!');
            location.reload();
        } else {
            alert('저장 실패');
        }
    } catch (e) { alert('오류'); }
}

// --- 4. 댓글 관련 기능 ---

async function loadComments() {
    try {
        const res = await fetch(`/api/comments/${eventId}`);
        const comments = await res.json();

        document.getElementById('commentCount').innerText = comments.length;
        const list = document.getElementById('commentList');
        list.innerHTML = '';

        if (comments.length === 0) {
            list.innerHTML = '<p style="color:#666; text-align:center;">첫 번째 댓글을 남겨보세요!</p>';
            return;
        }

        const rootComments = comments.filter(c => !c.parentCommentId);
        const replyComments = comments.filter(c => c.parentCommentId);

        rootComments.forEach(c => {
            list.innerHTML += createCommentHTML(c);
            const myReplies = replyComments.filter(r => r.parentCommentId === c._id);
            myReplies.forEach(r => list.innerHTML += createCommentHTML(r, true));
        });
    } catch (err) { console.error(err); }
}

function createCommentHTML(c, isReply = false) {
    const date = new Date(c.createdAt).toLocaleString();
    const writerId = c.userId._id || c.userId; 
    
    // 삭제 버튼 (본인 또는 관리자)
    // *주의: user 변수 대신 myNickname으로 비교 (가장 안전)
    const deleteBtn = (myNickname === c.userNickname || isAdmin) 
        ? `<button class="cmt-action-btn" onclick="deleteComment('${c._id}')">삭제</button>` 
        : '';
    
    const replyBtn = !isReply 
        ? `<button class="cmt-action-btn" onclick="toggleReplyForm('${c._id}')">답글달기</button>` 
        : '';

    const wrapperClass = isReply ? 'comment-item reply-item' : 'comment-item';
    const iconHtml = isReply ? '<span class="reply-icon">└</span>' : '';

    // 관리자 배지
    let badgeHtml = '';
    if (c.userId && c.userId.isAdmin) {
        badgeHtml = `<span class="admin-badge-small">관리자</span>`;
    }

    return `
        <div class="${wrapperClass}">
            ${iconHtml}
            <div class="comment-header">
                <div>
                    <span class="comment-writer">${c.userNickname}</span>
                    ${badgeHtml}
                    <span style="margin-left:10px; color:#64748b; font-size:0.85rem;">${date}</span>
                </div>
                <div>${replyBtn}${deleteBtn}</div>
            </div>
            <div class="comment-content">${c.content}</div>
            
            <div id="replyForm-${c._id}" class="comment-input-box reply-form">
                <textarea id="replyInput-${c._id}" placeholder="@${c.userNickname}님에게 답글 쓰기..."></textarea>
                <button class="apply-btn" style="width:auto; padding:5px 15px; margin-top:5px; font-size:0.9rem;" onclick="writeComment('${c._id}')">답글 등록</button>
            </div>
        </div>
    `;
}

async function writeComment(parentId = null) {
    if (!token) return alert('로그인이 필요합니다.');

    let content = '';
    if (parentId) content = document.getElementById(`replyInput-${parentId}`).value;
    else content = document.getElementById('commentInput').value;

    if (!content.trim()) return alert('내용을 입력해주세요.');

    try {
        const res = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ eventId, content, parentCommentId: parentId })
        });

        if (res.ok) {
            if (!parentId) document.getElementById('commentInput').value = '';
            loadComments();
        } else {
            const data = await res.json();
            alert(data.message || '등록 실패');
        }
    } catch (err) { alert('오류 발생'); }
}

function toggleReplyForm(commentId) {
    const form = document.getElementById(`replyForm-${commentId}`);
    if (form.style.display === 'block') {
        form.style.display = 'none';
    } else {
        document.querySelectorAll('.reply-form').forEach(f => f.style.display = 'none');
        form.style.display = 'block';
    }
}

async function deleteComment(commentId) {
    if (!confirm('정말 삭제하시겠습니까? (답글도 함께 삭제됩니다)')) return;
    try {
        const res = await fetch(`/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) { loadComments(); }
        else { const data = await res.json(); alert(data.message); }
    } catch (err) { alert('오류 발생'); }
}

function renderLottoStats(config) {
    let html = `<div style="display:flex; gap:20px; flex-wrap:wrap;">`;
    
    html += `<div style="flex:1; min-width:200px;"><strong style="color:var(--primary); display:block; margin-bottom:5px;">🎫 티켓 지급 확률</strong><ul style="padding-left:20px; margin:0;">`;
    config.ticketRates.forEach(r => { html += `<li>${r.count}장 지급 : ${r.rate}%</li>`; });
    html += `</ul></div>`;

    html += `<div style="flex:1; min-width:200px;"><strong style="color:var(--accent); display:block; margin-bottom:5px;">🏆 당첨 확률 및 재고</strong><ul style="padding-left:20px; margin:0;">`;
    config.winRates.forEach(r => {
        let stockInfo = '';
        if (r.name !== '꽝') {
            const left = r.maxCount - (r.currentCount || 0);
            const color = left <= 0 ? '#f43f5e' : '#94a3b8';
            stockInfo = ` <span style="color:${color}; font-size:0.85rem;">(남은 수량: ${Math.max(0, left)}/${r.maxCount})</span>`;
        }
        html += `<li>${r.name} : ${r.rate}%${stockInfo}</li>`;
    });
    html += `</ul></div></div>`;

    document.getElementById('lottoDetailText').innerHTML = html;
}

function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}/${mm}/${dd} ${hh}:${min}:${ss}`;
}