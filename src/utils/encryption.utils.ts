import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Encrypt plain text using AES-256-GCM
 */
export function encryptData(plaintext: string, tenantKey?: string): string {
  if (!plaintext) return plaintext;

  const key = Buffer.from(tenantKey || process.env.MASTER_ENCRYPTION_KEY!, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts ciphertext using AES-256-GCM
 */
export function decryptData(ciphertext: string, tenantKey?: string): string {
  if (!ciphertext) return ciphertext;

  const key = Buffer.from(tenantKey || process.env.MASTER_ENCRYPTION_KEY!, 'hex');

  const parts = ciphertext.split(':');

  try {
    if (parts.length !== 3) {
      return ciphertext;
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const result = decrypted.toString('utf8');

    return result;
  } catch (err) {
    return ciphertext;
  }
}

export function getTenantEncryptionKey(tenantId: string): string {
  const masterKey = Buffer.from(process.env.MASTER_ENCRYPTION_KEY!, 'hex');
  return crypto.createHmac('sha256', masterKey).update(tenantId).digest('hex');
}