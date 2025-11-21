// 인증 관련 로직
let isLoginMode = true;

function checkLoginStatus() {
    const loginView = document.getElementById('login-view');
    const mainView = document.getElementById('main-view');
    const navActions = document.getElementById('nav-actions');
    const createBtn = document.getElementById('createEventBtn');
    const adminBtn = document.getElementById('adminUserBtn');

    if (token) {
        loginView.classList.add('hidden');
        mainView.classList.remove('hidden');
        
        // 상단 네비게이션 바 구성
        navActions.innerHTML = `
            <div class="mail-icon-wrapper" onclick="openMailBox()">
                <span>📩</span>
                <span id="mailBadge" class="mail-badge hidden">0</span>
            </div>
            <span style="margin-right:15px; font-weight:bold; color:var(--primary); cursor:pointer;" onclick="location.href='profile/my-profile.html'">${nickname}님</span>
            <button class="apply-btn" style="width:auto; padding:5px 15px; background:#ef4444;" onclick="logout()">로그아웃</button>
        `;
        
        // 다른 모듈 함수 호출 (함수가 로드된 경우만 실행)
        if (typeof loadMyApps === 'function') loadMyApps();
        if (typeof checkUnreadMail === 'function') checkUnreadMail();

        if (isAdmin) {
            createBtn.classList.remove('hidden');
            adminBtn.classList.remove('hidden');
        }
    } else {
        loginView.classList.remove('hidden');
        mainView.classList.add('hidden');
    }
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('authTitle');
    const msg = document.getElementById('toggleMsg');
    const rememberArea = document.getElementById('rememberMe').parentElement.parentElement;

    if (isLoginMode) {
        title.innerText = "로그인";
        msg.innerText = "계정이 없으신가요? 회원가입하기";
        rememberArea.classList.remove('hidden'); 
    } else {
        title.innerText = "회원가입";
        msg.innerText = "이미 계정이 있으신가요? 로그인하기";
        rememberArea.classList.add('hidden'); 
    }
}

async function handleAuth() {
    const nick = document.getElementById('nickname').value;
    const pw = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    if(!nick || !pw) return alert('닉네임과 비밀번호를 입력해주세요.');
    
    if (!isLoginMode) {
        if (nick.length > 10) return alert('닉네임은 10글자 이내로 입력해주세요.');
        const pwRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{4,}$/;
        if (!pwRegex.test(pw)) return alert('비밀번호는 영문, 숫자, 특수문자를 모두 포함해야 합니다.');
    }

    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    const payload = { nickname: nick, password: pw, rememberMe };

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            if (isLoginMode) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', data.nickname);
                localStorage.setItem('nickname', data.nickname);
                localStorage.setItem('isAdmin', data.isAdmin);
                location.reload(); 
            } else {
                alert(data.message); toggleAuthMode();
            }
        } else { alert(data.message); }
    } catch (err) { alert('오류'); }
}

function logout() {
    localStorage.clear();
    location.href = '/';
}