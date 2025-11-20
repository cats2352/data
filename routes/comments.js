const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const { authenticateToken } = require('../middleware/auth');
const Event = require('../models/Event'); // ★ Event 모델을 불러와야 설정을 확인합니다.

// 1. 댓글 목록 조회 (작성자의 관리자 여부 포함)
router.get('/:eventId', async (req, res) => {
    try {
        const comments = await Comment.find({ eventId: req.params.eventId })
            .populate('userId', 'isAdmin') // ★ 핵심: 작성자 정보에서 isAdmin 필드를 가져옴
            .sort({ createdAt: 1 });
            
        res.json(comments);
    } catch (err) {
        console.error(err); // 에러 확인용 로그
        res.status(500).json({ message: '댓글 조회 실패' });
    }
});

// 2. 댓글 작성
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { eventId, content, parentCommentId } = req.body;
        
        // [1] 이벤트 설정 확인
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: '이벤트가 없습니다.' });

        // 설정 1: 댓글 기능이 꺼져있으면 차단
        if (!event.settings.isCommentAllowed) {
            return res.status(403).json({ message: '이 이벤트는 댓글 작성이 비활성화되어 있습니다.' });
        }

        // 설정 2: 1인 1댓글 제한 체크 (대댓글은 제외하고 '새 댓글'만 막거나, 아예 막거나 선택)
        // 여기서는 '내가 쓴 댓글이 하나라도 있으면' 막는 것으로 강력하게 적용합니다.
        if (event.settings.isCommentOnce) {
            const myComment = await Comment.findOne({ eventId, userId: req.user.id });
            if (myComment) {
                return res.status(400).json({ message: '이 이벤트는 1인당 1개의 댓글만 작성할 수 있습니다.' });
            }
        }
        
        if (!content) return res.status(400).json({ message: '내용을 입력해주세요.' });

        const newComment = new Comment({
            eventId,
            userId: req.user.id,
            userNickname: req.user.nickname,
            content,
            parentCommentId: parentCommentId || null
        });

        await newComment.save();
        res.status(201).json({ message: '댓글이 등록되었습니다.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '댓글 등록 실패' });
    }
});

// 3. 댓글 삭제 (작성자 본인만)
router.delete('/:commentId', authenticateToken, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);
        if (!comment) return res.status(404).json({ message: '댓글이 없습니다.' });

        // 본인 확인 (관리자도 삭제 가능하게 하려면 조건 추가)
        if (comment.userId.toString() !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ message: '삭제 권한이 없습니다.' });
        }

        // 대댓글이 있는 원본 댓글을 지울 때의 정책:
        // 방법 A: 대댓글도 싹 다 지운다. (여기서는 이 방법 사용)
        // 방법 B: "삭제된 댓글입니다"라고 내용만 바꾼다.
        await Comment.deleteMany({ parentCommentId: req.params.commentId }); // 자식들 삭제
        await Comment.findByIdAndDelete(req.params.commentId); // 본인 삭제

        res.json({ message: '삭제되었습니다.' });
    } catch (err) {
        res.status(500).json({ message: '오류 발생' });
    }
});

module.exports = router;