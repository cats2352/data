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

    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const userNickname = localStorage.getItem('userNickname');

    // 관리자가 아니면 접근 차단
    if (!isAdmin) {
        notify('관리자만 접근할 수 있는 페이지입니다.', 'error');
        setTimeout(() => {
            window.location.href = 'team-list.html';
        }, 1500);
        return;
    }

    const saveBtn = document.getElementById('btn-save-team');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const teamName = document.getElementById('t-name').value.trim();
            const captainName = document.getElementById('t-captain').value.trim();
            const description = document.getElementById('t-desc').value.trim();
            
            if (!teamName || !captainName) {
                return notify('대대명과 대대장 닉네임은 필수입니다.', 'error');
            }

            const data = {
                teamName,
                captainName,
                description,
                isLogPublic: document.getElementById('t-log-public').checked,
                isCommentAllowed: document.getElementById('t-comment').checked,
                isRecruiting: document.getElementById('t-recruit').checked,
                writer: userNickname
            };

            try {
                const res = await fetch('/api/teams', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (res.ok) {
                    notify('모집글이 등록되었습니다!', 'success');
                    setTimeout(() => {
                        window.location.href = 'team-list.html';
                    }, 1500);
                } else {
                    notify('등록 실패', 'error');
                }
            } catch (err) {
                console.error(err);
                notify('서버 오류', 'error');
            }
        });
    }
});