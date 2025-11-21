const mongoose = require('mongoose');

const AppSchema = new mongoose.Schema({
    eventId: String, 
    eventTitle: String, 
    userId: String,
    userName: String,
    ticketCount: { type: Number, default: 0 },
    
    // 유저가 확인한 결과 (공개)
    drawResults: [String],
    
    // ★ [NEW] 관리자만 볼 수 있는 미리 계산된 결과 (비공개)
    hiddenResults: [String],

    lastAppliedAt: { type: Date, default: Date.now },
    appliedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Application', AppSchema);