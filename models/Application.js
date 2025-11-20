const mongoose = require('mongoose');

const AppSchema = new mongoose.Schema({
    eventId: String, 
    eventTitle: String, 
    userId: String,
    userName: String,
    ticketCount: { type: Number, default: 0 },
    drawResults: [String],
    lastAppliedAt: { type: Date, default: Date.now },
    appliedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Application', AppSchema);