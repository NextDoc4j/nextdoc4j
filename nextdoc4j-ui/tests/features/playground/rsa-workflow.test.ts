import { constants, generateKeyPairSync, privateDecrypt } from 'node:crypto';
import { afterEach, expect, it, vi } from 'vitest';
import {
  computeRsaOaep,
  executePreRequestPipeline,
} from '../../../src/features/playground/pre-post-engine';

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

afterEach(() => vi.unstubAllGlobals());

it.each(['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const)(
  'encrypts a password and writes decryptable RSA-OAEP %s ciphertext into the request',
  async (rsaHash) => {
    const result = await executePreRequestPipeline(
      {
        steps: [
          {
            id: 'encrypt',
            name: '加密密码',
            type: 'transform',
            algorithm: 'rsa-oaep',
            rsaHash,
            rsaPublicKey: pem,
            source: 'request',
            path: '$.password',
            saveAs: 'encryptedPassword',
            enabled: true,
            failurePolicy: 'abort',
          },
          {
            id: 'write',
            name: '写回密码',
            type: 'write',
            source: 'variable',
            path: 'encryptedPassword',
            targetType: 'body',
            targetField: 'password',
            enabled: true,
            failurePolicy: 'abort',
          },
        ],
      },
      {
        body: JSON.stringify({ username: 'user', password: '密码123😀' }),
        headers: [],
        queryParams: [],
        onLog: vi.fn(),
        setBody: vi.fn(),
        setHeaders: vi.fn(),
        setQueryParams: vi.fn(),
      },
    );
    const body = JSON.parse(result.body);
    expect(body.username).toBe('user');
    const decrypted = privateDecrypt(
      {
        key: privateKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: rsaHash.toLowerCase().replace('-', ''),
      },
      Buffer.from(body.password, 'base64'),
    );
    expect(decrypted.toString('utf8')).toBe('密码123😀');
  },
);

it('accepts SPKI Base64 and defaults to SHA-256', async () => {
  const encoded = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  const ciphertext = await computeRsaOaep('123', encoded);
  expect(
    privateDecrypt(
      { key: privateKey, oaepHash: 'sha256' },
      Buffer.from(ciphertext, 'base64'),
    ).toString(),
  ).toBe('123');
});

it('rejects missing, malformed and unsupported public keys', async () => {
  await expect(computeRsaOaep('123')).rejects.toThrow('请填写 RSA 公钥');
  await expect(computeRsaOaep('123', 'invalid')).rejects.toThrow('RSA 公钥无效');
  await expect(
    computeRsaOaep('123', publicKey.export({ type: 'pkcs1', format: 'pem' }).toString()),
  ).rejects.toThrow('SPKI');
});

it('checks the UTF-8 byte limit before encryption', async () => {
  await expect(computeRsaOaep('中'.repeat(64), pem)).rejects.toThrow(
    '最多支持 190 字节，实际 192 字节',
  );
});

it('reports when browser WebCrypto is unavailable', async () => {
  vi.stubGlobal('crypto', {});
  await expect(computeRsaOaep('123', pem)).rejects.toThrow('HTTPS 或 localhost');
});
