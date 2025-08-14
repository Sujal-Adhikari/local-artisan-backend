const mongoose = require("mongoose");

const otpTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  code: { type: String, required: true },              // e.g. "123456"
  purpose: { type: String, enum: ["verify", "reset"], required: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model("OtpToken", otpTokenSchema);
