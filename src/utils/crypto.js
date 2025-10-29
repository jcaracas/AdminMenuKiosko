// src/utils/crypto.js
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const ALGO = "aes-256-gcm";
const KEY = crypto.createHash("sha256").update(process.env.CRYPTO_KEY || "fallback").digest();

export function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv, { authTagLength: 16 });
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decrypt(payload) {
  const data = Buffer.from(payload, "base64");
  const iv = data.slice(0, 12);
  const tag = data.slice(12, 28);
  const enc = data.slice(28);
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv, { authTagLength: 16 });
  decipher.setAuthTag(tag);
  const res = Buffer.concat([decipher.update(enc), decipher.final()]);
  return res.toString("utf8");
}
