// public/js/admin-inquiries.js 전체 교체 권장

document.addEventListener('DOMContentLoaded', async () => {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (!isAdmin) { alert('관리자만 접근 가능합니다.'); location.href = 'index.html'; return; }

    const listContainer = document.getElementById('inquiry-list');
    const modal = document.getElementById('reply-modal');
    let currentInquiryId = null;

    // 목록 불러오기
    async function loadInquiries() {
        try {
            const res = await fetch('/api/inquiries');
            const inquiries = await res.json();

            listContainer.innerHTML = inquiries.map((inq) => `
                <tr>
                    <td>${inq.writer}</td>
                    <td>${inq.targetAdmin}</td>
                    <td>${inq.category}</td>
                    <td class="reply-status ${inq.isReplied ? 'done' : 'wait'}">
                        ${inq.isReplied ? '답변완료' : '대기중'}
                    </td>
                    <td>
                        <button class="admin-btn edit-user-btn" onclick="openModal('${inq._id}', '${escapeHtml(inq.content)}')">
                            확인
                        </button>
                    </td>
                    <td>
                        <button class="admin-btn del-user-btn" onclick="deleteInquiry('${inq._id}')">
                            삭제
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (e) { console.error(e); }
    }

    loadInquiries(); // 실행

    // 모달 열기
    window.openModal = (id, content) => {
        currentInquiryId = id;
        document.getElementById('view-content').innerText = content;
        document.getElementById('reply-text').value = '';
        modal.classList.remove('hidden');
    };

    window.closeReplyModal = () => modal.classList.add('hidden');

    // 답장 전송
    document.getElementById('btn-send-reply').addEventListener('click', async () => {
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
            } else { alert('전송 실패'); }
        } catch (e) { alert('오류'); }
    });

    // ★ 문의 삭제 함수
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

    function escapeHtml(text) {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
});