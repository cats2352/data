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
    // ★ 추가: 관리자 여부 (기본값은 false)
    isAdmin: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);