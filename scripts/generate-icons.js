const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const rootDir = path.resolve(__dirname, "..");
const sourceIcon = path.join(rootDir, "images", "icon.png");
const resDir = path.join(rootDir, "android", "app", "src", "main", "res");

const launcherDensities = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

const adaptiveDensities = {
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432,
};

const notificationDensities = {
  mdpi: 24,
  hdpi: 36,
  xhdpi: 48,
  xxhdpi: 72,
  xxxhdpi: 96,
};

function circleMask(size) {
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
  );
}

function notificationSvg() {
  return `<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <mask id="crescent">
        <rect width="96" height="96" fill="#000"/>
        <circle cx="43" cy="50" r="27" fill="#fff"/>
        <circle cx="57" cy="42" r="24" fill="#000"/>
      </mask>
    </defs>
    <circle cx="43" cy="50" r="27" fill="#fff" mask="url(#crescent)"/>
    <path d="M68 23l3.1 6.3 7 1-5.1 4.9 1.2 7-6.2-3.3-6.2 3.3 1.2-7-5.1-4.9 7-1z" fill="#fff"/>
  </svg>`;
}

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function generate() {
  if (!fs.existsSync(sourceIcon)) {
    throw new Error(`Source icon not found: ${sourceIcon}`);
  }

  for (const [density, size] of Object.entries(launcherDensities)) {
    const dir = path.join(resDir, `mipmap-${density}`);
    await ensureDir(dir);

    await sharp(sourceIcon)
      .resize(size, size, { fit: "cover" })
      .png()
      .toFile(path.join(dir, "ic_launcher.png"));

    await sharp(sourceIcon)
      .resize(size, size, { fit: "cover" })
      .composite([{ input: circleMask(size), blend: "dest-in" }])
      .png()
      .toFile(path.join(dir, "ic_launcher_round.png"));

    const adaptiveSize = adaptiveDensities[density];
    const innerSize = Math.round(adaptiveSize * 0.68);
    const innerIcon = await sharp(sourceIcon)
      .resize(innerSize, innerSize, { fit: "cover" })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: adaptiveSize,
        height: adaptiveSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: innerIcon,
          left: Math.round((adaptiveSize - innerSize) / 2),
          top: Math.round((adaptiveSize - innerSize) / 2),
        },
      ])
      .png()
      .toFile(path.join(dir, "ic_launcher_foreground.png"));

    console.log(`Generated launcher icons: mipmap-${density}`);
  }

  for (const [density, size] of Object.entries(notificationDensities)) {
    const dir = path.join(resDir, `drawable-${density}`);
    await ensureDir(dir);
    await sharp(Buffer.from(notificationSvg()), { density: 384 })
      .resize(size, size, { fit: "contain" })
      .png()
      .toFile(path.join(dir, "ic_stat_name.png"));
  }

  await ensureDir(path.join(resDir, "drawable"));
  await sharp(Buffer.from(notificationSvg()), { density: 384 })
    .resize(96, 96, { fit: "contain" })
    .png()
    .toFile(path.join(resDir, "drawable", "ic_stat_name.png"));

  console.log("Generated notification icons: ic_stat_name.png");
}

generate().catch((error) => {
  console.error(error);
  process.exit(1);
});
