/**
 * Generates the full PWA icon set for Eternal Fitness from a single vector source.
 *
 *   bun run scripts/generate-icons.mjs
 *
 * Produces everything under public/: the app icons (regular + maskable), the
 * Apple touch icon, iOS splash screens, the favicon and the monochrome badge
 * used by push notifications.
 *
 * The mark is a barbell rendered in molten forge gradient — see .impeccable.md
 * for the design direction it comes from.
 */
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const ICONS = path.join(PUBLIC, 'icons');
const SPLASH = path.join(PUBLIC, 'splash');

// Design tokens, mirrored from tailwind.config.js
const FORGE_300 = '#f5b76a';
const FORGE_400 = '#f19737';
const FORGE_500 = '#ed7b16';
const FORGE_600 = '#de6009';
const EMBER_600 = '#dc2626';
const SURFACE_0 = '#0a0a09';
const SURFACE_100 = '#1a1918';

/**
 * The barbell mark, drawn in a 512x512 coordinate space centred on (256, 256).
 * `glow` adds the ambient heat behind the bar; disabled for the flat monochrome
 * variants where it would just turn into mud.
 */
function mark({ fill = 'url(#molten)', glow = true } = {}) {
  return `
    ${glow ? `<circle cx="256" cy="256" r="150" fill="url(#heat)" />` : ''}
    <g fill="${fill}">
      <!-- bar -->
      <rect x="96" y="240" width="320" height="32" rx="16" />
      <!-- inner plates -->
      <rect x="150" y="178" width="38" height="156" rx="12" />
      <rect x="324" y="178" width="38" height="156" rx="12" />
      <!-- outer plates -->
      <rect x="112" y="202" width="30" height="108" rx="10" />
      <rect x="370" y="202" width="30" height="108" rx="10" />
      <!-- sleeve caps -->
      <rect x="90" y="226" width="14" height="60" rx="7" />
      <rect x="408" y="226" width="14" height="60" rx="7" />
    </g>`;
}

function defs({ glow = true } = {}) {
  return `
  <defs>
    <linearGradient id="molten" x1="96" y1="170" x2="416" y2="342" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${FORGE_300}" />
      <stop offset="0.35" stop-color="${FORGE_500}" />
      <stop offset="0.72" stop-color="${FORGE_600}" />
      <stop offset="1" stop-color="${EMBER_600}" />
    </linearGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${SURFACE_100}" />
      <stop offset="1" stop-color="${SURFACE_0}" />
    </linearGradient>
    ${
      glow
        ? `<radialGradient id="heat" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${FORGE_500}" stop-opacity="0.45" />
      <stop offset="0.55" stop-color="${FORGE_600}" stop-opacity="0.14" />
      <stop offset="1" stop-color="${FORGE_600}" stop-opacity="0" />
    </radialGradient>`
        : ''
    }
  </defs>`;
}

/** Rising embers, echoing the AnimatedBackground particle system. */
const embers = `
  <g fill="${FORGE_400}">
    <circle cx="150" cy="118" r="7" opacity="0.55" />
    <circle cx="342" cy="96" r="5" opacity="0.4" />
    <circle cx="262" cy="132" r="4" opacity="0.3" />
    <circle cx="196" cy="404" r="5" opacity="0.35" />
    <circle cx="330" cy="392" r="7" opacity="0.5" />
  </g>`;

/** Full-bleed icon with rounded corners — the standard app icon. */
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
${defs()}
  <rect width="512" height="512" rx="114" fill="url(#bg)" />
  <rect width="512" height="512" rx="114" fill="none" stroke="${FORGE_600}" stroke-opacity="0.28" stroke-width="4" />
${embers}
${mark()}
</svg>`;

/**
 * Maskable icon: square bleed (the platform crops it) with the mark pulled in to
 * 62% so it survives an aggressive circle mask. Per the spec the safe zone is the
 * centred circle of diameter 80%.
 */
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
${defs()}
  <rect width="512" height="512" fill="url(#bg)" />
  <g transform="translate(256 256) scale(0.62) translate(-256 -256)">
${embers}
${mark()}
  </g>
</svg>`;

/** Monochrome badge for notifications — must be a flat alpha mask. */
const monochromeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <g transform="translate(256 256) scale(0.86) translate(-256 -256)">
${mark({ fill: '#ffffff', glow: false })}
  </g>
</svg>`;

/** Transparent-background mark, for use inside the app UI and splash screens. */
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
${defs({ glow: false })}
${mark({ glow: false })}
</svg>`;

const ICON_SIZES = [48, 64, 72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512, 1024];
const MASKABLE_SIZES = [192, 512, 1024];

/**
 * iOS still ignores the manifest for launch images, so each device size needs its
 * own link tag and its own bitmap. Portrait only — the app locks to portrait.
 */
const SPLASH_SCREENS = [
  { w: 1179, h: 2556, name: 'iphone-15-pro' },
  { w: 1290, h: 2796, name: 'iphone-15-pro-max' },
  { w: 1170, h: 2532, name: 'iphone-13' },
  { w: 1284, h: 2778, name: 'iphone-13-pro-max' },
  { w: 1125, h: 2436, name: 'iphone-x' },
  { w: 1242, h: 2688, name: 'iphone-xs-max' },
  { w: 828, h: 1792, name: 'iphone-xr' },
  { w: 750, h: 1334, name: 'iphone-8' },
  { w: 1242, h: 2208, name: 'iphone-8-plus' },
  { w: 1536, h: 2048, name: 'ipad' },
  { w: 1668, h: 2224, name: 'ipad-pro-10' },
  { w: 1668, h: 2388, name: 'ipad-pro-11' },
  { w: 2048, h: 2732, name: 'ipad-pro-12' },
];

async function main() {
  await rm(ICONS, { recursive: true, force: true });
  await rm(SPLASH, { recursive: true, force: true });
  await mkdir(ICONS, { recursive: true });
  await mkdir(SPLASH, { recursive: true });

  // Vector sources stay in the repo so the set can be regenerated or restyled.
  await writeFile(path.join(ICONS, 'icon.svg'), iconSvg);
  await writeFile(path.join(ICONS, 'icon-maskable.svg'), maskableSvg);
  await writeFile(path.join(ICONS, 'monochrome.svg'), monochromeSvg);
  await writeFile(path.join(ICONS, 'mark.svg'), markSvg);

  const iconBuf = Buffer.from(iconSvg);
  const maskBuf = Buffer.from(maskableSvg);

  for (const size of ICON_SIZES) {
    await sharp(iconBuf, { density: 384 })
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(path.join(ICONS, `icon-${size}.png`));
  }

  for (const size of MASKABLE_SIZES) {
    await sharp(maskBuf, { density: 384 })
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(path.join(ICONS, `maskable-${size}.png`));
  }

  await sharp(Buffer.from(monochromeSvg), { density: 384 })
    .resize(96, 96)
    .png({ compressionLevel: 9 })
    .toFile(path.join(ICONS, 'badge-96.png'));

  // Apple touch icon must be opaque and un-rounded; iOS applies its own mask.
  await sharp(iconBuf, { density: 384 })
    .resize(180, 180)
    .flatten({ background: SURFACE_0 })
    .png({ compressionLevel: 9 })
    .toFile(path.join(PUBLIC, 'apple-touch-icon.png'));

  // Favicons. .ico carries 16/32/48 so browsers and OS chrome each get a crisp one.
  await sharp(iconBuf, { density: 384 })
    .resize(32, 32)
    .png({ compressionLevel: 9 })
    .toFile(path.join(PUBLIC, 'favicon-32.png'));
  await sharp(iconBuf, { density: 384 })
    .resize(16, 16)
    .png({ compressionLevel: 9 })
    .toFile(path.join(PUBLIC, 'favicon-16.png'));
  await writeFile(path.join(PUBLIC, 'icon.svg'), iconSvg);

  // Splash screens: the mark centred on the forge background at ~38% of the
  // short edge, which is roughly where iOS puts app launch art.
  for (const { w, h, name } of SPLASH_SCREENS) {
    const markSize = Math.round(Math.min(w, h) * 0.38);
    const markPng = await sharp(Buffer.from(markSvg), { density: 384 })
      .resize(markSize, markSize)
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: w,
        height: h,
        channels: 4,
        background: SURFACE_0,
      },
    })
      .composite([{ input: markPng, gravity: 'center' }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(SPLASH, `${name}.png`));
  }

  console.log(
    `Generated ${ICON_SIZES.length} icons, ${MASKABLE_SIZES.length} maskable, ` +
      `${SPLASH_SCREENS.length} splash screens.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
