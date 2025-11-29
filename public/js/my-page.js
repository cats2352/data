document.addEventListener('DOMContentLoaded', async () => {
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

    const currentUser = localStorage.getItem('userNickname');
    if (!currentUser) {
        notify('로그인이 필요합니다.', 'error');
        setTimeout(() => {
            location.href = 'login.html';
        }, 1000);
        return;
    }

    // 데이터 로드
    try {
        const res = await fetch(`/api/users/${currentUser}/activity`);
        if (!res.ok) throw new Error('데이터 로드 실패');
        const data = await res.json();

        // 1. 프로필 렌더링
        document.getElementById('my-nickname').textContent = data.user.nickname;
        document.getElementById('my-join-date').textContent = `가입일: ${new Date(data.user.createdAt).toLocaleDateString()}`;
        
        document.getElementById('stat-decks').textContent = data.myDecks.length;
        document.getElementById('stat-comments').textContent = data.myComments.length;
        document.getElementById('stat-likes').textContent = data.likedDecks.length;

        // 2. 리스트 렌더링 함수
        renderList('list-decks', data.myDecks, 'deck');
        renderList('list-comments', data.myComments, 'comment');
        renderList('list-likes', data.likedDecks, 'deck');

    } catch (e) {
        console.error(e);
        notify('정보를 불러오는데 실패했습니다.', 'error');
    }
});

// 탭 전환 함수 (전역)
window.switchTab = (tabName) => {
    // 버튼 활성화
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // 컨텐츠 전환
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-content-${tabName}`).classList.add('active');
};

// 리스트 렌더링 헬퍼
function renderList(elementId, items, type) {
    const container = document.getElementById(elementId);
    if (items.length === 0) {
        container.innerHTML = '<div style="padding:20px; text-align:center; color:#888;">내역이 없습니다.</div>';
        return;
    }

    container.innerHTML = items.map(item => {
        const date = new Date(item.createdAt || Date.now()).toLocaleDateString();
        
        if (type === 'deck') {
            // 덱 리스트 아이템
            return `
                <div class="list-item" onclick="location.href='deck-detail.html?id=${item._id}'">
                    <div class="item-main">
                        <span class="item-title">
                            <span class="item-badge">${item.mainContent}</span>
                            ${item.title}
                        </span>
                        <div class="item-meta">
                            <i class="fa-solid fa-heart" style="color:#ff6b6b"></i> ${item.likes} &nbsp;|&nbsp; ${date}
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-right" style="color:var(--sub-text-color)"></i>
                </div>
            `;
        } else {
            // 댓글 리스트 아이템 (내가 쓴 댓글 내용 + 원본 글 제목)
            return `
                <div class="list-item" onclick="location.href='deck-detail.html?id=${item.deckId}'">
                    <div class="item-main">
                        <span class="item-title" style="font-size:0.95rem;">"${item.content}"</span>
                        <div class="item-meta">
                            원본 글: ${item.deckTitle} &nbsp;|&nbsp; ${date}
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-right" style="color:var(--sub-text-color)"></i>
                </div>
            `;
        }
    }).join('');
}