import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type OtpChallenge = { email: string; username: string; digest: string; expiresAt: number; attempts: number };
const challenges = new Map<string, OtpChallenge>();

const digestOtp = (challengeId: string, otp: string) =>
  createHmac('sha256', config.JWT_SECRET).update(`${challengeId}:${otp}`).digest('hex');

export function createOtpChallenge(user: { username: string; email: string }) {
  const challengeId = randomUUID();
  const otp = String(randomInt(100_000, 1_000_000));
  challenges.set(challengeId, {
    username: user.username,
    email: user.email,
    digest: digestOtp(challengeId, otp),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });
  return { challengeId, otp, expiresInSeconds: OTP_TTL_MS / 1000 };
}

export function verifyOtpChallenge(challengeId: string, otp: string) {
  const challenge = challenges.get(challengeId);
  if (!challenge || challenge.expiresAt < Date.now() || challenge.attempts >= MAX_ATTEMPTS) {
    challenges.delete(challengeId);
    return null;
  }

  challenge.attempts += 1;
  const expected = Buffer.from(challenge.digest, 'hex');
  const supplied = Buffer.from(digestOtp(challengeId, otp), 'hex');
  if (!timingSafeEqual(expected, supplied)) return null;

  challenges.delete(challengeId);
  return { username: challenge.username, email: challenge.email };
}
