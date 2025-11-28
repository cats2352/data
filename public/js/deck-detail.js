document.addEventListener('DOMContentLoaded', async () => {
    let commentsData = []; 
    let currentCommentSort = 'oldest'; 

    // 1. URL 파라미터 확인
    const params = new URLSearchParams(window.location.search);
    const deckId = params.get('id');

    if (!deckId) {
        alert('잘못된 접근입니다.');
        window.location.href = 'deck-share.html';
        return;
    }

    try {
        // 2. 덱 정보 요청
        const response = await fetch(`/api/decks/${deckId}`);
        const deck = await response.json();

        if (!response.ok) {
            alert(deck.message || '덱을 불러올 수 없습니다.');
            window.location.href = 'deck-share.html';
            return;
        }

        // 3. 화면 렌더링
        renderDeckDetail(deck);

    } catch (error) {
        console.error('Error:', error);
        alert('서버 오류가 발생했습니다.');
    }

    function renderDeckDetail(deck) {
        // --- 기본 정보 ---
        document.title = `${deck.title} - OPTC 커뮤니티`;
        document.getElementById('detail-title').textContent = deck.title;
        document.getElementById('detail-writer').innerHTML = `<i class="fa-solid fa-user"></i> ${deck.writer}`;
        document.getElementById('detail-date').innerHTML = `<i class="fa-regular fa-clock"></i> ${new Date(deck.createdAt).toLocaleDateString()}`;
        document.getElementById('detail-likes').innerHTML = `<i class="fa-solid fa-heart"></i> ${deck.likes}`;
        
        document.getElementById('detail-description').textContent = deck.description || '작성된 설명이 없습니다.';

        // 배지
        // ★ [추가] 해적왕의 궤적 매핑
        const contentMap = { 
            'pirate_festival': '해적제', 'kizuna': '유대결전', 
            'treasure_map': '트레저맵', 'coop': '공동전투',
            'pirate_trail': '해적왕의 궤적' 
        };
        const mainName = contentMap[deck.mainContent] || deck.mainContent;
        
        document.getElementById('detail-badges').innerHTML = `
            <span class="badge main">${mainName}</span>
            <span class="badge sub">${deck.subContent}</span>
        `;

        // --- 캐릭터 배치 ---
        const rowMain = document.getElementById('row-main');
        const rowSub = document.getElementById('row-sub');
        const labels = document.querySelectorAll('.formation-label');

        // ★ [수정] 해적왕의 궤적(pirate_trail)도 10칸 모드 적용
        if (deck.mainContent === 'kizuna' || deck.mainContent === 'treasure_map' || deck.mainContent === 'pirate_trail') {
            labels[0].textContent = "메인";
            labels[1].textContent = "서포터";
            renderSlots(rowMain, deck.characters.slice(0, 5));
            renderSlots(rowSub, deck.characters.slice(5, 10));
        } else {
            labels[0].textContent = "전열";
            labels[1].textContent = "후열";
            renderSlots(rowMain, deck.characters.slice(0, 5));
            renderSlots(rowSub, deck.characters.slice(5, 8));
        }

        // --- 캐릭터 옵션 정보 ---
        renderOptionSection(deck);

        // --- 공략 가이드 ---
        renderGuideSection(deck);

        // --- 댓글 초기화 ---
        initComments(deck.comments);
    }

    function renderSlots(container, chars) {
        container.innerHTML = ''; 
        chars.forEach(char => {
            const slot = document.createElement('div');
            slot.className = 'view-slot';
            if (char) {
                slot.innerHTML = `<img src="img/Thumbnail/${char.id}.png" alt="${char.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNjY2MiLz48L3N2Zz4='">`;
                slot.title = char.name;
            }
            container.appendChild(slot);
        });
    }

    function renderOptionSection(deck) {
        const container = document.getElementById('option-view-list');
        container.innerHTML = '';
        let hasOptions = false;

        deck.characters.forEach(char => {
            if (char && char.options && hasActiveOptions(char.options)) {
                hasOptions = true;
                const item = document.createElement('div');
                item.className = 'option-view-item';
                const tagsHtml = generateOptionTags(char.options);

                item.innerHTML = `
                    <img src="img/Thumbnail/${char.id}.png" class="option-view-thumb" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNjY2MiLz48L3N2Zz4='">
                    <div class="option-view-content">
                        <span class="option-view-name">${char.name}</span>
                        <div class="option-tags">${tagsHtml}</div>
                    </div>
                `;
                container.appendChild(item);
            }
        });

        if (!hasOptions) {
            container.innerHTML = '<p style="color:var(--sub-text-color); text-align:center;">설정된 추가 옵션이 없습니다.</p>';
        }
    }

    function hasActiveOptions(opt) {
        return opt.isFriend || opt.isCaptain || opt.isSuperEvo || 
               opt.isLimitBreak || opt.isSupportReq || opt.isPotential || 
               (opt.minLevel && opt.minLevel.trim() !== '');
    }

    function generateOptionTags(opt) {
        let tags = '';
        if (opt.isFriend) tags += `<span class="opt-tag friend">친선</span>`;
        if (opt.isCaptain) tags += `<span class="opt-tag captain">선장</span>`;
        if (opt.minLevel) tags += `<span class="opt-tag level">Lv.${opt.minLevel}</span>`;
        if (opt.isSuperEvo) tags += `<span class="opt-tag super">초진화</span>`;
        if (opt.isLimitBreak) tags += `<span class="opt-tag limit">한계돌파</span>`;
        if (opt.isPotential) tags += `<span class="opt-tag potential">잠능작</span>`;
        if (opt.isSupportReq) tags += `<span class="opt-tag support">서포트 필수</span>`;
        return tags;
    }

    function renderGuideSection(deck) {
        const container = document.getElementById('role-view-list');
        const sectionTitle = container.previousElementSibling; 
        container.innerHTML = ''; 

        // ★ [수정] 해적왕의 궤적(pirate_trail)도 라운드 모드 조건에 추가
        const isRoundMode = (deck.rounds && deck.rounds.length > 0) || 
                            (deck.mainContent === 'kizuna' || deck.mainContent === 'treasure_map' || deck.mainContent === 'pirate_trail');

        if (isRoundMode) {
            sectionTitle.textContent = "라운드별 공략";
            if (!deck.rounds || deck.rounds.length === 0) {
                container.innerHTML = '<p class="empty-msg" style="color:var(--sub-text-color); text-align:center;">작성된 라운드 공략이 없습니다.</p>';
                return;
            }

            deck.rounds.forEach((round, index) => {
                const box = document.createElement('div');
                box.className = 'round-detail-box';

                let charHtml = '';
                if (round.usedSlots && round.usedSlots.length > 0) {
                    charHtml = '<div class="round-detail-chars">';
                    round.usedSlots.forEach(slotIndex => {
                        const char = deck.characters[slotIndex];
                        if (char) {
                            const isSupport = slotIndex >= 5;
                            const badgeHtml = isSupport ? `<span class="support-badge">[서포트]</span>` : '';

                            charHtml += `
                                <div class="round-char-card">
                                    <img src="img/Thumbnail/${char.id}.png" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNjY2MiLz48L3N2Zz4='">
                                    <span>${char.name}${badgeHtml}</span>
                                </div>
                            `;
                        }
                    });
                    charHtml += '</div>';
                }

                box.innerHTML = `
                    <div class="round-detail-header">ROUND ${index + 1}</div>
                    ${charHtml}
                    <div class="round-detail-desc">${round.description || '설명 없음'}</div>
                `;
                container.appendChild(box);
            });

        } else {
            sectionTitle.textContent = "캐릭터 역할 및 운영법";
            let hasRole = false;
            deck.characters.forEach(char => {
                if (char) {
                    hasRole = true;
                    const item = document.createElement('div');
                    item.className = 'role-view-item';
                    item.innerHTML = `
                        <img src="img/Thumbnail/${char.id}.png" class="role-thumb" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNjY2MiLz48L3N2Zz4='">
                        <div>
                            <span class="role-char-name">${char.name}</span>
                            <div class="role-text">${char.role || '(작성된 설명 없음)'}</div>
                        </div>`;
                    container.appendChild(item);
                }
            });
            if (!hasRole) container.innerHTML = '<p style="color:var(--sub-text-color); text-align:center;">선택된 캐릭터가 없습니다.</p>';
        }
    }

    // --- ★ 댓글 시스템 로직 ---
    function initComments(comments) {
        commentsData = comments || [];
        renderComments();
    }

    function renderComments() {
        const listContainer = document.getElementById('comment-list');
        const countSpan = document.getElementById('comment-count');
        const currentUser = localStorage.getItem('userNickname');
        
        const isAdmin = localStorage.getItem('isAdmin') === 'true';

        let totalCount = commentsData.length;
        commentsData.forEach(c => totalCount += c.replies.length);
        countSpan.textContent = totalCount;

        let sortedComments = [...commentsData];
        if (currentCommentSort === 'newest') {
            sortedComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (currentCommentSort === 'reply') {
            sortedComments.sort((a, b) => b.replies.length - a.replies.length);
        } else {
            sortedComments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        }

        listContainer.innerHTML = '';

        sortedComments.forEach(comment => {
            const isLiked = comment.likes.includes(currentUser);
            const date = new Date(comment.createdAt).toLocaleString();

            const showDelBtn = currentUser && (comment.writer === currentUser || isAdmin);
            const delBtnHtml = showDelBtn 
                ? `<span class="action-btn delete-comment-btn" data-id="${comment._id}"><i class="fa-solid fa-trash"></i> 삭제</span>` 
                : '';

            const item = document.createElement('div');
            item.className = 'comment-item';
            
            // ★ [핵심 수정] reply-form에 style="display: none;" 추가하여 확실하게 숨김
            item.innerHTML = `
                <div class="comment-header">
                    <span class="comment-writer"><i class="fa-solid fa-user-circle"></i> ${comment.writer}</span>
                    <span class="comment-date">${date}</span>
                </div>
                <div class="comment-body">${comment.content}</div>
                <div class="comment-actions">
                    <span class="action-btn like-comment-btn ${isLiked ? 'liked' : ''}" data-id="${comment._id}">
                        <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i> ${comment.likes.length}
                    </span>
                    <span class="action-btn reply-open-btn" data-id="${comment._id}" data-writer="${comment.writer}">
                        <i class="fa-regular fa-comment-dots"></i> 답글달기
                    </span>
                    ${delBtnHtml} 
                </div>
                
                <div class="reply-list">
                    ${comment.replies.map(reply => {
                        const rLiked = reply.likes.includes(currentUser);
                        const showReplyDel = currentUser && (reply.writer === currentUser || isAdmin);
                        const rDelHtml = showReplyDel 
                            ? `<span class="action-btn delete-reply-btn" data-cid="${comment._id}" data-rid="${reply._id}"><i class="fa-solid fa-trash"></i></span>`
                            : '';

                        return `
                        <div class="reply-item">
                            <div class="comment-header">
                                <span class="comment-writer">└ ${reply.writer}</span>
                                <span class="comment-date">${new Date(reply.createdAt).toLocaleString()}</span>
                            </div>
                            <div class="comment-body">
                                ${reply.tag ? `<span class="mention-tag">@${reply.tag}</span>` : ''} 
                                ${reply.content}
                            </div>
                            <div class="comment-actions">
                                <span class="action-btn like-reply-btn ${rLiked ? 'liked' : ''}" 
                                    data-cid="${comment._id}" data-rid="${reply._id}">
                                    <i class="${rLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i> ${reply.likes.length}
                                </span>
                                ${rDelHtml} 
                            </div>
                        </div>`;
                    }).join('')}
                </div>

                <div class="reply-form hidden" id="reply-form-${comment._id}" style="display: none;">
                    <input type="text" class="reply-input" placeholder="답글을 입력하세요...">
                    <button class="reply-submit-btn" data-id="${comment._id}">등록</button>
                </div>
            `;
            listContainer.appendChild(item);
        });

        attachCommentEvents(); 
    }

    function attachCommentEvents() {
        const currentUser = localStorage.getItem('userNickname');

                document.querySelectorAll('.reply-open-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                if (!currentUser) return alert('로그인이 필요합니다.');
                const cid = btn.dataset.id;
                const writer = btn.dataset.writer;
                const form = document.getElementById(`reply-form-${cid}`);
                const input = form.querySelector('input');
                
                input.value = ''; 
                input.dataset.tag = writer; 
                input.placeholder = `@${writer} 님에게 답글 남기기...`;
                
                // ★ [핵심 수정] display 스타일 토글 로직 추가
                if (form.style.display === 'none' || form.style.display === '') {
                    form.style.display = 'flex'; // 보이게 함
                    form.classList.remove('hidden');
                    input.focus();
                } else {
                    form.style.display = 'none'; // 숨김
                    form.classList.add('hidden');
                }
            });
        });

        document.querySelectorAll('.like-comment-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!currentUser) return alert('로그인이 필요합니다.');
                const cid = btn.dataset.id;
                await toggleLike('comments', cid);
            });
        });

        document.querySelectorAll('.like-reply-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!currentUser) return alert('로그인이 필요합니다.');
                const cid = btn.dataset.cid;
                const rid = btn.dataset.rid;
                await toggleLike('replies', cid, rid);
            });
        });

        document.querySelectorAll('.reply-submit-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const cid = btn.dataset.id;
                const form = document.getElementById(`reply-form-${cid}`);
                const input = form.querySelector('input');
                const content = input.value.trim();
                const tag = input.dataset.tag || '';

                if (!content) return alert('내용을 입력하세요.');

                try {
                    const res = await fetch(`/api/decks/${deckId}/comments/${cid}/replies`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ writer: currentUser, content, tag })
                    });
                    if (res.ok) {
                        const newComments = await res.json();
                        initComments(newComments);
                    }
                } catch (err) { console.error(err); }
            });
        });

        // ★ [추가] 댓글 삭제 버튼 이벤트 리스너
        document.querySelectorAll('.delete-comment-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if(!confirm('댓글을 삭제하시겠습니까?')) return;
                const cid = btn.dataset.id;
                try {
                    const res = await fetch(`/api/decks/${deckId}/comments/${cid}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userNickname: currentUser }) // 요청자 정보(관리자 여부 확인용)
                    });
                    if (res.ok) {
                        const newComments = await res.json();
                        initComments(newComments);
                    } else {
                        alert('삭제 권한이 없습니다.');
                    }
                } catch(e) { console.error(e); }
            });
        });

        // ★ [추가] 답글 삭제 버튼 이벤트 리스너
        document.querySelectorAll('.delete-reply-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if(!confirm('답글을 삭제하시겠습니까?')) return;
                const cid = btn.dataset.cid;
                const rid = btn.dataset.rid;
                try {
                    const res = await fetch(`/api/decks/${deckId}/comments/${cid}/replies/${rid}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userNickname: currentUser })
                    });
                    if (res.ok) {
                        const newComments = await res.json();
                        initComments(newComments);
                    } else {
                        alert('삭제 권한이 없습니다.');
                    }
                } catch(e) { console.error(e); }
            });
        });
    }

    const commentSubmitBtn = document.getElementById('comment-submit-btn');
    if (commentSubmitBtn) {
        commentSubmitBtn.addEventListener('click', async () => {
            const currentUser = localStorage.getItem('userNickname');
            if (!currentUser) return alert('로그인이 필요합니다.');
            
            const input = document.getElementById('comment-input');
            const content = input.value.trim();
            if (!content) return alert('내용을 입력하세요.');

            try {
                const res = await fetch(`/api/decks/${deckId}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ writer: currentUser, content })
                });
                if (res.ok) {
                    input.value = ''; 
                    const newComments = await res.json();
                    initComments(newComments);
                }
            } catch (err) { console.error(err); }
        });
    }

    document.querySelectorAll('.sort-item').forEach(span => {
        span.addEventListener('click', () => {
            document.querySelector('.sort-item.active').classList.remove('active');
            span.classList.add('active');
            currentCommentSort = span.dataset.sort;
            renderComments();
        });
    });

    async function toggleLike(type, cid, rid = null) {
        const currentUser = localStorage.getItem('userNickname');
        let url = `/api/decks/${deckId}/comments/${cid}/like`;
        if (type === 'replies') {
            url = `/api/decks/${deckId}/comments/${cid}/replies/${rid}/like`;
        }

        try {
            const res = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userNickname: currentUser })
            });
            if (res.ok) {
                const newComments = await res.json();
                initComments(newComments);
            }
        } catch (err) { console.error(err); }
    }
});