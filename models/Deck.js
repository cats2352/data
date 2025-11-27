const mongoose = require('mongoose');

// 답글(대댓글) 스키마 (별도 파일로 안 빼고 내부에 정의)
const replySchema = new mongoose.Schema({
    writer: { type: String, required: true },     // 작성자
    tag: { type: String, default: '' },           // 멘션 대상 (@닉네임)
    content: { type: String, required: true },    // 내용
    likes: { type: [String], default: [] },       // 좋아요 누른 사람들
    createdAt: { type: Date, default: Date.now }
});

// 댓글 스키마
const commentSchema = new mongoose.Schema({
    writer: { type: String, required: true },
    content: { type: String, required: true },
    likes: { type: [String], default: [] },
    replies: [replySchema],                       // 답글 배열
    createdAt: { type: Date, default: Date.now }
});

const deckSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    writer: { type: String, required: true },
    mainContent: { type: String, required: true },
    subContent: { type: String, required: true },
    characters: { type: Array, required: true },
    rounds: { type: Array, default: [] },

    likes: { type: Number, default: 0 },
    likedBy: { type: [String], default: [] },
    
    // ★ 추가: 댓글 리스트
    comments: [commentSchema],
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Deck', deckSchema);