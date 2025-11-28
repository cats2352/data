document.addEventListener('DOMContentLoaded', () => {
    // 1. 하위 컨텐츠 데이터 정의
    const subCategories = {
        'pirate_festival': [
            { id: 'pf_nov_2025', name: '해적페스티벌' },
        ],
        'kizuna': [
            { id: 'kizuna_boss_blackbeard', name: '준비중' },
        ],
        'treasure_map': [
            { id: 'tm_wano', name: '준비중' },
        ],
        'coop': [
            { id: 'coop_red_hair', name: '준비중' }
        ],
        'pirate_trail': [
        { id: 'trail_vs_shanks', name: 'VS 키드' }, // 예시 데이터
        { id: 'trail_vs_kaido', name: '준비중' }
        ]
    };

    // DOM 요소 가져오기
    const step1Section = document.getElementById('step-1-content');
    const step2Section = document.getElementById('step-2-detail');
    const detailListContainer = document.getElementById('detail-list-container');
    const backBtn = document.getElementById('back-step-1');
    const selectCards = document.querySelectorAll('.select-card');
    
    // ★ 추가된 검색 관련 요소
    const searchInput = document.getElementById('event-search');
    const noResultMsg = document.getElementById('no-result-msg');

    let selectedContentType = '';

    // --- [Step 1] 컨텐츠 카드 클릭 이벤트 ---
    selectCards.forEach(card => {
        card.addEventListener('click', () => {
            const type = card.getAttribute('data-type');
            selectedContentType = type;

            // 리스트 생성
            renderDetailList(type);
            
            // ★ 검색창 초기화 (이전 검색어 삭제)
            if(searchInput) searchInput.value = '';
            if(noResultMsg) noResultMsg.classList.add('hidden');

            // 화면 전환
            step1Section.classList.remove('active');
            step1Section.classList.add('hidden');
            
            step2Section.classList.remove('hidden');
            step2Section.classList.add('active');
            
            // 검색창에 포커스 (바로 입력 가능하게)
            if(searchInput) setTimeout(() => searchInput.focus(), 100);
        });
    });

    // --- [Step 2] 하위 리스트 생성 함수 ---
    function renderDetailList(type) {
        detailListContainer.innerHTML = '';
        const list = subCategories[type];

        if (!list || list.length === 0) {
            detailListContainer.innerHTML = '<p class="step-desc">진행 중인 이벤트가 없습니다.</p>';
            return;
        }

        list.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'detail-btn'; // 이 클래스를 검색할 때 사용함
            btn.textContent = item.name;

            btn.addEventListener('click', () => {
                goToDeckWritePage(type, item.id, item.name);
            });

            detailListContainer.appendChild(btn);
        });
    }

    // --- ★ [기능 추가] 실시간 검색 필터링 ---
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const keyword = e.target.value.toLowerCase(); // 소문자로 변환해서 비교
            const buttons = detailListContainer.querySelectorAll('.detail-btn');
            let visibleCount = 0;

            buttons.forEach(btn => {
                const text = btn.textContent.toLowerCase();
                
                // 검색어가 포함되어 있으면 보여주고, 아니면 숨김
                if (text.includes(keyword)) {
                    btn.classList.remove('hidden'); // .hidden 클래스 제거 (보임)
                    visibleCount++;
                } else {
                    btn.classList.add('hidden'); // .hidden 클래스 추가 (숨김)
                }
            });

            // 검색 결과가 하나도 없으면 메시지 표시
            if (visibleCount === 0) {
                noResultMsg.classList.remove('hidden');
            } else {
                noResultMsg.classList.add('hidden');
            }
        });
    }

    // --- [Step 2] 뒤로가기 버튼 ---
    backBtn.addEventListener('click', () => {
        step2Section.classList.remove('active');
        step2Section.classList.add('hidden');

        step1Section.classList.remove('hidden');
        step1Section.classList.add('active');
    });

    // --- [Final] 덱 작성 페이지로 이동 ---
    function goToDeckWritePage(mainType, subId, subName) {
        const url = `deck-write.html?content=${mainType}&eventId=${subId}&eventName=${encodeURIComponent(subName)}`;
        window.location.href = url;
    }
});