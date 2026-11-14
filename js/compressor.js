// js/compressor.js

/**
 * Mengubah file gambar asli menjadi 2 versi WebP ringan:
 * 1. fullBlob  : Resolusi HD sesuai paket (1440px / 1600px / 1920px) untuk tampilan penuh & Google Drive
 * 2. thumbBlob : Resolusi 420px (~35-45 KB) agar loading grid galeri super cepat
 */
export async function compressWeddingPhoto(file, maxDimension = 1600, quality = 0.84) {
  const imageBitmap = await createImageBitmap(file);
  const { width, height } = imageBitmap;

  // Hitung dimensi Full HD proporsional
  const fullScale = Math.min(1, maxDimension / Math.max(width, height));
  const fullW = Math.round(width * fullScale);
  const fullH = Math.round(height * fullScale);

  // Hitung dimensi Thumbnail proporsional (lebar maks 420px)
  const thumbScale = Math.min(1, 420 / Math.max(width, height));
  const thumbW = Math.round(width * thumbScale);
  const thumbH = Math.round(height * thumbScale);

  const fullBlob = await renderToWebP(imageBitmap, fullW, fullH, quality);
  const thumbBlob = await renderToWebP(imageBitmap, thumbW, thumbH, 0.75);

  imageBitmap.close();

  return {
    fullBlob,
    thumbBlob,
    originalSizeKB: Math.round(file.size / 1024),
    compressedSizeKB: Math.round(fullBlob.size / 1024)
  };
}

function renderToWebP(bitmap, targetWidth, targetHeight, quality) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Gagal mengonversi gambar ke WebP"));
        resolve(blob);
      },
      "image/webp",
      quality
    );
  });
}