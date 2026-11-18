import { AuraScanResult, Language, classifyAuraScore, formatAuraScore } from '../types/aura';

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
): number {
  const words = text.split(/\s+/);
  let line = '';
  let currentY = y;
  let lineCount = 0;

  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = words[i];
      currentY += lineHeight;
      lineCount++;
      if (lineCount >= maxLines - 1) {
        const remaining = [line, ...words.slice(i + 1)].join(' ');
        let clipped = remaining;
        while (ctx.measureText(`${clipped}...`).width > maxWidth && clipped.length > 0) {
          clipped = clipped.slice(0, -1);
        }
        ctx.fillText(clipped === remaining ? clipped : `${clipped}...`, x, currentY);
        return currentY + lineHeight;
      }
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

export async function generateAuraShareCard(
  scan: AuraScanResult & { imageDataUrl: string; handle: string },
  lang: Language
): Promise<{ blob: Blob; dataUrl: string }> {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Fallback to system fonts if FontFaceSet rejects
    }
  }

  const width = 1080;
  const height = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D no disponible.');

  const tier = classifyAuraScore(scan.score);
  const accent = tier.accentColor;

  // Obsidian background
  ctx.fillStyle = '#131318';
  ctx.fillRect(0, 0, width, height);

  // Subtle CRT cyber grid
  ctx.strokeStyle = 'rgba(0, 228, 120, 0.06)';
  ctx.lineWidth = 1;
  for (let gx = 0; gx < width; gx += 32) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, height);
    ctx.stroke();
  }
  for (let gy = 0; gy < height; gy += 32) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(width, gy);
    ctx.stroke();
  }

  // Hard neo-brutalist offset card
  ctx.fillStyle = '#571bc1';
  ctx.fillRect(54, 54, width - 92, height - 92);

  ctx.fillStyle = '#0e0e13';
  ctx.fillRect(42, 42, width - 92, height - 92);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(42, 42, width - 92, height - 92);

  // Header Strip
  ctx.fillStyle = '#1f1f25';
  ctx.fillRect(72, 72, width - 152, 74);
  ctx.fillStyle = '#00e478';
  ctx.font = '800 28px Syne, sans-serif';
  ctx.fillText('⚡ AURA SCANNER', 98, 118);

  ctx.fillStyle = '#d0bcff';
  ctx.font = '800 20px "Bricolage Grotesque", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(scan.handle.toUpperCase(), width - 102, 117);
  ctx.textAlign = 'left';

  // Photo Frame
  const imgX = 72;
  const imgY = 172;
  const imgW = width - 152;
  const imgH = 560;

  ctx.fillStyle = '#1b1b20';
  ctx.fillRect(imgX, imgY, imgW, imgH);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = scan.imageDataUrl;
    });
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const boxRatio = imgW / imgH;
    let drawW = imgW;
    let drawH = imgH;
    let drawX = imgX;
    let drawY = imgY;

    if (imgRatio > boxRatio) {
      drawH = imgH;
      drawW = imgH * imgRatio;
      drawX = imgX - (drawW - imgW) / 2;
    } else {
      drawW = imgW;
      drawH = imgW / imgRatio;
      drawY = imgY - (drawH - imgH) / 2;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(imgX, imgY, imgW, imgH);
    ctx.clip();
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  } catch {
    ctx.fillStyle = '#2a292f';
    ctx.fillRect(imgX, imgY, imgW, imgH);
  }

  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(imgX, imgY, imgW, imgH);

  // Category Badge overlaid at bottom of image
  ctx.fillStyle = '#0e0e13';
  ctx.fillRect(imgX + 24, imgY + imgH - 76, 480, 56);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(imgX + 24, imgY + imgH - 76, 480, 56);
  ctx.fillStyle = accent;
  ctx.font = '800 26px Syne, sans-serif';
  ctx.fillText(scan.category, imgX + 44, imgY + imgH - 39);

  // Score Display
  const formatted = `${formatAuraScore(scan.score)} AURA`;
  ctx.fillStyle = accent;
  ctx.font = '800 78px Syne, sans-serif';
  ctx.fillText(formatted, 72, 830);

  // Funny Comment
  ctx.fillStyle = '#e4e1e9';
  ctx.font = '700 32px "Bricolage Grotesque", sans-serif';
  const afterCommentY = wrapText(ctx, `"${scan.funnyComment}"`, 72, 895, width - 152, 42, 3);

  // Explanation
  ctx.fillStyle = '#debec8';
  ctx.font = '500 24px "Bricolage Grotesque", sans-serif';
  wrapText(ctx, scan.explanation, 72, afterCommentY + 18, width - 152, 32, 3);

  // Highlights
  const tagsY = 1175;
  let tagX = 72;
  ctx.font = '800 18px "Bricolage Grotesque", sans-serif';
  for (const tag of scan.highlights.slice(0, 3)) {
    const label = `[ ${tag.toUpperCase()} ]`;
    const tagW = Math.min(300, ctx.measureText(label).width + 26);
    if (tagX + tagW > width - 72) break;
    ctx.fillStyle = '#1f1f25';
    ctx.fillRect(tagX, tagsY, tagW, 40);
    ctx.strokeStyle = '#571bc1';
    ctx.lineWidth = 2;
    ctx.strokeRect(tagX, tagsY, tagW, 40);
    ctx.fillStyle = '#00e478';
    ctx.fillText(label, tagX + 13, tagsY + 26);
    tagX += tagW + 14;
  }

  // Footer disclaimer
  ctx.fillStyle = '#a68992';
  ctx.font = '700 18px "Bricolage Grotesque", sans-serif';
  const footerText =
    lang === 'es'
      ? 'ENTRETENIMIENTO MEME CON IA • NO ES UNA MEDICIÓN CIENTÍFICA REAL'
      : 'AI MEME ENTERTAINMENT • NOT A REAL SCIENTIFIC MEASUREMENT';
  ctx.fillText(footerText, 72, 1266);

  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo exportar la tarjeta PNG.'))), 'image/png');
  });

  return { blob, dataUrl };
}
