import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export function createPrivacyVault(keyHex) {
  if (!/^[a-fA-F0-9]{64}$/.test(keyHex ?? '')) throw new Error('Clave de privacidad inválida.');
  const key = Buffer.from(keyHex, 'hex');
  return {
    seal(value, context) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(context));
      const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
      return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), body: body.toString('base64') });
    },
    open(envelope, context) {
      const value = JSON.parse(envelope);
      if (value.v !== 1) throw new Error('Versión de cifrado no válida.');
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(value.iv, 'base64'));
      decipher.setAAD(Buffer.from(context));
      decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
      return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.body, 'base64')), decipher.final()]).toString('utf8'));
    },
  };
}
