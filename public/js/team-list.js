document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('team-list-container');
    const createBtn = document.getElementById('create-team-btn');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    if (isAdmin) {
        createBtn.classList.remove('hidden');
    }

    try {
        const res = await fetch('/api/teams');
        const teams = await res.json();

        container.innerHTML = '';

        if (teams.length === 0) {
            container.innerHTML = '<p class="empty-message" style="text-align:center; padding:2rem; color:#888;">등록된 모집글이 없습니다.</p>';
            return;
        }

        teams.forEach(team => {
            const currentMembers = team.members.filter(m => m.name && m.name.trim() !== "").length;
            const statusClass = team.isRecruiting ? 'open' : 'closed';
            const statusText = team.isRecruiting ? '모집중' : '마감';
            const captainName = team.members[0] ? team.members[0].name : '미정';

            // ★ [수정] 리스트 아이템(Row) 구조 생성
            const item = document.createElement('article');
            item.className = 'team-list-item';
            
            // 클릭 시 상세 페이지 이동 (전체 영역 클릭 가능하도록)
            item.onclick = (e) => {
                // 버튼 클릭 시 중복 이동 방지
                if(!e.target.closest('button')) {
                    location.href = `team-detail.html?id=${team._id}`;
                }
            };
            item.style.cursor = 'pointer';

            item.innerHTML = `
                <div class="item-left">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    <div class="team-info-group">
                        <h3 class="team-name">${team.teamName}</h3>
                        <div class="captain-info">
                            <i class="fa-solid fa-crown" style="color:#ffc107; font-size:0.8rem;"></i> ${captainName}
                        </div>
                    </div>
                </div>
                
                <div class="item-right">
                    <div class="member-count">
                        <i class="fa-solid fa-user-group"></i> ${currentMembers} / 10
                    </div>
                    <button class="btn-detail" onclick="location.href='team-detail.html?id=${team._id}'">
                        상세보기
                    </button>
                </div>
            `;
            container.appendChild(item);
        });

    } catch (error) {
        console.error(error);
        container.innerHTML = '<p class="empty-message">데이터를 불러오는데 실패했습니다.</p>';
    }
});