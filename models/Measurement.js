const mongoose = require('mongoose');

const measurementSchema = new mongoose.Schema({
  name: String,
  provider: String,
  status: Boolean,
  ms: Number,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Measurement', measurementSchema);
