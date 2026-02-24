import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputSvg = 'static/kr_logo.svg';
const outputDir = 'static';

async function generate() {
	console.log('Generating high-resolution icons (Cover fit)...');

	const svgBuffer = fs.readFileSync(inputSvg);

	// Sizes for various platforms
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
		// We use fit: 'cover' or just ignore aspect ratio to force fill if the browser allows non-square
		// But favicons should be square. Cover will ensure the symbol fills the square.
		await sharp(svgBuffer)
			.resize(size, size, {
				fit: 'cover'
			})
			.png()
			.toFile(path.join(outputDir, name));
		console.log(`  Created ${name}`);
	}

	console.log('Icons generated successfully.');
}

generate().catch(console.error);
