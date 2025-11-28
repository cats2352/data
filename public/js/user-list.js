document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.getElementById('user-table-body');
    const paginationDiv = document.getElementById('pagination');
    const searchInput = document.getElementById('user-search-input');
    const searchBtn = document.getElementById('user-search-btn');
    
    const currentUser = localStorage.getItem('userNickname');
    let currentPage = 1;
    let currentSearch = '';

    // --- 1. 유저 목록 불러오기 함수 ---
    async function loadUsers(page, search) {
        try {
            // API 호출
            const response = await fetch(`/api/users?page=${page}&limit=20&search=${encodeURIComponent(search)}`);
            const data = await response.json();
            
            const users = data.users; 
            const totalPages = data.totalPages;

            // 관리자 확인
            const isAdmin = localStorage.getItem('isAdmin') === 'true';

            if (isAdmin) {
                const adminCol = document.querySelector('.admin-col');
                if(adminCol) adminCol.classList.remove('hidden');
            }

            // 테이블 비우기
            tableBody.innerHTML = '';

            if (!users || users.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">검색 결과가 없습니다.</td></tr>';
                paginationDiv.innerHTML = '';
                return;
            }

            // 테이블 렌더링
            users.forEach(user => {
                const date = new Date(user.createdAt).toLocaleDateString();
                const tr = document.createElement('tr');
                
                const adminBadge = user.isAdmin ? '<span class="admin-badge">ADMIN</span>' : '';

                // 승인 대기 배지 (isApproved가 false일 때만)
                const pendingBadge = (user.isApproved === false) 
                    ? '<span class="status-badge closed" style="margin-left:5px; font-size:0.7rem; color:#f44336; border:1px solid #f44336; padding:2px 6px; border-radius:4px;">승인대기</span>' 
                    : '';

                let adminBtns = '';
                
                if (isAdmin && user.nickname !== currentUser) {
                    // ★ [수정] 승인 여부에 따라 버튼 분기 처리
                    if (user.isApproved === false) {
                        // 1) 승인 대기 상태: 승인 / 거절 버튼 노출
                        adminBtns = `
                            <div class="manage-btn-group">
                                <button class="admin-btn" style="background-color:#4caf50;" onclick="approveUser('${user._id}', '${user.nickname}')">가입승인</button>
                                <button class="admin-btn" style="background-color:#f44336;" onclick="rejectUser('${user._id}', '${user.nickname}')">거절</button>
                            </div>
                        `;
                    } else {
                        // 2) 승인 완료 상태: 수정 / 추방 버튼 노출
                        adminBtns = `
                            <div class="manage-btn-group">
                                <button class="admin-btn edit-user-btn" onclick="editUser('${user._id}', '${user.nickname}')">수정</button>
                                <button class="admin-btn del-user-btn" onclick="deleteUser('${user._id}', '${user.nickname}')">추방</button>
                            </div>
                        `;
                    }
                } else if (isAdmin) {
                    adminBtns = '<span style="color:#888; font-size:0.8rem;">본인</span>';
                }

                tr.innerHTML = `
                    <td>
                        <i class="fa-solid fa-user-circle"></i> ${user.nickname} ${adminBadge} ${pendingBadge}
                    </td>
                    <td>${user.stats.deckCount}회</td>
                    <td>${user.stats.totalLikes}개</td>
                    <td>${user.stats.commentCount}개</td>
                    <td>${date}</td>
                    ${isAdmin ? `<td>${adminBtns}</td>` : ''} 
                `;
                tableBody.appendChild(tr);
            });

            // 페이지네이션 렌더링
            renderPagination(data.currentPage, totalPages);

        } catch (err) {
            console.error(err);
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">데이터 로딩 실패</td></tr>';
        }
    }

    // --- 2. 페이지네이션 버튼 생성 함수 ---
    function renderPagination(current, total) {
        paginationDiv.innerHTML = '';
        
        if (total <= 1) return;

        // 이전 버튼
        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
        prevBtn.disabled = current === 1;
        prevBtn.onclick = () => {
            if (current > 1) {
                currentPage--;
                loadUsers(currentPage, currentSearch);
            }
        };
        paginationDiv.appendChild(prevBtn);

        // 페이지 번호
        let startPage = Math.max(1, current - 2);
        let endPage = Math.min(total, startPage + 4);
        
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            const btn = document.createElement('button');
            btn.className = `page-btn ${i === current ? 'active' : ''}`;
            btn.textContent = i;
            btn.onclick = () => {
                currentPage = i;
                loadUsers(currentPage, currentSearch);
            };
            paginationDiv.appendChild(btn);
        }

        // 다음 버튼
        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        nextBtn.disabled = current === total;
        nextBtn.onclick = () => {
            if (current < total) {
                currentPage++;
                loadUsers(currentPage, currentSearch);
            }
        };
        paginationDiv.appendChild(nextBtn);
    }

    // --- 3. 검색 이벤트 ---
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            currentSearch = searchInput.value.trim();
            currentPage = 1;
            loadUsers(currentPage, currentSearch);
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                currentSearch = searchInput.value.trim();
                currentPage = 1;
                loadUsers(currentPage, currentSearch);
            }
        });
    }

    // 초기 로드
    loadUsers(currentPage, currentSearch);
});

// --- 전역 함수들 (관리자 기능) ---

// 1. 유저 정보 수정
window.editUser = async (id, oldName) => {
    const newName = prompt(`'${oldName}' 회원의 새로운 닉네임을 입력하세요:`, oldName);
    if (newName && newName !== oldName) {
        try {
            const res = await fetch(`/api/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newNickname: newName })
            });
            if (res.ok) {
                alert('변경되었습니다.');
                location.reload();
            } else {
                alert((await res.json()).message);
            }
        } catch (e) { alert('오류 발생'); }
    }
};

// 2. 유저 추방 (기존 회원 삭제)
window.deleteUser = async (id, name) => {
    if (confirm(`정말 '${name}' 회원을 추방하시겠습니까?\n작성한 덱도 모두 삭제됩니다.`)) {
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert('추방 처리되었습니다.');
                location.reload();
            }
        } catch (e) { alert('오류 발생'); }
    }
};

// 3. 가입 승인
window.approveUser = async (id, name) => {
    if (confirm(`'${name}' 님의 가입을 승인하시겠습니까?`)) {
        try {
            const res = await fetch(`/api/users/${id}/approve`, { method: 'PUT' });
            if (res.ok) {
                alert('승인되었습니다.');
                location.reload();
            } else {
                alert('오류가 발생했습니다.');
            }
        } catch (e) { console.error(e); alert('서버 오류'); }
    }
};

// 4. 가입 거절 (가입 대기자 삭제)
// 기능적으로는 deleteUser와 같지만, 메시지와 맥락을 다르게 보여주기 위해 분리했습니다.
window.rejectUser = async (id, name) => {
    if (confirm(`'${name}' 님의 가입 요청을 거절(삭제)하시겠습니까?`)) {
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert('가입이 거절되었습니다.');
                location.reload();
            } else {
                alert('오류가 발생했습니다.');
            }
        } catch (e) { console.error(e); alert('서버 오류'); }
    }
};