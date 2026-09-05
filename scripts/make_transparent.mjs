import sharp from 'sharp';
import fs from 'fs';

async function processOne(inputPath, outputPath) {
  console.log('Processing:', inputPath);
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels; // 4 (RGBA)

  // Check top-left corner color to know if background is black or white
  const cornerR = data[0];
  const cornerG = data[1];
  const cornerB = data[2];
  const isWhiteBg = cornerR > 200 && cornerG > 200 && cornerB > 200;

  console.log(`Detected background: ${isWhiteBg ? 'WHITE' : 'BLACK'} for ${inputPath}`);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      if (isWhiteBg) {
        // White background removal
        const minVal = Math.min(r, g, b);
        if (minVal > 248) {
          data[idx + 3] = 0;
        } else if (minVal > 230) {
          data[idx + 3] = Math.round(((248 - minVal) / 18) * 255);
        }
      } else {
        // Black background removal
        const maxVal = Math.max(r, g, b);
        if (maxVal < 6) {
          data[idx + 3] = 0;
        } else if (maxVal < 25) {
          data[idx + 3] = Math.round(((maxVal - 5) / 20) * 255);
        }
      }
    }
  }

  await sharp(data, {
    raw: {
      width,
      height,
      channels: 4
    }
  })
  .png({ compressionLevel: 9 })
  .toFile(outputPath);

  console.log('Done! Saved to:', outputPath);
}

async function main() {
  const brainPath = 'C:/Users/jakaa/.gemini/antigravity-ide/brain/4e4de079-ab0d-413d-824b-4b0010e62d61';
  
  // Engineer pose
  const engineerSrc = `${brainPath}/mascot_xepti_engineer_1787479818552.jpg`;
  if (fs.existsSync(engineerSrc)) {
    fs.copyFileSync(engineerSrc, 'public/mascot/xepti_engineer.jpg');
    await processOne('public/mascot/xepti_engineer.jpg', 'public/mascot/xepti_engineer_transparent.png');
  }
}

main().catch(console.error);
