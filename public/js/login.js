document.addEventListener('DOMContentLoaded', () => {
    // 요소 가져오기
    const registerSection = document.getElementById('register-section');
    const loginSection = document.getElementById('login-section');
    
    const goToLoginBtn = document.getElementById('go-to-login');
    const goToRegisterBtn = document.getElementById('go-to-register');
    
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');

    // ★ 추가된 요소: 체크박스
    const rememberMeCheckbox = document.getElementById('remember-me');

    // --- ★ [기능 1] 페이지 로드 시 저장된 정보 불러오기 ---
    if (loginForm) {
        const savedNickname = localStorage.getItem('savedNickname');
        const savedPassword = localStorage.getItem('savedPassword');

        if (savedNickname && savedPassword) {
            document.getElementById('login-nickname').value = savedNickname;
            document.getElementById('login-password').value = savedPassword;
            rememberMeCheckbox.checked = true; // 체크박스도 켜두기
        }
    }

    // 1. 화면 전환 기능
    if (goToLoginBtn && goToRegisterBtn) {
        goToLoginBtn.addEventListener('click', () => {
            registerSection.classList.add('hidden');
            loginSection.classList.remove('hidden');
        });

        goToRegisterBtn.addEventListener('click', () => {
            loginSection.classList.add('hidden');
            registerSection.classList.remove('hidden');
        });
    }

    // 2. 회원가입 처리 (서버로 전송)
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nickname = document.getElementById('reg-nickname').value.trim();
            const password = document.getElementById('reg-password').value.trim();

            if (nickname.length > 10) return alert('닉네임은 10글자 이내여야 합니다.');
            if (password.length < 4) return alert('비밀번호는 4자리 이상이어야 합니다.');
            const koreanRegex = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;
            if (koreanRegex.test(password)) return alert('비밀번호에는 한글을 사용할 수 없습니다.');

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nickname, password })
                });

                const data = await response.json();

                if (response.ok) {
                    // ★ [수정] 승인 대기 메시지
                    alert(data.message); 
                    document.getElementById('reg-nickname').value = '';
                    document.getElementById('reg-password').value = '';
                    registerSection.classList.add('hidden');
                    loginSection.classList.remove('hidden');
                } else {
                    alert(data.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('서버와 통신 중 오류가 발생했습니다.');
            }
        });
    }

    // 3. 로그인 처리 (서버로 전송)
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nickname = document.getElementById('login-nickname').value.trim();
            const password = document.getElementById('login-password').value.trim();

            if (nickname === '' || password === '') return alert('닉네임과 비밀번호를 입력해주세요.');

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nickname, password })
                });

                const data = await response.json();

                if (response.ok) {
                    // 로그인 상태 유지 (메인페이지 표시용)
                    localStorage.setItem('userNickname', data.nickname);

                    // ★ 관리자 여부 저장
                    localStorage.setItem('isAdmin', data.isAdmin);

                    // --- ★ [기능 2] 닉네임/비밀번호 기억하기 처리 ---
                    if (rememberMeCheckbox.checked) {
                        localStorage.setItem('savedNickname', nickname);
                        localStorage.setItem('savedPassword', password);
                    } else {
                        // 체크 해제하고 로그인하면 저장된 정보 삭제
                        localStorage.removeItem('savedNickname');
                        localStorage.removeItem('savedPassword');
                    }

                    alert(`${data.nickname} 선장님, 환영합니다!`);
                    window.location.href = 'index.html';
                } else {
                    // ★ [수정] 승인 대기 등 서버 메시지 표시
                    alert(data.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('서버와 통신 중 오류가 발생했습니다.');
            }
        });
    }
});