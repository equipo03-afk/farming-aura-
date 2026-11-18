export interface ProcessedImage {
  dataUrl: string;
  base64: string;
  mimeType: string;
  thumbnailDataUrl: string;
}

const MAX_RAW_FILE_BYTES = 20 * 1024 * 1024; // 20 MB raw file cap
const MAX_UPLOAD_BASE64_BYTES = 1.5 * 1024 * 1024; // Compact JPEG upload for mobile & proxy reliability

function renderToCanvas(
  source: HTMLImageElement | HTMLVideoElement,
  srcWidth: number,
  srcHeight: number,
  maxDimension: number,
  quality: number
): string {
  const scale = Math.min(1, maxDimension / Math.max(srcWidth, srcHeight));
  const width = Math.max(1, Math.round(srcWidth * scale));
  const height = Math.max(1, Math.round(srcHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo procesar la imagen en el lienzo.');
  }
  ctx.drawImage(source, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function processImageFile(file: File): Promise<ProcessedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen válida (usa JPG, PNG o WEBP).');
  }

  if (file.size > MAX_RAW_FILE_BYTES) {
    throw new Error('La fotografía supera el límite de 20 MB. Elige una imagen más ligera.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () =>
        reject(new Error('No se pudo decodificar la fotografía seleccionada. Prueba con JPG o PNG.'));
      el.src = objectUrl;
    });

    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
      throw new Error('La imagen parece estar dañada o vacía.');
    }

    let dataUrl = renderToCanvas(img, img.naturalWidth, img.naturalHeight, 1024, 0.82);
    let base64 = dataUrl.split(',')[1] || '';

    // Secondary compression pass if image is unusually dense
    if (base64.length * 0.75 > MAX_UPLOAD_BASE64_BYTES) {
      dataUrl = renderToCanvas(img, img.naturalWidth, img.naturalHeight, 768, 0.72);
      base64 = dataUrl.split(',')[1] || '';
    }

    const thumbnailDataUrl = renderToCanvas(img, img.naturalWidth, img.naturalHeight, 320, 0.65);

    return {
      dataUrl,
      base64,
      mimeType: 'image/jpeg',
      thumbnailDataUrl,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function captureVideoFrame(video: HTMLVideoElement, mirrored = false): ProcessedImage {
  if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    throw new Error('La cámara aún se está inicializando. Espera un instante e inténtalo de nuevo.');
  }

  const width = video.videoWidth;
  const height = video.videoHeight;

  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1024 / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo capturar el fotograma de la cámara.');
  }

  if (mirrored) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.86);

  const thumbCanvas = document.createElement('canvas');
  const thumbScale = Math.min(1, 320 / Math.max(width, height));
  thumbCanvas.width = Math.max(1, Math.round(width * thumbScale));
  thumbCanvas.height = Math.max(1, Math.round(height * thumbScale));
  const thumbCtx = thumbCanvas.getContext('2d');
  if (thumbCtx) {
    thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  }
  const thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.65);

  return {
    dataUrl,
    base64: dataUrl.split(',')[1] || '',
    mimeType: 'image/jpeg',
    thumbnailDataUrl,
  };
}
