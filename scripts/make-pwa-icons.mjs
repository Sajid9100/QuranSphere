import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const L = [
  [1,0,0,0,0],
  [1,0,0,0,0],
  [1,0,0,0,0],
  [1,0,0,0,0],
  [1,0,0,0,0],
  [1,0,0,0,0],
  [1,1,1,1,1],
];
const F = [
  [1,1,1,1,1],
  [1,0,0,0,0],
  [1,0,0,0,0],
  [1,1,1,1,0],
  [1,0,0,0,0],
  [1,0,0,0,0],
  [1,0,0,0,0],
];

function makePng(size, bg, fg) {
  const stride = size * 3;
  const raw = Buffer.alloc(size * (stride + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (stride + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const i = row + 1 + x * 3;
      raw[i] = bg[0]; raw[i+1] = bg[1]; raw[i+2] = bg[2];
    }
  }
  const scale = Math.floor(size * 0.45 / 7);
  const letterW = 5 * scale;
  const gap = scale * 2;
  const totalW = letterW * 2 + gap;
  const totalH = 7 * scale;
  const xOff = Math.floor((size - totalW) / 2);
  const yOff = Math.floor((size - totalH) / 2);

  function draw(bitmap, sx) {
    for (let by = 0; by < 7; by++) for (let bx = 0; bx < 5; bx++) {
      if (!bitmap[by][bx]) continue;
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const x = sx + bx * scale + dx;
        const y = yOff + by * scale + dy;
        if (x < 0 || x >= size || y < 0 || y >= size) continue;
        const i = y * (stride + 1) + 1 + x * 3;
        raw[i] = fg[0]; raw[i+1] = fg[1]; raw[i+2] = fg[2];
      }
    }
  }
  draw(L, xOff);
  draw(F, xOff + letterW + gap);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const BG = [0x0a, 0x2e, 0x1e];
const FG = [0xc9, 0xa8, 0x4c];

writeFileSync('public/icons/icon-192.png', makePng(192, BG, FG));
writeFileSync('public/icons/icon-512.png', makePng(512, BG, FG));
console.log('Wrote public/icons/icon-192.png and icon-512.png');
