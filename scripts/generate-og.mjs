// Generates public/og-default.png (1200x630), the placeholder social share image.
// Run with: node scripts/generate-og.mjs
// Replace the output with a designed image when one exists.
import sharp from 'sharp';

const W = 1200;
const H = 630;
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="0.5" cy="1.1" r="0.7">
      <stop offset="0" stop-color="#F4707A" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#F4707A" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="#F6E9E4"/>
  <rect width="100%" height="100%" fill="url(#glow)"/>
  <text x="80" y="300" font-family="Georgia, 'Times New Roman', serif" font-size="76" fill="#1B1614" letter-spacing="-1.5">Your front desk,</text>
  <text x="80" y="392" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="76" fill="#1B1614" letter-spacing="-1.5">down to one short list.</text>
  <text x="82" y="480" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#4A423E">Online booking, deposits and reminders for spray tan studios</text>
</svg>`;

const logo = await sharp('src/assets/logo-coral.png').resize({ height: 64 }).toBuffer();

await sharp(Buffer.from(svg))
  .composite([{ input: logo, left: 80, top: 80 }])
  .png({ compressionLevel: 9 })
  .toFile('public/og-default.png');

console.log('Wrote public/og-default.png');
