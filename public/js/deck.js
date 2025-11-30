document.addEventListener('DOMContentLoaded', () => {
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

    // 페이지네이션 요소
    const paginationDiv = document.getElementById('pagination');

    let currentSort = 'latest'; // 현재 정렬
    let currentFilter = {};     // 현재 검색 필터
    let currentPage = 1;        // ★ 현재 페이지

    // --- 초기 실행 ---
    initSubContentData(); // 세부 컨텐츠 데이터 세팅
    loadDecks(1);         // 덱 목록 불러오기 (1페이지)

    // --- 이벤트 리스너 ---

    // 1. 작성하기 버튼
    if (writeBtn) {
        writeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const userNickname = localStorage.getItem('userNickname');
            if (!userNickname) {
                notify('로그인이 필요한 서비스입니다.', 'error');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
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

            loadDecks(1); // 정렬 변경 시 1페이지부터 다시 로드
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
            currentFilter = {
                title: filterTitle.value.trim(),
                writer: filterWriter.value.trim(),
                startDate: filterDateStart.value,
                endDate: filterDateEnd.value,
                mainContent: filterMain.value,
                subContent: filterSub.value
            };
            toggleSidebar(false);
            loadDecks(1); // 검색 적용 시 1페이지부터
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
            updateSubContentOptions('');
            
            currentFilter = {};
            loadDecks(1); // 초기화 시 1페이지부터
        });
    }

    // --- 함수 정의 ---

    // 덱 불러오기 (페이지네이션 적용)
    async function loadDecks(page = 1) {
        const deckListContainer = document.getElementById('deck-list');
        const currentUser = localStorage.getItem('userNickname'); 
        
        currentPage = page; // 현재 페이지 갱신

        // 쿼리 스트링 만들기
        const params = new URLSearchParams({
            sort: currentSort,
            page: page,
            limit: 10, // 10개씩 보기
            ...currentFilter
        });

        try {
            const response = await fetch(`/api/decks?${params.toString()}`);
            const data = await response.json(); // { decks: [], totalPages: 0, ... }

            // 데이터 구조 변경에 따른 처리
            const decks = data.decks; 
            const totalPages = data.totalPages;

            if (!decks || decks.length === 0) {
                deckListContainer.innerHTML = `
                    <div class="empty-message">
                        <i class="fa-solid fa-box-open"></i>
                        <p>조건에 맞는 덱이 없습니다.</p>
                    </div>`;
                deckListContainer.classList.remove('deck-list-layout'); 
                if (paginationDiv) paginationDiv.innerHTML = ''; // 페이지네이션 숨김
                return;
            }

            deckListContainer.innerHTML = '';
            deckListContainer.classList.add('deck-list-layout');

            decks.forEach(deck => {
                const item = createDeckListItem(deck, currentUser);
                deckListContainer.appendChild(item);
            });

            // 페이지네이션 렌더링
            renderPagination(data.currentPage, totalPages);

        } catch (error) {
            console.error('덱 로딩 실패:', error);
            deckListContainer.innerHTML = '<p class="empty-message">오류 발생</p>';
        }
    }

    // ★ [추가] 페이지네이션 버튼 렌더링 함수
    function renderPagination(current, total) {
        if (!paginationDiv) return;
        paginationDiv.innerHTML = '';
        
        if (total <= 1) return; // 1페이지뿐이면 버튼 안 보임

        // 이전 버튼
        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
        prevBtn.disabled = current === 1;
        prevBtn.onclick = () => {
            if (current > 1) loadDecks(current - 1);
        };
        paginationDiv.appendChild(prevBtn);

        // 페이지 번호 (최대 5개 표시 알고리즘)
        let startPage = Math.max(1, current - 2);
        let endPage = Math.min(total, startPage + 4);
        
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            const btn = document.createElement('button');
            btn.className = `page-btn ${i === current ? 'active' : ''}`;
            btn.textContent = i;
            btn.onclick = () => loadDecks(i);
            paginationDiv.appendChild(btn);
        }

        // 다음 버튼
        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        nextBtn.disabled = current === total;
        nextBtn.onclick = () => {
            if (current < total) loadDecks(current + 1);
        };
        paginationDiv.appendChild(nextBtn);
    }

    // 세부 컨텐츠 옵션 업데이트
    function updateSubContentOptions(mainType) {
        filterSub.innerHTML = '<option value="">전체</option>'; 
        if (!mainType) {
            filterSub.disabled = true;
            return;
        }
        const subCategories = {
            'pirate_festival': ['해적페스티벌'],
            'kizuna': ['준비중'],
            'treasure_map': ['준비중'],
            'coop': ['준비중'],
            'pirate_trail': ['VS 키드', '준비중']
        };
        const list = subCategories[mainType];
        if (list) {
            list.forEach(item => {
                const option = document.createElement('option');
                option.value = item;
                option.textContent = item;
                filterSub.appendChild(option);
            });
            filterSub.disabled = false;
        } else {
            filterSub.disabled = true;
        }
    }

    function initSubContentData() { }

    function createDeckListItem(deck, currentUser) {
        const date = new Date(deck.createdAt).toLocaleDateString();
        const contentNameMap = {
            'pirate_festival': '해적제', 'kizuna': '유대결전',
            'treasure_map': '트레저맵', 'coop': '공동전투',
            'pirate_trail': '해적왕의 궤적'
        };
        const korContentName = contentNameMap[deck.mainContent] || deck.mainContent;

        const isLiked = deck.likedBy && deck.likedBy.includes(currentUser);
        const heartClass = isLiked ? 'fa-solid' : 'fa-regular';
        const activeClass = isLiked ? 'active' : '';

        let totalComments = 0;
        if (deck.comments && Array.isArray(deck.comments)) {
            totalComments = deck.comments.length; 
            deck.comments.forEach(c => {
                if (c.replies) totalComments += c.replies.length; 
            });
        }

        const isAdmin = localStorage.getItem('isAdmin') === 'true';

        let manageBtnHtml = '';
        if (currentUser && (deck.writer === currentUser || isAdmin)) {
            manageBtnHtml = `
                <div class="manage-btns">
                    ${deck.writer === currentUser ? `<button class="edit-btn" title="수정"><i class="fa-solid fa-pen"></i></button>` : ''}
                    <button class="delete-btn" title="삭제"><i class="fa-solid fa-trash"></i></button>
                </div>`;
        }

        let tagsHtml = '';
        if (deck.tags && deck.tags.length > 0) {
            tagsHtml = `<div class="deck-tags-preview">`;
            deck.tags.slice(0, 3).forEach(tag => {
                tagsHtml += `<span class="preview-tag">#${tag}</span>`;
            });
            if (deck.tags.length > 3) tagsHtml += `<span class="preview-tag">+${deck.tags.length - 3}</span>`;
            tagsHtml += `</div>`;
        }

        const article = document.createElement('article');
        article.className = 'deck-list-item'; 
        
        article.innerHTML = `
            <div class="deck-item-left">
                <div class="deck-badges">
                    <span class="badge-main">${korContentName}</span>
                    <span class="badge-sub">${deck.subContent}</span>
                </div>
                <div class="deck-text-info">
                    <h3 class="deck-title" title="${deck.title}">${deck.title}</h3>
                    ${tagsHtml}
                </div>
            </div>
            
            <div class="deck-item-right">
                <div class="deck-meta">
                    <span class="writer"><i class="fa-solid fa-user"></i> ${deck.writer}</span>
                    <span class="date">${date}</span>
                </div>
                
                <div class="deck-stats">
                    <button class="like-btn ${activeClass}" data-id="${deck._id}">
                        <i class="${heartClass} fa-heart"></i> <span class="like-count">${deck.likes}</span>
                    </button>
                    <span class="comment-stat">
                        <i class="fa-regular fa-comment-dots"></i> ${totalComments}
                    </span>
                </div>

                <div class="deck-actions">
                    ${manageBtnHtml}
                    <button class="detail-btn">상세보기</button>
                </div>
            </div>
        `;

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
                        notify('삭제되었습니다.', 'success');
                        loadDecks(currentPage); // 현재 페이지 유지하며 리로드
                    } else {
                        const data = await res.json();
                        notify(data.message, 'error');
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
            if (!currentUser) return notify('로그인이 필요합니다.', 'error');
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