document.addEventListener('DOMContentLoaded', async () => {
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

    const container = document.getElementById('inbox-container');
    const currentUser = localStorage.getItem('userNickname');

    if (!currentUser) {
        notify('로그인이 필요합니다.', 'error');
        setTimeout(() => {
            location.href = 'index.html';
        }, 1000);
        return;
    }

    try {
        const res = await fetch(`/api/messages/${currentUser}`);
        const messages = await res.json();

        container.innerHTML = '';

        if (messages.length === 0) {
            container.innerHTML = '<div class="empty-msg"><i class="fa-regular fa-envelope-open"></i><br>도착한 쪽지가 없습니다.</div>';
            return;
        }

        messages.forEach(msg => {
            const date = new Date(msg.createdAt).toLocaleString();
            
            const div = document.createElement('div');
            div.className = 'msg-card';
            div.innerHTML = `
                <div class="msg-header">
                    <span><i class="fa-solid fa-user-shield"></i> 보낸이: ${msg.sender}</span>
                    <span>${date}</span>
                </div>
                <div class="msg-preview">
                    [답변] ${msg.originalInquiry ? '"' + msg.originalInquiry + '"에 대한 답변입니다.' : '문의하신 내용에 대한 답변입니다.'}
                </div>
                <div class="msg-body">
                    ${msg.content.replace(/\n/g, '<br>')}
                </div>
            `;

            // 클릭 시 내용 펼치기/접기
            div.addEventListener('click', () => {
                div.classList.toggle('open');
            });

            container.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="empty-msg">오류가 발생했습니다.</div>';
    }
});