import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputSvg = 'static/kr_logo.svg';
const outputDir = 'static';

async function generate() {
	console.log('Generating high-resolution icons (Scaled down 25%)...');

	const svgBuffer = fs.readFileSync(inputSvg);

	const sizes = [
		{ size: 16, name: 'favicon-16x16.png' },
		{ size: 32, name: 'favicon-32x32.png' },
		{ size: 48, name: 'favicon-48x48.png' },
		{ size: 64, name: 'favicon-64x64.png' },
		{ size: 128, name: 'favicon-128x128.png' },
		{ size: 180, name: 'apple-touch-icon.png' },
		{ size: 192, name: 'icon-192x192.png' },
		{ size: 512, name: 'icon-512x512.png' }
	];

	for (const { size, name } of sizes) {
		// Scale down by 25% (i.e. image takes up 75% of the total canvas size)
		const innerSize = Math.round(size * 0.75);
		const pad = Math.round((size - innerSize) / 2);

		await sharp(svgBuffer)
			.resize(innerSize, innerSize, {
				fit: 'contain',
				background: { r: 0, g: 0, b: 0, alpha: 0 }
			})
			.extend({
				top: pad,
				bottom: size - innerSize - pad,
				left: pad,
				right: size - innerSize - pad,
				background: { r: 0, g: 0, b: 0, alpha: 0 }
			})
			.png()
			.toFile(path.join(outputDir, name));
		console.log(`  Created ${name}`);
	}

	// Generate a maskable icon specifically for Android splash screens with an opaque white background
	// so it doesn't inherit a dark background automatically from the OS.
	const maskableSize = 512;
	const innerMaskable = Math.round(maskableSize * 0.75);
	const padMaskable = Math.round((maskableSize - innerMaskable) / 2);

	await sharp(svgBuffer)
		.resize(innerMaskable, innerMaskable, {
			fit: 'contain',
			background: { r: 255, g: 255, b: 255, alpha: 1 }
		})
		.extend({
			top: padMaskable,
			bottom: maskableSize - innerMaskable - padMaskable,
			left: padMaskable,
			right: maskableSize - innerMaskable - padMaskable,
			background: { r: 255, g: 255, b: 255, alpha: 1 } // Opaque white background
		})
		.png()
		.toFile(path.join(outputDir, 'icon-512x512-maskable.png'));
	console.log(`  Created icon-512x512-maskable.png`);

	console.log('Icons generated successfully.');
}

generate().catch(console.error);
