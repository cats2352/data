// 전역 변수 및 유틸리티
const token = localStorage.getItem('token');
const user = localStorage.getItem('user'); // nickname
const nickname = localStorage.getItem('nickname');
const isAdmin = localStorage.getItem('isAdmin') === 'true';

// 날짜 포맷팅 (YYYY.MM.DD)
function formatDateShort(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return `${date.getFullYear()}.${date.getMonth()+1}.${date.getDate()}`;
}

// 모달 닫기 (공용)
function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}