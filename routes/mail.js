const express = require('express');
const router = express.Router();
const Mail = require('../models/Mail');
const User = require('../models/User');
const { authenticateToken, checkAdmin } = require('../middleware/auth');

// 1. 쪽지 보내기 (관리자 전용)
router.post('/send', authenticateToken, checkAdmin, async (req, res) => {
    try {
        // ★ subject 추가됨
        const { receiverId, subject, content } = req.body;

        if (!subject || !content) return res.status(400).json({ message: '제목과 내용을 모두 입력해주세요.' });

        // 받는 유저 확인
        const receiver = await User.findById(receiverId);
        if (!receiver) return res.status(404).json({ message: '존재하지 않는 유저입니다.' });

        const newMail = new Mail({
            senderId: req.user.id,
            senderName: '관리자', 
            receiverId,
            subject, // ★ 제목 저장
            content
        });

        await newMail.save();
        res.json({ message: `${receiver.nickname}님에게 쪽지를 보냈습니다.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '쪽지 전송 실패' });
    }
});

// 2. 내 쪽지함 조회 (7일 자동 삭제 로직 포함)
router.get('/my', authenticateToken, async (req, res) => {
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        await Mail.deleteMany({
            receiverId: req.user.id,
            createdAt: { $lt: sevenDaysAgo }
        });

        const mails = await Mail.find({ receiverId: req.user.id }).sort({ createdAt: -1 });
        res.json(mails);
    } catch (err) {
        res.status(500).json({ message: '쪽지 조회 실패' });
    }
});

// 3. 쪽지 읽음 처리
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        await Mail.findByIdAndUpdate(req.params.id, { isRead: true });
        res.json({ message: '읽음 처리됨' });
    } catch (err) {
        res.status(500).json({ message: '오류 발생' });
    }
});

// 4. 안 읽은 쪽지 개수 조회
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        const count = await Mail.countDocuments({ receiverId: req.user.id, isRead: false });
        res.json({ count });
    } catch (err) {
        res.status(500).json({ message: '오류' });
    }
});

module.exports = router;