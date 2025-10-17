const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '../dist');
const assetsSrc = path.join(distPath, 'assets/assets/images');
const assetsDest = path.join(distPath, 'assets/images');

console.log('Fixing asset paths...');
console.log('Source:', assetsSrc);
console.log('Destination:', assetsDest);

if (fs.existsSync(assetsSrc)) {
  // Create destination directory
  if (!fs.existsSync(assetsDest)) {
    fs.mkdirSync(assetsDest, { recursive: true });
  }
  
  // Copy all files and create non-hashed versions
  const files = fs.readdirSync(assetsSrc);
  console.log('Found files:', files.length);
  
  files.forEach(file => {
    if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
      const srcFile = path.join(assetsSrc, file);
      
      // Extract original filename by removing the hash
      // Format: filename.hash.png -> filename.png
      const parts = file.split('.');
      
      let originalName;
      if (parts.length >= 3) {
        // Standard pattern: filename.hash.png
        originalName = parts[0] + '.' + parts[parts.length - 1];
      } else {
        // No hash pattern, use original name
        originalName = file;
      }
      
      const destFile = path.join(assetsDest, originalName);
      
      fs.copyFileSync(srcFile, destFile);
      console.log('✅ Copied ' + file + ' to ' + originalName);
    }
  });
  
  // MANUALLY COPY MISSING SPRITE SHEETS
  const missingSpriteSheets = [
    'NBA120.png',
    'Overwatch75.png', 
    'spritesheet_lol.png',
    'spritesheet_pokemon21.png',
    'solved_border_default.png'
  ];
  
  missingSpriteSheets.forEach(sheet => {
    const sourcePath = path.join(__dirname, '../assets/images', sheet);
    const destPath = path.join(assetsDest, sheet);
    
    if (fs.existsSync(sourcePath) && !fs.existsSync(destPath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log('✅ Manually copied sprite sheet: ' + sheet);
    }
  });
  
  console.log('✅ Asset fixing complete!');
} else {
  console.log('❌ Source assets folder not found:', assetsSrc);
}