const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const svgPath = path.join(__dirname, '../public/logo.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  // Icon sizes needed for Windows ICO
  const sizes = [16, 24, 32, 48, 64, 128, 256];

  console.log('Generating PNG icons at various sizes...');

  // Generate PNGs at each size with blue background and padding
  const tempDir = path.join(__dirname, '../public/temp-icons');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const pngPaths = [];
  for (const size of sizes) {
    const padding = Math.round(size * 0.1);
    const innerSize = size - (padding * 2);

    const pngPath = path.join(tempDir, `icon-${size}.png`);
    await sharp(svgBuffer)
      .resize(innerSize, Math.round(innerSize * (516.77 / 1202.37)), { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 43, g: 71, b: 157, alpha: 255 } // #2b479d blue background
      })
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(pngPath);

    pngPaths.push(pngPath);
    console.log(`  Generated ${size}x${size} PNG`);
  }

  // Create ICO file from PNG files using dynamic import (ESM module)
  console.log('Creating ICO file...');
  const pngToIcoModule = await import('png-to-ico');
  const pngToIco = pngToIcoModule.default;
  const icoBuffer = await pngToIco(pngPaths);
  fs.writeFileSync(path.join(__dirname, '../public/icon.ico'), icoBuffer);

  // Clean up temp directory
  for (const p of pngPaths) fs.unlinkSync(p);
  fs.rmdirSync(tempDir);
  console.log('  Saved public/icon.ico');

  // Save a 256x256 PNG for use in the app sidebar
  console.log('Saving logo PNG for sidebar...');
  await sharp(svgBuffer)
    .resize(256, Math.round(256 * (516.77 / 1202.37)), { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(__dirname, '../public/logo.png'));
  console.log('  Saved public/logo.png');

  // Save a tray icon (32x32 PNG with blue background)
  console.log('Saving tray icon...');
  const trayPadding = 3;
  const trayInner = 32 - (trayPadding * 2);
  await sharp(svgBuffer)
    .resize(trayInner, Math.round(trayInner * (516.77 / 1202.37)), { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .extend({
      top: trayPadding,
      bottom: trayPadding,
      left: trayPadding,
      right: trayPadding,
      background: { r: 43, g: 71, b: 157, alpha: 255 }
    })
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toFile(path.join(__dirname, '../public/tray-icon.png'));
  console.log('  Saved public/tray-icon.png');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});

