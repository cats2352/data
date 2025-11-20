const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Application = require('../models/Application');
const { authenticateToken, checkAdmin } = require('../middleware/auth');

// 목록 조회
router.get('/', async (req, res) => {
    try {
        const events = await Event.find().sort({ createdAt: -1 });
        res.json(events);
    } catch (err) { res.status(500).json({ message: '오류' }); }
});

// 상세 조회
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        res.json(event);
    } catch (err) { res.status(404).json({ message: '이벤트 없음' }); }
});

// 참여자 목록 조회
router.get('/:id/participants', async (req, res) => {
    try {
        const participants = await Application.find({ eventId: req.params.id }).sort({ appliedAt: 1 });
        res.json(participants);
    } catch (err) { res.status(500).json({ message: '조회 실패' }); }
});

// 생성 (관리자) - ★ 수정됨
router.post('/', authenticateToken, checkAdmin, async (req, res) => {
    try {
        // req.body에 있는 모든 필드(customEventType, calcStart/End 등)가 자동으로 들어감
        const newEvent = new Event({ ...req.body, author: req.user.nickname });
        await newEvent.save();
        res.json({ message: '이벤트 생성 완료' });
    } catch (err) { res.status(500).json({ message: '생성 실패' }); }
});

// 삭제 (관리자)
router.delete('/:id', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const evt = await Event.findByIdAndDelete(req.params.id);
        if(!evt) return res.status(404).json({ message: '없음' });
        try { await Application.deleteMany({ eventId: req.params.id }); } 
        catch (e) { console.log('신청내역 정리 중 경고'); }
        res.json({ message: '삭제됨' });
    } catch(e) { res.status(500).json({ message: '오류' }); }
});

// ★ [NEW] 수동 당첨자 저장 (관리자)
router.post('/:id/winners', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const { winners } = req.body;
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: '이벤트 없음' });

        event.manualWinners = winners;
        await event.save();

        res.json({ message: '당첨자가 저장되었습니다.', manualWinners: event.manualWinners });
    } catch (err) {
        res.status(500).json({ message: '저장 실패' });
    }
});

module.exports = router;