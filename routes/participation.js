const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Application = require('../models/Application');
const { authenticateToken } = require('../middleware/auth');

// 1. 이벤트 참여 (티켓 지급 포함)
router.post('/apply', authenticateToken, async (req, res) => {
    try {
        const { eventId, eventTitle } = req.body;
        const userId = req.user.id;
        
        const event = await Event.findById(eventId);
        let app = await Application.findOne({ eventId, userId });
        const now = new Date();

        // [참여 횟수 제한 체크]
        if (app) {
            if (event.lottoConfig && event.lottoConfig.frequency === 'daily') {
                // 매일 참여: 날짜가 같은지 확인
                const lastDate = new Date(app.lastAppliedAt).toDateString();
                const today = now.toDateString();
                if (lastDate === today) {
                    return res.status(400).json({ message: '오늘은 이미 참여했습니다. 내일 다시 오세요!' });
                }
            } else {
                // 1회 참여
                return res.status(400).json({ message: '이미 참여한 이벤트입니다.' });
            }
        }

        // [티켓 개수 추첨]
        let gotTickets = 0;
        if (event.eventType === 'lotto' && event.lottoConfig) {
            const rates = event.lottoConfig.ticketRates;
            const rand = Math.random() * 100;
            let cumulative = 0;
            for (const item of rates) {
                cumulative += item.rate;
                if (rand <= cumulative) {
                    gotTickets = item.count;
                    break;
                }
            }
        }

        // [DB 저장/업데이트]
        if (app) {
            app.ticketCount += gotTickets;
            app.lastAppliedAt = now;
            await app.save();
        } else {
            app = new Application({
                eventId, 
                eventTitle, 
                userId, 
                userName: req.user.nickname,
                ticketCount: gotTickets, 
                lastAppliedAt: now
            });
            await app.save();
        }

        res.json({ message: `참여 완료!`, tickets: gotTickets });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '참여 처리 중 오류 발생' });
    }
});

// 2. 내 신청 내역 조회 (삭제된 이벤트 자동 정리)
router.get('/my-apps', authenticateToken, async (req, res) => {
    try {
        const myApps = await Application.find({ userId: req.user.id });
        const activeApps = [];

        for (const app of myApps) {
            const event = await Event.findById(app.eventId);
            if (!event) {
                // 이벤트가 삭제되었으면 신청 내역도 삭제
                await Application.findByIdAndDelete(app._id);
            } else {
                activeApps.push(app);
            }
        }
        
        // 최신순 정렬
        activeApps.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
        res.json(activeApps);
    } catch (err) {
        res.status(500).json({ message: '내역 조회 오류' });
    }
});

// 3. 당첨 결과 확인 (가챠 돌리기 & 재고 체크)
router.post('/lotto/draw', authenticateToken, async (req, res) => {
    try {
        const { eventId } = req.body;
        const app = await Application.findOne({ eventId, userId: req.user.id });
        const event = await Event.findById(eventId);

        if (!app || !event) return res.status(400).json({ message: '정보 없음' });
        if (app.drawResults.length > 0) return res.json({ results: app.drawResults, message: '이미 확인했습니다.' });

        const results = [];
        const winRates = event.lottoConfig.winRates;

        // 티켓 수만큼 반복 추첨
        for (let i = 0; i < app.ticketCount; i++) {
            const rand = Math.random() * 100;
            let cumulative = 0;
            let pickedItem = null;
            let pickedName = '꽝';

            // 확률에 따른 선택
            for (const item of winRates) {
                cumulative += item.rate;
                if (rand <= cumulative) {
                    pickedItem = item;
                    break;
                }
            }

            // 재고 확인 (품절이면 꽝)
            if (pickedItem && pickedItem.name !== '꽝') {
                if (pickedItem.maxCount > 0 && pickedItem.currentCount >= pickedItem.maxCount) {
                    pickedName = '꽝'; // 품절
                } else {
                    pickedName = pickedItem.name;
                    pickedItem.currentCount += 1; // 재고 차감
                }
            } else {
                pickedName = '꽝';
            }
            
            results.push(pickedName);
        }

        // 변경된 재고 저장
        event.markModified('lottoConfig.winRates');
        await event.save();

        // 결과 저장
        app.drawResults = results;
        await app.save();
        
        res.json({ results, message: '결과 확인 완료!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '추첨 중 오류 발생' });
    }
});

module.exports = router;