document.addEventListener('DOMContentLoaded', async () => {
    // 1. 관리자 체크
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (!isAdmin) { 
        alert('관리자만 접근 가능합니다.'); 
        location.href = 'index.html'; 
        return; 
    }

    const listContainer = document.getElementById('inquiry-list');
    const modal = document.getElementById('reply-modal');
    
    // 데이터를 전역 변수에 저장 (모달에서 쉽게 찾기 위해)
    let inquiriesData = [];
    let currentInquiryId = null;

    // 2. 목록 불러오기 함수
    async function loadInquiries() {
        try {
            const res = await fetch('/api/inquiries');
            inquiriesData = await res.json(); // 데이터 저장

            if (!inquiriesData || inquiriesData.length === 0) {
                listContainer.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">도착한 문의가 없습니다.</td></tr>';
                return;
            }

            // ★ HTML 생성 (data-label 속성 필수)
            listContainer.innerHTML = inquiriesData.map((inq) => `
                <tr>
                    <td data-label="작성자">${inq.writer}</td>
                    <td data-label="받는이">${inq.targetAdmin}</td>
                    <td data-label="유형">${inq.category}</td>
                    <td data-label="상태" class="reply-status ${inq.isReplied ? 'done' : 'wait'}">
                        ${inq.isReplied ? '답변완료' : '대기중'}
                    </td>
                    <td data-label="내용확인">
                        <button class="admin-btn edit-user-btn" onclick="openModal('${inq._id}')">
                            확인
                        </button>
                    </td>
                    <td data-label="관리">
                        <button class="admin-btn del-user-btn" onclick="deleteInquiry('${inq._id}')">
                            삭제
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (e) { 
            console.error(e);
            listContainer.innerHTML = '<tr><td colspan="6" style="text-align:center;">로딩 실패</td></tr>';
        }
    }

    loadInquiries(); // 실행

    // 3. 모달 열기 (ID로 데이터 찾기)
    window.openModal = (id) => {
        const inquiry = inquiriesData.find(item => item._id === id);
        if (!inquiry) return;

        currentInquiryId = id;
        document.getElementById('view-content').innerText = inquiry.content; // 안전하게 텍스트 넣기
        document.getElementById('reply-text').value = ''; // 입력창 초기화
        modal.classList.remove('hidden');
    };

    // 4. 답장 전송
    const sendBtn = document.getElementById('btn-send-reply');
    if(sendBtn) {
        sendBtn.addEventListener('click', async () => {
            const replyContent = document.getElementById('reply-text').value;
            const adminName = localStorage.getItem('userNickname');
            
            if (!replyContent) return alert('내용을 입력하세요.');

            try {
                const res = await fetch(`/api/inquiries/${currentInquiryId}/reply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ replyContent, adminName })
                });
                
                if (res.ok) {
                    alert('답장이 전송되었습니다.');
                    modal.classList.add('hidden');
                    loadInquiries(); // 목록 갱신
                } else { 
                    alert('전송 실패'); 
                }
            } catch (e) { alert('오류 발생'); }
        });
    }

    // 5. 문의 삭제
    window.deleteInquiry = async (id) => {
        if (!confirm('정말 이 문의 내역을 삭제하시겠습니까?')) return;
        try {
            const res = await fetch(`/api/inquiries/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert('삭제되었습니다.');
                loadInquiries();
            } else { alert('삭제 실패'); }
        } catch (e) { alert('오류 발생'); }
    };
});