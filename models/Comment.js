const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userNickname: { type: String, required: true },
    content: { type: String, required: true },
    
    // 대댓글을 위한 필드 (부모 댓글 ID)
    // parentCommentId가 없으면 일반 댓글, 있으면 대댓글입니다.
    parentCommentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', CommentSchema);