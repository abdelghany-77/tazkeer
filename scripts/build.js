const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..');
const outDir = path.resolve(srcDir, 'www');

// Ensure outDir exists
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

const filesToCopy = [
  'index.html',
  'styles.css',
  'quran.css',
  'script.js',
  'quran.js',
  'prophets.js',
  'dailyDuas.js',
  'adhan-native.js',
  'manifest.json',
  'sw.js',
  'icon.png'
];

const dirsToCopy = [
  'images',
  'data',
  'audio'
];

// Copy individual files
for (const file of filesToCopy) {
  const src = path.join(srcDir, file);
  const dest = path.join(outDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${file}`);
  }
}

// Copy directories recursively
for (const dir of dirsToCopy) {
  const src = path.join(srcDir, dir);
  const dest = path.join(outDir, dir);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`Copied directory: ${dir}`);
  }
}

console.log('Build completed: Assets copied to www/ for Capacitor.');
