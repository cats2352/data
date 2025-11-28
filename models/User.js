const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    nickname: {
        type: String,
        required: true,
        unique: true,
        maxlength: 10
    },
    password: {
        type: String,
        required: true,
        minlength: 4
    },
    // 관리자 여부
    isAdmin: {
        type: Boolean,
        default: false
    },
    // ★ 추가: 가입 승인 여부 (기본값 false: 승인 대기)
    isApproved: {
        type: Boolean,
        default: false 
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);