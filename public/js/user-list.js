// -----------------------------------------------------------
// ★ [안전장치] 알림 함수 정의
// -----------------------------------------------------------
const notify = (message, type = 'info') => {
    if (typeof showToast === 'function') {
        showToast(message, type);
    } else {
        alert(message);
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.getElementById('user-table-body');
    const paginationDiv = document.getElementById('pagination');
    const searchInput = document.getElementById('user-search-input');
    const searchBtn = document.getElementById('user-search-btn');
    
    // 승인 대기자 관련 요소
    const pendingSection = document.getElementById('pending-list-section');
    const pendingTableBody = document.getElementById('pending-table-body');

    const currentUser = localStorage.getItem('userNickname');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    
    let currentPage = 1;
    let currentSearch = '';
    let currentSort = 'latest'; // 기본 정렬: 최신 가입순

    // --- 초기 실행 ---
    if (isAdmin) {
        // 관리자라면 정회원 테이블의 '관리' 컬럼 헤더 보이기
        const adminCols = document.querySelectorAll('.admin-col');
        adminCols.forEach(col => col.classList.remove('hidden'));
        
        // 승인 대기자 목록 불러오기
        loadPendingUsers();
    }
    
    // 정회원 목록 불러오기 (초기 로드)
    loadApprovedUsers(currentPage, currentSearch);

    // --- [이벤트] 정렬 헤더 클릭 ---
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortType = th.dataset.sort;

            // '가입일(latest)'인 경우만 토글(최신<->오래된), 나머지는 해당 기준 내림차순 고정
            if (sortType === 'latest') {
                currentSort = (currentSort === 'latest') ? 'oldest' : 'latest';
            } else {
                currentSort = sortType;
            }

            // 아이콘 및 active 스타일 업데이트
            updateSortIcons(th);
            
            // 데이터 다시 로드 (페이지 1로 초기화하지 않음)
            loadApprovedUsers(currentPage, currentSearch);
        });
    });

    function updateSortIcons(clickedTh) {
        // 1. 모든 헤더 초기화
        document.querySelectorAll('th.sortable').forEach(th => {
            th.classList.remove('active');
            const icon = th.querySelector('i');
            // 아이콘 초기화 (기본값)
            if (icon) icon.className = 'fa-solid fa-sort'; 
        });

        // 2. 클릭된 헤더 활성화
        clickedTh.classList.add('active');
        const icon = clickedTh.querySelector('i');

        // 3. 정렬 상태에 따른 아이콘 변경
        if (currentSort === 'oldest') {
            icon.className = 'fa-solid fa-sort-up'; // 오름차순 (오래된 순)
        } else {
            icon.className = 'fa-solid fa-sort-down'; // 내림차순 (최신/많은 순)
        }
    }

    // --- [헬퍼] 상대 시간 계산 함수 ---
    const timeAgo = (dateStr) => {
        if (!dateStr) return '-';
        const now = new Date();
        const past = new Date(dateStr);
        const diff = (now - past) / 1000; // 초 단위

        if (diff < 60) return '방금 전';
        if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
        return past.toLocaleDateString(); // 7일 넘으면 날짜 표시
    };

    // --- 1. [관리자용] 승인 대기자 목록 불러오기 ---
    async function loadPendingUsers() {
        try {
            // isApproved=false 인 유저만 조회 (최대 100명)
            const response = await fetch(`/api/users?isApproved=false&limit=100`);
            const data = await response.json();
            const pendingUsers = data.users;

            if (pendingUsers && pendingUsers.length > 0) {
                pendingSection.classList.remove('hidden');
                pendingTableBody.innerHTML = '';

                pendingUsers.forEach(user => {
                    const date = new Date(user.createdAt).toLocaleDateString();
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>
                            <i class="fa-solid fa-user-clock" style="color:#ff5722;"></i> ${user.nickname}
                            <span class="status-badge pending">승인대기</span>
                        </td>
                        <td>${date}</td>
                        <td>
                            <div class="manage-btn-group">
                                <button class="admin-btn" style="background-color:#4caf50;" onclick="approveUser('${user._id}', '${user.nickname}')">승인</button>
                                <button class="admin-btn" style="background-color:#f44336;" onclick="rejectUser('${user._id}', '${user.nickname}')">거절</button>
                            </div>
                        </td>
                    `;
                    pendingTableBody.appendChild(tr);
                });
            } else {
                pendingSection.classList.add('hidden');
            }
        } catch (err) {
            console.error('승인 대기자 로딩 실패:', err);
        }
    }

    // --- 2. [공통] 정회원 목록 불러오기 ---
    async function loadApprovedUsers(page, search) {
        try {
            // API 호출 (isApproved=true, 정렬, 검색 포함)
            const url = `/api/users?page=${page}&limit=20&isApproved=true&search=${encodeURIComponent(search)}&sort=${currentSort}`;
            const response = await fetch(url);
            const data = await response.json();
            
            const users = data.users; 
            const totalPages = data.totalPages;

            tableBody.innerHTML = '';

            if (!users || users.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">검색 결과가 없습니다.</td></tr>';
                paginationDiv.innerHTML = '';
                return;
            }

            users.forEach(user => {
                const date = new Date(user.createdAt).toLocaleDateString();
                const lastActive = timeAgo(user.lastLogin); // 최근 접속일 변환

                const tr = document.createElement('tr');
                
                // 관리자 배지
                const adminBadge = user.isAdmin ? '<span class="status-badge admin">ADMIN</span>' : '';
                
                // 관리 버튼 (관리자이고 본인이 아닐 때)
                let adminBtns = '';
                if (isAdmin && user.nickname !== currentUser) {
                    adminBtns = `
                        <div class="manage-btn-group">
                            <button class="admin-btn edit-user-btn" onclick="editUser('${user._id}', '${user.nickname}')">수정</button>
                            <button class="admin-btn del-user-btn" onclick="deleteUser('${user._id}', '${user.nickname}')">추방</button>
                        </div>
                    `;
                } else if (isAdmin) {
                    adminBtns = '<span style="color:#888; font-size:0.8rem;">본인</span>';
                }

                // 관리자 컬럼
                const adminTd = isAdmin ? `<td>${adminBtns}</td>` : '';

                tr.innerHTML = `
                    <td>
                        <i class="fa-solid fa-user-circle"></i> ${user.nickname} ${adminBadge}
                    </td>
                    <td>${user.stats.deckCount}회</td>
                    <td>${user.stats.totalLikes}개</td>
                    <td>${user.stats.commentCount}개</td>
                    <td style="color:var(--accent-color); font-size:0.9rem; font-weight:500;">${lastActive}</td>
                    <td>${date}</td>
                    ${adminTd}
                `;
                tableBody.appendChild(tr);
            });

            renderPagination(data.currentPage, totalPages);

        } catch (err) {
            console.error(err);
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">데이터 로딩 실패</td></tr>';
        }
    }

    // --- 3. 페이지네이션 버튼 생성 함수 ---
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
                loadApprovedUsers(currentPage, currentSearch);
            }
        };
        paginationDiv.appendChild(prevBtn);

        // 페이지 번호 (최대 5개)
        let startPage = Math.max(1, current - 2);
        let endPage = Math.min(total, startPage + 4);
        if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

        for (let i = startPage; i <= endPage; i++) {
            const btn = document.createElement('button');
            btn.className = `page-btn ${i === current ? 'active' : ''}`;
            btn.textContent = i;
            btn.onclick = () => {
                currentPage = i;
                loadApprovedUsers(currentPage, currentSearch);
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
                loadApprovedUsers(currentPage, currentSearch);
            }
        };
        paginationDiv.appendChild(nextBtn);
    }

    // --- 4. 검색 이벤트 ---
    if (searchBtn && searchInput) {
        const handleSearch = () => {
            currentSearch = searchInput.value.trim();
            currentPage = 1; // 검색 시 1페이지로 초기화
            loadApprovedUsers(currentPage, currentSearch);
        };

        searchBtn.addEventListener('click', handleSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
    }
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
                notify('변경되었습니다.', 'success');
                setTimeout(() => location.reload(), 1000);
            } else {
                notify((await res.json()).message, 'error');
            }
        } catch (e) { notify('오류 발생', 'error'); }
    }
};

// 2. 유저 추방 (완전 삭제)
window.deleteUser = async (id, name) => {
    if (confirm(`정말 '${name}' 회원을 추방하시겠습니까?\n작성한 덱도 모두 삭제됩니다.`)) {
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                notify('추방 처리되었습니다.', 'success');
                setTimeout(() => location.reload(), 1000);
            } else {
                notify('오류 발생', 'error');
            }
        } catch (e) { notify('오류 발생', 'error'); }
    }
};

// 3. 가입 승인
window.approveUser = async (id, name) => {
    if (confirm(`'${name}' 님의 가입을 승인하시겠습니까?`)) {
        try {
            const res = await fetch(`/api/users/${id}/approve`, { method: 'PUT' });
            if (res.ok) {
                notify('승인되었습니다.', 'success');
                setTimeout(() => location.reload(), 1000);
            } else {
                notify('오류가 발생했습니다.', 'error');
            }
        } catch (e) { 
            console.error(e); 
            notify('서버 오류', 'error'); 
        }
    }
};

// 4. 가입 거절
window.rejectUser = async (id, name) => {
    if (confirm(`'${name}' 님의 가입 요청을 거절(삭제)하시겠습니까?`)) {
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                notify('가입이 거절되었습니다.', 'success');
                setTimeout(() => location.reload(), 1000);
            } else {
                notify('오류가 발생했습니다.', 'error');
            }
        } catch (e) { 
            console.error(e); 
            notify('서버 오류', 'error'); 
        }
    }
};