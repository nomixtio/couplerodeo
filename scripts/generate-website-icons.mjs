import { copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = join(root, 'public/icons');
const assetsDir = join(root, 'website/public/assets');

const copies = [
	['icon-192.png', 'icon-192.png'],
	['favicon-32.png', 'favicon.png'],
	['icon-180.png', 'apple-touch-icon.png'],
];

for (const [src, dest] of copies) {
	copyFileSync(join(iconsDir, src), join(assetsDir, dest));
	console.log(`copied ${src} → assets/${dest}`);
}
