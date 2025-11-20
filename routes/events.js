const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Application = require('../models/Application');
const { authenticateToken, checkAdmin } = require('../middleware/auth');

// 1. 이벤트 목록 조회
router.get('/', async (req, res) => {
    try {
        const events = await Event.find().sort({ createdAt: -1 });
        res.json(events);
    } catch (err) {
        res.status(500).json({ message: '서버 오류' });
    }
});

// 2. 이벤트 상세 조회
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
        res.json(event);
    } catch (err) {
        res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
    }
});

// 3. 참여자 목록 조회
router.get('/:id/participants', async (req, res) => {
    try {
        const participants = await Application.find({ eventId: req.params.id }).sort({ appliedAt: 1 });
        res.json(participants);
    } catch (err) {
        res.status(500).json({ message: '조회 실패' });
    }
});

// 4. 이벤트 생성 (관리자)
router.post('/', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const newEvent = new Event({ ...req.body, author: req.user.nickname });
        await newEvent.save();
        res.json({ message: '이벤트 생성 완료' });
    } catch (err) {
        res.status(500).json({ message: '생성 실패' });
    }
});

// ★ [복구됨] 5. 이벤트 수정 (관리자)
router.put('/:id', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const eventId = req.params.id;
        const updates = req.body;

        // 데이터 업데이트 (new: true는 업데이트된 최신 데이터를 반환하라는 옵션)
        const updatedEvent = await Event.findByIdAndUpdate(eventId, updates, { new: true });

        if (!updatedEvent) {
            return res.status(404).json({ message: '수정할 이벤트를 찾을 수 없습니다.' });
        }

        res.json({ message: '이벤트가 수정되었습니다.', event: updatedEvent });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '수정 중 오류 발생' });
    }
});

// 6. 이벤트 삭제 (관리자)
router.delete('/:id', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const evt = await Event.findByIdAndDelete(req.params.id);
        if (!evt) return res.status(404).json({ message: '이미 삭제된 이벤트입니다.' });
        
        try { await Application.deleteMany({ eventId: req.params.id }); } 
        catch (e) { console.log('신청내역 정리 중 경고:', e.message); }
        
        res.json({ message: '삭제되었습니다.' });
    } catch (e) {
        res.status(500).json({ message: '삭제 실패' });
    }
});

// 7. 수동 당첨자 저장 (관리자)
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