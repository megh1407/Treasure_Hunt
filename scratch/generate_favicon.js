const fs = require("fs");
const path = require("path");

function generateFavicon() {
  const width = 16;
  const height = 16;
  
  // Create pixels: 16x16 BGRA (bottom-to-top)
  const pixelData = Buffer.alloc(width * height * 4);
  const maskData = Buffer.alloc(Math.ceil(width / 32) * 4 * height, 0); // 0 means opaque, 1 means transparent
  
  // Center is (7.5, 7.5)
  for (let y = 0; y < height; y++) {
    // Note: DIB is bottom-to-top, so y=0 is bottom
    const actualY = 15 - y;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = x - 7.5;
      const dy = actualY - 7.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist <= 7.0) {
        // Quest amber/gold diamond/star in center
        const isCenterDiamond = Math.abs(dx) + Math.abs(dy) <= 3.5;
        const isCenterCore = Math.abs(dx) + Math.abs(dy) <= 1.5;
        
        if (isCenterCore) {
          // Bright white-gold core
          pixelData[idx] = 0xff;     // B
          pixelData[idx + 1] = 0xfa; // G
          pixelData[idx + 2] = 0xf0; // R
          pixelData[idx + 3] = 0xff; // A
        } else if (isCenterDiamond) {
          // Amber/Gold
          pixelData[idx] = 0x08;     // B
          pixelData[idx + 1] = 0xb3; // G
          pixelData[idx + 2] = 0xea; // R
          pixelData[idx + 3] = 0xff; // A
        } else {
          // Dark indigo / cyan quest background
          pixelData[idx] = 0x4b;     // B
          pixelData[idx + 1] = 0x1b; // G
          pixelData[idx + 2] = 0x1e; // R
          pixelData[idx + 3] = 0xff; // A
        }
      } else {
        // Transparent
        pixelData[idx] = 0;
        pixelData[idx + 1] = 0;
        pixelData[idx + 2] = 0;
        pixelData[idx + 3] = 0;
        
        // Mark transparent in 1-bit mask
        const maskRowBytes = Math.ceil(width / 32) * 4;
        const maskByteIdx = y * maskRowBytes + Math.floor(x / 8);
        const maskBitIdx = 7 - (x % 8);
        maskData[maskByteIdx] |= (1 << maskBitIdx);
      }
    }
  }
  
  const dibHeader = Buffer.alloc(40);
  dibHeader.writeUInt32LE(40, 0); // biSize
  dibHeader.writeInt32LE(width, 4); // biWidth
  dibHeader.writeInt32LE(height * 2, 8); // biHeight (double for icon: XOR + AND masks)
  dibHeader.writeUInt16LE(1, 12); // biPlanes
  dibHeader.writeUInt16LE(32, 14); // biBitCount
  dibHeader.writeUInt32LE(0, 16); // biCompression BI_RGB
  dibHeader.writeUInt32LE(pixelData.length + maskData.length, 20); // biSizeImage
  dibHeader.writeInt32LE(0, 24); // biXPelsPerMeter
  dibHeader.writeInt32LE(0, 28); // biYPelsPerMeter
  dibHeader.writeUInt32LE(0, 32); // biClrUsed
  dibHeader.writeUInt32LE(0, 36); // biClrImportant
  
  const totalResSize = dibHeader.length + pixelData.length + maskData.length;
  
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Icon type
  icoHeader.writeUInt16LE(1, 4); // 1 image
  
  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(width, 0);
  dirEntry.writeUInt8(height, 1);
  dirEntry.writeUInt8(0, 2); // Color palette
  dirEntry.writeUInt8(0, 3); // Reserved
  dirEntry.writeUInt16LE(1, 4); // Planes
  dirEntry.writeUInt16LE(32, 6); // Bit count
  dirEntry.writeUInt32LE(totalResSize, 8); // Bytes in res
  dirEntry.writeUInt32LE(22, 12); // Image offset (6 + 16)
  
  const icoBuffer = Buffer.concat([icoHeader, dirEntry, dibHeader, pixelData, maskData]);
  
  const targetPath = path.resolve(__dirname, "../frontend/public/favicon.ico");
  fs.writeFileSync(targetPath, icoBuffer);
  console.log(`Favicon successfully written to ${targetPath} (${icoBuffer.length} bytes)`);
}

generateFavicon();
