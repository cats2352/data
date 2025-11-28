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
            // API 호출 (페이지, 검색어 전달)
            const response = await fetch(`/api/users?page=${page}&limit=20&search=${encodeURIComponent(search)}`);
            const data = await response.json();
            
            // ★ 핵심: 서버 응답 구조가 변경되었으므로 data.users로 배열을 가져와야 함
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

                tr.innerHTML = `
                    <td>
                        <i class="fa-solid fa-user-circle"></i> ${user.nickname} ${adminBadge}
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
        
        if (total <= 1) return; // 1페이지뿐이면 버튼 숨김

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

        // 페이지 번호 버튼 (최대 5개 표시)
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
            currentPage = 1; // 검색 시 1페이지로 초기화
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

// 전역 함수 (관리자 기능용)
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

window.deleteUser = async (id, name) => {
    if (confirm(`정말 '${name}' 회원을 추방하시겠습니까?\n작성한 덱도 모두 삭제됩니다.`)) {
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert('처리되었습니다.');
                location.reload();
            }
        } catch (e) { alert('오류 발생'); }
    }
};