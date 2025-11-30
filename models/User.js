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
    isAdmin: {
        type: Boolean,
        default: false
    },
    isApproved: {
        type: Boolean,
        default: false 
    },
    // ★ [추가] 마지막 접속 시간 (기본값은 가입 시간)
    lastLogin: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);