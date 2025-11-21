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

// 7. 수동 당첨자 저장 (관리자) - 일괄 처리용 (기존 로직 유지)
router.post('/:id/winners', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const { winners } = req.body; // [{ userId, nickname, reward }, ...]
        const eventId = req.params.id;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: '이벤트 없음' });

        // 1. 이벤트 모델에 당첨자 목록 저장 (화면 표시용)
        event.manualWinners = winners;
        await event.save();

        // 2. 기존 당첨 내역 초기화
        await Application.updateMany({ eventId: eventId }, { $set: { drawResults: [] } });

        // 3. 새로운 당첨자들에게 당첨 내역 기록
        for (const w of winners) {
            let app = await Application.findOne({ eventId: eventId, userId: w.userId });

            if (!app) {
                app = new Application({
                    eventId: eventId,
                    eventTitle: event.title,
                    userId: w.userId,
                    userName: w.nickname,
                    ticketCount: 0,
                    appliedAt: new Date()
                });
            }

            app.drawResults = [w.reward];
            await app.save();
        }

        res.json({ message: '당첨자가 확정되었습니다.', manualWinners: event.manualWinners });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '저장 실패' });
    }
});

// ★ [NEW] 단일 당첨자 추가 (랭킹 리스트에서 개별 지급용)
router.post('/:id/winner/add', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const { userId, nickname, reward } = req.body;
        const eventId = req.params.id;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: '이벤트 없음' });

        // 1. 이미 당첨된 유저인지 확인 (중복 지급 방지)
        const alreadyWinner = event.manualWinners.find(w => w.userId === userId);
        if (alreadyWinner) {
            return res.status(400).json({ message: '이미 상품이 지급된 유저입니다.' });
        }

        // 2. 이벤트 모델에 당첨자 추가
        event.manualWinners.push({
            userId,
            nickname,
            content: '랭킹 당첨',
            reward
        });
        await event.save();

        // 3. 해당 유저의 Application(참여 내역)에 당첨 정보 업데이트
        let app = await Application.findOne({ eventId: eventId, userId: userId });
        
        // 만약 참여 내역이 없다면 생성 (예외 처리)
        if (!app) {
            app = new Application({
                eventId,
                eventTitle: event.title,
                userId,
                userName: nickname,
                ticketCount: 0,
                appliedAt: new Date()
            });
        }

        // 당첨 결과 기록 (기존 내역 유지하면서 추가하거나, 덮어쓰기)
        app.drawResults = [reward]; 
        await app.save();

        res.json({ message: `${nickname}님에게 [${reward}] 지급 완료!` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '저장 실패' });
    }
});

module.exports = router;