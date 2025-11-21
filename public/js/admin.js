// 관리자 기능 (유저 승인 관리)
function openAdminModal() {
    document.getElementById('adminModal').classList.remove('hidden');
    // 모달 열 때 검색창 초기화
    const searchInput = document.getElementById('userSearchInput');
    if (searchInput) searchInput.value = '';
    
    loadAdminUsers();
}

async function loadAdminUsers() {
    const pendingList = document.getElementById('pendingList');
    const approvedList = document.getElementById('approvedList');
    
    // 1. 승인 대기 목록 로드
    try {
        const resP = await fetch('/api/admin/pending-users', { headers: { 'Authorization': `Bearer ${token}` } });
        const pendingUsers = await resP.json();
        pendingList.innerHTML = '';
        
        if (pendingUsers.length === 0) {
            pendingList.innerHTML = '<p style="color:#666; font-size:0.9rem;">대기 중인 요청이 없습니다.</p>';
        } else {
            pendingUsers.forEach(u => {
                pendingList.innerHTML += `
                    <div style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                        <span>${u.nickname}</span>
                        <div style="display:flex; gap:5px;">
                            <button onclick="approveUser('${u._id}')" style="background:#2ecc71; border:none; color:white; padding:5px 10px; border-radius:5px; cursor:pointer;">승인</button>
                            <button onclick="rejectUser('${u._id}')" style="background:#ef4444; border:none; color:white; padding:5px 10px; border-radius:5px; cursor:pointer;">거절</button>
                        </div>
                    </div>`;
            });
        }
    } catch(e) { console.error(e); }

    // 2. 승인된 유저 목록 로드
    try {
        const resA = await fetch('/api/admin/approved-users', { headers: { 'Authorization': `Bearer ${token}` } });
        const approvedUsers = await resA.json();
        approvedList.innerHTML = '';

        if (approvedUsers.length === 0) {
            approvedList.innerHTML = '<p style="color:#666; font-size:0.9rem;">승인된 유저가 없습니다.</p>';
        } else {
            approvedUsers.forEach(u => {
                const isMe = (u.nickname === user); 
                const mailBtn = !isMe ? `<button onclick="openSendMailModal('${u._id}', '${u.nickname}')" style="background:#3b82f6; border:none; color:white; padding:5px 8px; border-radius:5px; cursor:pointer; margin-right:5px; font-size:0.8rem;">📩 쪽지</button>` : '';
                const cancelBtn = isMe ? `<span style="color:#666; font-size:0.8rem;">(나)</span>` : `<button onclick="unapproveUser('${u._id}')" style="background:#ef4444; border:none; color:white; padding:5px 10px; border-radius:5px; cursor:pointer;">취소</button>`;

                // ★ [수정됨] 검색을 위해 class="user-item" 추가
                approvedList.innerHTML += `
                    <div class="user-item" style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                        <span class="user-nickname">${u.nickname}</span>
                        <div style="display:flex; align-items:center;">${mailBtn}${cancelBtn}</div>
                    </div>`;
            });
        }
    } catch(e) { console.error(e); }
}

// ★ [NEW] 유저 검색 필터링 함수
function filterApprovedUsers() {
    const input = document.getElementById('userSearchInput');
    const filter = input.value.toUpperCase();
    const list = document.getElementById('approvedList');
    const items = list.getElementsByClassName('user-item');

    for (let i = 0; i < items.length; i++) {
        const nicknameSpan = items[i].querySelector('.user-nickname');
        if (nicknameSpan) {
            const txtValue = nicknameSpan.textContent || nicknameSpan.innerText;
            // 검색어가 포함되어 있으면 보이고(display=""), 아니면 숨김(display="none")
            if (txtValue.toUpperCase().indexOf(filter) > -1) {
                items[i].style.display = "flex"; // flex 레이아웃 유지
            } else {
                items[i].style.display = "none";
            }
        }
    }
}

async function approveUser(id) {
    if(!confirm('이 유저를 승인하시겠습니까?')) return;
    await fetch('/api/admin/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ targetUserId: id })
    });
    loadAdminUsers(); 
}

async function unapproveUser(id) {
    if(!confirm('승인을 취소하시겠습니까?\n해당 유저는 다시 승인받기 전까지 로그인이 차단됩니다.')) return;
    await fetch('/api/admin/unapprove', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ targetUserId: id })
    });
    loadAdminUsers(); 
}

async function rejectUser(id) {
    if(!confirm('정말 가입 요청을 거절(삭제)하시겠습니까?\n삭제된 계정은 복구할 수 없습니다.')) return;
    try {
        const res = await fetch(`/api/admin/user/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            loadAdminUsers();
        } else {
            alert('삭제 실패');
        }
    } catch(e) { console.error(e); }
}