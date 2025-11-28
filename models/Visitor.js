const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
    totalVisitors: { type: Number, default: 0 }, // 총 방문자
    todayVisitors: { type: Number, default: 0 }, // 오늘 방문자
    lastDate: { type: String, default: '' }      // 날짜 체크용 (YYYY-MM-DD)
});

module.exports = mongoose.model('Visitor', visitorSchema);