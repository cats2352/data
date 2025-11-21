const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Application = require('../models/Application');
const { authenticateToken } = require('../middleware/auth');

// 1. 이벤트 참여 (기존 동일)
router.post('/apply', authenticateToken, async (req, res) => {
    try {
        const { eventId, eventTitle } = req.body;
        const userId = req.user.id;
        
        const event = await Event.findById(eventId);
        let app = await Application.findOne({ eventId, userId });
        const now = new Date();

        if (app) {
            if (event.lottoConfig && event.lottoConfig.frequency === 'daily') {
                const lastDate = new Date(app.lastAppliedAt).toDateString();
                const today = now.toDateString();
                if (lastDate === today) {
                    return res.status(400).json({ message: '오늘은 이미 참여했습니다. 내일 다시 오세요!' });
                }
            } else {
                return res.status(400).json({ message: '이미 참여한 이벤트입니다.' });
            }
        }

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

// 2. 내 신청 내역 조회 (★ 수정됨: 이벤트 타입 및 기간 정보 추가)
router.get('/my-apps', authenticateToken, async (req, res) => {
    try {
        const myApps = await Application.find({ userId: req.user.id });
        const activeApps = [];

        for (const app of myApps) {
            const event = await Event.findById(app.eventId);
            if (!event) {
                await Application.findByIdAndDelete(app._id);
            } else {
                const appData = app.toObject(); 
                // ★ 핵심: 이벤트의 타입과 시간 정보를 같이 보냄
                appData.eventEndDate = event.endDate; 
                appData.eventType = event.eventType;
                appData.calcStartDate = event.calcStartDate;
                appData.calcEndDate = event.calcEndDate;
                
                activeApps.push(appData);
            }
        }
        
        activeApps.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
        res.json(activeApps);
    } catch (err) {
        res.status(500).json({ message: '내역 조회 오류' });
    }
});

// 3. 당첨 결과 확인 (기존 동일)
router.post('/lotto/draw', authenticateToken, async (req, res) => {
    try {
        const { eventId } = req.body;
        const app = await Application.findOne({ eventId, userId: req.user.id });
        const event = await Event.findById(eventId);

        if (!app || !event) return res.status(400).json({ message: '정보 없음' });
        if (app.drawResults.length > 0) return res.json({ results: app.drawResults, message: '이미 확인했습니다.' });

        const results = [];
        const winRates = event.lottoConfig.winRates;

        for (let i = 0; i < app.ticketCount; i++) {
            const rand = Math.random() * 100;
            let cumulative = 0;
            let pickedItem = null;
            let pickedName = '꽝';

            for (const item of winRates) {
                cumulative += item.rate;
                if (rand <= cumulative) {
                    pickedItem = item;
                    break;
                }
            }

            if (pickedItem && pickedItem.name !== '꽝') {
                if (pickedItem.maxCount > 0 && pickedItem.currentCount >= pickedItem.maxCount) {
                    pickedName = '꽝'; 
                } else {
                    pickedName = pickedItem.name;
                    pickedItem.currentCount += 1; 
                }
            } else {
                pickedName = '꽝';
            }
            results.push(pickedName);
        }

        event.markModified('lottoConfig.winRates');
        await event.save();

        app.drawResults = results;
        await app.save();
        
        res.json({ results, message: '결과 확인 완료!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '추첨 중 오류 발생' });
    }
});

module.exports = router;