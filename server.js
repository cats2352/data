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
    .then(() => console.log('✅ DB Connected!'))
    .catch(err => console.error(err));

// 라우터 연결
app.use('/api', require('./routes/auth'));           
app.use('/api/events', require('./routes/events'));  
app.use('/api/admin', require('./routes/admin'));    
app.use('/api', require('./routes/participation'));  
app.use('/api/comments', require('./routes/comments')); 

// 서버 시작
// 클라우드(Render)가 주는 포트를 쓰거나, 없으면 5000번을 씀
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
});