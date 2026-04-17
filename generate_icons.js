// generate_icons.js — Run with Node.js to create icon PNGs
// Usage: node generate_icons.js
// Requires: npm install canvas (or use the SVG files directly)

const fs = require('fs');
const path = require('path');

// Simple SVG icon generator — creates SVG icons that Chrome can use
// Chrome doesn't natively support SVG icons in manifest, so we'll create 
// simple data-URL PNGs using a canvas approach or use the SVGs as-is for development.

const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

for (const size of sizes) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4f8ef7;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3ecfb2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="24" fill="url(#bg)"/>
  <text x="64" y="82" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="white" text-anchor="middle">✦</text>
</svg>`;
  
  fs.writeFileSync(path.join(iconsDir, `icon${size}.svg`), svg);
  console.log(`Created icon${size}.svg`);
}

console.log('\nNote: Chrome Manifest V3 requires PNG icons. Convert the SVGs to PNGs using:');
console.log('  - An online converter (e.g., cloudconvert.com/svg-to-png)');
console.log('  - Or install sharp: npm install sharp && node convert_icons.js');
console.log('\nThe extension will work without icons (Chrome shows a default letter icon).');
