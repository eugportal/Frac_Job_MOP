import nodemailer from 'nodemailer';
import { config } from './config.js';

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_SECURE,
  auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD },
  requireTLS:true,
  tls: { rejectUnauthorized: false }, // Allow self-signed certificates
  logger: true, // Enable logging for debugging
  debug: true, // Enable debug output for detailed information
});

export async function sendOtpEmail(email: string, otp: string) {
  try{
    await transporter.sendMail({
    from: config.SMTP_FROM,
    to: email,
    subject: 'Your Frac Data Management verification code',
    text: `Your verification code is ${otp}. It expires in 10 minutes. Do not share this code.`,
  });
  }
  finally{
    transporter.close();
  }
}
