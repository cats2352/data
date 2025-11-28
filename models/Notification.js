const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    targetUser: { type: String, required: true }, // 알림 받을 유저
    content: { type: String, required: true },    // 알림 내용
    isRead: { type: Boolean, default: false },    // 읽음 여부
    createdAt: { type: Date, default: Date.now }
});

// ★ 핵심: 생성 후 3일(259200초)이 지나면 DB에서 자동 삭제됨
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 259200 });

module.exports = mongoose.model('Notification', notificationSchema);