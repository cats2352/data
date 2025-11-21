const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');
const token = localStorage.getItem('token');
const myNickname = localStorage.getItem('nickname'); 
// ★ [중요] 관리자 권한 확인 (문자열 'true'를 불리언 true로 변환)
const isAdmin = localStorage.getItem('isAdmin') === 'true'; 

if (!eventId) {
    alert('잘못된 접근입니다.');
    location.href = '/';
}

let currentEvent = null;

// 초기 실행
loadEventDetail();

async function loadEventDetail() {
    try {
        const res = await fetch(`/api/events/${eventId}`);
        if (!res.ok) throw new Error('이벤트 로드 실패');
        
        const evt = await res.json();
        currentEvent = evt; // 이벤트 정보 저장

        loadParticipants();
        loadComments();

        // UI 렌더링
        document.getElementById('evtTitle').innerText = evt.title;
        document.getElementById('evtAuthor').innerText = `👑 ${evt.author}`;
        
        const start = formatDateDetail(evt.startDate);
        const end = formatDateDetail(evt.endDate);
        document.getElementById('evtDate').innerText = `${start} ~ ${end}`;
        
        document.getElementById('evtDesc').innerText = evt.desc;

        const now = new Date();
        const endDate = new Date(evt.endDate);
        const isEnded = now > endDate;

        if (evt.eventType === 'custom' && evt.calcStartDate) {
            const calcStart = formatDateDetail(evt.calcStartDate);
            const calcEnd = formatDateDetail(evt.calcEndDate);
            document.getElementById('calcDateInfo').innerText = `⏳ 집계/발표 기간: ${calcStart} ~ ${calcEnd}`;
        }

        // [🏆 최종 당첨자 발표 목록] - 관리자 쪽지 버튼 포함
        if (evt.manualWinners && evt.manualWinners.length > 0) {
            const box = document.getElementById('manualWinnersBox');
            const list = document.getElementById('manualWinnersList');
            box.classList.remove('hidden');
            
            list.innerHTML = evt.manualWinners.map(w => {
                let mailBtn = '';
                // 관리자이고 본인이 아니면 쪽지 버튼 표시
                if (isAdmin && w.nickname !== myNickname && w.userId) {
                    mailBtn = `<button onclick="openSendMailModal('${w.userId}', '${w.nickname}')" style="margin-left:5px; background:none; border:1px solid #3b82f6; color:#3b82f6; border-radius:4px; padding:2px 5px; font-size:0.75rem; cursor:pointer;">📩</button>`;
                }
                
                return `<div style="padding:10px; border-bottom:1px solid #444; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <span style="color:#f39c12; font-weight:bold; font-size:1.1rem;">${w.nickname}</span> 
                        ${mailBtn}
                        <span style="color:#cbd5e1; font-size:0.9rem; margin-left:5px;">(${w.content ? w.content.substring(0,20) + '...' : '참여자'})</span>
                    </div>
                    <span style="color:#2ecc71; font-weight:bold;">🎁 ${w.reward}</span>
                 </div>`;
            }).join('');
        }

        const isCalcPeriod = (evt.calcStartDate && new Date(evt.calcStartDate) <= now);
        if (isAdmin && evt.eventType === 'custom' && isCalcPeriod) {
            document.getElementById('adminWinnerPanel').classList.remove('hidden');
            if (currentEvent.prizes && currentEvent.prizes.length > 0) {
                document.getElementById('rewardName').classList.add('hidden');
            } else {
                document.getElementById('rewardName').classList.remove('hidden');
            }
            loadCandidates(); 
            loadParticipantCandidates();
        }

        // UI 분기 처리 (로또 vs 숫자 뽑기 vs 일반)
        const joinBtn = document.getElementById('joinBtn');
        const normalPrizeBox = document.getElementById('normalPrizeBox');
        const lottoInfoBox = document.getElementById('lottoInfoBox');
        const visibilityBadge = document.getElementById('lottoVisibility');

        // A. 로또 이벤트
        if (evt.eventType === 'lotto' && evt.lottoConfig) {
            normalPrizeBox.classList.add('hidden'); 
            visibilityBadge.classList.remove('hidden');

            if (evt.lottoConfig.showDetails) {
                visibilityBadge.innerText = '👁️ 확률 정보 공개됨';
                renderLottoStats(evt.lottoConfig);
                lottoInfoBox.classList.remove('hidden');
            } else {
                visibilityBadge.innerText = '🔒 확률 정보 비공개';
                lottoInfoBox.classList.add('hidden');
            }

            if (isEnded) {
                joinBtn.innerText = '🎁 당첨 결과 확인하기';
                joinBtn.style.background = '#8e44ad'; 
                joinBtn.onclick = checkLottoResult;
            } else {
                const btnText = evt.lottoConfig.frequency === 'daily' ? '📅 매일 참여하고 로또 받기' : '🎰 로또 받기 (1회)';
                joinBtn.innerText = btnText;
                joinBtn.onclick = joinCurrentEvent;
            }

        } 
        // B. 제일 높은 숫자 뽑기 이벤트
        else if (evt.eventType === 'highest_number') {
            visibilityBadge.classList.add('hidden');
            normalPrizeBox.classList.remove('hidden');
            lottoInfoBox.classList.add('hidden');

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
                prizeList.innerHTML = '<p style="color:#666;">등록된 상품이 없습니다.</p>';
            }

            if (isEnded) {
                joinBtn.innerText = '마감되었습니다';
                joinBtn.disabled = true;
                joinBtn.style.background = '#475569';
            } else {
                joinBtn.innerText = '🎲 숫자 뽑고 랭킹 등록하기';
                joinBtn.onclick = joinHighestNumberEvent;
            }
        } 
        // C. 일반/커스텀 이벤트
        else {
            visibilityBadge.classList.add('hidden');
            normalPrizeBox.classList.remove('hidden');
            lottoInfoBox.classList.add('hidden');

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
                prizeList.innerHTML = '<p style="color:#666;">등록된 상품이 없습니다.</p>';
            }

            if (isEnded) {
                joinBtn.innerText = '마감되었습니다';
                joinBtn.disabled = true;
                joinBtn.style.background = '#475569';
            } else {
                joinBtn.innerText = '🙋‍♂️ 이벤트 참여 신청하기';
                joinBtn.onclick = joinCurrentEvent;
            }
        }

        if(evt.settings && evt.settings.isFirstCome) {
            const limitMsg = document.getElementById('limitMsg');
            limitMsg.innerText = `🚨 선착순 ${evt.settings.maxParticipants}명 제한 이벤트입니다.`;
            limitMsg.style.display = 'block';
        }

        const commentArea = document.getElementById('commentArea'); 
        if (commentArea) {
            if (evt.settings && evt.settings.isCommentAllowed) {
                commentArea.classList.remove('hidden');
            } else {
                commentArea.classList.add('hidden');
            }
        }

    } catch (err) {
        console.error(err);
        alert('정보를 불러오지 못했습니다.');
        location.href = '/';
    }
}

function renderLottoStats(config) {
    let html = `<div style="display:flex; gap:20px; flex-wrap:wrap;">`;
    html += `<div style="flex:1; min-width:200px;"><strong style="color:var(--primary); display:block; margin-bottom:5px;">🎰 로또 획득 확률</strong><ul style="padding-left:20px; margin:0;">`;
    config.ticketRates.forEach(r => { html += `<li>${r.count}개 획득 : ${r.rate}%</li>`; });
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
            if (data.tickets !== undefined) alert(`참여 완료!\n🎰 로또 ${data.tickets}개를 획득했습니다.\n(결과 확인 버튼을 눌러보세요!)`);
            else alert('참여 신청이 완료되었습니다!');
            loadParticipants(); 
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert('서버 오류 발생');
    }
}

async function joinHighestNumberEvent() {
    if (!token) return alert('로그인이 필요합니다.');
    const title = document.getElementById('evtTitle').innerText;

    if (!confirm(`'${title}' 이벤트에 참여하여 숫자를 뽑으시겠습니까?`)) return;

    try {
        const res = await fetch('/api/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ eventId, eventTitle: title })
        });
        const data = await res.json();
        
        if (res.ok) {
            if (typeof playNumberAnimation === 'function' && data.drawnNumber) {
                playNumberAnimation(data.drawnNumber, () => {
                    loadParticipants();
                });
            } else {
                alert(`참여 완료! 뽑은 숫자: ${data.drawnNumber}`);
                loadParticipants();
            }
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert('서버 오류 발생');
    }
}

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
            let msg = `🎰 확인한 로또: ${data.results.length}개\n\n📜 결과:\n${data.results.join(', ')}`;
            if(winList.length > 0) msg += `\n\n🎉 축하합니다! [${winList.join(', ')}] 당첨!`;
            else msg += `\n\n😭 아쉽게도 모두 꽝입니다.`;
            alert(msg);
            loadParticipants(); 
        } else { alert(data.message); }
    } catch(e) { alert('오류'); }
}

// ★ loadParticipants: 로또/일반/숫자뽑기 참여자 현황 통합 처리
// ... (이전 코드와 동일, urlParams ~ checkLottoResult 함수까지)

// ★ loadParticipants 수정됨
async function loadParticipants() {
    try {
        const res = await fetch(`/api/events/${eventId}/participants`);
        const parts = await res.json();
        document.getElementById('partCount').innerText = parts.length;
        const tbody = document.getElementById('partList');
        tbody.innerHTML = '';
        
        if (currentEvent?.eventType === 'highest_number' && typeof renderHighestRanking === 'function') {
            renderHighestRanking(parts);
        } else {
            const rankArea = document.getElementById('customRankingArea');
            if(rankArea) rankArea.classList.add('hidden');
        }

        const myEntry = parts.find(p => p.userName === myNickname);
        const ticketInfoDiv = document.getElementById('myTicketInfo');
        
        if (myEntry && currentEvent?.eventType === 'lotto') {
            ticketInfoDiv.innerText = `🎰 내 로또 개수: ${myEntry.ticketCount}개`;
        } else if (myEntry && currentEvent?.eventType === 'highest_number') {
            ticketInfoDiv.innerText = `🎲 내 숫자: ${myEntry.ticketCount}`;
        } else { 
            ticketInfoDiv.innerText = ''; 
        }

        if (parts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">아직 참여자가 없습니다.</td></tr>';
            return;
        }

        parts.forEach((p, index) => {
            let extraInfo = '';
            
            if (currentEvent?.eventType === 'lotto') {
                extraInfo += ` <span style="color:#f39c12; font-size:0.9rem; font-weight:bold;">(🎰 ${p.ticketCount}개)</span>`;
            } else if (currentEvent?.eventType === 'highest_number') {
                extraInfo += ` <span style="color:#2ecc71; font-weight:bold;">[${p.ticketCount}]</span>`;
            }

            // 1. 유저가 이미 확인한 결과
            if (currentEvent?.eventType === 'lotto' && p.drawResults && p.drawResults.length > 0) {
                const wins = p.drawResults.filter(r => r !== '꽝');
                if (wins.length > 0) extraInfo += ` <span style="color:#f43f5e; font-weight:bold;">[🎁 ${wins.join(', ')}]</span>`;
                else extraInfo += ` <span style="color:#64748b; font-size:0.85rem;">(꽝)</span>`;
            }
            // 2. ★ [NEW] 관리자 전용 미리보기 (유저는 아직 확인 안 함)
            else if (isAdmin && currentEvent?.eventType === 'lotto' && p.hiddenResults && p.hiddenResults.length > 0) {
                const hiddenWins = p.hiddenResults.filter(r => r !== '꽝');
                if (hiddenWins.length > 0) {
                    extraInfo += ` <span style="color:#a855f7; font-size:0.85rem;">[🔮 미확인 당첨: ${hiddenWins.join(', ')}]</span>`;
                } else {
                    extraInfo += ` <span style="color:#64748b; font-size:0.85rem;">[🔮 미확인: 꽝]</span>`;
                }
            }

            let mailBtn = '';
            if (isAdmin && p.userName !== myNickname) {
                mailBtn = `<button onclick="openSendMailModal('${p.userId}', '${p.userName}')" style="margin-left:8px; background:none; border:1px solid #3b82f6; color:#3b82f6; border-radius:4px; padding:2px 6px; font-size:0.75rem; cursor:pointer;">📩 쪽지</button>`;
            }

            tbody.innerHTML += `<tr>
                <td>${index + 1}</td>
                <td><strong>${p.userName}</strong>${extraInfo} ${mailBtn}</td>
                <td style="color:#94a3b8; font-size:0.9rem;">${formatDateDetail(p.appliedAt)}</td>
            </tr>`;
        });
    } catch (err) { console.error(err); }
}

// ... (이하 나머지 코드 동일)

async function loadComments() {
    try {
        const res = await fetch(`/api/comments/${eventId}`);
        const comments = await res.json();
        document.getElementById('commentCount').innerText = comments.length;
        const list = document.getElementById('commentList');
        list.innerHTML = '';
        if (comments.length === 0) { list.innerHTML = '<p style="color:#666; text-align:center;">첫 번째 댓글을 남겨보세요!</p>'; return; }
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
    const date = formatDateDetail(c.createdAt);
    const deleteBtn = (myNickname === c.userNickname || isAdmin) ? `<button class="cmt-action-btn" onclick="deleteComment('${c._id}')">삭제</button>` : '';
    const replyBtn = !isReply ? `<button class="cmt-action-btn" onclick="toggleReplyForm('${c._id}')">답글달기</button>` : '';
    const wrapperClass = isReply ? 'comment-item reply-item' : 'comment-item';
    const iconHtml = isReply ? '<span class="reply-icon">└</span>' : '';
    let badgeHtml = '';
    if (c.userId && c.userId.isAdmin) badgeHtml = `<span class="admin-badge-small">관리자</span>`;

    return `
        <div class="${wrapperClass}">
            ${iconHtml}
            <div class="comment-header">
                <div><span class="comment-writer">${c.userNickname}</span> ${badgeHtml} <span style="margin-left:10px; color:#64748b; font-size:0.85rem;">${date}</span></div>
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
    let content = parentId ? document.getElementById(`replyInput-${parentId}`).value : document.getElementById('commentInput').value;
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
        } else { const data = await res.json(); alert(data.message || '등록 실패'); }
    } catch (err) { alert('오류 발생'); }
}

function toggleReplyForm(commentId) {
    const form = document.getElementById(`replyForm-${commentId}`);
    if (form.style.display === 'block') { form.style.display = 'none'; }
    else {
        document.querySelectorAll('.reply-form').forEach(f => f.style.display = 'none');
        form.style.display = 'block';
    }
}

async function deleteComment(commentId) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
        const res = await fetch(`/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) loadComments();
        else { const data = await res.json(); alert(data.message); }
    } catch (err) { alert('오류 발생'); }
}

function generatePrizeOptions() {
    if (!currentEvent.prizes || currentEvent.prizes.length === 0) return null;

    let options = `<option value="">선택 안함</option>`;
    currentEvent.prizes.forEach(p => {
        options += `<option value="${p.label}||${p.reward}">${p.label} - ${p.reward}</option>`;
    });
    return options;
}

async function loadCandidates() {
    const res = await fetch(`/api/comments/${eventId}`);
    const comments = await res.json();
    const container = document.getElementById('commentCandidates');
    
    if(comments.length === 0) { container.innerHTML = '<p style="text-align:center; color:#666;">작성된 댓글이 없습니다.</p>'; return; }
    
    const prizeOptions = generatePrizeOptions();

    container.innerHTML = comments.map(c => {
        let selectorHtml = '';
        if (prizeOptions) {
            selectorHtml = `<select class="winner-select" data-uid="${c.userId._id || c.userId}" data-nick="${c.userNickname}" data-content="${c.content}" style="background:#1e293b; color:white; border:1px solid #475569; padding:5px; border-radius:5px; width:100%; margin-top:5px;">${prizeOptions}</select>`;
        } else {
            selectorHtml = `<input type="checkbox" class="chk-winner" value="${c.userId._id || c.userId}" data-nick="${c.userNickname}" data-content="${c.content}" style="width:20px; height:20px; margin-top:5px;">`;
        }

        return `
        <div class="comment-select-item">
            ${!prizeOptions ? selectorHtml : ''} 
            <div style="width:100%;">
                <strong style="color:#3b82f6;">${c.userNickname}</strong>
                <div style="color:#cbd5e1; font-size:0.9rem;">${c.content}</div>
                ${prizeOptions ? selectorHtml : ''} 
            </div>
        </div>`;
    }).join('');
}

function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
    if (tab === 'comment') {
        document.querySelectorAll('.admin-tab-btn')[0].classList.add('active');
        document.getElementById('tabComment').classList.remove('hidden');
        document.getElementById('tabParticipant').classList.add('hidden');
    } else {
        document.querySelectorAll('.admin-tab-btn')[1].classList.add('active');
        document.getElementById('tabComment').classList.add('hidden');
        document.getElementById('tabParticipant').classList.remove('hidden');
    }
}

async function loadParticipantCandidates() {
    const res = await fetch(`/api/events/${eventId}/participants`);
    const parts = await res.json();
    const container = document.getElementById('participantCandidates');
    
    if(parts.length === 0) { container.innerHTML = '<p style="text-align:center; color:#666;">참여자가 없습니다.</p>'; return; }
    
    const prizeOptions = generatePrizeOptions();

    container.innerHTML = parts.map(p => {
        let selectorHtml = '';
        if (prizeOptions) {
            selectorHtml = `<select class="winner-select" data-uid="${p.userId}" data-nick="${p.userName}" data-content="참여 신청" style="background:#1e293b; color:white; border:1px solid #475569; padding:5px; border-radius:5px; width:100%; margin-top:5px;">${prizeOptions}</select>`;
        } else {
            selectorHtml = `<input type="checkbox" class="chk-winner" value="${p.userId}" data-nick="${p.userName}" data-content="참여 신청" style="width:20px; height:20px; margin-top:5px;">`;
        }

        return `
        <div class="comment-select-item">
            ${!prizeOptions ? selectorHtml : ''}
            <div style="width:100%;">
                <strong style="color:#2ecc71;">${p.userName}</strong>
                <div style="color:#cbd5e1; font-size:0.9rem;">참여일: ${formatDateDetail(p.appliedAt)}</div>
                ${prizeOptions ? selectorHtml : ''}
            </div>
        </div>`;
    }).join('');
}

async function submitManualWinners() {
    if (!confirm('선택한 인원을 당첨자로 확정하시겠습니까?')) return;
    
    let winners = [];

    if (currentEvent.prizes && currentEvent.prizes.length > 0) {
        const selects = document.querySelectorAll('.winner-select');
        selects.forEach(sel => {
            if (sel.value) { 
                const [label, reward] = sel.value.split('||'); 
                winners.push({
                    userId: sel.dataset.uid,
                    nickname: sel.dataset.nick,
                    content: sel.dataset.content,
                    reward: `${label} (${reward})` 
                });
            }
        });
    } else {
        const reward = document.getElementById('rewardName').value;
        if(!reward) return alert('지급할 상품명을 입력해주세요.');
        const checkedBoxes = document.querySelectorAll('.chk-winner:checked');
        winners = Array.from(checkedBoxes).map(box => ({
            userId: box.value, nickname: box.dataset.nick, content: box.dataset.content, reward: reward
        }));
    }
    
    if(winners.length === 0) return alert('당첨자를 1명 이상 선택하세요.');

    try {
        const res = await fetch(`/api/events/${eventId}/winners`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ winners })
        });
        if (res.ok) { alert('당첨자 발표가 완료되었습니다!'); location.reload(); }
        else alert('저장 실패');
    } catch (e) { alert('오류'); }
}

function formatDateDetail(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? '오후' : '오전';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    return `${year}.${month}.${day}. ${ampm} ${hours}:${minutes}`;
}

// --- [NEW] 당첨자 개별 지정 로직 (숫자 뽑기용) ---

let selectedWinnerId = null;
let selectedWinnerName = null;

function openPrizeModal(userId, nickname) {
    selectedWinnerId = userId;
    selectedWinnerName = nickname;
    
    document.getElementById('targetWinnerName').innerText = nickname;
    const selector = document.getElementById('prizeSelector');
    selector.innerHTML = '';

    if (currentEvent.prizes && currentEvent.prizes.length > 0) {
        currentEvent.prizes.forEach(p => {
            selector.innerHTML += `<option value="${p.label} (${p.reward})">${p.label} - ${p.reward}</option>`;
        });
    } else {
        selector.innerHTML = `<option value="특별 상품">특별 상품 (설정된 상품 없음)</option>`;
    }

    document.getElementById('prizeSelectModal').classList.remove('hidden');
}

async function confirmGivePrize() {
    const reward = document.getElementById('prizeSelector').value;
    
    if (!confirm(`${selectedWinnerName}님에게 '${reward}'을(를) 지급하시겠습니까?`)) return;

    try {
        const res = await fetch(`/api/events/${eventId}/winner/add`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ 
                userId: selectedWinnerId, 
                nickname: selectedWinnerName, 
                reward: reward 
            })
        });

        const data = await res.json();

        if (res.ok) {
            alert(data.message);
            document.getElementById('prizeSelectModal').classList.add('hidden');
            location.reload(); 
        } else {
            alert(data.message);
        }
    } catch (e) {
        console.error(e);
        alert('오류가 발생했습니다.');
    }
}

// --- [NEW] 쪽지 보내기 로직 ---

let targetReceiverId = null;

function openSendMailModal(userId, nickname) {
    targetReceiverId = userId;
    document.getElementById('targetUserName').innerText = nickname;
    document.getElementById('mailSubject').value = ''; 
    document.getElementById('mailContent').value = ''; 
    
    document.getElementById('sendMailModal').classList.remove('hidden');
}

async function sendMail() {
    const subject = document.getElementById('mailSubject').value;
    const content = document.getElementById('mailContent').value;

    if (!subject.trim() || !content.trim()) return alert('제목과 내용을 모두 입력하세요.');
    if (!confirm('쪽지를 보내시겠습니까?')) return;

    try {
        const res = await fetch('/api/mail/send', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ receiverId: targetReceiverId, subject, content })
        });
        const data = await res.json();
        
        if (res.ok) {
            alert(data.message);
            document.getElementById('sendMailModal').classList.add('hidden');
        } else {
            alert(data.message);
        }
    } catch (e) { alert('전송 실패'); }
}