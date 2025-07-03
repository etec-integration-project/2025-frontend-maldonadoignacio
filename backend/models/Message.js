const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    fromUserId: { type: String, required: true },
    toUserId: { type: String, required: false },
    text: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    reactions: { type: [{ userId: String, emoji: String }], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
