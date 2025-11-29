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

    // -----------------------------------------------------------
    // ★ [추가] 비밀번호 보기/숨기기 토글 기능
    // -----------------------------------------------------------
    const toggleBtns = document.querySelectorAll('.toggle-pw-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target; // data-target 속성에서 input ID 가져오기
            const input = document.getElementById(targetId);
            
            if (input) {
                // 현재 타입이 password면 text로, text면 password로 변경
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                
                // 아이콘 모양 변경 (눈 ↔ 눈 사선)
                btn.classList.toggle('fa-eye');
                btn.classList.toggle('fa-eye-slash');
            }
        });
    });

    // 요소 가져오기
    const registerSection = document.getElementById('register-section');
    const loginSection = document.getElementById('login-section');
    
    const goToLoginBtn = document.getElementById('go-to-login');
    const goToRegisterBtn = document.getElementById('go-to-register');
    
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');

    // 체크박스 요소
    const rememberMeCheckbox = document.getElementById('remember-me');

    // --- [기능 1] 페이지 로드 시 저장된 정보 불러오기 ---
    if (loginForm) {
        const savedNickname = localStorage.getItem('savedNickname');
        const savedPassword = localStorage.getItem('savedPassword');

        if (savedNickname && savedPassword) {
            const nickInput = document.getElementById('login-nickname');
            const passInput = document.getElementById('login-password');
            
            if(nickInput) nickInput.value = savedNickname;
            if(passInput) passInput.value = savedPassword;
            if(rememberMeCheckbox) rememberMeCheckbox.checked = true;
        }
    }

    // 1. 화면 전환 기능
    if (goToLoginBtn && goToRegisterBtn) {
        goToLoginBtn.addEventListener('click', () => {
            if(registerSection) registerSection.classList.add('hidden');
            if(loginSection) loginSection.classList.remove('hidden');
        });

        goToRegisterBtn.addEventListener('click', () => {
            if(loginSection) loginSection.classList.add('hidden');
            if(registerSection) registerSection.classList.remove('hidden');
        });
    }

    // 2. 회원가입 처리
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nickname = document.getElementById('reg-nickname').value.trim();
            const password = document.getElementById('reg-password').value.trim();

            if (nickname.length > 10) return notify('닉네임은 10글자 이내여야 합니다.', 'error');
            if (password.length < 4) return notify('비밀번호는 4자리 이상이어야 합니다.', 'error');
            
            const koreanRegex = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;
            if (koreanRegex.test(password)) return notify('비밀번호에는 한글을 사용할 수 없습니다.', 'error');

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nickname, password })
                });

                const data = await response.json();

                if (response.ok) {
                    notify(data.message, 'success');
                    
                    document.getElementById('reg-nickname').value = '';
                    document.getElementById('reg-password').value = '';
                    
                    // 1.5초 후 로그인 화면으로 전환
                    setTimeout(() => {
                        if(registerSection) registerSection.classList.add('hidden');
                        if(loginSection) loginSection.classList.remove('hidden');
                    }, 1500);
                } else {
                    notify(data.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                notify('서버와 통신 중 오류가 발생했습니다.', 'error');
            }
        });
    }

    // 3. 로그인 처리
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nickname = document.getElementById('login-nickname').value.trim();
            const password = document.getElementById('login-password').value.trim();

            if (nickname === '' || password === '') return notify('닉네임과 비밀번호를 입력해주세요.', 'error');

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nickname, password })
                });

                const data = await response.json();

                if (response.ok) {
                    // 로그인 성공 처리
                    localStorage.setItem('userNickname', data.nickname);
                    localStorage.setItem('isAdmin', data.isAdmin);

                    // 닉네임/비밀번호 기억하기 처리
                    if (rememberMeCheckbox && rememberMeCheckbox.checked) {
                        localStorage.setItem('savedNickname', nickname);
                        localStorage.setItem('savedPassword', password);
                    } else {
                        localStorage.removeItem('savedNickname');
                        localStorage.removeItem('savedPassword');
                    }

                    // 성공 메시지 표시
                    notify(`${data.nickname} 선장님, 환영합니다!`, 'success');
                    
                    // 1초 후 메인 페이지 이동
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                } else {
                    // 실패 메시지 표시
                    notify(data.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                notify('서버와 통신 중 오류가 발생했습니다.', 'error');
            }
        });
    }
});