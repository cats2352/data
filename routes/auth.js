const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/key');
const { authenticateToken } = require('../middleware/auth');

// 회원가입
router.post('/register', async (req, res) => {
    try {
        const { nickname, password } = req.body;

        // 1. 닉네임 길이 제한 (10글자 이내)
        if (!nickname || nickname.length > 10) {
            return res.status(400).json({ message: '닉네임은 1~10글자 사이여야 합니다.' });
        }

        // 2. 비밀번호 복잡성 검사 (영문, 숫자, 특수문자 포함)
        // 정규식: 영문, 숫자, 특수문자가 각각 최소 1개 이상 포함되어야 함
        const pwRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{4,}$/;
        if (!pwRegex.test(password)) {
            return res.status(400).json({ message: '비밀번호는 영문, 숫자, 특수문자를 모두 포함해야 합니다.' });
        }

        // 3. 중복 닉네임 확인
        const existingUser = await User.findOne({ nickname });
        if (existingUser) {
            return res.status(400).json({ message: '이미 존재하는 닉네임입니다.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ nickname, password: hashedPassword }); // username 제외
        await newUser.save();
        
        res.status(201).json({ message: '가입 신청 완료! 승인 대기 중.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 에러 발생' });
    }
});

// 로그인
router.post('/login', async (req, res) => {
    try {
        const { nickname, password, rememberMe } = req.body; // rememberMe 추가됨

        // 닉네임으로 유저 찾기
        const user = await User.findOne({ nickname });
        if (!user) return res.status(400).json({ message: '가입되지 않은 닉네임입니다.' });

        // 비밀번호 확인
        if (!await bcrypt.compare(password, user.password)) {
            return res.status(400).json({ message: '비밀번호가 틀렸습니다.' });
        }

        // 승인 여부 확인
        if (!user.isApproved) return res.status(403).json({ message: '관리자 승인 대기 중입니다.' });

        // 토큰 생성 (로그인 유지 여부에 따라 만료 시간 다르게 설정)
        // 기본: 1시간(1h), 유지 시: 7일(7d)
        const expiresIn = rememberMe ? '7d' : '1h';
        
        const token = jwt.sign(
            { id: user._id, nickname: user.nickname, isAdmin: user.isAdmin }, 
            JWT_SECRET, 
            { expiresIn }
        );

        res.json({ 
            token, 
            nickname: user.nickname, 
            isAdmin: user.isAdmin,
            message: '로그인 성공'
        });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ message: '서버 에러' }); 
    }
});

// 내 정보 조회
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: '유저 없음' });
        res.json(user);
    } catch (e) {
        res.status(500).json({ message: '서버 에러' });
    }
});

module.exports = router;