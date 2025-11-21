const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Application = require('../models/Application');
const { authenticateToken } = require('../middleware/auth');

// 1. 이벤트 참여 (로또 추첨 로직을 여기로 이동)
router.post('/apply', authenticateToken, async (req, res) => {
    try {
        const { eventId, eventTitle } = req.body;
        const userId = req.user.id;
        
        const event = await Event.findById(eventId);
        let app = await Application.findOne({ eventId, userId });
        const now = new Date();

        // 이미 참여했는지 체크
        if (app) {
            if (event.lottoConfig && event.lottoConfig.frequency === 'daily') {
                const lastDate = new Date(app.lastAppliedAt).toDateString();
                const today = now.toDateString();
                if (lastDate === today) return res.status(400).json({ message: '오늘은 이미 참여했습니다.' });
            } else {
                return res.status(400).json({ message: '이미 참여한 이벤트입니다.' });
            }
        }

        let storedValue = 0; // 티켓 수 or 숫자
        let preCalculatedResults = []; // ★ 미리 계산된 당첨 결과

        // A. 로또 이벤트
        if (event.eventType === 'lotto' && event.lottoConfig) {
            // 1) 티켓 개수 결정
            const rates = event.lottoConfig.ticketRates;
            const rand = Math.random() * 100;
            let cumulative = 0;
            for (const item of rates) {
                cumulative += item.rate;
                if (rand <= cumulative) {
                    storedValue = item.count;
                    break;
                }
            }

            // 2) ★ [NEW] 당첨 여부 미리 계산 (재고 차감 포함)
            const winRates = event.lottoConfig.winRates;
            
            for (let i = 0; i < storedValue; i++) {
                const randWin = Math.random() * 100;
                let cumWin = 0;
                let pickedItem = null;
                let pickedName = '꽝';

                for (const item of winRates) {
                    cumWin += item.rate;
                    if (randWin <= cumWin) {
                        pickedItem = item;
                        break;
                    }
                }

                if (pickedItem && pickedItem.name !== '꽝') {
                    // 재고 확인
                    if (pickedItem.maxCount > 0 && pickedItem.currentCount >= pickedItem.maxCount) {
                        pickedName = '꽝'; 
                    } else {
                        pickedName = pickedItem.name;
                        pickedItem.currentCount += 1; // ★ 여기서 미리 재고 차감
                    }
                } else {
                    pickedName = '꽝';
                }
                preCalculatedResults.push(pickedName);
            }
            
            // 변경된 재고 저장
            event.markModified('lottoConfig.winRates');
            await event.save();
        } 
        // B. 숫자 뽑기 이벤트
        else if (event.eventType === 'highest_number') {
            storedValue = Math.floor(Math.random() * 99999) + 1;
        }

        if (app) {
            // 매일 참여인 경우 누적
            app.ticketCount += storedValue; 
            // 기존 결과에 새 결과 추가
            if (preCalculatedResults.length > 0) {
                app.hiddenResults = (app.hiddenResults || []).concat(preCalculatedResults);
            }
            app.lastAppliedAt = now;
            await app.save();
        } else {
            app = new Application({
                eventId, 
                eventTitle, 
                userId, 
                userName: req.user.nickname,
                ticketCount: storedValue,
                hiddenResults: preCalculatedResults, // ★ 여기에 저장
                lastAppliedAt: now
            });
            await app.save();
        }

        res.json({ 
            message: `참여 완료!`, 
            tickets: event.eventType === 'lotto' ? storedValue : undefined,
            drawnNumber: event.eventType === 'highest_number' ? storedValue : undefined
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '참여 처리 중 오류 발생' });
    }
});

// 2. 내 신청 내역 조회 (기존 유지)
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

// 3. 당첨 결과 확인 (단순히 숨겨진 결과를 공개로 전환)
router.post('/lotto/draw', authenticateToken, async (req, res) => {
    try {
        const { eventId } = req.body;
        const app = await Application.findOne({ eventId, userId: req.user.id });
        
        if (!app) return res.status(400).json({ message: '정보 없음' });
        if (app.drawResults.length > 0 && (!app.hiddenResults || app.hiddenResults.length === 0)) {
            return res.json({ results: app.drawResults, message: '이미 확인했습니다.' });
        }

        // ★ 저장된 hiddenResults를 drawResults로 이동
        // (만약 예전 데이터라 hiddenResults가 없다면 여기서 계산하는 로직을 둘 수도 있지만, 
        //  깔끔하게 새 로직만 적용합니다. 기존 데이터는 '꽝' 처리되거나 할 수 있음)
        let results = app.hiddenResults || [];
        
        // 만약 hiddenResults가 비어있는데 티켓은 있다면? (예외 상황: 꽝으로 채움)
        if (results.length < app.ticketCount) {
            const diff = app.ticketCount - results.length;
            for(let i=0; i<diff; i++) results.push('꽝');
        }

        app.drawResults = results;
        // app.hiddenResults = []; // 필요하다면 비워도 됨 (여기선 기록용으로 둠)
        
        await app.save();
        
        res.json({ results, message: '결과 확인 완료!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '오류 발생' });
    }
});

module.exports = router;