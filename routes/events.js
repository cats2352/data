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

// 5. 이벤트 수정 (관리자)
router.put('/:id', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const eventId = req.params.id;
        const updates = req.body;
        const updatedEvent = await Event.findByIdAndUpdate(eventId, updates, { new: true });
        if (!updatedEvent) return res.status(404).json({ message: '수정할 이벤트를 찾을 수 없습니다.' });
        res.json({ message: '이벤트가 수정되었습니다.', event: updatedEvent });
    } catch (err) {
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

// ★ [수정됨] 7. 수동 당첨자 저장 (관리자) - 참여 내역 자동 생성 로직 추가
router.post('/:id/winners', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const { winners } = req.body; // [{ userId, nickname, reward }, ...]
        const eventId = req.params.id;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: '이벤트 없음' });

        // 1. 이벤트 모델에 당첨자 목록 저장 (화면 표시용)
        event.manualWinners = winners;
        await event.save();

        // 2. 기존 당첨 내역 초기화 (재선정 시 기존 당첨자 취소 처리를 위해)
        // 해당 이벤트의 모든 참여 내역에서 당첨 결과를 비웁니다.
        await Application.updateMany({ eventId: eventId }, { $set: { drawResults: [] } });

        // 3. 새로운 당첨자들에게 당첨 내역 기록 (참여 내역이 없으면 자동 생성)
        for (const w of winners) {
            let app = await Application.findOne({ eventId: eventId, userId: w.userId });

            // ★ 참여 내역이 없다면(댓글만 쓰고 참여 버튼 안 누른 경우) -> 자동 생성
            if (!app) {
                app = new Application({
                    eventId: eventId,
                    eventTitle: event.title,
                    userId: w.userId,
                    userName: w.nickname,
                    ticketCount: 0, // 커스텀 이벤트는 보통 로또 개념 없음
                    appliedAt: new Date()
                });
            }

            // 당첨 결과 기록
            app.drawResults = [w.reward];
            await app.save();
        }

        res.json({ message: '당첨자가 확정되었습니다. (명예의 전당 반영 완료)', manualWinners: event.manualWinners });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '저장 실패' });
    }
});

module.exports = router;