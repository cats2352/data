document.addEventListener('DOMContentLoaded', async () => {
    // [알림 함수]
    const notify = (message, type = 'info') => {
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            alert(message);
        }
    };

    // --- 1. URL 파라미터 파싱 및 초기화 ---
    const params = new URLSearchParams(window.location.search);
    
    let mainContent = params.get('content') || 'pirate_festival';
    let subEventName = params.get('eventName') || '이벤트 미선택';
    
    const editDeckId = params.get('id');

    const contentMap = {
        'pirate_festival': '해적제', 'kizuna': '유대결전',
        'treasure_map': '트레저맵', 'coop': '공동전투',
        'pirate_trail': '해적왕의 궤적'
    };
    
    // --- 2. DOM 요소 변수 선언 ---
    const mainInput = document.getElementById('main-content-display');
    const subInput = document.getElementById('sub-content-display');
    const titleInput = document.getElementById('deck-title');
    const descInput = document.getElementById('deck-description');
    const saveBtn = document.getElementById('save-deck-btn');
    const roleList = document.getElementById('role-list'); 
    
    const optionList = document.getElementById('char-option-list');

    const modal = document.getElementById('char-modal');
    const closeBtn = document.getElementById('close-modal');
    const searchInput = document.getElementById('char-search-input');
    const searchResults = document.getElementById('search-results');
    
    // ★ 태그 관련 변수
    const tagInput = document.getElementById('tag-input');
    const tagListEl = document.getElementById('tag-list');
    let tags = [];

    let slots = []; 
    let deckState = []; 
    let currentSlotIndex = null;
    let roundState = [{ usedSlots: [], description: "" }]; 

    // --- 3. 화면 표시 및 초기 설정 ---
    if(mainInput) mainInput.value = contentMap[mainContent] || mainContent;
    if(subInput) subInput.value = subEventName;

    let characterData = {};
    try {
        const response = await fetch('character_data.json');
        characterData = await response.json();
    } catch (error) { console.error('캐릭터 데이터 로드 실패:', error); }

    // --- 4. 컨텐츠별 모드 확인 ---
    function isRoundMode() {
        return mainContent === 'kizuna' || mainContent === 'treasure_map' || mainContent === 'pirate_trail';
    }

    function getFormationConfig() {
        if (isRoundMode()) {
            return { rows: [5, 5], labels: ['메인', '서포터'], total: 10 };
        }
        return { rows: [5, 3], labels: ['전열', '후열'], total: 8 };
    }

    // --- 5. 배치 UI 생성 ---
    function initFormationUI() {
        const config = getFormationConfig();
        const container = document.querySelector('.formation-container');
        
        if (deckState.length === 0 || deckState.length !== config.total) {
            deckState = Array(config.total).fill(null);
        }

        let html = '';
        let slotCounter = 0;

        config.rows.forEach((count, rowIndex) => {
            html += `
            <div class="formation-group">
                <div class="row-label">${config.labels[rowIndex]}</div>
                <div class="formation-row row-${rowIndex === 0 ? 'main' : 'sub'}">`;
            for(let i=0; i<count; i++) {
                html += `<div class="char-slot" data-index="${slotCounter}"><i class="fa-solid fa-plus"></i></div>`;
                slotCounter++;
            }
            html += `   </div>
            </div>`;
        });
        container.innerHTML = html;

        slots = document.querySelectorAll('.char-slot');
        slots.forEach(slot => {
            slot.addEventListener('click', () => {
                if (slot.querySelector('img')) return;
                currentSlotIndex = parseInt(slot.dataset.index);
                modal.classList.remove('hidden');
                searchInput.value = ''; searchInput.focus();
                renderSearchResults(''); 
            });
        });
    }

    // --- 6. UI 업데이트 통합 함수 ---
    function updateAllUI() {
        updateGuideUI();  // 역할/라운드 설명
        updateOptionUI(); // 캐릭터 옵션 설정
    }

    // --- 7. 캐릭터 옵션 UI 생성 ---
    function updateOptionUI() {
        optionList.innerHTML = '';
        const hasCharacter = deckState.some(char => char !== null);
        
        if (!hasCharacter) {
            optionList.innerHTML = '<div class="empty-role-msg">캐릭터를 배치하면 설정창이 나타납니다.</div>';
            return;
        }

        deckState.forEach((char, index) => {
            if (char) {
                if (!char.options) {
                    char.options = {
                        isFriend: false, isCaptain: false, isSuperEvo: false,
                        minLevel: '', isLimitBreak: false, isSupportReq: false, isPotential: false
                    };
                }

                const row = document.createElement('div');
                row.className = 'option-item';

                const charInfo = `
                    <div class="option-char-info">
                        <img src="img/Thumbnail/${char.id}.webp" class="option-thumb" onerror="this.src='https://via.placeholder.com/60'">
                        <span class="option-name">${char.name}</span>
                    </div>`;

                const controlsDiv = document.createElement('div');
                controlsDiv.className = 'option-controls';

                const isSpecialContent = isRoundMode(); 
                const isSupportSlot = isSpecialContent && index >= 5; 

                if (isSpecialContent && !isSupportSlot) {
                    controlsDiv.appendChild(createCheckbox(char, 'isFriend', '친선'));
                    controlsDiv.appendChild(createCheckbox(char, 'isCaptain', '선장'));
                }

                controlsDiv.appendChild(createCheckbox(char, 'isSuperEvo', '초진화'));
                controlsDiv.appendChild(createInput(char, 'minLevel', '캐릭터LV최솟값'));
                controlsDiv.appendChild(createCheckbox(char, 'isLimitBreak', '한계돌파'));
                controlsDiv.appendChild(createCheckbox(char, 'isPotential', '잠능작'));

                if (isSpecialContent && isSupportSlot) {
                    controlsDiv.appendChild(createCheckbox(char, 'isSupportReq', '서포트 필수'));
                }

                row.innerHTML = charInfo;
                row.appendChild(controlsDiv);
                optionList.appendChild(row);
            }
        });
    }

    function createCheckbox(char, key, labelText) {
        const label = document.createElement('label');
        label.className = 'chk-label';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = char.options[key] || false;
        
        input.addEventListener('change', (e) => {
            char.options[key] = e.target.checked;
        });

        label.appendChild(input);
        const textSpan = document.createElement('span');
        textSpan.textContent = labelText;
        label.appendChild(textSpan);

        return label;
    }

    function createInput(char, key, labelText) {
        const div = document.createElement('div');
        div.className = 'level-input-group';
        
        const label = document.createElement('span');
        label.className = 'level-label';
        label.textContent = labelText;

        const input = document.createElement('input');
        input.type = 'text'; 
        input.className = 'level-input';
        input.placeholder = 'MAX';
        input.value = char.options[key] || '';

        input.addEventListener('input', (e) => {
            char.options[key] = e.target.value;
        });

        div.appendChild(label);
        div.appendChild(input);
        return div;
    }

    // --- 8. 가이드 UI ---
    function updateGuideUI() {
        const sectionTitle = document.querySelector('.role-desc-section .section-title');
        
        if (isRoundMode()) {
            sectionTitle.textContent = "라운드별 공략";
            renderRoundUI();
        } else {
            sectionTitle.textContent = "캐릭터 역할 설명";
            renderRoleUI();
        }
    }

    function renderRoleUI() {
        roleList.innerHTML = '';
        const hasCharacter = deckState.some(char => char !== null);
        if (!hasCharacter) {
            roleList.innerHTML = '<div class="empty-role-msg">캐릭터를 선택하면 역할 입력창이 나타납니다.</div>';
            return;
        }

        deckState.forEach((char, index) => {
            if (char) {
                const row = document.createElement('div');
                row.className = 'role-item';
                const img = document.createElement('img');
                img.src = `img/Thumbnail/${char.id}.webp`;
                img.className = 'role-thumb';
                img.onerror = () => { img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 50 50'%3E%3Crect width='50' height='50' fill='%23cccccc'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='8' fill='%23555555'%3ENo Img%3C/text%3E%3C/svg%3E"; };

                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'role-input';
                input.placeholder = `${char.name}의 역할/운용법`;
                input.value = char.role || '';
                input.addEventListener('input', (e) => { deckState[index].role = e.target.value; });

                const removeBtn = document.createElement('button');
                removeBtn.className = 'role-remove-btn';
                removeBtn.innerHTML = '<i class="fa-solid fa-minus"></i>';
                removeBtn.addEventListener('click', () => removeCharacter(index));

                row.append(img, input, removeBtn);
                roleList.appendChild(row);
            }
        });
    }

    function renderRoundUI() {
        roleList.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'round-container';

        roundState.forEach((round, rIndex) => {
            const box = document.createElement('div');
            box.className = 'round-box';
            
            const header = document.createElement('div');
            header.className = 'round-header';
            header.innerHTML = `<span class="round-title">ROUND ${rIndex + 1}</span>`;
            
            if (roundState.length > 1) {
                const delBtn = document.createElement('button');
                delBtn.className = 'round-remove-btn';
                delBtn.innerText = '라운드 삭제';
                delBtn.onclick = () => {
                    roundState.splice(rIndex, 1);
                    renderRoundUI();
                };
                header.appendChild(delBtn);
            }
            box.appendChild(header);

            const charSelector = document.createElement('div');
            charSelector.className = 'round-char-selector';
            
            let hasChar = false;
            for(let i=0; i<deckState.length; i++) {
                const char = deckState[i];
                if (char) {
                    hasChar = true;
                    const item = document.createElement('div');
                    item.className = 'round-char-item';
                    item.innerHTML = `<img src="img/Thumbnail/${char.id}.webp"><span class="round-char-name">${char.name}</span>`;
                    item.title = char.name;
                    if (round.usedSlots.includes(i)) item.classList.add('selected');
                    item.onclick = () => {
                        if (round.usedSlots.includes(i)) round.usedSlots = round.usedSlots.filter(s => s !== i);
                        else round.usedSlots.push(i);
                        renderRoundUI();
                    };
                    charSelector.appendChild(item);
                }
            }
            if (!hasChar) {
                charSelector.style.display = 'block';
                charSelector.innerHTML = '<p style="text-align:center; color:#888; padding:10px;">위쪽 "캐릭터 배치"에서 먼저 캐릭터를 추가해주세요.</p>';
            }
            box.appendChild(charSelector);

            const textarea = document.createElement('textarea');
            textarea.className = 'round-desc-input';
            textarea.placeholder = `${rIndex + 1}라운드 공략을 입력하세요...`;
            textarea.rows = 3;
            textarea.value = round.description;
            textarea.addEventListener('input', (e) => { round.description = e.target.value; });
            box.appendChild(textarea);

            container.appendChild(box);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'add-round-btn';
        addBtn.innerHTML = '<i class="fa-solid fa-plus"></i> 라운드 추가하기';
        addBtn.onclick = () => {
            roundState.push({ usedSlots: [], description: "" });
            renderRoundUI();
        };
        
        roleList.appendChild(container);
        roleList.appendChild(addBtn);
    }

    // --- ★ 태그 기능 구현 ---
    if (tagInput) {
        // 엔터키 입력 시 태그 추가
        tagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addTag(tagInput.value);
            }
        });
        
        // 백스페이스로 마지막 태그 삭제
        tagInput.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && tagInput.value === '' && tags.length > 0) {
                removeTag(tags.length - 1);
            }
        });
    }

    function addTag(text) {
        let tag = text.trim();
        // # 제거
        if (tag.startsWith('#')) tag = tag.substring(1);
        if (tag === '') return;
        
        // 중복 및 개수 제한
        if (tags.includes(tag)) {
            notify('이미 존재하는 태그입니다.', 'error');
            tagInput.value = '';
            return;
        }
        if (tags.length >= 5) {
            notify('태그는 최대 5개까지 가능합니다.', 'error');
            return;
        }

        tags.push(tag);
        renderTags();
        tagInput.value = '';
    }

    function removeTag(index) {
        tags.splice(index, 1);
        renderTags();
    }

    function renderTags() {
        tagListEl.innerHTML = '';
        tags.forEach((tag, index) => {
            const span = document.createElement('span');
            span.className = 'tag-chip';
            span.innerHTML = `#${tag} <i class="fa-solid fa-xmark" onclick="deleteTag(${index})"></i>`;
            tagListEl.appendChild(span);
        });
    }
    
    // 전역 함수로 노출 (onclick용)
    window.deleteTag = (index) => removeTag(index);

    // --- 9. 데이터 로드 (수정 모드) ---
    if (editDeckId) {
        saveBtn.textContent = '수정 완료';
        try {
            const res = await fetch(`/api/decks/${editDeckId}`);
            if (res.ok) {
                const deck = await res.json();
                
                titleInput.value = deck.title;
                descInput.value = deck.description;
                mainContent = deck.mainContent; 
                subEventName = deck.subContent;

                if(mainInput) mainInput.value = contentMap[mainContent] || mainContent;
                if(subInput) subInput.value = subEventName;

                if (deck.rounds && deck.rounds.length > 0) roundState = deck.rounds;

                initFormationUI(); 

                deck.characters.forEach((char, index) => {
                    if (char) {
                        deckState[index] = char; 
                        selectCharacter(char.id, char.name, index, char.role, false);
                    }
                });

                // ★ 태그 불러오기
                if (deck.tags && Array.isArray(deck.tags)) {
                    tags = deck.tags;
                    renderTags();
                }
                
                updateAllUI(); 
            } else {
                notify('데이터를 불러올 수 없습니다.', 'error');
                setTimeout(() => { window.location.href = 'deck-share.html'; }, 1500);
            }
        } catch (err) { console.error(err); }
    } else {
        initFormationUI();
        updateAllUI();
    }

    // --- 10. 공통 기능 (모달/검색) ---
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            renderSearchResults(e.target.value.trim());
        }, 300); 
    });

    function isFuzzyMatch(text, keyword) { 
        if (!keyword) return true;
        const pattern = keyword.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
        return new RegExp(pattern, 'i').test(text);
    }

    function renderSearchResults(keyword) { 
        searchResults.innerHTML = ''; 
        if (!keyword || keyword.trim() === '') return;

        let count = 0; 
        let hasResult = false;
        const fragment = document.createDocumentFragment(); 

        for (const [id, name] of Object.entries(characterData)) {
            if (isFuzzyMatch(name, keyword)) {
                hasResult = true;
                
                const div = document.createElement('div');
                div.className = 'result-item';
                div.title = name;

                const img = document.createElement('img');
                img.src = `img/Thumbnail/${id}.webp`; 
                img.alt = name;
                img.loading = "lazy";
                img.onerror = function() { 
                    this.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMTIiIGhlaWdodD0iMTEyIiB2aWV3Qm94PSIwIDAgMTEyIDExMiI+PHJlY3Qgd2lkdGg9IjExMiIgaGVpZ2h0PSIxMTIiIGZpbGw9IiNjY2NjY2MiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM1NTU1NTUiPk5vIEltZzwvdGV4dD48L3N2Zz4="; 
                };

                const textSpan = document.createElement('span');
                textSpan.className = 'result-name';
                textSpan.textContent = name;

                div.addEventListener('click', () => { 
                    selectCharacter(id, name, currentSlotIndex); 
                    modal.classList.add('hidden'); 
                });

                div.appendChild(img);
                div.appendChild(textSpan);
                fragment.appendChild(div);

                count++; 
                if (count > 100) break; 
            }
        }

        if (!hasResult) {
            searchResults.innerHTML = '<div style="padding:20px; color:#aaa; text-align:center;">검색 결과가 없습니다.</div>';
        } else {
            searchResults.appendChild(fragment);
        }
    }

    function selectCharacter(id, name, index, savedRole = '', shouldUpdateUI = true) {
        const existingOptions = deckState[index]?.options || null;
        
        deckState[index] = { 
            id, name, 
            role: savedRole, 
            options: existingOptions 
        };
        
        const slot = document.querySelector(`.char-slot[data-index="${index}"]`);
        if (slot) {
            slot.innerHTML = `
                <img src="img/Thumbnail/${id}.webp" alt="${name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNjY2MiLz48L3N2Zz4='">
                <button class="slot-remove-btn" title="삭제"><i class="fa-solid fa-xmark"></i></button>
            `;
            slot.querySelector('.slot-remove-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                removeCharacter(index);
            });
        }

        if (shouldUpdateUI) updateAllUI();
    }

    function removeCharacter(index) {
        deckState[index] = null;
        const slot = document.querySelector(`.char-slot[data-index="${index}"]`);
        if (slot) slot.innerHTML = '<i class="fa-solid fa-plus"></i>';
        
        updateAllUI(); 
    }

    // --- 11. 저장 버튼 ---
    if(saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const title = titleInput.value.trim();
            const description = descInput.value.trim();
            const userNickname = localStorage.getItem('userNickname');

            if (!userNickname) return notify('로그인 후 이용해주세요.', 'error');
            if (!title) return notify('덱 제목을 입력해주세요!', 'error');
            
            const deckData = {
                title, description,
                writer: userNickname,
                mainContent, 
                subContent: editDeckId ? subInput.value : subEventName, 
                characters: deckState, 
                rounds: isRoundMode() ? roundState : [],
                tags: tags // ★ 태그 저장
            };

            try {
                let response;
                if (editDeckId) {
                    response = await fetch(`/api/decks/${editDeckId}`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(deckData)
                    });
                } else {
                    response = await fetch('/api/decks', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(deckData)
                    });
                }
                const result = await response.json();
                
                if (response.ok) {
                    notify(editDeckId ? '수정되었습니다!' : '저장되었습니다!', 'success');
                    setTimeout(() => {
                        window.location.href = 'deck-share.html';
                    }, 1500);
                } else { 
                    notify('실패: ' + result.message, 'error'); 
                }
            } catch (error) { 
                console.error(error); 
                notify('서버 오류가 발생했습니다.', 'error'); 
            }
        });
    }
});