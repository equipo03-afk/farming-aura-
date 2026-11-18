import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB decoded image limit
const GEMINI_TIMEOUT_MS = 25000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'scans.json');

type AuraCategory =
  | 'AURA NEGATIVA 💀'
  | 'NPC'
  | 'SIN AURA'
  | 'AURA NORMAL'
  | 'AURA ALTA'
  | 'SIGMA'
  | 'AURA LEGENDARIA'
  | 'AURA DIVINA'
  | 'AURA INFINITA 🔥';

interface FeedRecord {
  id: string;
  handle: string;
  score: number;
  category: AuraCategory;
  comment: string;
  createdAt: string;
}

interface PersistedStore {
  totalScans: number;
  scans: FeedRecord[];
}

function classifyAuraScoreServer(rawScore: number): AuraCategory {
  const score = Math.max(-1000000, Math.min(1000000, Math.round(rawScore)));
  if (score === 1000000) return 'AURA INFINITA 🔥';
  if (score >= 500000) return 'AURA DIVINA';
  if (score >= 100000) return 'AURA LEGENDARIA';
  if (score >= 50000) return 'SIGMA';
  if (score >= 10000) return 'AURA ALTA';
  if (score >= 1000) return 'AURA NORMAL';
  if (score >= 1) return 'SIN AURA';
  if (score >= -99999) return 'NPC';
  return 'AURA NEGATIVA 💀';
}

function loadStore(): PersistedStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PersistedStore>;
      const scans = Array.isArray(parsed.scans) ? parsed.scans : [];
      const totalScans = typeof parsed.totalScans === 'number' && parsed.totalScans >= 0 ? parsed.totalScans : scans.length;
      return { totalScans, scans };
    }
  } catch (err) {
    console.warn('[AURA SCANNER] Could not read data/scans.json, initializing empty store:', err);
  }
  return { totalScans: 0, scans: [] };
}

function saveStore(store: PersistedStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(store, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DATA_FILE);
  } catch (err) {
    console.warn('[AURA SCANNER] Could not persist data/scans.json:', err);
  }
}

const store: PersistedStore = loadStore();

// Sliding-window in-memory rate limiter
interface RateBucket {
  timestamps: number[];
}
const scanRateMap = new Map<string, RateBucket>();
const feedRateMap = new Map<string, RateBucket>();
const recentImageHashMap = new Map<string, number>();

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function createRateLimiter(bucketMap: Map<string, RateBucket>, maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = getClientIp(req);
    const now = Date.now();
    const bucket = bucketMap.get(ip) || { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

    if (bucket.timestamps.length >= maxRequests) {
      const oldest = bucket.timestamps[0];
      const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error: `Demasiadas solicitudes. Espera ${retryAfterSec}s antes de volver a intentarlo.`,
      });
      return;
    }

    bucket.timestamps.push(now);
    bucketMap.set(ip, bucket);
    next();
  };
}

function validateImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  if (mimeType === 'image/webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

function sanitizeHandle(raw: unknown): string {
  if (typeof raw !== 'string') return '@anon_aura';
  const cleaned = raw.replace(/[^a-zA-Z0-9_@.-]/g, '').trim().slice(0, 24);
  if (!cleaned) return '@anon_aura';
  return cleaned.startsWith('@') ? cleaned : `@${cleaned}`;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function generateWithRetry<T>(fn: () => Promise<T>, maxRetries = 1): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(
        fn(),
        GEMINI_TIMEOUT_MS,
        'TIMEOUT: La IA tardó demasiado en responder. Inténtalo de nuevo.'
      );
    } catch (err: unknown) {
      lastError = err;
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? Number((err as { status?: number }).status)
          : 0;
      const isTimeout = err instanceof Error && err.message.startsWith('TIMEOUT:');
      const isRetryable = !isTimeout && (status === 500 || status === 502 || status === 503 || status === 504);
      if (!isRetryable || attempt === maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }
  throw lastError;
}

const app = express();
app.disable('x-powered-by');
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(express.json({ limit: '8mb' }));

const scanLimiter = createRateLimiter(scanRateMap, 12, 60 * 1000);
const feedLimiter = createRateLimiter(feedRateMap, 60, 60 * 1000);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim()),
    persistenceMode: 'local-json',
    totalScans: store.totalScans,
  });
});

app.get('/api/feed', feedLimiter, (_req: Request, res: Response) => {
  const leaderboard = [...store.scans].sort((a, b) => b.score - a.score).slice(0, 50);
  res.json({
    totalScans: store.totalScans,
    recent: store.scans.slice(0, 15),
    leaderboard,
  });
});

app.post('/api/scan-aura', scanLimiter, async (req: Request, res: Response) => {
  const body = req.body as {
    imageBase64?: unknown;
    mimeType?: unknown;
    language?: unknown;
    roastIntensity?: unknown;
    userHandle?: unknown;
    boostArmed?: unknown;
  };

  const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64.trim() : '';
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim() : '';
  const language = body.language === 'en' ? 'en' : 'es';
  const roastIntensity =
    body.roastIntensity === 'savage' || body.roastIntensity === 'hype' ? body.roastIntensity : 'normal';
  const userHandle = sanitizeHandle(body.userHandle);
  const boostArmed = Boolean(body.boostArmed);

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    res.status(400).json({ error: 'Formato de imagen no compatible. Usa JPG, PNG o WEBP.' });
    return;
  }

  if (!imageBase64 || imageBase64.length < 100 || !/^[A-Za-z0-9+/=]+$/.test(imageBase64)) {
    res.status(400).json({ error: 'No se recibió una imagen base64 válida para analizar.' });
    return;
  }

  const imageBuffer = Buffer.from(imageBase64, 'base64');
  if (imageBuffer.length > MAX_IMAGE_BYTES) {
    res.status(413).json({ error: 'La imagen supera el límite máximo permitido de 5 MB.' });
    return;
  }

  if (!validateImageSignature(imageBuffer, mimeType)) {
    res.status(400).json({ error: 'El archivo no coincide con una imagen JPG, PNG o WEBP válida.' });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      error:
        'La clave API de Gemini (GEMINI_API_KEY) no está configurada en el servidor. Configúrala en Settings > Secrets para activar el escáner real.',
    });
    return;
  }

  // Prevent accidental duplicate double-submit bursts within 3 seconds
  const clientIp = getClientIp(req);
  const imgHash = crypto.createHash('sha256').update(imageBuffer).digest('hex').slice(0, 16);
  const dedupKey = `${clientIp}:${imgHash}`;
  const now = Date.now();
  const prevTimestamp = recentImageHashMap.get(dedupKey);
  if (prevTimestamp && now - prevTimestamp < 3000) {
    res.status(429).json({ error: 'Solicitud duplicada detectada. Espera un momento.' });
    return;
  }
  recentImageHashMap.set(dedupKey, now);

  // Clean up old dedup entries opportunistically
  if (recentImageHashMap.size > 500) {
    for (const [k, ts] of recentImageHashMap.entries()) {
      if (now - ts > 10000) recentImageHashMap.delete(k);
    }
  }

  const toneDirective =
    roastIntensity === 'savage'
      ? 'Be extra witty, ironic, and playfully ruthless like internet aura/roast memes (never genuinely hateful, cruel, or offensive about protected traits, bodies, or appearance—focus on vibes, poses, lighting, objects, posture, and comedic situations).'
      : roastIntensity === 'hype'
      ? 'Lean into maximum hype, epic anime protagonist energy, and dramatic phonk/sigma praise while keeping the full score spectrum fair.'
      : 'Balance comedic roasts and epic meme praise based on the real visual vibe, framing, lighting, pose, outfit, and background details.';

  const langDirective =
    language === 'en'
      ? 'Write funnyComment, explanation, and highlights strictly in natural, punchy Gen-Z English.'
      : 'Write funnyComment, explanation, and highlights strictly in natural, punchy Gen-Z Spanish (slang de internet / memes de aura, sigma, NPC, phonk, drip).';

  const systemInstruction = `You are AURA SCANNER AI v4.2, a hilarious viral internet meme engine inspired by "Farmear Aura" / Aura Farming memes.
Analyze the uploaded photo (people, poses, pets, outfits, objects, expressions, lighting, framing, or chaotic background vibes) and produce an entertaining, non-scientific meme Aura Score strictly between -1000000 and 1000000.

Use the FULL spectrum creatively based on what you actually observe in the photo:
- -1000000 to -100000: "AURA NEGATIVA 💀" (chaotic L moments, awkward framing, cursed vibes, hilarious fail energy)
- -99999 to 0: "NPC" (default settings, blank stare, zero main-character energy, waiting-for-a-quest posture)
- 1 to 999: "SIN AURA" (barely registering on the aura radar, airplane-mode energy)
- 1000 to 9999: "AURA NORMAL" (chill everyday citizen vibes)
- 10000 to 49999: "AURA ALTA" (solid drip, confident framing, rising energy)
- 50000 to 99999: "SIGMA" (unbothered, dramatic lighting, stoic gaze, cool sunglasses/pose)
- 100000 to 499999: "AURA LEGENDARIA" (cinematic anime protagonist energy, iconic pose or pet aura)
- 500000 to 999999: "AURA DIVINA" (unreal cinematic presence, god-tier drip or comedic perfection)
- 1000000: "AURA INFINITA 🔥" (reserved for truly transcendent, hilarious, or cinematic 10/10 meme perfection)

Rules:
- Reference real visual details you actually see in the image (pose, lighting, clothing, expression, props, pets, background) so the user feels the AI truly saw their photo.
- Keep it playful, meme-focused, and light-hearted—never insult someone's physical traits, race, gender, disability, or appearance; joke about vibes, lighting, posture, angles, and meme energy!
- Clearly frame the explanation as playful internet entertainment, not a real measurement.
- ${toneDirective}
- ${langDirective}`;

  try {
    const response = await generateWithRetry(() =>
      ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
            {
              text:
                language === 'en'
                  ? 'Scan this photo and judge its viral Aura Score from -1,000,000 to +1,000,000.'
                  : 'Escanea esta fotografía y calcula su puntuación viral de Aura entre -1.000.000 y +1.000.000.',
            },
          ],
        },
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: {
                type: Type.INTEGER,
                description: 'Integer score between -1000000 and 1000000.',
              },
              level: {
                type: Type.STRING,
                description: 'Matching aura category label.',
              },
              funnyComment: {
                type: Type.STRING,
                description:
                  'One punchy, hilarious meme verdict referencing visual details in the photo (max 140 chars).',
              },
              explanation: {
                type: Type.STRING,
                description:
                  'Brief 2-sentence explanation of why the photo got this score, playfully noting it is meme entertainment.',
              },
              highlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Exactly 3 short uppercase HUD telemetry tags (2-4 words each).',
              },
            },
            required: ['score', 'level', 'funnyComment', 'explanation', 'highlights'],
          },
        },
      })
    );

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      res.status(502).json({ error: 'Gemini devolvió una respuesta vacía. Inténtalo de nuevo.' });
      return;
    }

    let parsed: {
      score?: number;
      funnyComment?: string;
      explanation?: string;
      highlights?: string[];
    };

    try {
      parsed = JSON.parse(rawText) as typeof parsed;
    } catch {
      res.status(502).json({ error: 'Error al interpretar el veredicto JSON de la IA.' });
      return;
    }

    let finalScore = Number.isFinite(Number(parsed.score))
      ? Math.max(-1000000, Math.min(1000000, Math.round(Number(parsed.score))))
      : 0;

    let boostApplied = false;
    if (boostArmed && finalScore > 0 && finalScore < 1000000) {
      finalScore = Math.min(1000000, Math.round(finalScore * 2.5));
      boostApplied = true;
    }

    const category = classifyAuraScoreServer(finalScore);
    const funnyComment =
      typeof parsed.funnyComment === 'string' && parsed.funnyComment.trim()
        ? parsed.funnyComment.trim().slice(0, 220)
        : language === 'en'
        ? 'Aura frequency locked. Pure internet energy detected.'
        : 'Frecuencia de aura bloqueada. Energía viral detectada.';

    const explanation =
      typeof parsed.explanation === 'string' && parsed.explanation.trim()
        ? parsed.explanation.trim().slice(0, 400)
        : language === 'en'
        ? 'Calculated purely for meme entertainment based on your lighting, framing, and aura presence.'
        : 'Evaluación generada únicamente por entretenimiento meme según tu encuadre, iluminación y vibra.';

    const highlights = Array.isArray(parsed.highlights)
      ? parsed.highlights
          .filter((h): h is string => typeof h === 'string' && h.trim().length > 0)
          .map((h) => h.trim().slice(0, 32))
          .slice(0, 3)
      : [];

    while (highlights.length < 3) {
      highlights.push(language === 'en' ? 'AURA VERIFIED' : 'AURA VERIFICADA');
    }

    const scanId = `scan-${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();

    store.totalScans += 1;
    store.scans.unshift({
      id: scanId,
      handle: userHandle,
      score: finalScore,
      category,
      comment: funnyComment,
      createdAt,
    });
    if (store.scans.length > 100) {
      store.scans.length = 100;
    }
    saveStore(store);

    res.json({
      id: scanId,
      createdAt,
      score: finalScore,
      category,
      funnyComment,
      explanation,
      highlights,
      boostApplied,
      totalScans: store.totalScans,
    });
  } catch (err: unknown) {
    console.error('[AURA SCANNER] Gemini error:', err);
    if (err instanceof Error && err.message.startsWith('TIMEOUT:')) {
      res.status(504).json({ error: err.message.replace('TIMEOUT: ', '') });
      return;
    }

    const status =
      typeof err === 'object' && err !== null && 'status' in err
        ? Number((err as { status?: number }).status)
        : 500;
    const message =
      err instanceof Error ? err.message : 'Error inesperado al analizar el aura con Gemini.';

    if (
      status === 403 ||
      status === 400 ||
      message.includes('API_KEY_INVALID') ||
      message.includes('PERMISSION_DENIED')
    ) {
      res.status(status).json({
        error:
          'Clave de Gemini inválida o sin permisos. Verifica GEMINI_API_KEY en el panel Settings > Secrets.',
      });
      return;
    }
    if (status === 429 || message.includes('RESOURCE_EXHAUSTED')) {
      res.status(429).json({
        error: 'Límite de solicitudes de Gemini alcanzado temporalmente. Espera unos segundos e inténtalo de nuevo.',
      });
      return;
    }

    res.status(500).json({
      error: 'No se pudo completar el escaneo de aura con la IA. Inténtalo nuevamente.',
    });
  }
});

// Ensure any unmatched /api/* path ALWAYS returns JSON (never HTML SPA fallback)
app.use('/api', (req: Request, res: Response) => {
  res.status(404).json({
    error: `Ruta API no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// Preserve access to raw Stitch exports if referenced directly
app.use('/stitch/home-es', express.static(path.join(__dirname, 'aura_farming_home_espa_ol'), { index: 'code.html' }));
app.use('/stitch/home-en', express.static(path.join(__dirname, 'aura_farming_home'), { index: 'code.html' }));
app.use('/stitch/scan', express.static(path.join(__dirname, 'aura_capture_scan'), { index: 'code.html' }));

// Global Express JSON error handler (catches express.json SyntaxError, PayloadTooLargeError, etc.)
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const errObj = err as { type?: string; status?: number; statusCode?: number; message?: string };
  if (errObj?.type === 'entity.too.large' || errObj?.status === 413) {
    res.status(413).json({
      error: 'La fotografía enviada supera el tamaño máximo permitido (8 MB).',
    });
    return;
  }
  if (errObj?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    res.status(400).json({
      error: 'El cuerpo de la solicitud JSON está malformado.',
    });
    return;
  }

  console.error('[AURA SCANNER] Unhandled Express error on', req.originalUrl, err);
  const status = typeof errObj?.status === 'number' ? errObj.status : 500;
  res.status(status).json({
    error: 'Error interno del servidor al procesar la solicitud.',
  });
});

async function startServer() {
  const distDir = path.join(__dirname, 'dist');
  const useProdStatic =
    process.env.NODE_ENV === 'production' ||
    (process.env.NODE_ENV !== 'development' && fs.existsSync(path.join(distDir, 'index.html')));

  if (useProdStatic) {
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AURA SCANNER server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AURA SCANNER server:', err);
  process.exit(1);
});
