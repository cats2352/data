const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // username 필드 삭제됨
    nickname: { type: String, required: true, unique: true }, // 이제 닉네임이 ID 역할
    password: { type: String, required: true },
    isApproved: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);