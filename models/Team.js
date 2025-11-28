// models/Team.js
const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    type: { type: String, required: true }, // 'CHANGE', 'IN', 'OUT'
    message: { type: String, required: true },
    adminName: { type: String, required: true }
});

const commentSchema = new mongoose.Schema({
    writer: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const teamSchema = new mongoose.Schema({
    teamName: { type: String, required: true, maxlength: 25 },
    description: { type: String, maxlength: 1000 },
    
    // 멤버 배열: 0번은 대대장, 1~9번은 동맹원 (총 10칸 고정)
    // 값: { name: "닉네임" } 또는 { name: "" }(비어있음)
    members: { 
        type: [{ name: String }], 
        default: Array(10).fill({ name: "" }) 
    },

    isLogPublic: { type: Boolean, default: true },      // 로그 공개 여부
    isCommentAllowed: { type: Boolean, default: true }, // 댓글 허용 여부
    isRecruiting: { type: Boolean, default: true },     // 모집중 여부

    logs: [logSchema],       // 변경 로그
    comments: [commentSchema], // 댓글
    likes: { type: Number, default: 0 },
    likedBy: { type: [String], default: [] },

    writer: { type: String, required: true }, // 작성자(관리자)
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Team', teamSchema);