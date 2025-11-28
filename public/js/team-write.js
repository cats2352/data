document.addEventListener('DOMContentLoaded', () => {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const userNickname = localStorage.getItem('userNickname');

    // 관리자가 아니면 접근 차단
    if (!isAdmin) {
        alert('관리자만 접근할 수 있는 페이지입니다.');
        window.location.href = 'team-list.html';
        return;
    }

    const saveBtn = document.getElementById('btn-save-team');
    
    saveBtn.addEventListener('click', async () => {
        const teamName = document.getElementById('t-name').value.trim();
        const captainName = document.getElementById('t-captain').value.trim();
        const description = document.getElementById('t-desc').value.trim();
        
        if (!teamName || !captainName) {
            return alert('대대명과 대대장 닉네임은 필수입니다.');
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
                alert('모집글이 등록되었습니다!');
                window.location.href = 'team-list.html';
            } else {
                alert('등록 실패');
            }
        } catch (err) {
            console.error(err);
            alert('서버 오류');
        }
    });
});