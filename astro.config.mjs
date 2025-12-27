// @ts-check
import { defineConfig } from 'astro/config';
import { imageCompress } from './vite-plugin-image-compress.js';

// https://astro.build/config
export default defineConfig({
	vite: {
		plugins: [
			imageCompress({
				quality: 80, // JPEG/PNG品質（0-100、数値が高いほど高品質）
				webpQuality: 80, // WebP品質
				enableWebp: false, // WebP形式も生成するか（trueにすると元の画像に加えて.webpファイルも生成）
				include: /\.(jpg|jpeg|png)$/i // 圧縮対象のファイル拡張子
			})
		]
	}
});
