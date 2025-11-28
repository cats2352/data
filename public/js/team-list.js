document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('team-list-container');
    const createBtn = document.getElementById('create-team-btn');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    // 관리자 버튼 표시
    if (isAdmin) {
        createBtn.classList.remove('hidden');
    }

    try {
        const res = await fetch('/api/teams');
        const teams = await res.json();

        container.innerHTML = '';

        if (teams.length === 0) {
            container.innerHTML = '<p class="empty-message">등록된 모집글이 없습니다.</p>';
            return;
        }

        teams.forEach(team => {
            // 현재 인원 계산 (이름이 있는 멤버 수)
            const currentMembers = team.members.filter(m => m.name && m.name.trim() !== "").length;
            const statusClass = team.isRecruiting ? 'open' : 'closed';
            const statusText = team.isRecruiting ? '모집중' : '마감';
            const captainName = team.members[0] ? team.members[0].name : '미정';

            const card = document.createElement('article');
            card.className = 'recruit-card';
            card.innerHTML = `
                <div class="card-header">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <h3 class="team-name">${team.teamName}</h3>
                <div class="captain-info">
                    <i class="fa-solid fa-crown" style="color:#ffc107;"></i> 대대장: ${captainName}
                </div>
                <div class="team-meta">
                    <div class="member-count">
                        <i class="fa-solid fa-user-group"></i> ${currentMembers} / 10명
                    </div>
                    <button class="btn-detail" onclick="location.href='team-detail.html?id=${team._id}'">
                        상세보기
                    </button>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        container.innerHTML = '<p class="empty-message">데이터를 불러오는데 실패했습니다.</p>';
    }
});