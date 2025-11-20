const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { MONGO_URI } = require('./config/key'); // config 폴더 사용

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// DB 연결
mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅ DB Connected!');

        // ★ [긴급 조치] 기존 username 인덱스 삭제 로직
        // username 필드가 없어졌는데 유니크 인덱스가 남아있으면 에러(500)가 발생하므로 삭제합니다.
        try {
            const collection = mongoose.connection.collection('users');
            const indexes = await collection.indexes();
            
            // username 관련 인덱스가 있는지 확인
            const usernameIndex = indexes.find(idx => idx.key && idx.key.username);
            
            if (usernameIndex) {
                await collection.dropIndex(usernameIndex.name);
                console.log('🗑️ [시스템] 기존 username 중복방지 인덱스를 삭제했습니다. (이제 에러가 해결됩니다)');
            }
        } catch (err) {
            // 인덱스가 이미 없거나 다른 문제면 로그만 찍고 넘어감
            console.log('ℹ️ 인덱스 체크 패스:', err.message);
        }
    })
    .catch(err => console.error(err));

// 라우터 연결
app.use('/api', require('./routes/auth'));           
app.use('/api/events', require('./routes/events'));  
app.use('/api/admin', require('./routes/admin'));    
app.use('/api', require('./routes/participation'));  
app.use('/api/comments', require('./routes/comments')); 

// 서버 시작
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
});