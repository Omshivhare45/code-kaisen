// server/models/pendingReport.model.js
//
// WhatsApp delivers the photo and the location as two separate messages.
// This collection holds whichever one arrives first, keyed by phone number,
// until the other one shows up. Auto-expires after 30 minutes so an
// abandoned half-submission doesn't linger forever.

const mongoose = require('mongoose');

const pendingReportSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  photoUrl: { type: String },
  description: { type: String },
  coordinates: { type: [Number] }, // [longitude, latitude]
  address: { type: String },
  aiClassification: { type: mongoose.Schema.Types.Mixed }, // result from classifyIssue()
  createdAt: { type: Date, default: Date.now, expires: 1800 }, // TTL: 30 min
});

module.exports = mongoose.model('PendingReport', pendingReportSchema);