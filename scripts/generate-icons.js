const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outputDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background with rounded corners (simulate)
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, size, size);

  // Terminal window
  const pad = size * 0.1;
  const winY = size * 0.15;
  const winH = size * 0.7;

  // Window background
  ctx.fillStyle = '#16213e';
  ctx.fillRect(pad, winY, size - pad * 2, winH);

  // Title bar
  ctx.fillStyle = '#0f3460';
  ctx.fillRect(pad, winY, size - pad * 2, size * 0.1);

  // Window dots
  const dotR = size * 0.02;
  const dotY = winY + size * 0.05;

  ctx.fillStyle = '#e94560';
  ctx.beginPath();
  ctx.arc(pad + size * 0.08, dotY, dotR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f39c12';
  ctx.beginPath();
  ctx.arc(pad + size * 0.14, dotY, dotR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#10ac84';
  ctx.beginPath();
  ctx.arc(pad + size * 0.20, dotY, dotR, 0, Math.PI * 2);
  ctx.fill();

  // Terminal prompt symbol
  ctx.fillStyle = '#10ac84';
  ctx.font = `bold ${size * 0.25}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('>_', size / 2, size * 0.55);

  return canvas;
}

sizes.forEach(size => {
  const canvas = drawIcon(size);
  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(outputDir, `icon-${size}.png`);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated: icon-${size}.png`);
});

console.log('All icons generated!');
