// convert_icons.js — Converts SVG icons to PNG using sharp
// Usage: npm install sharp && node convert_icons.js

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'icons');
const sizes = [16, 48, 128];

async function convert() {
  for (const size of sizes) {
    const svgPath = path.join(iconsDir, `icon${size}.svg`);
    const pngPath = path.join(iconsDir, `icon${size}.png`);

    if (!fs.existsSync(svgPath)) {
      console.log(`SVG not found: ${svgPath}. Run generate_icons.js first.`);
      continue;
    }

    await sharp(svgPath).resize(size, size).png().toFile(pngPath);
    console.log(`Created icon${size}.png`);
  }
  console.log('Done! All icons converted.');
}

convert().catch(console.error);
