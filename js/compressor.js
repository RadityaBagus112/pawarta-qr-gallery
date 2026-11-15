// js/compressor.js

/**
 * Mengubah file gambar ukuran BERAPAPUN (5MB - 50MB+) menjadi 2 versi WebP HD ringan:
 * 1. fullBlob  : Resolusi HD sesuai paket (1440px / 1600px / 1920px), otomatis dijaga di bawah 1.5MB
 * 2. thumbBlob : Resolusi 420px (~35-45 KB) agar loading galeri super cepat
 */
export async function compressWeddingPhoto(file, maxDimension = 1600, quality = 0.84) {
  const { source, width, height, cleanup } = await loadImageSafe(file);

  try {
    // Hitung dimensi Full HD proporsional
    const fullScale = Math.min(1, maxDimension / Math.max(width, height));
    const fullW = Math.round(width * fullScale);
    const fullH = Math.round(height * fullScale);

    // Hitung dimensi Thumbnail proporsional (lebar maks 420px)
    const thumbScale = Math.min(1, 420 / Math.max(width, height));
    const thumbW = Math.round(width * thumbScale);
    const thumbH = Math.round(height * thumbScale);

    // Kompresi adaptif: jika hasil masih > 1.5 MB (misal foto panorama raksasa), turunkan kualitas sedikit
    let currentQuality = quality;
    let fullBlob = await renderToWebP(source, fullW, fullH, currentQuality);
    while (fullBlob.size > 1.5 * 1024 * 1024 && currentQuality > 0.5) {
      currentQuality -= 0.1;
      fullBlob = await renderToWebP(source, fullW, fullH, currentQuality);
    }

    const thumbBlob = await renderToWebP(source, thumbW, thumbH, 0.75);

    return {
      fullBlob,
      thumbBlob,
      originalSizeKB: Math.round(file.size / 1024),
      compressedSizeKB: Math.round(fullBlob.size / 1024)
    };
  } finally {
    cleanup();
  }
}

/**
 * Memuat gambar dengan aman untuk file raksasa sekalipun (dengan fallback HTMLImageElement)
 */
async function loadImageSafe(file) {
  try {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close()
    };
  } catch {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve({
          source: img,
          width: img.naturalWidth,
          height: img.naturalHeight,
          cleanup: () => URL.revokeObjectURL(url)
        });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("File gambar tidak dapat dibaca oleh browser"));
      };
      img.src = url;
    });
  }
}

function renderToWebP(source, targetWidth, targetHeight, quality) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

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