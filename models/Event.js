const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    title: String,
    startDate: Date,
    endDate: Date,
    eventType: String, // 'lotto', 'quiz', 'custom'
    desc: String,
    author: String,
    imgUrl: String,
    prizes: [{ label: String, reward: String }],

    // ★ [NEW] 직접 입력 & 집계 관련 필드
    customEventType: String,
    calcStartDate: Date,
    calcEndDate: Date,

    // ★ [NEW] 수동 당첨자 목록
    manualWinners: [{
        userId: String,
        nickname: String,
        content: String,
        reward: String
    }],
    
    lottoConfig: {
        winRates: [{ 
            name: String, rate: Number, 
            maxCount: { type: Number, default: 0 }, 
            currentCount: { type: Number, default: 0 } 
        }], 
        ticketRates: [{ count: Number, rate: Number }], 
        frequency: String, 
        showDetails: Boolean 
    },
    settings: {
        isFirstCome: { type: Boolean, default: false },
        maxParticipants: { type: Number, default: 0 },
        isCommentAllowed: { type: Boolean, default: false },
        isCommentOnce: { type: Boolean, default: false }
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', EventSchema);