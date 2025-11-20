const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken, checkAdmin } = require('../middleware/auth');

// 대기 목록
router.get('/pending-users', authenticateToken, checkAdmin, async (req, res) => {
    const users = await User.find({ isApproved: false }).select('-password');
    res.json(users);
});

// 승인
router.post('/approve', authenticateToken, checkAdmin, async (req, res) => {
    await User.findByIdAndUpdate(req.body.targetUserId, { isApproved: true });
    res.json({ message: '승인 완료' });
});

module.exports = router;