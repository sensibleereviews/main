import { createHmac, randomBytes } from "crypto";

// RFC 6238 TOTP Implementation (HMAC-SHA1, 30s step, 6 digits)
// Pure Node.js crypto implementation — zero external dependencies

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateBase32Secret(byteLength = 20): string {
  const bytes = randomBytes(byteLength);
  let bits = "";
  for (let i = 0; i < bytes.length; i++) {
    bits += bytes[i].toString(2).padStart(8, "0");
  }
  let secret = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5);
    if (chunk.length < 5) break;
    secret += BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  return secret;
}

function base32ToBuffer(base32: string): Buffer {
  const clean = base32.replace(/=+$/, "").toUpperCase();
  let bits = "";
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    const chunk = bits.slice(i, i + 8);
    if (chunk.length === 8) bytes.push(parseInt(chunk, 2));
  }
  return Buffer.from(bytes);
}

export function computeTotp(secret: string, counter: number): string {
  const key = base32ToBuffer(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));

  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = (binary % 1_000_000).toString().padStart(6, "0");
  return otp;
}

export function verifyTotp(token: string, secret: string, window = 1): boolean {
  if (!token || !secret) return false;
  const cleanToken = token.trim().replace(/\s/g, "");
  if (cleanToken.length !== 6) return false;

  const currentCounter = Math.floor(Date.now() / 30_000);

  for (let i = -window; i <= window; i++) {
    const expected = computeTotp(secret, currentCounter + i);
    if (expected === cleanToken) return true;
  }
  return false;
}

export function generateOtpAuthUrl(email: string, secret: string, issuer = "Sensiblee"): string {
  const cleanEmail = encodeURIComponent(email);
  const cleanIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${cleanIssuer}:${cleanEmail}?secret=${secret}&issuer=${cleanIssuer}&algorithm=SHA1&digits=6&period=30`;
}
