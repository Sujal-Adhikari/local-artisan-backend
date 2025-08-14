import crypto from 'crypto';
import { z } from 'zod';
import { sendMail } from '../utils/mailer.js';

// In-memory stores (DEV ONLY!). Replace with DB/Redis later.
const otpStore = new Map();         // email -> { code, expiresAt, attempts }
const resetTokenStore = new Map();  // email -> { token, expiresAt }

const EmailDto = z.object({ email: z.string().email() });
const VerifyDto = z.object({ email: z.string().email(), code: z.string().length(6) });
const SetPasswordDto = z.object({
  email: z.string().email(),
  resetToken: z.string().min(10),
  newPassword: z.string().min(6)
});

// helper
const generateOTP = (len = 6) => crypto.randomInt(0, 10 ** len).toString().padStart(len, '0');

// POST /auth/request-reset
export async function requestReset(req, res) {
  const parsed = EmailDto.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid email' });
  const { email } = parsed.data;

  const code = generateOTP(6);
  const expiresAt = Date.now() + 5 * 60 * 1000;
  otpStore.set(email, { code, expiresAt, attempts: 0 });

  console.log(`[OTP] ${email} -> ${code} (expires in 5m)`);

  // Send email (don’t fail the response if mailer has a hiccup)
  try {
    await sendMail(email, 'Your Craftoria reset code',
      `<p>Use this code to reset your password:</p>
       <p style="font-size:24px;letter-spacing:4px"><b>${code}</b></p>
       <p>This code expires in 5 minutes.</p>`
    );
  } catch (err) {
    console.error('Email error:', err.message);
  }

  // Always ok to avoid email enumeration
  return res.json({ ok: true });
}

// POST /auth/verify-otp
export function verifyOtp(req, res) {
  const parsed = VerifyDto.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });

  const { email, code } = parsed.data;
  const entry = otpStore.get(email);
  if (!entry) return res.status(400).json({ message: 'Invalid or expired code' });

  entry.attempts = (entry.attempts || 0) + 1;
  if (entry.attempts > 5) {
    otpStore.delete(email);
    return res.status(429).json({ message: 'Too many attempts; request a new code' });
  }
  if (Date.now() > entry.expiresAt || entry.code !== code) {
    return res.status(400).json({ message: 'Invalid or expired code' });
  }

  // success → issue short-lived reset token
  const token = crypto.randomBytes(24).toString('hex');
  resetTokenStore.set(email, { token, expiresAt: Date.now() + 10 * 60 * 1000 });
  otpStore.delete(email);

  return res.json({ ok: true, resetToken: token });
}

// POST /auth/set-password
export function setPassword(req, res) {
  const parsed = SetPasswordDto.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });

  const { email, resetToken, newPassword } = parsed.data;
  const entry = resetTokenStore.get(email);
  if (!entry || entry.token !== resetToken || Date.now() > entry.expiresAt) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }

  // TODO: hash and save new password to your DB (bcrypt/argon2). For demo:
  console.log(`[PASSWORD RESET] ${email} -> ${newPassword} (hash in real app)`);
  resetTokenStore.delete(email);

  return res.json({ ok: true });
}

