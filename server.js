require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const User = require('./models/User');
const Deck = require('./models/Deck');

const app = express();

// 기본 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- ★ [핵심] Vercel용 DB 연결 함수 정의 (캐싱 처리) ---
let cachedDb = null;

async function connectDB() {
    // 1. 이미 연결되어 있고 상태가 정상이면 기존 연결 재사용
    if (cachedDb && mongoose.connection.readyState === 1) {
        return cachedDb;
    }

    // 2. 연결이 없으면 새로 연결
    try {
        cachedDb = await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected (New Connection)');
        return cachedDb;
    } catch (err) {
        console.error('❌ DB Connection Error:', err);
        throw err;
    }
}

// --- ★ API 라우트 ---

// 1. 회원가입 API
app.post('/api/register', async (req, res) => {
    try {
        await connectDB(); // ★ DB 연결 필수
        const { nickname, password } = req.body;

        const existingUser = await User.findOne({ nickname });
        if (existingUser) {
            return res.status(400).json({ message: '이미 존재하는 닉네임입니다.' });
        }

        const newUser = new User({ nickname, password });
        await newUser.save();

        res.status(201).json({ message: '회원가입 성공!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 2. 로그인 API
app.post('/api/login', async (req, res) => {
    try {
        await connectDB(); // ★ DB 연결 필수
        const { nickname, password } = req.body;
        
        const user = await User.findOne({ nickname });
        if (!user) return res.status(400).json({ message: '존재하지 않는 닉네임입니다.' });
        if (user.password !== password) return res.status(400).json({ message: '비밀번호가 틀렸습니다.' });

        res.status(200).json({ 
            message: '로그인 성공!', 
            nickname: user.nickname,
            isAdmin: user.isAdmin 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 3. 덱 저장 API
app.post('/api/decks', async (req, res) => {
    try {
        await connectDB(); // ★ DB 연결 필수
        const { title, description, writer, mainContent, subContent, characters, rounds } = req.body;

        const newDeck = new Deck({
            title, description, writer, mainContent, subContent, characters,
            rounds: rounds || []
        });

        await newDeck.save();
        res.status(201).json({ message: '덱이 성공적으로 저장되었습니다!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '덱 저장 중 오류가 발생했습니다.' });
    }
});

// 4. 덱 목록 불러오기 API
app.get('/api/decks', async (req, res) => {
    try {
        await connectDB(); // ★ DB 연결 필수
        const { sort, title, writer, mainContent, subContent, startDate, endDate } = req.query;
        
        let query = {};

        if (title) query.title = { $regex: title, $options: 'i' };
        if (writer) query.writer = { $regex: writer, $options: 'i' };
        if (mainContent) query.mainContent = mainContent;
        if (subContent) query.subContent = subContent;

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        let sortOption = { createdAt: -1 };
        if (sort === 'popular') {
            sortOption = { likes: -1, createdAt: -1 };
        }

        const decks = await Deck.find(query).sort(sortOption);
        res.status(200).json(decks);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '덱 목록을 불러오지 못했습니다.' });
    }
});

// 5. 덱 삭제 API
app.delete('/api/decks/:id', async (req, res) => {
    try {
        await connectDB(); // ★ DB 연결 필수
        const deckId = req.params.id;
        const { userNickname } = req.body; 

        const deck = await Deck.findById(deckId);
        if (!deck) return res.status(404).json({ message: '덱을 찾을 수 없습니다.' });

        const user = await User.findOne({ nickname: userNickname });
        const isAdmin = user && user.isAdmin;

        if (deck.writer !== userNickname && !isAdmin) {
            return res.status(403).json({ message: '삭제 권한이 없습니다.' });
        }

        await Deck.findByIdAndDelete(deckId);
        res.status(200).json({ message: '삭제되었습니다.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 6. 좋아요 토글 API
app.put('/api/decks/:id/like', async (req, res) => {
    try {
        await connectDB(); // ★ DB 연결 필수
        const deckId = req.params.id;
        const { userNickname } = req.body;

        const deck = await Deck.findById(deckId);
        if (!deck) return res.status(404).json({ message: '덱을 찾을 수 없습니다.' });

        const index = deck.likedBy.indexOf(userNickname);

        if (index === -1) {
            deck.likedBy.push(userNickname);
            deck.likes += 1;
        } else {
            deck.likedBy.splice(index, 1);
            deck.likes -= 1;
        }

        await deck.save();
        res.status(200).json({ likes: deck.likes, liked: index === -1 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 7. 특정 덱 조회 API
app.get('/api/decks/:id', async (req, res) => {
    try {
        await connectDB(); // ★ DB 연결 필수
        const deck = await Deck.findById(req.params.id);
        if (!deck) return res.status(404).json({ message: '덱을 찾을 수 없습니다.' });
        res.status(200).json(deck);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 8. 덱 수정 API
app.put('/api/decks/:id', async (req, res) => {
    try {
        await connectDB(); // ★ DB 연결 필수
        const deckId = req.params.id;
        const { writer, title, description, characters, rounds } = req.body;

        const deck = await Deck.findById(deckId);
        if (!deck) return res.status(404).json({ message: '덱을 찾을 수 없습니다.' });

        if (deck.writer !== writer) {
            return res.status(403).json({ message: '수정 권한이 없습니다.' });
        }

        deck.title = title;
        deck.description = description;
        deck.characters = characters;
        deck.rounds = rounds || [];

        await deck.save();
        res.status(200).json({ message: '수정되었습니다!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 9. 댓글 작성 API
app.post('/api/decks/:id/comments', async (req, res) => {
    try {
        await connectDB(); // ★ DB 연결 필수
        const { writer, content } = req.body;
        const deck = await Deck.findById(req.params.id);
        if (!deck) return res.status(404).json({ message: '덱을 찾을 수 없습니다.' });

        deck.comments.push({ writer, content });
        await deck.save();
        res.status(201).json(deck.comments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 10. 답글(대댓글) 작성 API
app.post('/api/decks/:id/comments/:commentId/replies', async (req, res) => {
    try {
        await connectDB(); // ★ DB 연결 필수
        const { writer, content, tag } = req.body;
        const deck = await Deck.findById(req.params.id);
        if (!deck) return res.status(404).json({ message: '덱을 찾을 수 없습니다.' });

        const comment = deck.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });

        comment.replies.push({ writer, content, tag });
        await deck.save();
        res.status(201).json(deck.comments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 11. 댓글 좋아요 토글 API
app.put('/api/decks/:id/comments/:commentId/like', async (req, res) => {
    try {
        await connectDB(); // ★ DB 연결 필수
        const { userNickname } = req.body;
        const deck = await Deck.findById(req.params.id);
        const comment = deck.comments.id(req.params.commentId);

        const index = comment.likes.indexOf(userNickname);
        if (index === -1) comment.likes.push(userNickname);
        else comment.likes.splice(index, 1);

        await deck.save();
        res.status(200).json(deck.comments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 12. 답글 좋아요 토글 API
app.put('/api/decks/:id/comments/:commentId/replies/:replyId/like', async (req, res) => {
    try {
        await connectDB(); // ★ DB 연결 필수
        const { userNickname } = req.body;
        const deck = await Deck.findById(req.params.id);
        const comment = deck.comments.id(req.params.commentId);
        const reply = comment.replies.id(req.params.replyId);

        const index = reply.likes.indexOf(userNickname);
        if (index === -1) reply.likes.push(userNickname);
        else reply.likes.splice(index, 1);

        await deck.save();
        res.status(200).json(deck.comments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 13. 사용자 목록 조회 API
app.get('/api/users', async (req, res) => {
    try {
        await connectDB(); // ★ DB 연결 필수
        const users = await User.find().select('-password');
        const decks = await Deck.find();

        const userList = users.map(user => {
            const userDecks = decks.filter(d => d.writer === user.nickname);
            const totalLikes = userDecks.reduce((sum, d) => sum + d.likes, 0);
            
            let commentCount = 0;
            decks.forEach(d => {
                d.comments.forEach(c => {
                    if (c.writer === user.nickname) commentCount++;
                    c.replies.forEach(r => {
                        if (r.writer === user.nickname) commentCount++;
                    });
                });
            });

            return {
                _id: user._id,
                nickname: user.nickname,
                isAdmin: user.isAdmin,
                createdAt: user.createdAt,
                stats: { deckCount, totalLikes, commentCount }
            };
        });

        res.status(200).json(userList);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '유저 목록 로딩 실패' });
    }
});

// 14. [관리자] 유저 닉네임 변경 API
app.put('/api/users/:id', async (req, res) => {
    try {
        await connectDB(); // ★ DB 연결 필수
        const { newNickname } = req.body;
        const targetUser = await User.findById(req.params.id);
        
        if (!targetUser) return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });

        const oldNickname = targetUser.nickname;
        targetUser.nickname = newNickname;
        await targetUser.save();

        await Deck.updateMany({ writer: oldNickname }, { writer: newNickname });

        res.status(200).json({ message: '닉네임이 변경되었습니다.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '닉네임 변경 실패' });
    }
});

// 15. [관리자] 유저 강제 탈퇴 API
app.delete('/api/users/:id', async (req, res) => {
    try {
        await connectDB(); // ★ DB 연결 필수
        const targetUser = await User.findById(req.params.id);
        if (!targetUser) return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });

        await Deck.deleteMany({ writer: targetUser.nickname });
        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: '회원이 탈퇴처리 되었습니다.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '탈퇴 처리 실패' });
    }
});

// 16. 댓글 삭제 API
app.delete('/api/decks/:id/comments/:commentId', async (req, res) => {
    try {
        await connectDB(); // ★ DB 연결 필수
        const { id, commentId } = req.params;
        const { userNickname } = req.body;

        const deck = await Deck.findById(id);
        if (!deck) return res.status(404).json({ message: '덱 없음' });

        const comment = deck.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: '댓글 없음' });

        const user = await User.findOne({ nickname: userNickname });
        const isAdmin = user && user.isAdmin;

        if (comment.writer !== userNickname && !isAdmin) {
            return res.status(403).json({ message: '권한이 없습니다.' });
        }

        deck.comments.pull(commentId);
        await deck.save();
        res.status(200).json(deck.comments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 17. 답글 삭제 API
app.delete('/api/decks/:id/comments/:commentId/replies/:replyId', async (req, res) => {
    try {
        await connectDB(); // ★ DB 연결 필수
        const { id, commentId, replyId } = req.params;
        const { userNickname } = req.body;

        const deck = await Deck.findById(id);
        if (!deck) return res.status(404).json({ message: '덱 없음' });

        const comment = deck.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: '댓글 없음' });

        const reply = comment.replies.id(replyId);
        if (!reply) return res.status(404).json({ message: '답글 없음' });

        const user = await User.findOne({ nickname: userNickname });
        const isAdmin = user && user.isAdmin;

        if (reply.writer !== userNickname && !isAdmin) {
            return res.status(403).json({ message: '권한이 없습니다.' });
        }

        reply.deleteOne(); 
        await deck.save();
        res.status(200).json(deck.comments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 서버 시작
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 서버가 ${PORT}번 포트에서 실행 중입니다: http://localhost:${PORT}`);
    });
}

module.exports = app;