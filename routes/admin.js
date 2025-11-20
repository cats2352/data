const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken, checkAdmin } = require('../middleware/auth');

// 1. 대기 목록
router.get('/pending-users', authenticateToken, checkAdmin, async (req, res) => {
    // username 제외하고 nickname만 가져오면 됨
    const users = await User.find({ isApproved: false }).select('-password');
    res.json(users);
});

// 2. 승인된 유저 목록
router.get('/approved-users', authenticateToken, checkAdmin, async (req, res) => {
    const users = await User.find({ isApproved: true }).select('-password');
    res.json(users);
});

// 3. 승인
router.post('/approve', authenticateToken, checkAdmin, async (req, res) => {
    await User.findByIdAndUpdate(req.body.targetUserId, { isApproved: true });
    res.json({ message: '승인 완료' });
});

// 4. 승인 취소
router.post('/unapprove', authenticateToken, checkAdmin, async (req, res) => {
    await User.findByIdAndUpdate(req.body.targetUserId, { isApproved: false });
    res.json({ message: '승인 취소 완료' });
});

// 5. 유저 삭제
router.delete('/user/:id', authenticateToken, checkAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: '유저가 삭제되었습니다.' });
    } catch (err) {
        res.status(500).json({ message: '삭제 실패' });
    }
});

module.exports = router;