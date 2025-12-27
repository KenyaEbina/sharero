import { readdir, stat, readFile, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import sharp from 'sharp';

/**
 * ビルド時に画像を圧縮するViteプラグイン
 */
export function imageCompress(options = {}) {
	const {
		quality = 80, // JPEG品質（0-100）
		webpQuality = 80, // WebP品質（0-100）
		enableWebp = false, // WebP形式も生成するか
		include = /\.(jpg|jpeg|png)$/i, // 圧縮対象のファイル拡張子
		publicDir = 'public' // publicディレクトリのパス
	} = options;

	return {
		name: 'vite-plugin-image-compress',
		apply: 'build',
		async closeBundle() {
			const publicPath = join(process.cwd(), publicDir);
			await compressImages(publicPath, { quality, webpQuality, enableWebp, include });
		}
	};
}

/**
 * ディレクトリ内の画像を再帰的に圧縮
 */
async function compressImages(dir, options) {
	try {
		const entries = await readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(dir, entry.name);

			if (entry.isDirectory()) {
				// 再帰的にサブディレクトリを処理
				await compressImages(fullPath, options);
			} else if (entry.isFile() && options.include.test(entry.name)) {
				// 画像ファイルを圧縮
				await compressImage(fullPath, options);
			}
		}
	} catch (error) {
		console.error(`画像圧縮エラー (${dir}):`, error.message);
	}
}

/**
 * 個別の画像ファイルを圧縮
 */
async function compressImage(filePath, options) {
	try {
		const ext = extname(filePath).toLowerCase();
		const buffer = await readFile(filePath);
		const stats = await stat(filePath);
		const originalSize = stats.size;

		let compressedBuffer;
		let outputPath = filePath;

		if (ext === '.jpg' || ext === '.jpeg') {
			// JPEG圧縮
			compressedBuffer = await sharp(buffer)
				.jpeg({ quality: options.quality, mozjpeg: true })
				.toBuffer();
		} else if (ext === '.png') {
			// PNG圧縮
			compressedBuffer = await sharp(buffer)
				.png({ quality: options.quality, compressionLevel: 9 })
				.toBuffer();
		} else {
			return; // サポートされていない形式
		}

		// 圧縮後のサイズが元より小さい場合のみ上書き
		if (compressedBuffer.length < originalSize) {
			await writeFile(outputPath, compressedBuffer);
			const newSize = compressedBuffer.length;
			const reduction = ((originalSize - newSize) / originalSize * 100).toFixed(1);
			console.log(`✓ 圧縮: ${filePath} (${formatSize(originalSize)} → ${formatSize(newSize)}, ${reduction}%削減)`);
		} else {
			console.log(`⊘ スキップ: ${filePath} (圧縮効果なし)`);
		}

		// WebP形式も生成する場合
		if (options.enableWebp) {
			const webpPath = filePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
			const webpBuffer = await sharp(buffer)
				.webp({ quality: options.webpQuality })
				.toBuffer();
			await writeFile(webpPath, webpBuffer);
			console.log(`✓ WebP生成: ${webpPath} (${formatSize(webpBuffer.length)})`);
		}
	} catch (error) {
		console.error(`画像圧縮エラー (${filePath}):`, error.message);
	}
}

/**
 * バイト数を読みやすい形式に変換
 */
function formatSize(bytes) {
	if (bytes < 1024) return bytes + ' B';
	if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
	return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
