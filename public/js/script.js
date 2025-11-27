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

    // --- 2. 햄버거 메뉴 기능 ---
    const hamburgerBtn = document.querySelector('.hamburger');
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
            alert('메뉴 기능은 추후 추가될 예정입니다!');
        });
    }

    // --- 3. 로그인 상태 UI 변경 (새로 추가된 부분) ---
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
        navRight.appendChild(userDiv);

        // 로그아웃 기능 연결
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if(confirm('로그아웃 하시겠습니까?')) {
                    localStorage.removeItem('userNickname'); // 저장된 정보 삭제
                    localStorage.removeItem('isAdmin'); // ★ [추가] 관리자 정보 삭제
                    location.reload(); // 페이지 새로고침 (원래대로 돌아감)
                }
            });
        }
    }
});