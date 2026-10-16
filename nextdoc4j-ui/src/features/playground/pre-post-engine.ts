import { buildSecurityCredentials } from '../security/security';
import { resolveRequestBase } from '../../lib/http';
import { runPipelineScript } from './pre-post-script-runner';
import type {
  PrePostPhaseConfig,
  PrePostPhase,
  WorkflowStep,
  WorkflowContext,
  WorkflowRuntime,
  WorkflowResponse,
  WorkflowTransform,
} from './pre-post-types';

/**
 * 将任意字符串（含多字节中文、Emoji等）编码为标准的 UTF-8 字节数组
 */
export function stringToUtf8Bytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let codePoint = str.charCodeAt(i);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = ((codePoint - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
        i++;
      }
    }
    if (codePoint < 0x80) {
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint < 0x10000) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return bytes;
}

/**
 * 纯前端高效 MD5 计算函数（支持标准 UTF-8 中文字符串）
 */
export function computeMd5(string: string): string {
  const bytes = stringToUtf8Bytes(string);
  const lMessageLength = bytes.length;

  /** Rotates a 32-bit MD5 word to the left.
   * @param lValue Word to rotate.
   * @param iShiftBits Rotation bit count.
   * @returns Rotated word.
   */
  function rotateLeft(lValue: number, iShiftBits: number) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  /** Adds two MD5 words with 32-bit wraparound.
   * @param lX First word.
   * @param lY Second word.
   * @returns Wrapped sum.
   */
  function addUnsigned(lX: number, lY: number) {
    const lX4 = lX & 0x40000000;
    const lY4 = lY & 0x40000000;
    const lX8 = lX & 0x80000000;
    const lY8 = lY & 0x80000000;
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      else return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    } else return lResult ^ lX8 ^ lY8;
  }
  /** Computes the MD5 F round mixing function.
   * @param x Round state word.
   * @param y Round state word.
   * @param z Round state word.
   * @returns Mixed word.
   */
  function F(x: number, y: number, z: number) {
    return (x & y) | (~x & z);
  }
  /** Computes the MD5 G round mixing function.
   * @param x Round state word.
   * @param y Round state word.
   * @param z Round state word.
   * @returns Mixed word.
   */
  function G(x: number, y: number, z: number) {
    return (x & z) | (y & ~z);
  }
  /** Computes the MD5 H round mixing function.
   * @param x Round state word.
   * @param y Round state word.
   * @param z Round state word.
   * @returns Mixed word.
   */
  function H(x: number, y: number, z: number) {
    return x ^ y ^ z;
  }
  /** Computes the MD5 I round mixing function.
   * @param x Round state word.
   * @param y Round state word.
   * @param z Round state word.
   * @returns Mixed word.
   */
  function I(x: number, y: number, z: number) {
    return y ^ (x | ~z);
  }
  /** Applies one MD5 FF round operation.
   * @param a Round state word.
   * @param b Round state word.
   * @param c Round state word.
   * @param d Round state word.
   * @param x Message word.
   * @param s Rotation bit count.
   * @param ac Round constant.
   * @returns Updated round word.
   */
  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  /** Applies one MD5 GG round operation.
   * @param a Round state word.
   * @param b Round state word.
   * @param c Round state word.
   * @param d Round state word.
   * @param x Message word.
   * @param s Rotation bit count.
   * @param ac Round constant.
   * @returns Updated round word.
   */
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  /** Applies one MD5 HH round operation.
   * @param a Round state word.
   * @param b Round state word.
   * @param c Round state word.
   * @param d Round state word.
   * @param x Message word.
   * @param s Rotation bit count.
   * @param ac Round constant.
   * @returns Updated round word.
   */
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  /** Applies one MD5 II round operation.
   * @param a Round state word.
   * @param b Round state word.
   * @param c Round state word.
   * @param d Round state word.
   * @param x Message word.
   * @param s Rotation bit count.
   * @param ac Round constant.
   * @returns Updated round word.
   */
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  /** Pads the current UTF-8 message into MD5 words.
   * @param None Uses the enclosing message bytes and length.
   * @returns Little-endian words including padding and length.
   */
  function convertToWordArray() {
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    const lWordArray = Array<number>(lNumberOfWords).fill(0);
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      const lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (bytes[lByteCount] << lBytePosition);
      lByteCount++;
    }
    const lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = (lMessageLength * 8) & 0xffffffff;
    lWordArray[lNumberOfWords - 1] = Math.floor((lMessageLength * 8) / 0x100000000);
    return lWordArray;
  }
  /** Formats an MD5 word in little-endian hexadecimal.
   * @param lValue Word to encode.
   * @returns Eight lowercase hexadecimal characters.
   */
  function wordToHex(lValue: number) {
    let wordToHexValue = '';
    for (let lCount = 0; lCount <= 3; lCount++) {
      const lByte = (lValue >>> (lCount * 8)) & 255;
      const wordToHexValue_temp = '0' + lByte.toString(16);
      wordToHexValue = wordToHexValue + wordToHexValue_temp.slice(-2);
    }
    return wordToHexValue;
  }

  const x = convertToWordArray();
  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;
  const S11 = 7,
    S12 = 12,
    S13 = 17,
    S14 = 22;
  const S21 = 5,
    S22 = 9,
    S23 = 14,
    S24 = 20;
  const S31 = 4,
    S32 = 11,
    S33 = 16,
    S34 = 23;
  const S41 = 6,
    S42 = 10,
    S43 = 15,
    S44 = 21;

  for (let k = 0; k < x.length; k += 16) {
    const AA = a;
    const BB = b;
    const CC = c;
    const DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xd76aa478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070db);
    b = FF(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
    a = FF(a, b, c, d, x[k + 4], S11, 0xf57c0faf);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787c62a);
    c = FF(c, d, a, b, x[k + 6], S13, 0xa8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xfd469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098d8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
    c = FF(c, d, a, b, x[k + 10], S13, 0xffff5bb1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895cd7be);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6b901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xfd987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xa679438e);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49b40821);
    a = GG(a, b, c, d, x[k + 1], S21, 0xf61e2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xc040b340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265e5a51);
    b = GG(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa);
    a = GG(a, b, c, d, x[k + 5], S21, 0xd62f105d);
    d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xd8a1e681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21e1cde6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xc33707d6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xf4d50d87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455a14ed);
    a = GG(a, b, c, d, x[k + 13], S21, 0xa9e3e905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676f02d9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);
    a = HH(a, b, c, d, x[k + 5], S31, 0xfffa3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771f681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6d9d6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xfde5380c);
    a = HH(a, b, c, d, x[k + 1], S31, 0xa4beea44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289b7ec6);
    d = HH(d, a, b, c, x[k + 0], S32, 0xeaa127fa);
    c = HH(c, d, a, b, x[k + 3], S33, 0xd4ef3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x4881d05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xd9d4d039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xc4ac5665);
    a = II(a, b, c, d, x[k + 0], S41, 0xf4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432aff97);
    c = II(c, d, a, b, x[k + 14], S43, 0xab9423a7);
    b = II(b, c, d, a, x[k + 5], S44, 0xfc93a039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655b59c3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
    c = II(c, d, a, b, x[k + 10], S43, 0xffeff47d);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845dd1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6fa87e4f);
    d = II(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
    c = II(c, d, a, b, x[k + 6], S43, 0xa3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
    a = II(a, b, c, d, x[k + 4], S41, 0xf7537e82);
    d = II(d, a, b, c, x[k + 11], S42, 0xbd3af235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb);
    b = II(b, c, d, a, x[k + 9], S44, 0xeb86d391);
    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }
  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

/**
 * 纯前端高效 SHA-256 计算函数（支持标准 UTF-8 中文字符串）
 */
export function computeSha256(string: string): string {
  const bytes = stringToUtf8Bytes(string);
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let H0 = 0x6a09e667,
    H1 = 0xbb67ae85,
    H2 = 0x3c6ef372,
    H3 = 0xa54ff53a;
  let H4 = 0x510e527f,
    H5 = 0x9b05688c,
    H6 = 0x1f83d9ab,
    H7 = 0x5be0cd19;

  const bitLength = bytes.length * 8;
  const newLen = (((bytes.length + 8) >> 6) + 1) << 6;
  const padded = new Uint8Array(newLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(newLen - 4, bitLength >>> 0, false);
  view.setUint32(newLen - 8, Math.floor(bitLength / 0x100000000), false);

  const W = new Uint32Array(64);
  /** Rotates a SHA-256 word to the right.
   * @param n Rotation bit count.
   * @param x Word to rotate.
   * @returns Rotated word.
   */
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));

  for (let i = 0; i < newLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(7, W[t - 15]) ^ rotr(18, W[t - 15]) ^ (W[t - 15] >>> 3);
      const s1 = rotr(17, W[t - 2]) ^ rotr(19, W[t - 2]) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }

    let a = H0,
      b = H1,
      c = H2,
      d = H3,
      e = H4,
      f = H5,
      g = H6,
      h = H7;

    for (let t = 0; t < 64; t++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H0 = (H0 + a) >>> 0;
    H1 = (H1 + b) >>> 0;
    H2 = (H2 + c) >>> 0;
    H3 = (H3 + d) >>> 0;
    H4 = (H4 + e) >>> 0;
    H5 = (H5 + f) >>> 0;
    H6 = (H6 + g) >>> 0;
    H7 = (H7 + h) >>> 0;
  }

  /** Formats an unsigned SHA-256 word.
   * @param n Word to encode.
   * @returns Eight lowercase hexadecimal characters.
   */
  const toHex = (n: number) => n.toString(16).padStart(8, '0');
  return (
    toHex(H0) +
    toHex(H1) +
    toHex(H2) +
    toHex(H3) +
    toHex(H4) +
    toHex(H5) +
    toHex(H6) +
    toHex(H7)
  ).toLowerCase();
}

/**
 * 标准 UTF-8 Base64 编码
 */
export function encodeBase64(str: string): string {
  const bytes = stringToUtf8Bytes(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * AES-128-CBC S-box 与轮常量
 */
const AES_SBOX = [
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
  0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
  0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
  0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
  0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
  0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
  0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
  0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
  0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
  0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
  0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
  0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
  0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
  0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
  0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
];
const AES_RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

/**
 * 纯 JS AES-128-CBC 加密实现（PKCS#7 填充），支持中文字符与所有浏览器环境
 */
export function computeAes128Cbc(plaintext: string, keyStr: string, ivStr: string): string {
  if (!keyStr || !keyStr.trim()) {
    throw new Error('AES 密钥 (Key) 不能为空');
  }
  if (!ivStr || !ivStr.trim()) {
    throw new Error('AES 偏移量 (IV) 不能为空');
  }

  if (stringToUtf8Bytes(keyStr).length !== 16 || stringToUtf8Bytes(ivStr).length !== 16)
    throw new Error('AES-128-CBC 密钥和 IV 必须各为 16 个 UTF-8 字节');

  const keyBytes = new Uint8Array(stringToUtf8Bytes(keyStr));
  const ivBytes = new Uint8Array(stringToUtf8Bytes(ivStr));

  // 密钥扩展 (10 rounds -> 44 words)
  const w = new Uint32Array(44);
  for (let i = 0; i < 4; i++) {
    w[i] =
      (keyBytes[4 * i] << 24) |
      (keyBytes[4 * i + 1] << 16) |
      (keyBytes[4 * i + 2] << 8) |
      keyBytes[4 * i + 3];
  }
  for (let i = 4; i < 44; i++) {
    let temp = w[i - 1];
    if (i % 4 === 0) {
      temp =
        ((AES_SBOX[(temp >>> 16) & 0xff] << 24) |
          (AES_SBOX[(temp >>> 8) & 0xff] << 16) |
          (AES_SBOX[temp & 0xff] << 8) |
          AES_SBOX[(temp >>> 24) & 0xff]) ^
        (AES_RCON[i / 4] << 24);
    }
    w[i] = (w[i - 4] ^ temp) >>> 0;
  }

  /** Multiplies an AES byte by two in the finite field.
   * @param a Input byte.
   * @returns Reduced byte.
   */
  const xtime = (a: number) => ((a << 1) ^ (((a >>> 7) & 1) * 0x11b)) & 0xff;

  /** Encrypts one AES-128 block with the expanded key.
   * @param input Sixteen plaintext bytes.
   * @param output Ciphertext destination.
   * @param offset Destination byte offset.
   * @returns Nothing; writes sixteen ciphertext bytes.
   */
  const encryptBlock = (input: Uint8Array, output: Uint8Array, offset: number) => {
    let s0 = input[0],
      s1 = input[1],
      s2 = input[2],
      s3 = input[3];
    let s4 = input[4],
      s5 = input[5],
      s6 = input[6],
      s7 = input[7];
    let s8 = input[8],
      s9 = input[9],
      s10 = input[10],
      s11 = input[11];
    let s12 = input[12],
      s13 = input[13],
      s14 = input[14],
      s15 = input[15];

    // 初始 AddRoundKey
    s0 ^= (w[0] >>> 24) & 0xff;
    s1 ^= (w[0] >>> 16) & 0xff;
    s2 ^= (w[0] >>> 8) & 0xff;
    s3 ^= w[0] & 0xff;
    s4 ^= (w[1] >>> 24) & 0xff;
    s5 ^= (w[1] >>> 16) & 0xff;
    s6 ^= (w[1] >>> 8) & 0xff;
    s7 ^= w[1] & 0xff;
    s8 ^= (w[2] >>> 24) & 0xff;
    s9 ^= (w[2] >>> 16) & 0xff;
    s10 ^= (w[2] >>> 8) & 0xff;
    s11 ^= w[2] & 0xff;
    s12 ^= (w[3] >>> 24) & 0xff;
    s13 ^= (w[3] >>> 16) & 0xff;
    s14 ^= (w[3] >>> 8) & 0xff;
    s15 ^= w[3] & 0xff;

    // Rounds 1 to 9
    for (let round = 1; round <= 9; round++) {
      const t0 = AES_SBOX[s0],
        t1 = AES_SBOX[s5],
        t2 = AES_SBOX[s10],
        t3 = AES_SBOX[s15];
      const t4 = AES_SBOX[s4],
        t5 = AES_SBOX[s9],
        t6 = AES_SBOX[s14],
        t7 = AES_SBOX[s3];
      const t8 = AES_SBOX[s8],
        t9 = AES_SBOX[s13],
        t10 = AES_SBOX[s2],
        t11 = AES_SBOX[s7];
      const t12 = AES_SBOX[s12],
        t13 = AES_SBOX[s1],
        t14 = AES_SBOX[s6],
        t15 = AES_SBOX[s11];

      const kw0 = w[round * 4],
        kw1 = w[round * 4 + 1],
        kw2 = w[round * 4 + 2],
        kw3 = w[round * 4 + 3];

      s0 = (xtime(t0) ^ xtime(t1) ^ t1 ^ t2 ^ t3 ^ ((kw0 >>> 24) & 0xff)) & 0xff;
      s1 = (t0 ^ xtime(t1) ^ xtime(t2) ^ t2 ^ t3 ^ ((kw0 >>> 16) & 0xff)) & 0xff;
      s2 = (t0 ^ t1 ^ xtime(t2) ^ xtime(t3) ^ t3 ^ ((kw0 >>> 8) & 0xff)) & 0xff;
      s3 = (xtime(t0) ^ t0 ^ t1 ^ t2 ^ xtime(t3) ^ (kw0 & 0xff)) & 0xff;

      s4 = (xtime(t4) ^ xtime(t5) ^ t5 ^ t6 ^ t7 ^ ((kw1 >>> 24) & 0xff)) & 0xff;
      s5 = (t4 ^ xtime(t5) ^ xtime(t6) ^ t6 ^ t7 ^ ((kw1 >>> 16) & 0xff)) & 0xff;
      s6 = (t4 ^ t5 ^ xtime(t6) ^ xtime(t7) ^ t7 ^ ((kw1 >>> 8) & 0xff)) & 0xff;
      s7 = (xtime(t4) ^ t4 ^ t5 ^ t6 ^ xtime(t7) ^ (kw1 & 0xff)) & 0xff;

      s8 = (xtime(t8) ^ xtime(t9) ^ t9 ^ t10 ^ t11 ^ ((kw2 >>> 24) & 0xff)) & 0xff;
      s9 = (t8 ^ xtime(t9) ^ xtime(t10) ^ t10 ^ t11 ^ ((kw2 >>> 16) & 0xff)) & 0xff;
      s10 = (t8 ^ t9 ^ xtime(t10) ^ xtime(t11) ^ t11 ^ ((kw2 >>> 8) & 0xff)) & 0xff;
      s11 = (xtime(t8) ^ t8 ^ t9 ^ t10 ^ xtime(t11) ^ (kw2 & 0xff)) & 0xff;

      s12 = (xtime(t12) ^ xtime(t13) ^ t13 ^ t14 ^ t15 ^ ((kw3 >>> 24) & 0xff)) & 0xff;
      s13 = (t12 ^ xtime(t13) ^ xtime(t14) ^ t14 ^ t15 ^ ((kw3 >>> 16) & 0xff)) & 0xff;
      s14 = (t12 ^ t13 ^ xtime(t14) ^ xtime(t15) ^ t15 ^ ((kw3 >>> 8) & 0xff)) & 0xff;
      s15 = (xtime(t12) ^ t12 ^ t13 ^ t14 ^ xtime(t15) ^ (kw3 & 0xff)) & 0xff;
    }

    // Round 10 (无 MixColumns)
    const t0 = AES_SBOX[s0],
      t1 = AES_SBOX[s5],
      t2 = AES_SBOX[s10],
      t3 = AES_SBOX[s15];
    const t4 = AES_SBOX[s4],
      t5 = AES_SBOX[s9],
      t6 = AES_SBOX[s14],
      t7 = AES_SBOX[s3];
    const t8 = AES_SBOX[s8],
      t9 = AES_SBOX[s13],
      t10 = AES_SBOX[s2],
      t11 = AES_SBOX[s7];
    const t12 = AES_SBOX[s12],
      t13 = AES_SBOX[s1],
      t14 = AES_SBOX[s6],
      t15 = AES_SBOX[s11];

    const kw0 = w[40],
      kw1 = w[41],
      kw2 = w[42],
      kw3 = w[43];
    output[offset + 0] = (t0 ^ ((kw0 >>> 24) & 0xff)) & 0xff;
    output[offset + 1] = (t1 ^ ((kw0 >>> 16) & 0xff)) & 0xff;
    output[offset + 2] = (t2 ^ ((kw0 >>> 8) & 0xff)) & 0xff;
    output[offset + 3] = (t3 ^ (kw0 & 0xff)) & 0xff;

    output[offset + 4] = (t4 ^ ((kw1 >>> 24) & 0xff)) & 0xff;
    output[offset + 5] = (t5 ^ ((kw1 >>> 16) & 0xff)) & 0xff;
    output[offset + 6] = (t6 ^ ((kw1 >>> 8) & 0xff)) & 0xff;
    output[offset + 7] = (t7 ^ (kw1 & 0xff)) & 0xff;

    output[offset + 8] = (t8 ^ ((kw2 >>> 24) & 0xff)) & 0xff;
    output[offset + 9] = (t9 ^ ((kw2 >>> 16) & 0xff)) & 0xff;
    output[offset + 10] = (t10 ^ ((kw2 >>> 8) & 0xff)) & 0xff;
    output[offset + 11] = (t11 ^ (kw2 & 0xff)) & 0xff;

    output[offset + 12] = (t12 ^ ((kw3 >>> 24) & 0xff)) & 0xff;
    output[offset + 13] = (t13 ^ ((kw3 >>> 16) & 0xff)) & 0xff;
    output[offset + 14] = (t14 ^ ((kw3 >>> 8) & 0xff)) & 0xff;
    output[offset + 15] = (t15 ^ (kw3 & 0xff)) & 0xff;
  };

  // PKCS#7 填充
  const plainBytes = [...stringToUtf8Bytes(plaintext)];
  const padLen = 16 - (plainBytes.length % 16);
  for (let i = 0; i < padLen; i++) {
    plainBytes.push(padLen);
  }

  const outBytes = new Uint8Array(plainBytes.length);
  const block = new Uint8Array(16);
  let prev = ivBytes;

  for (let i = 0; i < plainBytes.length; i += 16) {
    for (let j = 0; j < 16; j++) {
      block[j] = plainBytes[i + j] ^ prev[j];
    }
    encryptBlock(block, outBytes, i);
    prev = outBytes.subarray(i, i + 16);
  }

  let binary = '';
  for (let i = 0; i < outBytes.length; i++) {
    binary += String.fromCharCode(outBytes[i]);
  }
  return btoa(binary);
}

/**
 * AES-CBC 加密函数（明确报错，杜绝静默回退）
 */
export async function computeAesCbc(plaintext: string, keyStr = '', ivStr = ''): Promise<string> {
  if (!keyStr || !keyStr.trim()) {
    throw new Error('AES 密钥 (Key) 不能为空');
  }
  if (!ivStr || !ivStr.trim()) {
    throw new Error('AES 偏移量 (IV) 不能为空');
  }

  if (stringToUtf8Bytes(keyStr).length !== 16 || stringToUtf8Bytes(ivStr).length !== 16)
    throw new Error('AES-128-CBC 密钥和 IV 必须各为 16 个 UTF-8 字节');

  // 尝试优先使用浏览器原生 WebCrypto 加速
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const keyBytes = new Uint8Array(stringToUtf8Bytes(keyStr));
      const ivBytes = new Uint8Array(stringToUtf8Bytes(ivStr));

      const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, [
        'encrypt',
      ]);
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-CBC', iv: ivBytes },
        cryptoKey,
        new Uint8Array(stringToUtf8Bytes(plaintext)),
      );
      let binary = '';
      const encBytes = new Uint8Array(encrypted);
      for (let i = 0; i < encBytes.length; i++) {
        binary += String.fromCharCode(encBytes[i]);
      }
      return btoa(binary);
    } catch {
      // 若 WebCrypto 出现环境异常，平滑切换至标准纯 JS 实现
    }
  }

  try {
    return computeAes128Cbc(plaintext, keyStr, ivStr);
  } catch (err) {
    throw new Error(`AES 加密失败: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Encrypts UTF-8 text with a browser-supported RSA-OAEP public key.
 * @param plaintext Text to encrypt without hashing or truncation.
 * @param publicKey SPKI public key as PUBLIC KEY PEM or Base64 DER.
 * @param hash OAEP and MGF1 hash agreed with the server; defaults to SHA-256.
 * @returns Base64 ciphertext for a subsequent request-write step.
 */
export async function computeRsaOaep(
  plaintext: string,
  publicKey?: string,
  hash: NonNullable<WorkflowStep['rsaHash']> = 'SHA-256',
): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('RSA-OAEP 需要支持 WebCrypto 的浏览器，请使用 HTTPS 或 localhost');
  }
  const keyText = publicKey?.trim();
  if (!keyText) throw new Error('请填写 RSA 公钥');
  if (keyText.includes('-----BEGIN') && !keyText.startsWith('-----BEGIN PUBLIC KEY-----')) {
    throw new Error('请使用 SPKI 公钥（BEGIN PUBLIC KEY），不支持私钥或 RSA PUBLIC KEY 格式');
  }
  let key: CryptoKey;
  try {
    const encoded = keyText
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\s/g, '');
    key = await crypto.subtle.importKey(
      'spki',
      Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0)),
      { name: 'RSA-OAEP', hash },
      false,
      ['encrypt'],
    );
  } catch {
    throw new Error('RSA 公钥无效，请填写完整的 SPKI PEM 或 Base64 公钥，并检查哈希算法');
  }
  const bytes = new TextEncoder().encode(plaintext);
  const hashBytes = { 'SHA-1': 20, 'SHA-256': 32, 'SHA-384': 48, 'SHA-512': 64 }[hash];
  const maxBytes =
    Math.ceil((key.algorithm as RsaHashedKeyAlgorithm).modulusLength / 8) - 2 * hashBytes - 2;
  if (maxBytes < 0)
    throw new Error(`当前 RSA 公钥位数不支持 ${hash}，请使用与后端一致的公钥和填充参数`);
  if (bytes.length > maxBytes) {
    throw new Error(
      `RSA-OAEP 输入过长：当前公钥与哈希最多支持 ${maxBytes} 字节，实际 ${bytes.length} 字节`,
    );
  }
  const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, bytes);
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

/** Encrypts with RSA PKCS#1 v1.5 for backends using RSA/ECB/PKCS1Padding.
 * @param plaintext UTF-8 text to encrypt.
 * @param publicKey PEM or Base64 public key supplied by the server.
 * @returns Base64 ciphertext; rejects invalid keys and overlong input.
 */
export async function computeRsaPkcs1(plaintext: string, publicKey?: string): Promise<string> {
  if (!publicKey?.trim()) throw new Error('请填写 RSA 公钥');
  if (publicKey.includes('PRIVATE KEY')) throw new Error('请填写公钥，不支持私钥');
  const { default: forge } = await import('node-forge');
  let key: import('node-forge').pki.rsa.PublicKey;
  try {
    const pem = publicKey.includes('-----BEGIN')
      ? publicKey
      : `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
    key = forge.pki.publicKeyFromPem(pem);
  } catch {
    throw new Error('RSA 公钥无效，请使用 PEM 或 SPKI Base64 公钥');
  }
  const maxBytes = Math.ceil(key.n.bitLength() / 8) - 11;
  const bytes = new TextEncoder().encode(plaintext).length;
  if (bytes > maxBytes)
    throw new Error(`RSA PKCS#1 v1.5 最多支持 ${maxBytes} 字节，实际 ${bytes} 字节`);
  return forge.util.encode64(key.encrypt(forge.util.encodeUtf8(plaintext), 'RSAES-PKCS1-V1_5'));
}

/**
 * Computes synchronous digests, Base64 encoding or AES encryption.
 * @param algorithm Selected digest, encoding or encryption operation.
 * @param plaintext UTF-8 source text.
 * @param key AES key when encryption is selected.
 * @param iv AES initialization vector when encryption is selected.
 * @returns Encoded result; hashes and Base64 are not encryption.
 */
export function computeCrypto(
  algorithm: 'aes-cbc' | 'base64' | 'md5-hex-lower' | 'md5-hex-upper' | 'sha256',
  plaintext: string,
  key?: string,
  iv?: string,
): string {
  switch (algorithm) {
    case 'md5-hex-lower':
      return computeMd5(plaintext).toLowerCase();
    case 'md5-hex-upper':
      return computeMd5(plaintext).toUpperCase();
    case 'sha256':
      return computeSha256(plaintext);
    case 'base64':
      return encodeBase64(plaintext);
    case 'aes-cbc':
      return computeAes128Cbc(plaintext, key || '', iv || '');
    default:
      return computeMd5(plaintext);
  }
}

/**
 * 通用 JSONPath 提取函数（支持 $.data.token, data.token, [0].id 等）
 * @param data Source data or variable map.
 * @param pathStr Path to read; without $, literal property names take precedence.
 * @returns Selected value, or undefined for a missing path.
 */
export function extractByJsonPath(data: unknown, pathStr: string): unknown {
  if (data === null || data === undefined || !pathStr) return undefined;
  let normalized = pathStr.trim();
  const absolute = normalized.startsWith('$');
  if (!absolute && typeof data === 'object' && Object.hasOwn(data, pathStr))
    return (data as Record<string, unknown>)[pathStr];
  if (normalized.startsWith('$')) normalized = normalized.slice(1);
  if (normalized.startsWith('.')) normalized = normalized.slice(1);
  if (!absolute && normalized.startsWith('response.')) normalized = normalized.slice(9);
  if (!absolute && normalized.startsWith('body.')) normalized = normalized.slice(5);
  if (!normalized) return data;

  const tokens = normalized
    .replace(/\[(\w+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);
  let current: unknown = data;
  for (const [index, token] of tokens.entries()) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === 'object') {
      // Literal variable names take precedence over nested paths.
      const remaining = tokens.slice(index).join('.');
      if (!absolute && Object.hasOwn(current, remaining))
        return (current as Record<string, unknown>)[remaining];
      current = (current as Record<string, unknown>)[token];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * 构建完整的请求 URL
 * @param rawUrl Absolute URL or relative auxiliary endpoint.
 * @param origin Page origin used to resolve relative URLs.
 * @param apiBase Configured API base path.
 * @param requestPrefix Service-specific URL prefix.
 * @returns Fully resolved request URL.
 */
function resolveFullUrl(
  rawUrl: string,
  origin?: string,
  apiBase?: string,
  requestPrefix?: string,
): string {
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  const baseOrigin =
    origin || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  const cleanPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  const base = resolveRequestBase(requestPrefix || '', apiBase || '').replace(/\/+$/, '');
  const target = `${base}${cleanPath}`;
  return new URL(target, baseOrigin).toString();
}

/** Creates isolated values for one send while retaining an explicit flow snapshot.
 * @param flow Values shared by related requests in the current service.
 * @param results Previously executed manual step results.
 * @returns Independent runtime objects; no references to the editable request.
 */
export const createWorkflowRuntime = (
  flow: Record<string, unknown> = {},
  results: Record<string, unknown> = {},
): WorkflowRuntime => ({
  variables: {},
  flow: structuredClone(flow),
  results: structuredClone(results),
});

/** Writes a supported JSON path without silently replacing malformed JSON.
 * @param value JSON object or array to update.
 * @param path Dot/bracket path identifying the destination.
 * @param next New typed value.
 * @returns Updated root, including replacement when path is $.
 */
function writeJsonPath(value: unknown, path: string, next: unknown): unknown {
  if (path === '$') return next;
  const keys = path
    .replace(/^\$\.?/, '')
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.');
  if (
    !keys.length ||
    keys.some((key) => !key || ['__proto__', 'constructor', 'prototype'].includes(key))
  )
    throw new Error('目标路径无效');
  if (!value || typeof value !== 'object') throw new Error('目标 Body 必须是 JSON 对象或数组');
  let target = value as Record<string, unknown>;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) target[key] = next;
    else {
      if (target[key] === undefined) target[key] = /^\d+$/.test(keys[index + 1]) ? [] : {};
      if (!target[key] || typeof target[key] !== 'object')
        throw new Error(`目标路径 ${key} 不是对象`);
      target = target[key] as Record<string, unknown>;
    }
  });
  return value;
}

/** Resolves a required path, preserving zero, false, empty strings and null.
 * @param value Typed source data.
 * @param path Optional root or supported JSON path.
 * @returns Selected data; throws when the field does not exist.
 */
function readPath(value: unknown, path = '$'): unknown {
  const result = extractByJsonPath(value, path || '$');
  if (result === undefined) throw new Error(`未找到字段或变量：${path}`);
  return result;
}

/** Converts a workflow value to request text without losing object structure.
 * @param value Typed value.
 * @returns String representation suitable for a request field.
 */
function asText(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/** Converts workflow data without coercing structured outputs back to text.
 * @param algorithm Synchronous text, type, encoding or digest operation.
 * @param value Typed value read from the selected source.
 * @returns Converted value; rejects unsupported inputs instead of silently changing their meaning.
 */
function transformValue(
  algorithm: Exclude<WorkflowTransform, 'aes-cbc' | 'rsa-oaep' | 'rsa-pkcs1'>,
  value: unknown,
): unknown {
  switch (algorithm) {
    case 'json-stringify':
      return JSON.stringify(value);
    case 'to-string':
      return asText(value);
    case 'to-number': {
      if (typeof value !== 'string' && typeof value !== 'number')
        throw new Error('转为数字仅支持数字或十进制数字文本');
      const text = String(value).trim();
      if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text) || !Number.isFinite(Number(text)))
        throw new Error('请输入有效的十进制数字，空值不能转为数字');
      const number = Number(text);
      if (Number.isInteger(number) && !Number.isSafeInteger(number))
        throw new Error('数值超出安全整数范围，请保留为文本以避免精度丢失');
      return number;
    }
    case 'to-boolean': {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string' && ['true', 'false'].includes(value.trim()))
        return value.trim() === 'true';
      throw new Error('转为布尔值仅支持 true、false 或对应的文本');
    }
    case 'trim':
    case 'uppercase':
    case 'lowercase':
    case 'json-parse':
    case 'base64-decode':
    case 'url-encode':
    case 'url-decode': {
      if (typeof value !== 'string')
        throw new Error('此转换需要文本输入，请先选择文本字段或转为文本');
      switch (algorithm) {
        case 'trim':
          return value.trim();
        case 'uppercase':
          return value.toUpperCase();
        case 'lowercase':
          return value.toLowerCase();
        case 'json-parse':
          return JSON.parse(value);
        case 'url-encode':
          return encodeURIComponent(value);
        case 'url-decode':
          return decodeURIComponent(value);
        case 'base64-decode':
          return new TextDecoder('utf-8', { fatal: true }).decode(
            Uint8Array.from(atob(value), (char) => char.charCodeAt(0)),
          );
      }
      break;
    }
    case 'base64':
    case 'md5-hex-lower':
    case 'md5-hex-upper':
    case 'sha256':
      return computeCrypto(algorithm, asText(value));
    default:
      throw new Error('不支持的转换方式，请重新选择');
  }
}

/** Waits for asynchronous script completion or cancellation without retaining listeners.
 * @param run Pending script result.
 * @param signal Request cancellation signal.
 * @returns Script output, or rejects promptly on cancellation.
 */
async function waitForScript(run: Promise<unknown>, signal?: AbortSignal): Promise<unknown> {
  let abort: (() => void) | undefined;
  try {
    signal?.throwIfAborted();
    return await Promise.race([
      run,
      new Promise<never>((_, reject) => {
        if (signal) {
          abort = () => reject(signal.reason);
          signal.addEventListener('abort', abort, { once: true });
        }
      }),
    ]);
  } finally {
    if (abort) signal?.removeEventListener('abort', abort);
  }
}

/** Executes ordered steps with a shared runtime and explicit manual/automatic triggers.
 * @param steps Configured steps in execution order.
 * @param phase Current request phase.
 * @param context Request snapshot, flow data, cancellation and update callbacks.
 * @returns Resolves on success; rejects on abort-policy failures or cancellation.
 */
export async function executeWorkflowSteps(
  steps: WorkflowStep[],
  phase: PrePostPhase,
  context: WorkflowContext,
): Promise<void> {
  const runtime = context.runtime ?? createWorkflowRuntime();
  let body = context.body;
  let headers = context.headers.map((item) => ({ ...item }));
  let query = context.queryParams.map((item) => ({ ...item }));
  let security = { ...context.securityValues };
  let pathParams = (context.pathParams ?? []).map((item) => ({ ...item }));
  let formFields = (context.formFields ?? []).map((item) => ({ ...item }));
  let urlEncodedFields = (context.urlEncodedFields ?? []).map((item) => ({ ...item }));
  let cookies = (context.cookies ?? []).map((item) => ({ ...item }));
  /** Records a step outcome without exposing credentials or body values.
   * @param step Current step.
   * @param content Explanation of the data flow or error.
   * @param status Execution outcome.
   * @returns Nothing; forwards an entry to the console.
   */
  const log = (step: WorkflowStep, content: string, status: 'pass' | 'fail' | 'skip' | 'info') =>
    context.onLog({
      category:
        step.type === 'assert' ? 'ASSERT' : phase === 'pre-request' ? 'PRE-REQ' : 'POST-RES',
      phase: phase === 'pre-request' ? 'pre' : 'post',
      content: `[${step.name}] ${content}`,
      status,
      time: new Date().toISOString().slice(11, 23),
    });
  /** Reads a step's explicitly selected source.
   * @param step Source location, part and path.
   * @returns Typed value, rejecting missing sources.
   */
  const read = (step: WorkflowStep): unknown => {
    if (step.source === 'fixed') return step.value ?? '';
    if (step.source === 'variable') return readPath(runtime.variables, step.path);
    if (step.source === 'flow') return readPath(runtime.flow, step.path);
    if (step.source === 'result')
      return readPath(runtime.results[step.resultStepId || ''], step.path);
    if (step.source === 'request') {
      if (step.sourcePart === 'headers')
        return readPath(
          Object.fromEntries(
            headers.filter((h) => h.enabled).map((h) => [h.name.toLowerCase(), h.value]),
          ),
          step.path?.toLowerCase(),
        );
      if (step.sourcePart === 'query')
        return readPath(
          Object.fromEntries(query.filter((h) => h.enabled).map((h) => [h.name, h.value])),
          step.path,
        );
      const fields =
        step.sourcePart === 'path'
          ? pathParams
          : step.sourcePart === 'form'
            ? formFields
            : step.sourcePart === 'urlencoded'
              ? urlEncodedFields
              : undefined;
      if (fields)
        return readPath(
          Object.fromEntries(
            fields.filter((item) => item.enabled).map((item) => [item.name, item.value]),
          ),
          step.path,
        );
      if (step.sourcePart === 'text') return body;
      return readPath(JSON.parse(body), step.path);
    }
    if (!context.response) throw new Error('当前阶段没有主请求响应，请选择辅助请求结果');
    if (step.sourcePart === 'status') return context.response.status;
    if (step.sourcePart === 'text') return context.response.text;
    if (step.sourcePart === 'headers')
      return readPath(context.response.headers, step.path?.toLowerCase());
    return readPath(context.response.json, step.path);
  };
  /** Expands explicit run/flow/step-result references in request configuration.
   * @param text Template containing {{flow.name}}, {{run.name}} or {{steps.id.path}}.
   * @returns Expanded text; rejects unresolved references instead of sending placeholders.
   */
  const interpolate = (text: string): string =>
    text.replace(/\{\{\s*(.*?)\s*\}\}/g, (_, path: string) =>
      asText(
        readPath({ flow: runtime.flow, run: runtime.variables, steps: runtime.results }, path),
      ),
    );
  /** Updates only this request snapshot or an explicitly chosen variable scope.
   * @param target Destination kind.
   * @param field Destination field or variable name.
   * @param value Typed value to write.
   * @returns Nothing; updates runtime and request callbacks.
   */
  const write = (target: WorkflowStep['targetType'], field: string | undefined, value: unknown) => {
    context.signal?.throwIfAborted();
    if (target === 'text') field = '$';
    if (!field?.trim()) throw new Error('请填写目标字段或变量名');
    if (['__proto__', 'constructor', 'prototype'].includes(field)) throw new Error('目标名称无效');
    if (target === 'variable' || target === 'flow') {
      (target === 'flow' ? runtime.flow : runtime.variables)[field] = value;
      return;
    }
    if (target === 'security') {
      if (!context.securityKeys?.includes(field)) throw new Error('请选择当前服务中有效的认证方案');
      if (typeof value !== 'string' || !value.trim())
        throw new Error('认证值必须是非空字符串，原认证未改变');
      security = { ...security, [field]: value.trim() };
      if (phase === 'pre-request' && !context.manualStepId) {
        const credentials = buildSecurityCredentials(
          { [field]: [] },
          context.securitySchemes,
          security,
        );
        if (!credentials.length) throw new Error('当前认证方案无法写入请求');
        for (const credential of credentials)
          write(credential.in, credential.name, credential.value);
      }
      context.onSecurityValuesChange?.(security);
      return;
    }
    if (phase !== 'pre-request') throw new Error('后置操作不能修改已发送的请求');
    if (context.manualStepId) throw new Error('手动步骤不能修改主请求，请设置为随主请求自动执行');
    if (target === 'text') {
      if (context.bodyKind && !['json', 'raw', 'xml'].includes(context.bodyKind))
        throw new Error('原始文本写入仅适用于 JSON/XML/raw 请求体');
      body = asText(value);
      context.setBody(body);
      return;
    }
    if (target === 'body') {
      if (context.bodyKind && !['json', 'raw'].includes(context.bodyKind))
        throw new Error('JSON 字段写入仅适用于 JSON/raw 请求体，文件操作请使用脚本');
      body = JSON.stringify(writeJsonPath(JSON.parse(body), field, value), null, 2);
      context.setBody(body);
      return;
    }
    if (!['header', 'query', 'path', 'form', 'urlencoded', 'cookie'].includes(target ?? ''))
      throw new Error('请选择写入目标');
    if (
      (target === 'form' && context.bodyKind !== 'form-data') ||
      (target === 'urlencoded' && context.bodyKind !== 'urlencoded')
    )
      throw new Error('表单写入目标与当前请求体类型不一致');
    if (target === 'cookie' && !context.sendBrowserCredentials)
      throw new Error('请先启用浏览器 Cookie 发送');
    const current =
      target === 'header'
        ? headers
        : target === 'query'
          ? query
          : target === 'path'
            ? pathParams
            : target === 'form'
              ? formFields
              : target === 'urlencoded'
                ? urlEncodedFields
                : cookies;
    /** Matches the target field using its transport's case rules.
     * @param name Existing parameter name.
     * @returns Whether the parameter should receive this write.
     */
    const match = (name: string) =>
      target === 'header' ? name.toLowerCase() === field.toLowerCase() : name === field;
    const next = current.some((item) => match(item.name))
      ? current.map((item) =>
          match(item.name) ? { ...item, enabled: true, value: asText(value) } : item,
        )
      : [...current, { enabled: true, name: field, value: asText(value) }];
    if (target === 'header') {
      headers = next;
      context.setHeaders(next);
    } else if (target === 'query') {
      query = next;
      context.setQueryParams(next);
    } else if (target === 'path') {
      pathParams = next;
      context.setPathParams?.(next);
    } else if (target === 'form') {
      formFields = next;
      context.setFormFields?.(next);
    } else if (target === 'urlencoded') {
      urlEncodedFields = next;
      context.setUrlEncodedFields?.(next);
    } else {
      cookies = next;
      context.setCookies?.(next);
    }
  };
  /** Sends one auxiliary request through the same service URL and credential settings.
   * @param options URL, method, headers, body and opt-in inherited headers.
   * @returns Parsed response including status and browser-readable headers.
   */
  const sendRequest = async (options: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    inheritHeaders?: boolean;
    allowHttpErrors?: boolean;
  }): Promise<WorkflowResponse> => {
    context.signal?.throwIfAborted();
    if (!options.url.trim()) throw new Error('请填写辅助请求地址');
    const url = resolveFullUrl(
      interpolate(options.url),
      context.origin,
      context.apiBase,
      context.requestPrefix,
    );
    const sameOrigin =
      new URL(url).origin ===
      new URL(resolveFullUrl('/', context.origin, context.apiBase, context.requestPrefix)).origin;
    if (options.inheritHeaders && !sameOrigin) throw new Error('跨源辅助请求不能继承主请求头');
    const requestHeaders = new Headers(
      options.inheritHeaders
        ? {
            ...context.inheritedHeaders,
            ...Object.fromEntries(headers.filter((h) => h.enabled).map((h) => [h.name, h.value])),
          }
        : {},
    );
    Object.entries(options.headers ?? {}).forEach(([name, value]) =>
      requestHeaders.set(name, interpolate(value)),
    );
    let requestBody = options.body as BodyInit | undefined;
    if (
      options.body !== undefined &&
      options.body !== null &&
      typeof options.body === 'object' &&
      !(options.body instanceof Blob) &&
      !(options.body instanceof FormData) &&
      !(options.body instanceof URLSearchParams) &&
      !(options.body instanceof ArrayBuffer) &&
      !ArrayBuffer.isView(options.body)
    ) {
      requestBody = JSON.stringify(options.body);
      if (!requestHeaders.has('content-type'))
        requestHeaders.set('content-type', 'application/json');
    }
    if (options.body instanceof FormData) requestHeaders.delete('content-type');
    if (options.body instanceof URLSearchParams)
      requestHeaders.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
    const response = await fetch(url, {
      method: options.method || 'GET',
      body: requestBody,
      headers: requestHeaders,
      credentials: context.sendBrowserCredentials ? 'include' : 'omit',
      signal: context.signal,
    });
    const contentType = response.headers.get('content-type') || '';
    let text = '',
      image: string | undefined,
      json: unknown;
    if (contentType.startsWith('image/')) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > 2 * 1024 * 1024) throw new Error('图片预览超过 2 MB');
      let binary = '';
      for (const byte of bytes) binary += String.fromCharCode(byte);
      image = `data:${contentType.split(';')[0]};base64,${btoa(binary)}`;
    } else {
      text = await response.text();
      try {
        json = JSON.parse(text);
      } catch {
        /* Text responses remain readable. */
      }
    }
    context.signal?.throwIfAborted();
    const result = {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      text,
      json,
      image,
    };
    if (!response.ok && !options.allowHttpErrors) {
      throw Object.assign(new Error(`辅助请求返回 HTTP ${response.status}`), { response: result });
    }
    return result;
  };
  for (const step of steps) {
    if (!step.enabled) continue;
    if (context.manualStepId ? step.id !== context.manualStepId : step.trigger === 'manual')
      continue;
    try {
      context.signal?.throwIfAborted();
      // Invalidate this run's result before execution, including condition skips and failures.
      delete runtime.results[step.id];

      if (step.condition) {
        const source =
          step.condition.source === 'flow'
            ? runtime.flow
            : step.condition.source === 'variable'
              ? runtime.variables
              : context.response;
        const value = extractByJsonPath(source, step.condition.path);
        if (
          value === undefined ||
          (step.condition.expected !== undefined
            ? String(value) !== step.condition.expected
            : !value)
        ) {
          if (step.saveAs)
            delete (step.scope === 'flow' ? runtime.flow : runtime.variables)[step.saveAs];
          log(step, '执行条件不满足', 'skip');
          continue;
        }
      }
      let output: unknown;
      if (step.type === 'request') {
        let requestBody: unknown = step.requestBody ? interpolate(step.requestBody) : undefined;
        if (step.requestBody && step.requestBodyKind !== 'text') {
          try {
            // Expand quoted values as JSON strings and bare references as typed JSON values.
            const jsonBody = step.requestBody.replace(
              /"(?:\\.|[^"\\])*"|\{\{\s*(.*?)\s*\}\}/g,
              (match, path: string | undefined) =>
                path === undefined
                  ? JSON.stringify(interpolate(JSON.parse(match)))
                  : JSON.stringify(
                      readPath(
                        { flow: runtime.flow, run: runtime.variables, steps: runtime.results },
                        path,
                      ),
                    ),
            );
            requestBody = JSON.parse(jsonBody);
          } catch {
            if (step.requestBodyKind && step.requestBodyKind !== 'auto')
              throw new Error('辅助请求 Body 必须是有效 JSON；表单请使用字段名到值的 JSON 对象');
          }
        }
        if (step.requestBodyKind === 'urlencoded' || step.requestBodyKind === 'form-data') {
          if (!requestBody || typeof requestBody !== 'object' || Array.isArray(requestBody))
            throw new Error('辅助请求表单必须是字段名到值的 JSON 对象');
          const form =
            step.requestBodyKind === 'urlencoded' ? new URLSearchParams() : new FormData();
          for (const [name, value] of Object.entries(requestBody)) {
            for (const item of Array.isArray(value) ? value : [value])
              form.append(name, asText(item));
          }
          requestBody = form;
        }
        const requestHeaders = JSON.parse(step.requestHeaders || '{}') as Record<string, string>;
        if (step.requestBodyKind === 'json' && requestBody !== undefined) {
          requestBody = JSON.stringify(requestBody);
          if (!Object.keys(requestHeaders).some((name) => name.toLowerCase() === 'content-type'))
            requestHeaders['Content-Type'] = 'application/json';
        }
        output = await sendRequest({
          url: step.endpoint || '',
          method: step.method,
          body: requestBody,
          headers: requestHeaders,
          inheritHeaders: step.inheritHeaders,
          allowHttpErrors: step.allowHttpErrors,
        });
        if (step.previewPath) {
          const preview = extractByJsonPath(output, step.previewPath);
          if (typeof preview === 'string' && preview.trim()) {
            const image = preview.startsWith('data:image/')
              ? preview
              : /^[A-Za-z0-9+/=\s]+$/.test(preview)
                ? `data:image/png;base64,${preview.replace(/\s/g, '')}`
                : undefined;
            if (image) (output as WorkflowResponse).image = image;
          }
        }
      } else if (step.type === 'input') {
        if (step.resultStepId && runtime.results[step.resultStepId] === undefined)
          throw new Error('请先运行关联的辅助步骤，再填写输入');
        output = readPath(runtime.flow, step.path);
        if (output === null || String(output).trim() === '')
          throw new Error(`请先填写流程变量 ${step.path}`);
      } else if (step.type === 'script') {
        if (!step.scriptCode?.trim()) throw new Error('请填写脚本');
        if (typeof window !== 'undefined') {
          const result = await runPipelineScript(
            phase,
            { steps: [{ ...step, failurePolicy: 'abort', condition: undefined }] },
            {
              ...context,
              body,
              headers,
              queryParams: query,
              runtime,
              pathParams,
              formFields,
              urlEncodedFields,
              cookies,
              securityValues: security,
            },
          );
          body = result.body;
          headers = result.headers;
          query = result.queryParams;
          pathParams = result.pathParams;
          formFields = result.formFields;
          urlEncodedFields = result.urlEncodedFields;
          cookies = result.cookies;
          context.setPathParams?.(pathParams);
          context.setFormFields?.(formFields);
          context.setUrlEncodedFields?.(urlEncodedFields);
          context.setCookies?.(cookies);
          Object.assign(runtime, result.runtime);
          context.setBody(body);
          context.setHeaders(headers);
          context.setQueryParams(query);
          if (result.securityValues) {
            security = result.securityValues;
            context.onSecurityValuesChange?.(security);
          }
          output = result.runtime.results[step.id];
        } else {
          const nextdoc = {
            variables: {
              get: (name: string) => readPath(runtime.variables, name),
              set: (name: string, value: unknown) => write('variable', name, value),
            },
            flow: {
              get: (name: string) => readPath(runtime.flow, name),
              set: (name: string, value: unknown) => write('flow', name, value),
              remove: (name: string) => {
                context.signal?.throwIfAborted();
                delete runtime.flow[name];
              },
            },
            results: { get: (id: string) => readPath(runtime.results, id) },
            files: {
              get: (name?: string) =>
                context.files?.find((file) => !name || file.name === name)?.file,
            },
            request: {
              body: {
                get: () => JSON.parse(body),
                text: () => body,
                setText: (value: string) => write('text', '$', value),
                set: (field: string | Record<string, unknown>, value?: unknown) =>
                  write(
                    'body',
                    typeof field === 'string' && value !== undefined ? field : '$',
                    value !== undefined ? value : field,
                  ),
              },
              headers: {
                get: (name: string) =>
                  headers.find(
                    (item) => item.enabled && item.name.toLowerCase() === name.toLowerCase(),
                  )?.value,
                set: (name: string, value: string) => write('header', name, value),
              },
              queryParams: {
                get: (name: string) =>
                  query.find((item) => item.enabled && item.name === name)?.value,
                set: (name: string, value: string) => write('query', name, value),
              },
              pathParams: {
                get: (name: string) =>
                  pathParams.find((item) => item.enabled && item.name === name)?.value,
                set: (name: string, value: string) => write('path', name, value),
              },
              formFields: {
                get: (name: string) =>
                  formFields.find((item) => item.enabled && item.name === name)?.value,
                set: (name: string, value: string) => write('form', name, value),
              },
              urlEncodedFields: {
                get: (name: string) =>
                  urlEncodedFields.find((item) => item.enabled && item.name === name)?.value,
                set: (name: string, value: string) => write('urlencoded', name, value),
              },
              cookies: {
                get: (name: string) =>
                  cookies.find((item) => item.enabled && item.name === name)?.value,
                set: (name: string, value: string) => write('cookie', name, value),
              },
            },
            response: {
              status: context.response?.status,
              json: (path = '$') => readPath(context.response?.json, path),
              text: () => context.response?.text,
              headers: context.response?.headers,
            },
            security: { setToken: (name: string, token: string) => write('security', name, token) },
            crypto: {
              md5: computeMd5,
              sha256: computeSha256,
              aesEncrypt: computeAesCbc,
              rsaOaep: computeRsaOaep,
              rsaPkcs1: computeRsaPkcs1,
              base64Encode: encodeBase64,
              base64Decode: (value: string) =>
                new TextDecoder().decode(
                  Uint8Array.from(atob(value), (char) => char.charCodeAt(0)),
                ),
            },
            sendRequest,
            assert: (pass: boolean, message: string) => {
              if (!pass) throw new Error(message);
            },
          };
          const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
            ...args: string[]
          ) => (...args: unknown[]) => Promise<unknown>;
          const run = new AsyncFunction('nextdoc', 'console', step.scriptCode);
          output = await waitForScript(
            run(nextdoc, {
              log: (...args: unknown[]) => log(step, args.map(String).join(' '), 'info'),
              info: (...args: unknown[]) => log(step, args.map(String).join(' '), 'info'),
              error: (...args: unknown[]) => log(step, args.map(String).join(' '), 'fail'),
              warn: (...args: unknown[]) => log(step, args.map(String).join(' '), 'info'),
            }),
            context.signal,
          );
        }
      } else {
        output = read(step);
        if (step.type === 'transform') {
          const input = asText(output);
          output =
            step.algorithm === 'rsa-pkcs1'
              ? await computeRsaPkcs1(
                  input,
                  step.rsaPublicKey ? interpolate(step.rsaPublicKey) : undefined,
                )
              : step.algorithm === 'rsa-oaep'
                ? await computeRsaOaep(
                    input,
                    step.rsaPublicKey ? interpolate(step.rsaPublicKey) : undefined,
                    step.rsaHash,
                  )
                : step.algorithm === 'aes-cbc'
                  ? await computeAesCbc(
                      input,
                      step.key ? interpolate(step.key) : undefined,
                      step.iv ? interpolate(step.iv) : undefined,
                    )
                  : transformValue(step.algorithm || 'base64', output);
          context.signal?.throwIfAborted();
          if (step.writeBack) {
            if (step.source !== 'request' || step.sourcePart !== 'body')
              throw new Error('直接替换仅支持请求 JSON 字段');
            write('body', step.path, output);
          }
        } else if (step.type === 'write' || step.type === 'security') {
          write(step.type === 'security' ? 'security' : step.targetType, step.targetField, output);
        } else if (step.type === 'assert') {
          const pass =
            step.operator === 'not-empty'
              ? output !== null && String(output).trim() !== ''
              : step.operator === 'contains'
                ? asText(output).includes(step.expectedValue ?? '')
                : String(output) === (step.expectedValue ?? '');
          if (!pass) throw new Error(`校验失败：${step.path || '$'} ${step.operator}`);
        }
      }
      context.signal?.throwIfAborted();
      runtime.results[step.id] = output;
      if (step.saveAs) write(step.scope === 'flow' ? 'flow' : 'variable', step.saveAs, output);
      if (step.type === 'extract' && !step.saveAs) throw new Error('请填写保存变量名');
      log(
        step,
        `${step.source || step.type}${step.path ? ` → ${step.path}` : ''}${step.type === 'write' || step.type === 'security' ? ` → ${step.targetType || 'security'}.${step.targetField}` : step.writeBack ? ' → 替换本次请求原字段' : step.saveAs ? ` → ${step.scope === 'flow' ? '流程' : '本次'}变量 ${step.saveAs}` : ' → 步骤结果'}`,
        'pass',
      );
    } catch (error) {
      delete runtime.results[step.id];
      if (error instanceof Error && 'response' in error) runtime.results[step.id] = error.response;
      if (step.saveAs)
        delete (step.scope === 'flow' ? runtime.flow : runtime.variables)[step.saveAs];
      context.signal?.throwIfAborted();
      log(step, error instanceof Error ? error.message : String(error), 'fail');
      if (step.failurePolicy === 'abort') throw error;
    }
  }
}

/** Executes pre-request steps against a disposable request snapshot.
 * @param config Ordered workflow steps.
 * @param context Request values and shared runtime.
 * @returns Final request values and runtime for this send only.
 */
export async function executePreRequestPipeline(
  config: PrePostPhaseConfig,
  context: WorkflowContext,
) {
  let body = context.body,
    headers = context.headers,
    queryParams = context.queryParams,
    pathParams = context.pathParams ?? [],
    formFields = context.formFields ?? [],
    urlEncodedFields = context.urlEncodedFields ?? [],
    cookies = context.cookies ?? [],
    securityValues = context.securityValues;
  const runtime = context.runtime ?? createWorkflowRuntime();
  await executeWorkflowSteps(config.steps, 'pre-request', {
    ...context,
    runtime,
    setBody: (value) => {
      body = value;
      context.setBody(value);
    },
    setHeaders: (value) => {
      headers = value;
      context.setHeaders(value);
    },
    setQueryParams: (value) => {
      queryParams = value;
      context.setQueryParams(value);
    },
    setPathParams: (value) => {
      pathParams = value;
      context.setPathParams?.(value);
    },
    setFormFields: (value) => {
      formFields = value;
      context.setFormFields?.(value);
    },
    setUrlEncodedFields: (value) => {
      urlEncodedFields = value;
      context.setUrlEncodedFields?.(value);
    },
    setCookies: (value) => {
      cookies = value;
      context.setCookies?.(value);
    },
    onSecurityValuesChange: (value) => {
      securityValues = value;
      context.onSecurityValuesChange?.(value);
    },
  });
  return {
    body,
    headers,
    queryParams,
    runtime,
    pathParams,
    formFields,
    urlEncodedFields,
    cookies,
    securityValues,
  };
}

/** Runs response processing while keeping the received HTTP response readable.
 * @param config Ordered workflow steps.
 * @param context Response, shared runtime and explicit authentication callbacks.
 * @returns Nothing; step errors remain visible in the console.
 */
export async function executePostResponsePipeline(
  config: PrePostPhaseConfig,
  context: Partial<WorkflowContext> & Pick<WorkflowContext, 'onLog' | 'response'>,
): Promise<void> {
  try {
    await executeWorkflowSteps(config.steps, 'post-response', {
      body: '',
      headers: [],
      queryParams: [],
      setBody: () => undefined,
      setHeaders: () => undefined,
      setQueryParams: () => undefined,
      ...context,
    });
  } catch {
    context.signal?.throwIfAborted();
  }
}
