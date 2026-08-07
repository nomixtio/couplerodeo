import { copyFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = join(root, 'public/icons');
const assetsDir = join(root, 'website/public/assets');
const sourcePath = join(iconsDir, 'logo-source.png');

const iconSizes = [
	{ name: 'favicon-16.png', size: 16 },
	{ name: 'favicon-32.png', size: 32 },
	{ name: 'icon-180.png', size: 180 },
	{ name: 'icon-192.png', size: 192 },
	{ name: 'icon-512.png', size: 512 },
];

const master = await sharp(sourcePath)
	.resize(512, 512, { kernel: sharp.kernel.lanczos3 })
	.png()
	.toBuffer();

for (const { name, size } of iconSizes) {
	const outPath = join(iconsDir, name);
	const png =
		size === 512
			? master
			: await sharp(master).resize(size, size, { kernel: sharp.kernel.lanczos3 }).png().toBuffer();
	writeFileSync(outPath, png);
	console.log(`wrote ${outPath} (${size}x${size})`);
}

writeFileSync(join(root, 'public/favicon.png'), await sharp(master).resize(32, 32).png().toBuffer());
console.log('wrote public/favicon.png');

const websiteCopies = [
	['icon-192.png', 'icon-192.png'],
	['favicon-32.png', 'favicon.png'],
	['icon-180.png', 'apple-touch-icon.png'],
];

for (const [src, dest] of websiteCopies) {
	copyFileSync(join(iconsDir, src), join(assetsDir, dest));
	console.log(`copied ${src} → website/public/assets/${dest}`);
}
