const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
    writer: { type: String, required: true },       // 작성자
    targetAdmin: { type: String, required: true },  // 받는 관리자
    category: { type: String, required: true },     // 문의 유형
    content: { type: String, required: true },      // 내용
    reply: { type: String, default: '' },           // 답장 내용
    isReplied: { type: Boolean, default: false },   // 답장 여부
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Inquiry', inquirySchema);