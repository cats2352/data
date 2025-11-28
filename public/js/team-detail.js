document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const teamId = params.get('id');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const userNickname = localStorage.getItem('userNickname');

    if (!teamId) { alert('잘못된 접근입니다.'); location.href = 'team-list.html'; return; }

    let teamData = null; 

    // --- DOM 요소 ---
    const settingsModal = document.getElementById('settings-modal');
    const btnOpenSettings = document.getElementById('btn-open-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const btnSaveSettings = document.getElementById('btn-save-settings');
    const btnDeleteTeam = document.getElementById('btn-delete-team');
    const adminActionsDiv = document.getElementById('admin-actions');
    
    // 설정 체크박스
    const chkRecruit = document.getElementById('edit-recruit');
    const chkLog = document.getElementById('edit-log-public');
    const chkComment = document.getElementById('edit-comment');

    // 댓글 관련
    const commentInputArea = document.getElementById('comment-input-area');
    const commentDisabledMsg = document.getElementById('comment-disabled-msg');
    const btnSubmitComment = document.getElementById('btn-submit-comment');
    const commentInput = document.getElementById('comment-input');

    // 초기 로딩
    await loadTeamData();

    async function loadTeamData() {
        try {
            const res = await fetch(`/api/teams/${teamId}`);
            if (!res.ok) throw new Error('불러오기 실패');
            teamData = await res.json();
            renderAll(teamData);
        } catch (err) {
            console.error(err);
            alert('데이터를 불러올 수 없습니다.');
        }
    }

    function renderAll(team) {
        // 1. 기본 정보
        document.getElementById('detail-name').textContent = team.teamName;
        document.getElementById('detail-desc').textContent = team.description || '설명이 없습니다.';
        document.getElementById('detail-writer').innerHTML = `<i class="fa-solid fa-user-pen"></i> ${team.writer}`;
        document.getElementById('detail-date').innerHTML = `<i class="fa-regular fa-clock"></i> ${new Date(team.updatedAt).toLocaleDateString()}`;
        
        const statusBadge = document.getElementById('detail-status');
        if(statusBadge) {
            statusBadge.className = `status-badge ${team.isRecruiting ? 'open' : 'closed'}`;
            statusBadge.textContent = team.isRecruiting ? '모집중' : '마감';
        }

        const labelLog = document.getElementById('label-log-public');
        const labelComment = document.getElementById('label-comment-allowed');
        
        if(labelLog) {
            labelLog.style.color = team.isLogPublic ? '#4caf50' : '#f44336';
            labelLog.innerHTML = team.isLogPublic ? '<i class="fa-solid fa-check"></i> 로그 공개' : '<i class="fa-solid fa-xmark"></i> 로그 비공개';
        }
        if(labelComment) {
            labelComment.style.color = team.isCommentAllowed ? '#4caf50' : '#f44336';
            labelComment.innerHTML = team.isCommentAllowed ? '<i class="fa-solid fa-check"></i> 댓글 허용' : '<i class="fa-solid fa-xmark"></i> 댓글 불가';
        }

        // 2. 관리자 버튼
        if (isAdmin) {
            if(adminActionsDiv) adminActionsDiv.classList.remove('hidden');
            if(btnDeleteTeam) {
                btnDeleteTeam.onclick = async () => {
                    if(confirm('정말 삭제하시겠습니까?')) {
                        try {
                            const res = await fetch(`/api/teams/${teamId}`, { method: 'DELETE' });
                            if(res.ok) { alert('삭제됨'); location.href='team-list.html'; }
                        } catch(e) {}
                    }
                };
            }
            if(btnOpenSettings) {
                btnOpenSettings.onclick = () => {
                    chkRecruit.checked = team.isRecruiting;
                    chkLog.checked = team.isLogPublic;
                    chkComment.checked = team.isCommentAllowed;
                    settingsModal.classList.remove('hidden');
                };
            }
        }

        // 3. 멤버 리스트
        renderMembers(team.members);

        // 4. 로그
        renderLogs(team.logs, team.isLogPublic);

        // 5. ★ [추가] 댓글 섹션 제어
        if (team.isCommentAllowed) {
            commentInputArea.classList.remove('hidden');
            commentDisabledMsg.classList.add('hidden');
        } else {
            commentInputArea.classList.add('hidden');
            commentDisabledMsg.classList.remove('hidden');
        }
        renderComments(team.comments);
    }

    // --- 댓글 렌더링 및 기능 ---
    function renderComments(comments) {
        const listContainer = document.getElementById('comment-list');
        const countSpan = document.getElementById('comment-count');
        if(!listContainer) return;

        countSpan.textContent = comments.length;
        listContainer.innerHTML = '';

        // 최신순 정렬
        const sorted = [...comments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        sorted.forEach(cmt => {
            const date = new Date(cmt.createdAt).toLocaleString();
            // 삭제 버튼 조건: 작성자 본인 or 관리자
            const showDel = (cmt.writer === userNickname) || isAdmin;
            const delHtml = showDel ? `<button class="delete-comment-btn" onclick="deleteTeamComment('${cmt._id}')"><i class="fa-solid fa-trash"></i></button>` : '';

            const div = document.createElement('div');
            div.className = 'comment-item';
            div.innerHTML = `
                <div class="comment-header">
                    <span class="comment-writer"><i class="fa-solid fa-user"></i> ${cmt.writer}</span>
                    <span class="comment-date">${date}</span>
                </div>
                <div class="comment-body">${cmt.content}</div>
                <div class="comment-actions" style="justify-content:flex-end;">
                    ${delHtml}
                </div>
            `;
            listContainer.appendChild(div);
        });
    }

    // 댓글 등록 버튼
    if (btnSubmitComment) {
        btnSubmitComment.addEventListener('click', async () => {
            if (!userNickname) return alert('로그인이 필요합니다.');
            const content = commentInput.value.trim();
            if (!content) return alert('내용을 입력하세요.');

            try {
                const res = await fetch(`/api/teams/${teamId}/comments`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ writer: userNickname, content })
                });
                if (res.ok) {
                    commentInput.value = '';
                    loadTeamData(); // 화면 갱신
                } else {
                    const data = await res.json();
                    alert(data.message);
                }
            } catch (e) { console.error(e); }
        });
    }

    // 댓글 삭제 (전역 함수)
    window.deleteTeamComment = async (commentId) => {
        if (!confirm('댓글을 삭제하시겠습니까?')) return;
        try {
            const res = await fetch(`/api/teams/${teamId}/comments/${commentId}`, {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userNickname })
            });
            if (res.ok) {
                loadTeamData();
            } else {
                alert('권한이 없습니다.');
            }
        } catch (e) { console.error(e); }
    };

    // --- 설정 모달 로직 ---
    if(btnCloseSettings) btnCloseSettings.onclick = () => settingsModal.classList.add('hidden');
    if(btnSaveSettings) {
        btnSaveSettings.onclick = async () => {
            const updateData = {
                isRecruiting: chkRecruit.checked,
                isLogPublic: chkLog.checked,
                isCommentAllowed: chkComment.checked
            };
            try {
                const res = await fetch(`/api/teams/${teamId}`, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(updateData)
                });
                if(res.ok) {
                    alert('설정이 변경되었습니다.');
                    settingsModal.classList.add('hidden');
                    loadTeamData();
                } else { alert('변경 실패'); }
            } catch (e) { console.error(e); }
        };
    }

    // --- 멤버 및 로그 렌더링 함수들 ---
    function renderMembers(members) {
        const container = document.getElementById('member-list-container');
        if(!container) return;
        container.innerHTML = '';

        members.forEach((member, index) => {
            const slot = document.createElement('div');
            slot.className = 'member-slot';
            const roleName = index === 0 ? '👑 대대장' : `동맹원 ${index}`;
            const isEmpty = !member.name;
            
            let html = `<span class="slot-role">${roleName}</span>`;
            if (isEmpty) {
                html += `<span class="slot-name slot-empty">대대원이 모집되지 않았습니다.</span>`;
                if (isAdmin) html += `<div class="admin-controls"><button class="control-btn btn-in" onclick="handleMember(${index}, 'IN')">IN</button></div>`;
            } else {
                html += `<span class="slot-name">${member.name}</span>`;
                if (isAdmin) html += `<div class="admin-controls">
                    <button class="control-btn btn-change" onclick="handleMember(${index}, 'CHANGE', '${member.name}')">변경</button>
                    <button class="control-btn btn-out" onclick="handleMember(${index}, 'OUT', '${member.name}')">OUT</button>
                </div>`;
            }
            slot.innerHTML = html;
            container.appendChild(slot);
        });
    }

    function renderLogs(logs, isPublic) {
        const logBox = document.getElementById('log-box');
        const filterEl = document.getElementById('log-filter-type');
        if(!logBox) return;

        if (!isPublic && !isAdmin) {
            logBox.innerHTML = '<p style="padding:10px; color:#777;">비공개 로그입니다.</p>';
            return;
        }

        const filterType = filterEl ? filterEl.value : 'ALL';
        logBox.innerHTML = '';
        
        [...logs].reverse().forEach(log => {
            if (filterType !== 'ALL' && log.type !== filterType) return;
            const date = new Date(log.timestamp);
            const timeStr = `${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
            
            const div = document.createElement('div');
            div.className = 'log-entry';
            div.innerHTML = `<span class="log-date">[${timeStr}]</span><span class="log-type ${log.type}">${log.type}</span> ${log.message}`;
            logBox.appendChild(div);
        });
    }

    const logFilter = document.getElementById('log-filter-type');
    if(logFilter) {
        logFilter.addEventListener('change', () => {
            if(teamData) renderLogs(teamData.logs, teamData.isLogPublic);
        });
    }

    window.handleMember = async (index, action, currentName = '') => {
        let newName = '';
        if (action === 'IN') {
            newName = prompt('추가할 닉네임:');
            if (!newName) return;
        } else if (action === 'CHANGE') {
            newName = prompt('변경할 닉네임:', currentName);
            if (!newName || newName === currentName) return;
        } else if (action === 'OUT') {
            if (!confirm(`'${currentName}' 대대원을 추방하시겠습니까?`)) return;
        }

        try {
            const res = await fetch(`/api/teams/${teamId}/members`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slotIndex: index, action, newName, adminName: userNickname })
            });
            if (res.ok) loadTeamData();
            else alert('처리 실패');
        } catch (e) { console.error(e); }
    };
});