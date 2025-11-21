// 쪽지 관련 로직

// 1. 안 읽은 쪽지 개수 확인
async function checkUnreadMail() {
    if (!token) return;
    try {
        const res = await fetch('/api/mail/unread-count', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const badge = document.getElementById('mailBadge');
        
        if (data.count > 0) {
            badge.innerText = data.count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    } catch (e) { console.error('쪽지 확인 실패', e); }
}

// 2. 내 쪽지함 열기 (목록 조회)
async function openMailBox() {
    const modal = document.getElementById('mailBoxModal');
    modal.classList.remove('hidden');
    
    const list = document.getElementById('mailList');
    list.innerHTML = '<p style="color:#94a3b8;">불러오는 중...</p>';

    try {
        const res = await fetch('/api/mail/my', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const mails = await res.json();
        
        list.innerHTML = '';
        if (mails.length === 0) {
            list.innerHTML = '<p style="color:#94a3b8; padding:20px;">받은 쪽지가 없습니다.</p>';
            return;
        }

        mails.forEach(mail => {
            const isUnread = !mail.isRead;
            const date = new Date(mail.createdAt).toLocaleDateString(); // 날짜만 간단히
            
            const item = document.createElement('div');
            item.className = `mail-item ${isUnread ? 'unread' : ''}`;
            
            // ★ 클릭 시 상세 보기 함수 호출
            // mail 객체를 문자열로 변환해서 넘기기 위해 encodeURIComponent 사용
            const mailData = encodeURIComponent(JSON.stringify(mail));
            item.setAttribute('onclick', `openMailDetail('${mailData}', this)`);

            // 제목과 보낸 사람, 날짜만 표시
            item.innerHTML = `
                <div style="flex:1;">
                    <div class="mail-subject">${isUnread ? '<span style="color:#f43f5e;">●</span> ' : ''}${mail.subject || '제목 없음'}</div>
                    <div class="mail-meta">보낸이: ${mail.senderName} | ${date}</div>
                </div>
                <div style="color:#64748b; font-size:1.2rem;">👉</div>
            `;
            list.appendChild(item);
        });
    } catch (e) {
        list.innerHTML = '<p style="color:red;">오류 발생</p>';
    }
}

// 3. 쪽지 상세 보기 (내용 표시 & 읽음 처리)
async function openMailDetail(mailDataEncoded, itemElement) {
    const mail = JSON.parse(decodeURIComponent(mailDataEncoded));
    
    // 상세 모달에 데이터 채우기
    document.getElementById('detailSubject').innerText = mail.subject || '제목 없음';
    document.getElementById('detailSender').innerText = `보낸이: ${mail.senderName}`;
    document.getElementById('detailDate').innerText = new Date(mail.createdAt).toLocaleString();
    document.getElementById('detailContent').innerText = mail.content;

    // 모달 열기
    document.getElementById('mailDetailModal').classList.remove('hidden');

    // 읽음 처리 (안 읽었을 경우에만)
    if (!mail.isRead) {
        try {
            await fetch(`/api/mail/${mail._id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // 목록 UI 갱신
            if(itemElement) {
                itemElement.classList.remove('unread');
                // 빨간 점 제거
                const subjectDiv = itemElement.querySelector('.mail-subject');
                if(subjectDiv) subjectDiv.innerHTML = mail.subject || '제목 없음';
            }
            checkUnreadMail(); // 배지 갱신
        } catch (e) { console.error(e); }
    }
}

// 4. 관리자: 쪽지 보내기 모달 열기
let targetReceiverId = null;

function openSendMailModal(userId, nickname) {
    targetReceiverId = userId;
    document.getElementById('targetUserName').innerText = nickname;
    document.getElementById('mailSubject').value = ''; // 제목 초기화
    document.getElementById('mailContent').value = ''; // 내용 초기화
    
    document.getElementById('adminModal').classList.add('hidden');
    document.getElementById('sendMailModal').classList.remove('hidden');
}

// 5. 관리자: 쪽지 전송
async function sendMail() {
    const subject = document.getElementById('mailSubject').value;
    const content = document.getElementById('mailContent').value;

    if (!subject.trim() || !content.trim()) return alert('제목과 내용을 모두 입력하세요.');

    if (!confirm('쪽지를 보내시겠습니까?')) return;

    try {
        const res = await fetch('/api/mail/send', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ receiverId: targetReceiverId, subject, content })
        });
        const data = await res.json();
        
        if (res.ok) {
            alert(data.message);
            document.getElementById('sendMailModal').classList.add('hidden');
            // document.getElementById('adminModal').classList.remove('hidden'); // 필요 시 주석 해제
        } else {
            alert(data.message);
        }
    } catch (e) { alert('전송 실패'); }
}