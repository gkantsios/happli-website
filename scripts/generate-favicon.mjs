// Generates public/favicon.ico (16x16 and 32x32) from public/favicon-32.png.
// Run with: node scripts/generate-favicon.mjs
// The ICO holds PNG images, which every current browser supports.
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const SOURCE = 'public/favicon-32.png';
const sizes = [16, 32];

const images = await Promise.all(sizes.map((size) => sharp(SOURCE).resize(size, size).png().toBuffer()));

// ICONDIR header (6 bytes) + one ICONDIRENTRY (16 bytes) per image, then the PNG data.
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(images.length, 4);

let offset = 6 + 16 * images.length;
const entries = images.map((data, i) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(sizes[i], 0); // width
  entry.writeUInt8(sizes[i], 1); // height
  entry.writeUInt8(0, 2); // no palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(data.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += data.length;
  return entry;
});

await writeFile('public/favicon.ico', Buffer.concat([header, ...entries, ...images]));
console.log('Wrote public/favicon.ico');
