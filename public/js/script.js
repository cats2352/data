document.addEventListener('DOMContentLoaded', () => {
    // --- 1. 테마(다크모드/라이트모드) 설정 ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;
    const icon = themeToggleBtn.querySelector('i');

    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'light') {
        body.classList.add('light-mode');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }

    themeToggleBtn.addEventListener('click', () => {
        body.classList.toggle('light-mode');
        if (body.classList.contains('light-mode')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            localStorage.setItem('theme', 'light');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            localStorage.setItem('theme', 'dark');
        }
    });

// --- 2. 햄버거 메뉴 기능 (수정됨: 쪽지함 추가) ---
    const hamburgerBtn = document.querySelector('.hamburger');
    const mobileMenu = document.getElementById('mobile-menu');

    // 모바일 메뉴 내용을 스크립트로 주입 (모든 페이지 공통 적용을 위해)
    if (mobileMenu) {
        // 기존 내용 초기화 후 새로 작성
        mobileMenu.innerHTML = `
            <a href="index.html" class="menu-item"><i class="fa-solid fa-layer-group"></i> 덱 공유</a>
            <a href="team-list.html" class="menu-item"><i class="fa-solid fa-flag"></i> 팀트갤 모집</a>
            <a href="inbox.html" class="menu-item"><i class="fa-solid fa-envelope"></i> 쪽지함</a>
            <div class="menu-divider"></div>
            <a href="user-list.html" class="menu-item"><i class="fa-solid fa-users"></i> 유저 목록</a>
        `;
    }

    if (hamburgerBtn && mobileMenu) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileMenu.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!hamburgerBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
                mobileMenu.classList.remove('active');
            }
        });
    }

    // --- 3. 로그인 상태 UI 변경 ---
    const userNickname = localStorage.getItem('userNickname');
    const isAdmin = localStorage.getItem('isAdmin') === 'true'; // 관리자 여부
    
    const navRight = document.querySelector('.nav-right');
    const authArea = document.querySelector('.nav-auth-area');
    const loginBtn = document.querySelector('.login-btn');

    if (userNickname) {
        if (loginBtn) loginBtn.remove();

        // ★ [수정] 상단 프로필 옆 아이콘 코드는 삭제했습니다.
        // 대신 햄버거 메뉴(모바일 메뉴)에는 관리자 링크를 추가해둡니다.
        if (isAdmin && mobileMenu) {
            // 이미 추가된 적 있는지 확인 후 추가 (중복 방지)
            if (!mobileMenu.querySelector('.admin-link-item')) {
                const divider = document.createElement('div');
                divider.className = 'menu-divider';
                mobileMenu.appendChild(divider);

                const adminLink = document.createElement('a');
                adminLink.href = 'admin-inquiries.html';
                adminLink.className = 'menu-item admin-link-item'; // 클래스 추가
                adminLink.style.color = '#ff9800'; 
                adminLink.innerHTML = '<i class="fa-solid fa-envelope-open-text"></i> 관리자 문의함';
                mobileMenu.appendChild(adminLink);
            }
        }

        const userDiv = document.createElement('div');
        userDiv.className = 'user-profile';
        
        // 아이콘 없이 닉네임과 로그아웃 버튼만 표시
        userDiv.innerHTML = `
            <span class="user-name"><i class="fa-solid fa-user-circle"></i> ${userNickname}</span>
            <button id="logout-btn" class="logout-btn" title="로그아웃"><i class="fa-solid fa-right-from-bracket"></i></button>
        `;

        if (authArea) authArea.appendChild(userDiv);
        else navRight.appendChild(userDiv);

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if(confirm('로그아웃 하시겠습니까?')) {
                    localStorage.removeItem('userNickname');
                    localStorage.removeItem('isAdmin');
                    location.reload();
                }
            });
        }
    }

    // --- 4. 방문자 수 가져오기 (1일 1회 제한) ---
    const totalCountEl = document.getElementById('total-count');
    const todayCountEl = document.getElementById('today-count');

    if (totalCountEl && todayCountEl) {
        const todayStr = new Date().toISOString().split('T')[0];
        const lastVisitDate = localStorage.getItem('lastVisitDate');
        let query = '';
        
        if (lastVisitDate === todayStr) {
            query = '?mode=view';
        }

        fetch(`/api/visitors${query}`)
            .then(res => res.json())
            .then(data => {
                totalCountEl.textContent = data.total.toLocaleString();
                todayCountEl.textContent = data.today.toLocaleString();
                if (lastVisitDate !== todayStr) {
                    localStorage.setItem('lastVisitDate', todayStr);
                }
            })
            .catch(err => console.error('방문자 집계 실패', err));
    }

    // --- 5. 공식 디스코드 버튼 ---
    const discordBtn = document.getElementById('discord-link');
    if (discordBtn) {
        discordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            alert('공식 디스코드는 현재 준비 중입니다! 🙇‍♂️');
        });
    }

    // --- 6. 개발자 문의하기 모달 ---
    const btnOpenInquiry = document.getElementById('btn-open-inquiry');
    const inquiryModal = document.getElementById('inquiry-modal');
    const btnCloseInquiry = document.getElementById('btn-close-inquiry');
    const btnSubmitInquiry = document.getElementById('btn-submit-inquiry');
    const adminSelect = document.getElementById('inq-admin-list');

    if (btnOpenInquiry && inquiryModal) {
        btnOpenInquiry.addEventListener('click', async (e) => {
            e.preventDefault();
            const currentUser = localStorage.getItem('userNickname');
            if (!currentUser) return alert('로그인이 필요합니다.');

            try {
                const res = await fetch('/api/admins');
                const admins = await res.json();
                adminSelect.innerHTML = admins.map(a => `<option value="${a.nickname}">${a.nickname} (관리자)</option>`).join('');
                inquiryModal.classList.remove('hidden');
            } catch (err) { alert('관리자 목록 로딩 실패'); }
        });

        if(btnCloseInquiry) btnCloseInquiry.addEventListener('click', () => inquiryModal.classList.add('hidden'));

        if(btnSubmitInquiry) {
            btnSubmitInquiry.addEventListener('click', async () => {
                const targetAdmin = adminSelect.value;
                const category = document.getElementById('inq-category').value;
                const content = document.getElementById('inq-content').value.trim();
                const writer = localStorage.getItem('userNickname');

                if (!content) return alert('내용을 입력하세요.');

                try {
                    const res = await fetch('/api/inquiries', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ writer, targetAdmin, category, content })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        alert(data.message);
                        document.getElementById('inq-content').value = '';
                        inquiryModal.classList.add('hidden');
                    } else {
                        alert(data.message);
                    }
                } catch (err) { alert('서버 오류'); }
            });
        }
    }

    // --- 7. 알림 시스템 ---
    const notiBtn = document.getElementById('noti-btn');
    const notiDropdown = document.getElementById('noti-dropdown');
    const notiBadge = document.getElementById('noti-badge');
    
    if (notiBtn) {
        async function loadNotifications() {
            const user = localStorage.getItem('userNickname');
            if (!user) return;

            try {
                const res = await fetch(`/api/notifications/${user}`);
                const notis = await res.json();
                
                const unreadCount = notis.filter(n => !n.isRead).length;
                if (unreadCount > 0) {
                    notiBadge.textContent = unreadCount;
                    notiBadge.classList.add('show');
                } else {
                    notiBadge.classList.remove('show');
                }

                if (notis.length === 0) {
                    notiDropdown.innerHTML = '<div class="noti-empty">알림이 없습니다.</div>';
                } else {
                    notiDropdown.innerHTML = notis.map(n => `
                        <div class="noti-item ${n.isRead ? 'read' : ''}" onclick="readNotification('${n._id}')">
                            ${n.content}
                            <div style="font-size:0.7rem; color:#888; margin-top:4px;">${new Date(n.createdAt).toLocaleDateString()}</div>
                        </div>
                    `).join('');
                }
            } catch (err) { console.error('알림 로드 실패', err); }
        }

        loadNotifications();
        
        notiBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notiDropdown.classList.toggle('active');
        });

        window.readNotification = async (id) => {
            await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
            loadNotifications();
        };

        document.addEventListener('click', (e) => {
            if (!notiBtn.contains(e.target) && !notiDropdown.contains(e.target)) {
                notiDropdown.classList.remove('active');
            }
        });
    }
});