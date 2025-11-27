document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.getElementById('user-table-body');
    const currentUser = localStorage.getItem('userNickname');
    
    // 1. 유저 목록 불러오기
    try {
        const response = await fetch('/api/users');
        const users = await response.json();

        // 2. 현재 접속자가 관리자(Admin)인지 확인
        // (보안상 서버 세션으로 체크해야 하지만, 여기선 로컬 닉네임과 대조)
        const myInfo = users.find(u => u.nickname === currentUser);
        const isAdmin = myInfo && myInfo.isAdmin;

        // 관리자라면 테이블 헤더의 '관리' 컬럼 보이기
        if (isAdmin) {
            document.querySelector('.admin-col').classList.remove('hidden');
        }

        // 3. 테이블 렌더링
        users.forEach(user => {
            const date = new Date(user.createdAt).toLocaleDateString();
            const tr = document.createElement('tr');
            
            // 관리자 배지
            const adminBadge = user.isAdmin ? '<span class="admin-badge">ADMIN</span>' : '';

            // 관리 버튼 (관리자에게만 보임 & 자기 자신은 삭제 불가)
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

    } catch (err) {
        console.error(err);
        tableBody.innerHTML = '<tr><td colspan="6">데이터를 불러오는데 실패했습니다.</td></tr>';
    }
});

// 전역 함수로 등록 (onclick 사용 위해)
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