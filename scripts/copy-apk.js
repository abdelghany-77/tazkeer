const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const apkOutput = path.join(rootDir, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const apkDir = path.join(rootDir, 'apk');

if (!fs.existsSync(apkDir)) {
  fs.mkdirSync(apkDir, { recursive: true });
}

if (fs.existsSync(apkOutput)) {
  const destArabic = path.join(apkDir, 'ذَكِّرْ.apk');

  fs.copyFileSync(apkOutput, destArabic);

  const stats = fs.statSync(apkOutput);
  console.log(`\n========================================`);
  console.log(`✓ APK successfully built & published:`);
  console.log(`  - ${destArabic} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`========================================\n`);
} else {
  console.warn(`[Warning] Built APK not found at: ${apkOutput}`);
}

