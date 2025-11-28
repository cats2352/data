const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    receiver: { type: String, required: true }, // 받는 사람 (유저)
    sender: { type: String, default: '운영자' }, // 보낸 사람
    content: { type: String, required: true },  // 쪽지 내용 (답변)
    originalInquiry: { type: String },          // 원본 문의 내용 요약 (선택)
    createdAt: { type: Date, default: Date.now }
});

// ★ 핵심: 7일(604800초) 후 자동 삭제 설정
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('Message', messageSchema);