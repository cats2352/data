require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const User = require('./models/User'); 
const Deck = require('./models/Deck');
const Visitor = require('./models/Visitor'); // 방문자 모델
const Team = require('./models/Team');       // 팀 모델
const compression = require('compression'); 

const app = express();

// ★ [추가] 응답 데이터 압축 (가장 위쪽에 배치하는 것이 좋습니다)
app.use(compression()); 

// 기본 설정
app.use(cors());
app.use(express.json());

// 정적 파일 캐싱 설정 (1일)
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: 86400000 
}));

// -----------------------------------------------------
// Vercel용 DB 연결 함수
// -----------------------------------------------------
let cachedDb = null;

async function connectDB() {
    if (cachedDb && mongoose.connection.readyState === 1) {
        return cachedDb;
    }
    try {
        mongoose.set('strictQuery', false);
        cachedDb = await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected');
        return cachedDb;
    } catch (err) {
        console.error('❌ DB Connection Error:', err);
        throw err;
    }
}

// -----------------------------------------------------
// API 라우트
// -----------------------------------------------------

// --- 1. 방문자 수 카운트 API (1일 1회 제한) ---
app.get('/api/visitors', async (req, res) => {
    try {
        await connectDB();
        
        // 한국 시간(KST) 기준 날짜 구하기
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstDate = new Date(utc + kstOffset);
        const todayStr = kstDate.toISOString().split('T')[0]; // YYYY-MM-DD

        let stats = await Visitor.findOne();
        if (!stats) {
            stats = new Visitor({ totalVisitors: 0, todayVisitors: 0, lastDate: todayStr });
        }

        if (stats.lastDate !== todayStr) {
            stats.todayVisitors = 0; 
            stats.lastDate = todayStr;
        }

        // 'view' 모드가 아닐 때만 카운트 증가
        if (req.query.mode !== 'view') {
            stats.todayVisitors += 1;
            stats.totalVisitors += 1;
            await stats.save();
        }

        res.status(200).json({ total: stats.totalVisitors, today: stats.todayVisitors });
    } catch (error) {
        console.error('Visitor Count Error:', error);
        res.status(200).json({ total: 0, today: 0 });
    }
});

// --- 2. 회원가입 & 로그인 ---
app.post('/api/register', async (req, res) => {
    try {
        await connectDB();
        const { nickname, password } = req.body;
        const existingUser = await User.findOne({ nickname });
        if (existingUser) return res.status(400).json({ message: '이미 존재하는 닉네임입니다.' });

        const newUser = new User({ nickname, password });
        await newUser.save();
        res.status(201).json({ message: '회원가입 성공!' });
    } catch (error) { res.status(500).json({ message: '서버 오류' }); }
});

app.post('/api/login', async (req, res) => {
    try {
        await connectDB();
        const { nickname, password } = req.body;
        const user = await User.findOne({ nickname });
        if (!user) return res.status(400).json({ message: '존재하지 않는 닉네임입니다.' });
        if (user.password !== password) return res.status(400).json({ message: '비밀번호가 틀렸습니다.' });

        res.status(200).json({ message: '로그인 성공!', nickname: user.nickname, isAdmin: user.isAdmin });
    } catch (error) { res.status(500).json({ message: '서버 오류' }); }
});

// --- 3. 덱(Deck) 관련 API ---
app.post('/api/decks', async (req, res) => {
    try {
        await connectDB();
        const { title, description, writer, mainContent, subContent, characters, rounds } = req.body;
        const newDeck = new Deck({ title, description, writer, mainContent, subContent, characters, rounds: rounds || [] });
        await newDeck.save();
        res.status(201).json({ message: '저장 완료' });
    } catch (error) { res.status(500).json({ message: '오류 발생' }); }
});

app.get('/api/decks', async (req, res) => {
    try {
        await connectDB();
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
        if (sort === 'popular') sortOption = { likes: -1, createdAt: -1 };

        const decks = await Deck.find(query).sort(sortOption);
        res.status(200).json(decks);
    } catch (error) { res.status(500).json({ message: '로딩 실패' }); }
});

app.get('/api/decks/:id', async (req, res) => {
    try {
        await connectDB();
        const deck = await Deck.findById(req.params.id);
        if (!deck) return res.status(404).json({ message: '덱 없음' });
        res.status(200).json(deck);
    } catch (error) { res.status(500).json({ message: '오류' }); }
});

app.delete('/api/decks/:id', async (req, res) => {
    try {
        await connectDB();
        const deckId = req.params.id;
        const { userNickname } = req.body;
        const deck = await Deck.findById(deckId);
        if (!deck) return res.status(404).json({ message: '덱 없음' });

        const user = await User.findOne({ nickname: userNickname });
        const isAdmin = user && user.isAdmin;

        if (deck.writer !== userNickname && !isAdmin) return res.status(403).json({ message: '권한 없음' });

        await Deck.findByIdAndDelete(deckId);
        res.status(200).json({ message: '삭제됨' });
    } catch (error) { res.status(500).json({ message: '오류' }); }
});

app.put('/api/decks/:id', async (req, res) => {
    try {
        await connectDB();
        const { writer, title, description, characters, rounds } = req.body;
        const deck = await Deck.findById(req.params.id);
        if (!deck) return res.status(404).json({ message: '덱 없음' });
        if (deck.writer !== writer) return res.status(403).json({ message: '권한 없음' });

        deck.title = title;
        deck.description = description;
        deck.characters = characters;
        deck.rounds = rounds || [];
        await deck.save();
        res.status(200).json({ message: '수정됨' });
    } catch (error) { res.status(500).json({ message: '오류' }); }
});

app.put('/api/decks/:id/like', async (req, res) => {
    try {
        await connectDB();
        const { userNickname } = req.body;
        const deck = await Deck.findById(req.params.id);
        if (!deck) return res.status(404).json({ message: '덱 없음' });

        const index = deck.likedBy.indexOf(userNickname);
        if (index === -1) { deck.likedBy.push(userNickname); deck.likes += 1; }
        else { deck.likedBy.splice(index, 1); deck.likes -= 1; }

        await deck.save();
        res.status(200).json({ likes: deck.likes, liked: index === -1 });
    } catch (error) { res.status(500).json({ message: '오류' }); }
});

// 덱 댓글 API
app.post('/api/decks/:id/comments', async (req, res) => {
    try {
        await connectDB();
        const { writer, content } = req.body;
        const deck = await Deck.findById(req.params.id);
        if (!deck) return res.status(404).json({ message: '덱 없음' });
        deck.comments.push({ writer, content });
        await deck.save();
        res.status(201).json(deck.comments);
    } catch (error) { res.status(500).json({ message: '오류' }); }
});

app.post('/api/decks/:id/comments/:commentId/replies', async (req, res) => {
    try {
        await connectDB();
        const { writer, content, tag } = req.body;
        const deck = await Deck.findById(req.params.id);
        const comment = deck.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ message: '댓글 없음' });
        comment.replies.push({ writer, content, tag });
        await deck.save();
        res.status(201).json(deck.comments);
    } catch (error) { res.status(500).json({ message: '오류' }); }
});

app.put('/api/decks/:id/comments/:commentId/like', async (req, res) => {
    try {
        await connectDB();
        const { userNickname } = req.body;
        const deck = await Deck.findById(req.params.id);
        const comment = deck.comments.id(req.params.commentId);
        const index = comment.likes.indexOf(userNickname);
        if (index === -1) comment.likes.push(userNickname);
        else comment.likes.splice(index, 1);
        await deck.save();
        res.status(200).json(deck.comments);
    } catch (e) { res.status(500).json({ message: 'Error' }); }
});

app.put('/api/decks/:id/comments/:commentId/replies/:replyId/like', async (req, res) => {
    try {
        await connectDB();
        const { userNickname } = req.body;
        const deck = await Deck.findById(req.params.id);
        const comment = deck.comments.id(req.params.commentId);
        const reply = comment.replies.id(req.params.replyId);
        const index = reply.likes.indexOf(userNickname);
        if (index === -1) reply.likes.push(userNickname);
        else reply.likes.splice(index, 1);
        await deck.save();
        res.status(200).json(deck.comments);
    } catch (e) { res.status(500).json({ message: 'Error' }); }
});

app.delete('/api/decks/:id/comments/:commentId', async (req, res) => {
    try {
        await connectDB();
        const { id, commentId } = req.params;
        const { userNickname } = req.body;
        const deck = await Deck.findById(id);
        const comment = deck.comments.id(commentId);
        const user = await User.findOne({ nickname: userNickname });
        const isAdmin = user && user.isAdmin;

        if (comment.writer !== userNickname && !isAdmin) return res.status(403).json({ message: '권한 없음' });

        deck.comments.pull(commentId);
        await deck.save();
        res.status(200).json(deck.comments);
    } catch (e) { res.status(500).json({ message: 'Error' }); }
});

app.delete('/api/decks/:id/comments/:commentId/replies/:replyId', async (req, res) => {
    try {
        await connectDB();
        const { id, commentId, replyId } = req.params;
        const { userNickname } = req.body;
        const deck = await Deck.findById(id);
        const comment = deck.comments.id(commentId);
        const reply = comment.replies.id(replyId);
        const user = await User.findOne({ nickname: userNickname });
        const isAdmin = user && user.isAdmin;

        if (reply.writer !== userNickname && !isAdmin) return res.status(403).json({ message: '권한 없음' });

        reply.deleteOne();
        await deck.save();
        res.status(200).json(deck.comments);
    } catch (e) { res.status(500).json({ message: 'Error' }); }
});

// --- 4. 사용자 관리 API ---
app.get('/api/users', async (req, res) => {
    try {
        await connectDB();
        const users = await User.find().select('nickname isAdmin createdAt').lean();
        const stats = await Deck.aggregate([
            {
                $project: {
                    writer: 1, likes: 1,
                    commentCount: {
                        $add: [{ $size: "$comments" }, { $reduce: { input: "$comments", initialValue: 0, in: { $add: ["$$value", { $size: { $ifNull: ["$$this.replies", []] } }] } } }]
                    }
                }
            },
            {
                $group: { _id: "$writer", deckCount: { $sum: 1 }, totalLikes: { $sum: "$likes" }, totalComments: { $sum: "$commentCount" } }
            }
        ]);
        const statsMap = {};
        stats.forEach(stat => { statsMap[stat._id] = stat; });

        const userList = users.map(user => {
            const stat = statsMap[user.nickname] || { deckCount: 0, totalLikes: 0, totalComments: 0 };
            return {
                _id: user._id, nickname: user.nickname, isAdmin: user.isAdmin, createdAt: user.createdAt,
                stats: { deckCount: stat.deckCount, totalLikes: stat.totalLikes, commentCount: stat.totalComments }
            };
        });
        res.status(200).json(userList);
    } catch (error) { res.status(500).json({ message: '로딩 실패' }); }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        await connectDB();
        const { newNickname } = req.body;
        const targetUser = await User.findById(req.params.id);
        if (!targetUser) return res.status(404).json({ message: '유저 없음' });

        const oldNickname = targetUser.nickname;
        targetUser.nickname = newNickname;
        await targetUser.save();
        await Deck.updateMany({ writer: oldNickname }, { writer: newNickname });
        res.status(200).json({ message: '변경됨' });
    } catch (e) { res.status(500).json({ message: '실패' }); }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await connectDB();
        const targetUser = await User.findById(req.params.id);
        if (!targetUser) return res.status(404).json({ message: '유저 없음' });
        await Deck.deleteMany({ writer: targetUser.nickname });
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: '추방됨' });
    } catch (e) { res.status(500).json({ message: '실패' }); }
});

// --- 5. 팀(Team) 모집 관련 API ---
app.get('/api/teams', async (req, res) => {
    try {
        await connectDB();
        const teams = await Team.find().sort({ createdAt: -1 });
        res.status(200).json(teams);
    } catch (e) { res.status(500).json({ message: 'Error' }); }
});

app.get('/api/teams/:id', async (req, res) => {
    try {
        await connectDB();
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ message: '팀 없음' });
        res.status(200).json(team);
    } catch (e) { res.status(500).json({ message: 'Error' }); }
});

app.post('/api/teams', async (req, res) => {
    try {
        await connectDB();
        const { teamName, description, writer, captainName, isLogPublic, isCommentAllowed, isRecruiting } = req.body;
        const members = Array(10).fill({ name: "" });
        members[0] = { name: captainName };

        const newTeam = new Team({ teamName, description, writer, members, isLogPublic, isCommentAllowed, isRecruiting });
        await newTeam.save();
        res.status(201).json({ message: '생성됨' });
    } catch (e) { res.status(500).json({ message: '실패' }); }
});

app.put('/api/teams/:id/members', async (req, res) => {
    try {
        await connectDB();
        const { slotIndex, action, newName, adminName } = req.body; 
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ message: '팀 없음' });

        const now = new Date();
        const timeString = `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()}/${now.getHours()}/${now.getMinutes()}`;
        let logMessage = "";
        const oldName = team.members[slotIndex].name;

        if (action === 'CHANGE') {
            team.members[slotIndex].name = newName;
            logMessage = `시간(${timeString}): "${oldName}"님이 "${newName}"님으로 닉네임이 변경되었습니다.`;
        } else if (action === 'IN') {
            team.members[slotIndex].name = newName;
            logMessage = `시간(${timeString}): "${newName}"님이 신규대대원으로 가입하셨습니다. 승인자: ${adminName}`;
        } else if (action === 'OUT') {
            team.members[slotIndex].name = ""; 
            logMessage = `시간(${timeString}): "${oldName}"님이 "${team.teamName}"에서 탈퇴하셨습니다. 승인자: ${adminName}`;
        }

        team.logs.push({ type: action, message: logMessage, adminName, timestamp: now });
        team.updatedAt = now;
        team.markModified('members');
        await team.save();
        res.status(200).json(team);
    } catch (e) { res.status(500).json({ message: '실패' }); }
});

app.put('/api/teams/:id', async (req, res) => {
    try {
        await connectDB();
        const updateData = req.body;
        updateData.updatedAt = Date.now();
        await Team.findByIdAndUpdate(req.params.id, updateData);
        res.status(200).json({ message: '수정됨' });
    } catch (e) { res.status(500).json({ message: 'Error' }); }
});

app.delete('/api/teams/:id', async (req, res) => {
    try {
        await connectDB();
        await Team.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: '삭제됨' });
    } catch (e) { res.status(500).json({ message: 'Error' }); }
});

// ★ [핵심] 누락되었던 팀 댓글 API 추가
app.post('/api/teams/:id/comments', async (req, res) => {
    try {
        await connectDB();
        const { writer, content } = req.body;
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ message: '팀 없음' });

        if (!team.isCommentAllowed) return res.status(403).json({ message: '댓글 작성 비허용' });

        team.comments.push({ writer, content });
        await team.save();
        res.status(201).json(team.comments);
    } catch (e) { res.status(500).json({ message: 'Error' }); }
});

app.delete('/api/teams/:id/comments/:commentId', async (req, res) => {
    try {
        await connectDB();
        const { id, commentId } = req.params;
        const { userNickname } = req.body;
        const team = await Team.findById(id);
        if (!team) return res.status(404).json({ message: '팀 없음' });

        const comment = team.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: '댓글 없음' });

        const user = await User.findOne({ nickname: userNickname });
        const isAdmin = user && user.isAdmin;

        if (comment.writer !== userNickname && !isAdmin) {
            return res.status(403).json({ message: '권한 없음' });
        }

        team.comments.pull(commentId);
        await team.save();
        res.status(200).json(team.comments);
    } catch (e) { res.status(500).json({ message: 'Error' }); }
});

// 서버 실행
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

module.exports = app;