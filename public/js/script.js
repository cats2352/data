document.addEventListener('DOMContentLoaded', () => {
    // --- 1. 테마(다크모드/라이트모드) 설정 ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;
    const icon = themeToggleBtn.querySelector('i');

    // 로컬 스토리지에서 테마 설정 불러오기
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'light') {
        body.classList.add('light-mode');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }

    // 테마 전환 클릭 이벤트
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

// --- 2. 햄버거 메뉴 기능 (수정됨) ---
    const hamburgerBtn = document.querySelector('.hamburger');
    const mobileMenu = document.getElementById('mobile-menu');

    if (hamburgerBtn && mobileMenu) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 클릭 이벤트가 문서로 전파되는 것 방지
            mobileMenu.classList.toggle('active');
        });

        // 화면의 다른 곳을 클릭하면 메뉴 닫기
        document.addEventListener('click', (e) => {
            if (!hamburgerBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
                mobileMenu.classList.remove('active');
            }
        });
    }

    // --- 3. 로그인 상태 UI 변경 (유저 프로필 표시) ---
    const userNickname = localStorage.getItem('userNickname'); // 저장된 닉네임 가져오기
    const navRight = document.querySelector('.nav-right');
    const loginBtn = document.querySelector('.login-btn'); // '로그인/회원가입' 버튼

    // 로그인이 되어 있고, 화면에 로그인 버튼이 있다면 (메인 페이지 등)
    if (userNickname && loginBtn) {
        // 기존 로그인 버튼 삭제
        loginBtn.remove();

        // 유저 프로필 영역 생성
        const userDiv = document.createElement('div');
        userDiv.className = 'user-profile';
        
        // 닉네임 표시 및 로그아웃 버튼
        userDiv.innerHTML = `
            <span class="user-name">
                <i class="fa-solid fa-user-circle"></i> ${userNickname}
            </span>
            <button id="logout-btn" class="logout-btn" title="로그아웃">
                <i class="fa-solid fa-right-from-bracket"></i>
            </button>
        `;

        // 네비게이션 바에 추가
        // .nav-auth-area가 있다면 그 안에, 없다면 navRight에 바로 추가
        const authArea = document.querySelector('.nav-auth-area');
        if (authArea) {
            authArea.appendChild(userDiv);
        } else {
            navRight.appendChild(userDiv);
        }

        // 로그아웃 기능 연결
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if(confirm('로그아웃 하시겠습니까?')) {
                    localStorage.removeItem('userNickname'); // 저장된 정보 삭제
                    localStorage.removeItem('isAdmin'); // 관리자 정보 삭제
                    location.reload(); // 페이지 새로고침 (원래대로 돌아감)
                }
            });
        }
    }

    // --- 4. 방문자 수 가져오기 (1일 1회 카운트 제한 적용) ---
    const totalCountEl = document.getElementById('total-count');
    const todayCountEl = document.getElementById('today-count');

    if (totalCountEl && todayCountEl) {
        // 오늘 날짜 구하기 (YYYY-MM-DD)
        const todayStr = new Date().toISOString().split('T')[0];
        
        // 로컬 스토리지에서 마지막 방문 날짜 가져오기
        const lastVisitDate = localStorage.getItem('lastVisitDate');

        // 오늘 이미 방문했으면 'view' 모드, 처음이면 'visit' 모드(생략 가능)
        let query = '';
        if (lastVisitDate === todayStr) {
            query = '?mode=view'; // 카운트 증가 방지
        }

        fetch(`/api/visitors${query}`)
            .then(res => res.json())
            .then(data => {
                // 숫자에 콤마(,)를 찍어서 표시 (예: 1,234)
                totalCountEl.textContent = data.total.toLocaleString(); 
                todayCountEl.textContent = data.today.toLocaleString();

                // 카운트가 정상적으로 반영되었다면(view 모드가 아니었다면), 방문 기록 저장
                if (lastVisitDate !== todayStr) {
                    localStorage.setItem('lastVisitDate', todayStr);
                }
            })
            .catch(err => console.error('방문자 집계 실패', err));
    }

    // --- 5. 공식 디스코드 버튼 '준비중' 처리 ---
    const discordBtn = document.getElementById('discord-link');
    if (discordBtn) {
        discordBtn.addEventListener('click', (e) => {
            e.preventDefault(); // 링크 이동 막기
            alert('공식 디스코드는 현재 준비 중입니다! 🙇‍♂️');
        });
    }
});