document.addEventListener('DOMContentLoaded', () => {
    // 1. 공통 변수
    const writeBtn = document.querySelector('.write-btn');
    const sortOptions = document.querySelectorAll('.sort-options span');
    
    // 검색 관련 요소
    const searchBtn = document.querySelector('.search-btn');
    const sidebar = document.getElementById('search-sidebar');
    const overlay = document.getElementById('search-overlay');
    const closeSearchBtn = document.getElementById('close-search-btn');
    const applySearchBtn = document.getElementById('apply-search-btn');
    const resetSearchBtn = document.getElementById('reset-search-btn');

    // 필터 입력 요소
    const filterTitle = document.getElementById('filter-title');
    const filterWriter = document.getElementById('filter-writer');
    const filterDateStart = document.getElementById('filter-date-start');
    const filterDateEnd = document.getElementById('filter-date-end');
    const filterMain = document.getElementById('filter-main-content');
    const filterSub = document.getElementById('filter-sub-content');

    let currentSort = 'latest'; // 현재 정렬
    let currentFilter = {};     // 현재 검색 필터

    // --- 초기 실행 ---
    initSubContentData(); // 세부 컨텐츠 데이터 세팅
    loadDecks();          // 덱 목록 불러오기

    // --- 이벤트 리스너 ---

    // 1. 작성하기 버튼
    if (writeBtn) {
        writeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const userNickname = localStorage.getItem('userNickname');
            if (!userNickname) {
                alert('로그인이 필요한 서비스입니다.');
                window.location.href = 'login.html';
            } else {
                window.location.href = 'deck-select.html';
            }
        });
    }

    // 2. 정렬 옵션 (인기순/최신순)
    sortOptions.forEach(span => {
        span.addEventListener('click', () => {
            const text = span.innerText.trim();
            if (text === '|') return;

            let newSort = 'latest';
            if (text === '인기 순') newSort = 'popular';
            else if (text === '최신 순') newSort = 'latest';

            if (currentSort === newSort) return;

            currentSort = newSort;
            document.querySelector('.sort-options span.active').classList.remove('active');
            span.classList.add('active');

            loadDecks(); // 정렬 변경 시 다시 로드
        });
    });

    // 3. 검색 사이드바 열기/닫기
    function toggleSidebar(show) {
        if (show) {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        } else {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    }

    if (searchBtn) searchBtn.addEventListener('click', () => toggleSidebar(true));
    if (closeSearchBtn) closeSearchBtn.addEventListener('click', () => toggleSidebar(false));
    if (overlay) overlay.addEventListener('click', () => toggleSidebar(false));

    // 4. 메인 컨텐츠 변경 시 세부 컨텐츠 목록 갱신
    if (filterMain) {
        filterMain.addEventListener('change', () => {
            updateSubContentOptions(filterMain.value);
        });
    }

    // 5. 검색 적용 버튼
    if (applySearchBtn) {
        applySearchBtn.addEventListener('click', () => {
            // 필터 객체 생성
            currentFilter = {
                title: filterTitle.value.trim(),
                writer: filterWriter.value.trim(),
                startDate: filterDateStart.value,
                endDate: filterDateEnd.value,
                mainContent: filterMain.value,
                subContent: filterSub.value
            };
            
            toggleSidebar(false); // 창 닫기
            loadDecks();          // 데이터 다시 로드
        });
    }

    // 6. 초기화 버튼
    if (resetSearchBtn) {
        resetSearchBtn.addEventListener('click', () => {
            filterTitle.value = '';
            filterWriter.value = '';
            filterDateStart.value = '';
            filterDateEnd.value = '';
            filterMain.value = '';
            updateSubContentOptions(''); // 세부 목록 초기화
            
            currentFilter = {}; // 필터 초기화
            loadDecks();
        });
    }

    // --- 함수 정의 ---

    // 덱 불러오기 (정렬 + 필터 적용)
    async function loadDecks() {
        const deckListContainer = document.getElementById('deck-list');
        const currentUser = localStorage.getItem('userNickname'); 
        
        // 쿼리 스트링 만들기
        const params = new URLSearchParams({
            sort: currentSort,
            ...currentFilter // 검색 조건 펼치기
        });

        try {
            const response = await fetch(`/api/decks?${params.toString()}`);
            const decks = await response.json();

            if (decks.length === 0) {
                deckListContainer.innerHTML = `
                    <div class="empty-message">
                        <i class="fa-solid fa-box-open"></i>
                        <p>조건에 맞는 덱이 없습니다.</p>
                    </div>`;
                deckListContainer.classList.remove('deck-grid-layout');
                return;
            }

            deckListContainer.innerHTML = '';
            deckListContainer.classList.add('deck-grid-layout');

            decks.forEach(deck => {
                const card = createDeckCard(deck, currentUser);
                deckListContainer.appendChild(card);
            });

        } catch (error) {
            console.error('덱 로딩 실패:', error);
            deckListContainer.innerHTML = '<p class="empty-message">오류 발생</p>';
        }
    }

    // 세부 컨텐츠 옵션 업데이트
    function updateSubContentOptions(mainType) {
        filterSub.innerHTML = '<option value="">전체</option>'; // 초기화
        
        if (!mainType) {
            filterSub.disabled = true;
            return;
        }

        // deck-select.js 와 동일한 데이터
        const subCategories = {
            'pirate_festival': [
                '해적페스티벌', 
            ],
            'kizuna': [
                '준비중', 
            ],
            'treasure_map': [
                '준비중',
            ],
            'coop': [
                '준비중'
            ],
            // ★ [추가] 해적왕의 궤적 데이터
            'pirate_trail': [
                'VS 키드', 
                '준비중'
            ]
        };

        const list = subCategories[mainType];
        if (list) {
            list.forEach(item => {
                const option = document.createElement('option');
                option.value = item; // 저장할 때 이름 그대로 저장했으므로 value도 이름
                option.textContent = item;
                filterSub.appendChild(option);
            });
            filterSub.disabled = false;
        } else {
            filterSub.disabled = true;
        }
    }

    function initSubContentData() {
        // 초기화 시 필요한 로직이 있다면 여기에
    }

    // 카드 HTML 생성
    function createDeckCard(deck, currentUser) {
        const date = new Date(deck.createdAt).toLocaleDateString();
        let previewImagesHtml = '';
        const limit = 5; 
        
        deck.characters.slice(0, limit).forEach(char => {
            if (char) {
                previewImagesHtml += `<img src="img/Thumbnail/${char.id}.webp" alt="${char.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNjY2MiLz48L3N2Zz4='">`;
            } else {
                previewImagesHtml += `<div class="empty-slot"></div>`;
            }
        });

        const contentNameMap = {
            'pirate_festival': '해적제', 'kizuna': '유대결전',
            'treasure_map': '트레저맵', 'coop': '공동전투',
            'pirate_trail': '해적왕의 궤적' // ★ [추가] 맵핑 정보
        };
        const korContentName = contentNameMap[deck.mainContent] || deck.mainContent;

        const isLiked = deck.likedBy && deck.likedBy.includes(currentUser);
        const heartClass = isLiked ? 'fa-solid' : 'fa-regular';
        const activeClass = isLiked ? 'active' : '';

        // ★ [추가] 댓글 수 계산 로직
        let totalComments = 0;
        if (deck.comments && Array.isArray(deck.comments)) {
            totalComments = deck.comments.length; // 댓글 수
            deck.comments.forEach(c => {
                if (c.replies) totalComments += c.replies.length; // 대댓글 수 합산
            });
        }

        // ★ [추가] 관리자 여부 확인
        const isAdmin = localStorage.getItem('isAdmin') === 'true';

        let manageBtnHtml = '';
        // ★ [수정] 작성자 본인이거나, 관리자이면 관리 버튼 표시
        if (currentUser && (deck.writer === currentUser || isAdmin)) {
            manageBtnHtml = `
                <div class="manage-btns">
                    ${deck.writer === currentUser ? `<button class="edit-btn" title="수정"><i class="fa-solid fa-pen"></i></button>` : ''}
                    <button class="delete-btn" title="삭제"><i class="fa-solid fa-trash"></i></button>
                </div>`;
        }

        const article = document.createElement('article');
        article.className = 'deck-card';
        // ★ [수정] footer에 stats-group 및 comment-stat 추가
        article.innerHTML = `
            <div class="deck-card-header">
                <span class="badge-main">${korContentName}</span>
                <span class="badge-sub">${deck.subContent}</span>
                ${manageBtnHtml}
            </div>
            <div class="deck-card-body">
                <h3 class="deck-title">${deck.title}</h3>
                <div class="deck-meta">
                    <span><i class="fa-solid fa-user"></i> ${deck.writer}</span>
                    <span><i class="fa-regular fa-clock"></i> ${date}</span>
                </div>
                <div class="deck-preview-images">
                    ${previewImagesHtml}
                </div>
            </div>
            <div class="deck-card-footer">
                <div class="stats-group">
                    <button class="like-btn ${activeClass}" data-id="${deck._id}">
                        <i class="${heartClass} fa-heart"></i> <span class="like-count">${deck.likes}</span>
                    </button>
                    <span class="comment-stat">
                        <i class="fa-regular fa-comment-dots"></i> ${totalComments}
                    </span>
                </div>
                <button class="detail-btn">상세보기</button>
            </div>
        `;

        // 이벤트 리스너 연결 (삭제, 수정, 좋아요, 상세보기)
        const delBtn = article.querySelector('.delete-btn');
        if (delBtn) {
            delBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm('삭제하시겠습니까?')) return;
                try {
                    const res = await fetch(`/api/decks/${deck._id}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userNickname: currentUser })
                    });
                    if (res.ok) {
                        alert('삭제되었습니다.');
                        loadDecks();
                    } else {
                        alert((await res.json()).message);
                    }
                } catch (err) { console.error(err); }
            });
        }

        const editBtn = article.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.location.href = `deck-write.html?id=${deck._id}`;
            });
        }

        const likeBtn = article.querySelector('.like-btn');
        likeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!currentUser) return alert('로그인이 필요합니다.');
            try {
                const res = await fetch(`/api/decks/${deck._id}/like`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userNickname: currentUser })
                });
                if (res.ok) {
                    const data = await res.json();
                    const icon = likeBtn.querySelector('i');
                    const countSpan = likeBtn.querySelector('.like-count');
                    countSpan.textContent = data.likes;
                    if (data.liked) {
                        icon.classList.replace('fa-regular', 'fa-solid');
                        likeBtn.classList.add('active');
                    } else {
                        icon.classList.replace('fa-solid', 'fa-regular');
                        likeBtn.classList.remove('active');
                    }
                }
            } catch (err) { console.error(err); }
        });

        const detailBtn = article.querySelector('.detail-btn');
        if (detailBtn) {
            detailBtn.addEventListener('click', () => {
                window.location.href = `deck-detail.html?id=${deck._id}`;
            });
        }
        
        return article;
    }
});