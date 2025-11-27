require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const User = require('./models/User'); // 1. User 모델 불러오기
const Deck = require('./models/Deck');

const app = express();

// 기본 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// DB 연결
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB 연결 성공!'))
    .catch(err => console.error('DB 연결 실패:', err));

// --- ★ API 라우트 (회원가입 & 로그인) ---

// 1. 회원가입 API
app.post('/api/register', async (req, res) => {
    try {
        const { nickname, password } = req.body;

        // 닉네임 중복 체크
        const existingUser = await User.findOne({ nickname });
        if (existingUser) {
            return res.status(400).json({ message: '이미 존재하는 닉네임입니다.' });
        }

        // 새 유저 생성 및 저장
        const newUser = new User({ nickname, password });
        await newUser.save();

        res.status(201).json({ message: '회원가입 성공!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 2. 로그인 API (수정)
app.post('/api/login', async (req, res) => {
    try {
        const { nickname, password } = req.body;
        const user = await User.findOne({ nickname });
        if (!user) return res.status(400).json({ message: '존재하지 않는 닉네임입니다.' });
        if (user.password !== password) return res.status(400).json({ message: '비밀번호가 틀렸습니다.' });

        // ★ [수정] isAdmin 정보도 함께 반환
        res.status(200).json({ 
            message: '로그인 성공!', 
            nickname: user.nickname,
            isAdmin: user.isAdmin // 추가됨
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

/* ... 기존 로그인/회원가입 API ... */

// 3. 덱 저장 API
app.post('/api/decks', async (req, res) => {
    try {
        // ★ rounds 추가
        const { title, description, writer, mainContent, subContent, characters, rounds } = req.body;

        const newDeck = new Deck({
            title, description, writer, mainContent, subContent, characters,
            rounds: rounds || [] // 없으면 빈 배열
        });

        await newDeck.save();
        res.status(201).json({ message: '덱이 성공적으로 저장되었습니다!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '덱 저장 중 오류가 발생했습니다.' });
    }
});

// 4. 덱 목록 불러오기 API (정렬 + 검색 필터링)
app.get('/api/decks', async (req, res) => {
    try {
        const { sort, title, writer, mainContent, subContent, startDate, endDate } = req.query;
        
        // 1. 검색 조건(Filter) 구성
        let query = {};

        // 제목 검색 (부분 일치, 대소문자 무시)
        if (title) {
            query.title = { $regex: title, $options: 'i' };
        }

        // 작성자 검색 (부분 일치)
        if (writer) {
            query.writer = { $regex: writer, $options: 'i' };
        }

        // 컨텐츠 종류 (정확 일치)
        if (mainContent) {
            query.mainContent = mainContent;
        }

        // 세부 컨텐츠 (정확 일치)
        if (subContent) {
            query.subContent = subContent;
        }

        // 기간 검색
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                // 시작일 00:00:00 부터
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                // 종료일 23:59:59 까지
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        // 2. 정렬(Sort) 옵션
        let sortOption = { createdAt: -1 }; // 기본값: 최신순
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

/* ... 기존 코드 아래에 추가 ... */

// 5. 덱 삭제 API (수정)
app.delete('/api/decks/:id', async (req, res) => {
    try {
        const deckId = req.params.id;
        const { userNickname } = req.body; 

        const deck = await Deck.findById(deckId);
        if (!deck) return res.status(404).json({ message: '덱을 찾을 수 없습니다.' });

        // ★ [수정] 요청한 유저 정보 조회 (관리자 여부 확인)
        const user = await User.findOne({ nickname: userNickname });
        const isAdmin = user && user.isAdmin;

        // 작성자 본인이거나 관리자(Admin)라면 삭제 허용
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
        const deckId = req.params.id;
        const { userNickname } = req.body;

        const deck = await Deck.findById(deckId);
        if (!deck) return res.status(404).json({ message: '덱을 찾을 수 없습니다.' });

        // 이미 좋아요를 눌렀는지 확인
        const index = deck.likedBy.indexOf(userNickname);

        if (index === -1) {
            // 안 눌렀으면 -> 추가 (좋아요 +1)
            deck.likedBy.push(userNickname);
            deck.likes += 1;
        } else {
            // 이미 눌렀으면 -> 제거 (좋아요 취소 -1)
            deck.likedBy.splice(index, 1);
            deck.likes -= 1;
        }

        await deck.save();
        // 변경된 좋아요 수와 내가 눌렀는지 여부를 반환
        res.status(200).json({ likes: deck.likes, liked: index === -1 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

/* ... 기존 코드 아래에 추가 ... */

// 7. 특정 덱 조회 API (상세보기용)
app.get('/api/decks/:id', async (req, res) => {
    try {
        const deck = await Deck.findById(req.params.id);
        if (!deck) return res.status(404).json({ message: '덱을 찾을 수 없습니다.' });
        res.status(200).json(deck);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

/* ... 기존 코드 아래에 추가 ... */

// 8. 덱 수정 API
app.put('/api/decks/:id', async (req, res) => {
    try {
        const deckId = req.params.id;
        // ★ rounds 추가
        const { writer, title, description, characters, rounds } = req.body;

        const deck = await Deck.findById(deckId);
        if (!deck) return res.status(404).json({ message: '덱을 찾을 수 없습니다.' });

        if (deck.writer !== writer) {
            return res.status(403).json({ message: '수정 권한이 없습니다.' });
        }

        deck.title = title;
        deck.description = description;
        deck.characters = characters;
        deck.rounds = rounds || []; // 업데이트

        await deck.save();
        res.status(200).json({ message: '수정되었습니다!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

/* ... 기존 API들 아래에 추가 ... */

// 9. 댓글 작성 API
app.post('/api/decks/:id/comments', async (req, res) => {
    try {
        const { writer, content } = req.body;
        const deck = await Deck.findById(req.params.id);
        if (!deck) return res.status(404).json({ message: '덱을 찾을 수 없습니다.' });

        deck.comments.push({ writer, content });
        await deck.save();
        res.status(201).json(deck.comments); // 갱신된 댓글 리스트 반환
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 10. 답글(대댓글) 작성 API
app.post('/api/decks/:id/comments/:commentId/replies', async (req, res) => {
    try {
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

/* ... 기존 코드 ... */

// 13. 사용자 목록 조회 API (통계 포함)
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find().select('-password'); // 비밀번호 제외하고 조회
        const decks = await Deck.find(); // 통계 계산을 위해 모든 덱 조회

        // 각 유저별 통계 계산
        const userList = users.map(user => {
            const userDecks = decks.filter(d => d.writer === user.nickname);
            
            // 1. 덱 작성 횟수
            const deckCount = userDecks.length;
            
            // 2. 받은 총 좋아요 수
            const totalLikes = userDecks.reduce((sum, d) => sum + d.likes, 0);
            
            // 3. 작성한 댓글 수 (모든 덱을 뒤져서 카운트)
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
        const { newNickname } = req.body;
        const targetUser = await User.findById(req.params.id);
        
        if (!targetUser) return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });

        const oldNickname = targetUser.nickname;
        
        // 1. 유저 정보 수정
        targetUser.nickname = newNickname;
        await targetUser.save();

        // 2. 작성한 덱의 작성자 이름도 모두 변경 (동기화)
        await Deck.updateMany({ writer: oldNickname }, { writer: newNickname });

        // (참고: 댓글 작성자 이름은 데이터 구조상 일괄 변경이 복잡하여 생략하거나 추후 고도화 필요)

        res.status(200).json({ message: '닉네임이 변경되었습니다.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '닉네임 변경 실패 (중복일 수 있음)' });
    }
});

// 15. [관리자] 유저 강제 탈퇴 API
app.delete('/api/users/:id', async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id);
        if (!targetUser) return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });

        // 1. 유저가 작성한 덱 모두 삭제
        await Deck.deleteMany({ writer: targetUser.nickname });

        // 2. 유저 삭제
        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: '회원이 탈퇴처리 되었습니다.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '탈퇴 처리 실패' });
    }
});

// ★ [신규] 16. 댓글 삭제 API
app.delete('/api/decks/:id/comments/:commentId', async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const { userNickname } = req.body; // 요청자

        const deck = await Deck.findById(id);
        if (!deck) return res.status(404).json({ message: '덱 없음' });

        const comment = deck.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: '댓글 없음' });

        // 권한 확인
        const user = await User.findOne({ nickname: userNickname });
        const isAdmin = user && user.isAdmin;

        if (comment.writer !== userNickname && !isAdmin) {
            return res.status(403).json({ message: '권한이 없습니다.' });
        }

        // 댓글 삭제 (Mongoose 배열 메서드 pull 사용)
        deck.comments.pull(commentId);
        await deck.save();
        res.status(200).json(deck.comments); // 갱신된 목록 반환
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// ★ [신규] 17. 답글(대댓글) 삭제 API
app.delete('/api/decks/:id/comments/:commentId/replies/:replyId', async (req, res) => {
    try {
        const { id, commentId, replyId } = req.params;
        const { userNickname } = req.body;

        const deck = await Deck.findById(id);
        if (!deck) return res.status(404).json({ message: '덱 없음' });

        const comment = deck.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: '댓글 없음' });

        const reply = comment.replies.id(replyId);
        if (!reply) return res.status(404).json({ message: '답글 없음' });

        // 권한 확인
        const user = await User.findOne({ nickname: userNickname });
        const isAdmin = user && user.isAdmin;

        if (reply.writer !== userNickname && !isAdmin) {
            return res.status(403).json({ message: '권한이 없습니다.' });
        }

        // 답글 삭제
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