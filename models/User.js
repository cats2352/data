const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    nickname: { type: String, required: true, unique: true },
    isApproved: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    // ★ [NEW] 가입일 필드 추가
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);