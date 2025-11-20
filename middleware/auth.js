const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/key');
const User = require('../models/User');

// 로그인 확인
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: '로그인 필요' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: '토큰 만료' });
        req.user = user;
        next();
    });
};

// 관리자 확인
const checkAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (user && user.isAdmin) next();
        else res.status(403).json({ message: '관리자 권한이 없습니다!' });
    } catch (err) {
        res.status(500).json({ message: '서버 오류' });
    }
};

module.exports = { authenticateToken, checkAdmin };