const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/key');
const { authenticateToken } = require('../middleware/auth'); // ★ 이거 추가!

// 회원가입
router.post('/register', async (req, res) => {
    try {
        const { username, password, nickname } = req.body;
        // 유효성 검사 생략 (기존 로직 유지)
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, nickname });
        await newUser.save();
        res.status(201).json({ message: '가입 신청 완료! 승인 대기 중.' });
    } catch (error) {
        res.status(400).json({ message: '중복된 정보가 있습니다.' });
    }
});

// 로그인
router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (!user) return res.status(400).json({ message: '아이디 없음' });
        if (!await bcrypt.compare(req.body.password, user.password)) return res.status(400).json({ message: '비번 틀림' });
        if (!user.isApproved) return res.status(403).json({ message: '승인 대기 중입니다.' });

        const token = jwt.sign({ id: user._id, username: user.username, nickname: user.nickname, isAdmin: user.isAdmin }, JWT_SECRET);
        res.json({ token, username: user.username, nickname: user.nickname, isAdmin: user.isAdmin });
    } catch (e) { res.status(500).json({ message: '서버 에러' }); }
});

// [NEW] 내 정보 조회 (마이페이지용)
router.get('/me', authenticateToken, async (req, res) => {
    try {
        // 비밀번호 제외하고 내 정보 찾기
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: '유저 없음' });
        res.json(user);
    } catch (e) {
        res.status(500).json({ message: '서버 에러' });
    }
});

module.exports = router;