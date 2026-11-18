import React, { useEffect, useRef, useState } from 'react';
import {
  AppSettings,
  AuraScanResult,
  ScanHistoryItem,
  classifyAuraScore,
  formatAuraScore,
} from '../types/aura';
import { ProcessedImage, captureVideoFrame, processImageFile } from '../utils/image';
import { fetchJsonSafe } from '../utils/api';
import { generateAuraShareCard } from '../utils/shareCard';
import { playClickSound, playRevealSound, playScanTickSound } from '../utils/sound';

interface ScannerViewProps {
  settings: AppSettings;
  flashBoost: boolean;
  onToggleFlash: () => void;
  onScanComplete: (item: ScanHistoryItem) => void;
  onGoToHistory: () => void;
}

const MEME_QUOTES_ES = [
  'Detectando energía sigma...',
  'Midiendo aura en gigavatios...',
  'Calculando probabilidad de NPC: 0.04%...',
  'Evaluando coeficiente de rizz e iluminación...',
  'Analizando postura de protagonista con IA...',
  'Sincronizando veredicto viral...',
];

const MEME_QUOTES_EN = [
  'Detecting sigma energy...',
  'Measuring aura levels in gigawatts...',
  'Checking NPC probability: 0.04%...',
  'Calculating rizz & lighting coefficient...',
  'Analyzing main-character posture via AI...',
  'Synchronizing viral verdict...',
];

export const ScannerView: React.FC<ScannerViewProps> = ({
  settings,
  flashBoost,
  onToggleFlash,
  onScanComplete,
  onGoToHistory,
}) => {
  const isEs = settings.language === 'es';
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraFallbackInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [previewImage, setPreviewImage] = useState<ProcessedImage | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanPercent, setScanPercent] = useState(18);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<AuraScanResult | null>(null);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [flashTrigger, setFlashTrigger] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [downloadingCard, setDownloadingCard] = useState(false);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraReady(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (abortRef.current) {
        abortRef.current.abort();
      }
      inFlightRef.current = false;
    };
  }, []);

  // Attach MediaStream to <video> safely on iOS Safari, Android Chrome, and Desktop
  useEffect(() => {
    const videoEl = videoRef.current;
    if (cameraActive && videoEl && streamRef.current) {
      videoEl.srcObject = streamRef.current;
      videoEl.play().catch(() => undefined);
    }
  }, [cameraActive]);

  // Sync hardware torch constraint live when flashBoost changes while camera is active
  useEffect(() => {
    if (!cameraActive || !streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    const caps = typeof track.getCapabilities === 'function' ? (track.getCapabilities() as { torch?: boolean }) : {};
    if (caps.torch) {
      track
        .applyConstraints({
          advanced: [{ torch: flashBoost } as MediaTrackConstraintSet],
        })
        .catch(() => undefined);
    }
  }, [flashBoost, cameraActive]);

  // Scanning progress quotes & sound loop
  useEffect(() => {
    if (!isScanning) return;
    setScanPercent(18);
    setQuoteIdx(0);
    const interval = window.setInterval(() => {
      setScanPercent((prev) => (prev >= 94 ? 94 : Math.min(94, prev + 14)));
      setQuoteIdx((prev) => (prev + 1) % MEME_QUOTES_ES.length);
      playScanTickSound(settings.soundEnabled);
    }, 550);
    return () => window.clearInterval(interval);
  }, [isScanning, settings.soundEnabled]);

  // Score count-up/count-down animation on reveal
  useEffect(() => {
    if (!result) return;
    const target = result.score;
    const duration = 900;
    const start = performance.now();
    let frameId = 0;

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(target * eased));
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setAnimatedScore(target);
      }
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [result]);

  const startCamera = async (requestedFacing: 'user' | 'environment' = facingMode) => {
    if (cameraLoading) return;
    setErrorMsg(null);
    setCameraError(false);
    setResult(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(true);
      cameraFallbackInputRef.current?.click();
      return;
    }

    stopCamera();
    setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: requestedFacing },
          width: { ideal: 1080 },
          height: { ideal: 1350 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setPreviewImage(null);
      setCameraReady(false);
      setCameraActive(true);
    } catch (err) {
      console.warn('Camera access failed:', err);
      setCameraError(true);
      setErrorMsg(
        isEs
          ? 'No pudimos abrir la cámara en vivo (permiso denegado o sin cámara). Usa la cámara nativa del teléfono o sube una foto desde tu galería.'
          : 'Could not access live camera (permission denied or unavailable). Use native camera capture or upload from your gallery.'
      );
    } finally {
      setCameraLoading(false);
    }
  };

  const handleFlipCamera = async () => {
    playClickSound(settings.soundEnabled);
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    if (cameraActive) {
      await startCamera(next);
    }
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current || !cameraReady) return;
    playClickSound(settings.soundEnabled);

    if (flashBoost) {
      setFlashTrigger(true);
      window.setTimeout(() => setFlashTrigger(false), 360);
    }

    try {
      const captured = captureVideoFrame(videoRef.current, facingMode === 'user');
      stopCamera();
      setPreviewImage(captured);
      setResult(null);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al capturar la fotografía.');
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    playClickSound(settings.soundEnabled);
    setErrorMsg(null);
    setCameraError(false);
    setResult(null);
    stopCamera();

    try {
      const processed = await processImageFile(file);
      setPreviewImage(processed);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : isEs
          ? 'No se pudo procesar la fotografía seleccionada.'
          : 'Could not process the selected photo.'
      );
    }
  };

  const handleScanAura = async () => {
    if (!previewImage || isScanning || inFlightRef.current) return;
    inFlightRef.current = true;
    playClickSound(settings.soundEnabled);
    setErrorMsg(null);
    setResult(null);
    setIsScanning(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 30000);

    try {
      const payload = await fetchJsonSafe<AuraScanResult>(
        '/api/scan-aura',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            imageBase64: previewImage.base64,
            mimeType: previewImage.mimeType,
            language: settings.language,
            roastIntensity: settings.roastIntensity,
            userHandle: settings.handle,
            boostArmed: settings.boostArmed,
          }),
        },
        settings.language
      );

      setScanPercent(100);
      await new Promise((r) => setTimeout(r, 320));

      setResult(payload);
      playRevealSound(settings.soundEnabled, payload.score);

      const historyItem: ScanHistoryItem = {
        ...payload,
        id: payload.id || `scan-${Date.now()}`,
        imageDataUrl: previewImage.thumbnailDataUrl,
        createdAt: payload.createdAt || new Date().toISOString(),
        handle: settings.handle.startsWith('@') ? settings.handle : `@${settings.handle}`,
      };
      onScanComplete(historyItem);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (timedOut) {
          setErrorMsg(
            isEs
              ? 'El análisis superó el tiempo máximo de espera (30s). Inténtalo nuevamente.'
              : 'Analysis timed out after 30s. Please try again.'
          );
        }
        return;
      }
      setErrorMsg(
        err instanceof Error
          ? err.message
          : isEs
          ? 'Error de conexión al analizar tu aura.'
          : 'Connection error while scanning your aura.'
      );
    } finally {
      window.clearTimeout(timeoutId);
      setIsScanning(false);
      abortRef.current = null;
      inFlightRef.current = false;
    }
  };

  const handleCancelScan = () => {
    playClickSound(settings.soundEnabled);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    inFlightRef.current = false;
    setIsScanning(false);
  };

  const handleRepeatScan = () => {
    playClickSound(settings.soundEnabled);
    setResult(null);
    setPreviewImage(null);
    setErrorMsg(null);
    setCameraError(false);
    setShareFeedback(null);
  };

  const handleShareResult = async () => {
    if (!result || !previewImage) return;
    playClickSound(settings.soundEnabled);

    const shareText = isEs
      ? `⚡ AURA SCANNER VEREDICTO ⚡\nPuntuación: ${formatAuraScore(result.score)} AURA\nCategoría: ${result.category}\n"${result.funnyComment}"\n${result.explanation}`
      : `⚡ AURA SCANNER VERDICT ⚡\nScore: ${formatAuraScore(result.score)} AURA\nTier: ${result.category}\n"${result.funnyComment}"\n${result.explanation}`;

    try {
      const { blob } = await generateAuraShareCard(
        {
          ...result,
          imageDataUrl: previewImage.dataUrl,
          handle: settings.handle,
        },
        settings.language
      );
      const file = new File([blob], 'aura-scanner-result.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `AURA SCANNER: ${formatAuraScore(result.score)} AURA`,
          text: shareText,
          files: [file],
        });
        setShareFeedback(isEs ? '¡COMPARTIDO!' : 'SHARED!');
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: `AURA SCANNER: ${formatAuraScore(result.score)} AURA`,
          text: shareText,
        });
        setShareFeedback(isEs ? '¡COMPARTIDO!' : 'SHARED!');
        return;
      }

      await navigator.clipboard.writeText(shareText);
      setShareFeedback(isEs ? '¡COPIADO AL PORTAPAPELES!' : 'COPIED TO CLIPBOARD!');
    } catch {
      try {
        await navigator.clipboard.writeText(shareText);
        setShareFeedback(isEs ? '¡COPIADO AL PORTAPAPELES!' : 'COPIED TO CLIPBOARD!');
      } catch {
        setShareFeedback(isEs ? 'USA GUARDAR PNG PARA COMPARTIR' : 'USE SAVE PNG TO SHARE');
      }
    } finally {
      window.setTimeout(() => setShareFeedback(null), 2600);
    }
  };

  const handleDownloadCard = async () => {
    if (!result || !previewImage || downloadingCard) return;
    playClickSound(settings.soundEnabled);
    setDownloadingCard(true);
    try {
      const { dataUrl } = await generateAuraShareCard(
        {
          ...result,
          imageDataUrl: previewImage.dataUrl,
          handle: settings.handle,
        },
        settings.language
      );
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `aura-scanner-${result.score}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShareFeedback(isEs ? '¡TARJETA PNG GUARDADA!' : 'PNG CARD SAVED!');
      window.setTimeout(() => setShareFeedback(null), 2600);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo descargar la tarjeta.');
    } finally {
      setDownloadingCard(false);
    }
  };

  const resultTier = result ? classifyAuraScore(result.score) : null;
  const activeBlocks = Math.max(1, Math.min(5, Math.ceil(scanPercent / 20)));
  const quoteList = isEs ? MEME_QUOTES_ES : MEME_QUOTES_EN;

  return (
    <div className="flex flex-col w-full px-margin-mobile gap-space-md select-none pb-8">
      {/* Hidden File Inputs */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="hidden"
        onChange={handleFileSelected}
      />
      <input
        ref={cameraFallbackInputRef}
        type="file"
        accept="image/*"
        capture={facingMode === 'user' ? 'user' : 'environment'}
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* TOP TELEMETRY STRIP */}
      <div className="flex items-center justify-between bg-surface-container-lowest px-space-sm py-space-xs shadow-[2px_2px_0px_#571bc1]">
        <div className="flex items-center gap-space-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full bg-tertiary opacity-75" />
            <span className="relative inline-flex h-2 w-2 bg-tertiary" />
          </span>
          <span className="font-label-md text-label-md text-tertiary tracking-widest uppercase">
            SYS.ONLINE // SCANNER_V4.2
          </span>
        </div>
        <div className="flex items-center gap-space-xs">
          <button
            type="button"
            id="camFlipBtn"
            aria-label={isEs ? 'Cambiar cámara' : 'Flip Camera'}
            onClick={handleFlipCamera}
            className={`w-8 h-8 flex items-center justify-center bg-surface-container-high hover:text-tertiary active:translate-x-0.5 active:translate-y-0.5 transition-all shadow-[1px_1px_0px_#000000] cursor-pointer ${
              facingMode === 'environment' ? 'text-tertiary' : 'text-on-surface'
            }`}
            title={isEs ? 'Alternar cámara frontal/trasera' : 'Switch front/rear camera'}
          >
            <span className="material-symbols-outlined text-lg">flip_camera_ios</span>
          </button>
          <button
            type="button"
            id="torchBtn"
            aria-label={isEs ? 'Alternar flash' : 'Toggle Flash'}
            onClick={() => {
              playClickSound(settings.soundEnabled);
              onToggleFlash();
            }}
            className={`w-8 h-8 flex items-center justify-center active:translate-x-0.5 active:translate-y-0.5 transition-all shadow-[1px_1px_0px_#000000] cursor-pointer ${
              flashBoost
                ? 'bg-primary-container text-on-primary-container'
                : 'bg-surface-container-high text-on-surface hover:text-primary'
            }`}
            title={isEs ? 'Flash de estudio' : 'Studio flash'}
          >
            <span className="material-symbols-outlined text-lg">bolt</span>
          </button>
        </div>
      </div>

      {/* HERO TITLE & SCRIPT */}
      <div className="flex flex-col gap-space-xs">
        <div className="inline-flex self-start px-space-xs py-0.5 bg-surface-container-high text-secondary-fixed text-label-md font-label-md tracking-wider shadow-[2px_2px_0px_#000000]">
          {isEs ? '[ RECONOCIMIENTO BIOMÉTRICO IA ACTIVO ]' : '[ AI BIOMETRIC RECOGNITION ACTIVE ]'}
        </div>
        <h1 className="font-headline-xl-mobile text-headline-xl-mobile uppercase text-on-surface leading-none tracking-tight">
          {isEs ? (
            <>
              ESCANEA TU <span className="text-tertiary drop-shadow-[0_0_12px_#00e478]">AURA</span>
            </>
          ) : (
            <>
              LET&apos;S SCAN YOUR <span className="text-tertiary drop-shadow-[0_0_12px_#00e478]">AURA</span>
            </>
          )}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {isEs
            ? 'Sube una foto o usa tu cámara. La IA medirá cuánta aura viral llevas hoy.'
            : 'Show us your face or upload a pic. See how much pure viral aura you carry today.'}
        </p>
      </div>

      {/* ERROR BANNER */}
      {errorMsg && (
        <div className="bg-error-container text-on-error-container p-space-sm shadow-[3px_3px_0px_#000000] flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-lg shrink-0 mt-0.5">warning</span>
              <span className="font-body-md text-body-md font-bold">{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="font-label-md text-xs underline uppercase shrink-0 cursor-pointer"
            >
              OK
            </button>
          </div>
          {cameraError && (
            <button
              type="button"
              onClick={() => cameraFallbackInputRef.current?.click()}
              className="self-start bg-surface-container-lowest text-tertiary px-2.5 py-1 font-label-md text-[10px] uppercase tracking-wider shadow-[2px_2px_0px_#000000] cursor-pointer"
            >
              [ {isEs ? 'USAR CÁMARA NATIVA DEL DISPOSITIVO' : 'USE DEVICE NATIVE CAMERA'} ]
            </button>
          )}
        </div>
      )}

      {/* VIEWFINDER HUD CHASSIS */}
      <div
        className={`relative w-full aspect-[4/5] bg-surface-container-lowest overflow-hidden flex items-center justify-center ${
          flashBoost ? 'ring-4 ring-primary-fixed/80' : ''
        }`}
        style={{
          boxShadow: resultTier ? `4px 4px 0px ${resultTier.shadowColor}` : '4px 4px 0px #571bc1',
        }}
      >
        {/* Background Visual Layer */}
        {cameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => setCameraReady(true)}
            onCanPlay={() => setCameraReady(true)}
            className={`absolute inset-0 w-full h-full object-cover ${
              facingMode === 'user' ? 'scale-x-[-1]' : ''
            }`}
          />
        ) : previewImage ? (
          <img
            src={previewImage.dataUrl}
            alt={isEs ? 'Vista previa para escaneo' : 'Photo preview for aura scan'}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-surface-container-lowest">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,228,120,0.08)_0%,rgba(87,27,193,0.06)_50%,transparent_80%)] pointer-events-none" />
          </div>
        )}

        {/* Studio Flash Overlay on Capture */}
        {flashTrigger && <div className="absolute inset-0 bg-white z-40 animate-flash-fade pointer-events-none" />}

        {/* CRT Mesh Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,228,120,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,228,120,0.05)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

        {/* High-Voltage Corner Brackets */}
        <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-tertiary pointer-events-none shadow-[0_0_6px_#00e478]" />
        <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-primary pointer-events-none shadow-[0_0_6px_#ffb0cd]" />
        <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-primary pointer-events-none shadow-[0_0_6px_#ffb0cd]" />
        <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-tertiary pointer-events-none shadow-[0_0_6px_#00e478]" />

        {/* HUD Telemetry Gauges */}
        <div className="absolute top-3 left-3 flex flex-col gap-0.5 pointer-events-none bg-surface-container-lowest/70 px-1.5 py-0.5">
          <span className="font-label-md text-[10px] text-tertiary tracking-widest leading-none">
            {isScanning ? 'LOCK: 99.9%' : previewImage ? 'IMG: READY' : cameraActive ? 'CAM: LIVE' : 'LOCK: 99.4%'}
          </span>
          <span className="font-label-md text-[9px] text-on-surface-variant tracking-wider leading-none">
            FREQ: 432Hz
          </span>
        </div>
        <div className="absolute top-3 right-3 flex flex-col items-end gap-0.5 pointer-events-none bg-surface-container-lowest/70 px-1.5 py-0.5">
          <span className="font-label-md text-[10px] text-primary tracking-widest leading-none">
            {settings.boostArmed ? 'BOOST // 2.5X' : `CAM // ${facingMode === 'user' ? 'FRONT' : 'REAR'}`}
          </span>
          <span className="font-label-md text-[9px] text-tertiary-fixed tracking-wider leading-none">
            {isScanning ? 'ANALYZING' : 'STABLE'}
          </span>
        </div>

        {/* Central Targeting Mask / Wireframe Reticle */}
        {(!previewImage || isScanning) && (
          <div className="relative w-48 h-60 flex items-center justify-center pointer-events-none z-10">
            <svg className="absolute inset-0 w-full h-full text-secondary opacity-85" fill="none" viewBox="0 0 100 130">
              <ellipse
                className="animate-pulse"
                cx="50"
                cy="65"
                rx="38"
                ry="52"
                stroke="currentColor"
                strokeDasharray="4 3"
                strokeWidth="1"
              />
              <ellipse cx="50" cy="65" opacity="0.6" rx="34" ry="46" stroke="#00e478" strokeWidth="0.8" />
              <circle cx="35" cy="54" r="3" stroke="#ffb0cd" strokeWidth="1" />
              <circle cx="65" cy="54" r="3" stroke="#ffb0cd" strokeWidth="1" />
              <path d="M 45 74 L 50 78 L 55 74" stroke="#00e478" strokeLinecap="square" strokeWidth="1.2" />
              <path d="M 38 90 Q 50 98 62 90" stroke="#d0bcff" strokeWidth="1.2" />
              <line stroke="#00e478" strokeWidth="2" x1="50" x2="50" y1="2" y2="12" />
              <line stroke="#00e478" strokeWidth="2" x1="50" x2="50" y1="118" y2="128" />
              <line stroke="#00e478" strokeWidth="2" x1="2" x2="12" y1="65" y2="65" />
              <line stroke="#00e478" strokeWidth="2" x1="88" x2="98" y1="65" y2="65" />
            </svg>
            <div
              className="w-12 h-12 border border-tertiary/40 flex items-center justify-center animate-spin"
              style={{ animationDuration: isScanning ? '2s' : '12s' }}
            >
              <div className="w-4 h-4 bg-primary/30" />
            </div>
          </div>
        )}

        {/* Quick clear photo button when preview is loaded and not scanning */}
        {previewImage && !isScanning && !result && (
          <button
            type="button"
            onClick={handleRepeatScan}
            className="absolute bottom-12 right-3 z-20 bg-surface-container-lowest/90 text-on-surface hover:text-error px-2.5 py-1 shadow-[2px_2px_0px_#000000] font-label-md text-[10px] uppercase tracking-wider cursor-pointer"
          >
            [ {isEs ? 'CAMBIAR FOTO' : 'CHANGE PHOTO'} ]
          </button>
        )}

        {/* High Score Particle Burst on Result */}
        {result && result.score >= 50000 && (
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            {['⚡', '🔥', '👑', '✨', '🗿', '⚡'].map((symbol, idx) => (
              <span
                key={idx}
                className="absolute bottom-14 text-2xl animate-particle-rise"
                style={{ left: `${14 + idx * 14}%`, animationDelay: `${idx * 100}ms` }}
              >
                {symbol}
              </span>
            ))}
          </div>
        )}

        {/* Kinetic Vertical Laser Scan Line */}
        {(cameraActive || isScanning || !previewImage) && (
          <div
            className={`absolute w-full h-1 bg-gradient-to-r from-transparent via-tertiary to-transparent shadow-[0_0_16px_#00e478] pointer-events-none z-20 ${
              isScanning ? 'animate-scan-sweep-fast' : 'animate-scan-sweep'
            }`}
          />
        )}

        {/* Viewfinder Bottom Live Readout Pill */}
        <div className="absolute bottom-3 inset-x-3 flex justify-between items-center bg-surface-container-lowest/85 backdrop-blur-md px-space-sm py-1 pointer-events-none z-20">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-sm text-tertiary">graphic_eq</span>
            <span className="font-label-md text-[10px] text-on-surface uppercase tracking-wider">
              {isScanning
                ? isEs
                  ? 'ESCANEANDO FRECUENCIA...'
                  : 'SCANNING FREQUENCY...'
                : result
                ? result.category
                : isEs
                ? 'ARMÓNICOS DE AURA: NOMINAL'
                : 'AURA HARMONICS: NOMINAL'}
            </span>
          </div>
          <span className="font-label-md text-[10px] text-primary uppercase font-bold tracking-widest">
            +1,000,000 MAX
          </span>
        </div>
      </div>

      {/* SPECTACULAR RESULT REVEAL CARD */}
      {result && resultTier && (
        <section
          className="animate-aura-burst bg-surface-container-low p-space-md flex flex-col gap-space-sm border-2"
          style={{
            borderColor: resultTier.accentColor,
            boxShadow: `5px 5px 0px ${resultTier.shadowColor}`,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-widest">
              {isEs ? '[ VEREDICTO OFICIAL IA ]' : '[ OFFICIAL AI VERDICT ]'}
            </span>
            <span
              className={`px-2 py-0.5 font-label-md text-label-md font-extrabold uppercase ${resultTier.badgeBgClass} ${resultTier.badgeTextClass}`}
            >
              {result.category}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                className={`font-headline-xl-mobile text-4xl font-black tracking-tighter ${resultTier.textClass}`}
              >
                {formatAuraScore(animatedScore)}
              </span>
              <span className="font-headline-md text-on-surface uppercase">AURA</span>
              {result.boostApplied && (
                <span className="bg-tertiary text-on-tertiary px-1.5 py-0.5 font-label-md text-[10px] uppercase">
                  ⚡ 2.5X BOOST
                </span>
              )}
            </div>

            <div className="w-full h-2.5 bg-surface-container-lowest p-0.5 flex">
              <div
                className={`h-full transition-all duration-700 ${resultTier.barClass}`}
                style={{
                  width: `${Math.max(8, Math.min(100, Math.round(((result.score + 1000000) / 2000000) * 100)))}%`,
                }}
              />
            </div>
          </div>

          <div className="bg-surface-container-lowest p-space-sm border-l-4" style={{ borderColor: resultTier.accentColor }}>
            <p className="font-title-md text-title-md text-on-surface leading-snug">
              &ldquo;{result.funnyComment}&rdquo;
            </p>
          </div>

          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            {result.explanation}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {result.highlights.map((tag, i) => (
              <span
                key={i}
                className="bg-surface-container-high px-2 py-0.5 font-label-md text-[10px] text-tertiary uppercase tracking-wider shadow-[1px_1px_0px_#000000]"
              >
                [ {tag} ]
              </span>
            ))}
          </div>

          {shareFeedback && (
            <div className="bg-tertiary text-on-tertiary px-3 py-1.5 font-label-md text-center uppercase tracking-wider">
              {shareFeedback}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleShareResult}
              className="bg-primary-container text-on-primary-container py-2.5 px-3 flex items-center justify-center gap-1.5 font-label-lg uppercase shadow-[3px_3px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">share</span>
              <span>{isEs ? 'COMPARTIR' : 'SHARE'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadCard}
              disabled={downloadingCard}
              className="bg-secondary-container text-on-secondary-container py-2.5 px-3 flex items-center justify-center gap-1.5 font-label-lg uppercase shadow-[3px_3px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              <span>{downloadingCard ? '...' : isEs ? 'GUARDAR PNG' : 'SAVE PNG'}</span>
            </button>

            <button
              type="button"
              onClick={handleRepeatScan}
              className="bg-tertiary text-on-tertiary py-2.5 px-3 flex items-center justify-center gap-1.5 font-label-lg uppercase shadow-[3px_3px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              <span>{isEs ? 'REPETIR' : 'RE-SCAN'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound(settings.soundEnabled);
                onGoToHistory();
              }}
              className="bg-surface-container-highest text-on-surface py-2.5 px-3 flex items-center justify-center gap-1.5 font-label-lg uppercase shadow-[3px_3px_0px_#571bc1] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">history</span>
              <span>{isEs ? 'HISTORIAL' : 'HISTORY'}</span>
            </button>
          </div>
        </section>
      )}

      {/* ANALYZING STATE DRAWER */}
      {isScanning && (
        <div
          id="analyzingChassis"
          className="flex flex-col gap-space-sm bg-surface-container-low p-space-md shadow-[4px_4px_0px_#f751a1] transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-xl animate-spin">sync</span>
              <span className="font-title-md text-title-md text-on-surface uppercase tracking-tight">
                {isEs ? 'ANALIZANDO TU AURA...' : 'ANALYZING YOUR AURA...'}
              </span>
            </div>
            <span className="font-headline-md text-headline-md text-primary font-bold" id="percentText">
              {scanPercent}%
            </span>
          </div>

          <div className="w-full h-4 bg-surface-container-lowest p-0.5 flex gap-1 shadow-inner">
            {[0, 1, 2, 3, 4].map((blockIdx) => (
              <div
                key={blockIdx}
                className={`h-full w-1/5 transition-colors duration-300 ${
                  blockIdx < activeBlocks
                    ? blockIdx === 3
                      ? 'bg-tertiary'
                      : 'bg-primary'
                    : 'bg-surface-container-high'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between bg-surface-container-lowest px-space-sm py-space-xs">
            <div className="flex items-center gap-space-xs min-w-0">
              <span className="material-symbols-outlined text-tertiary text-sm shrink-0">terminal</span>
              <span className="font-body-md text-body-md text-tertiary font-bold tracking-tight truncate" id="memeStatus">
                {quoteList[quoteIdx]}
              </span>
            </div>
            <span className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-widest shrink-0 ml-2">
              [RUNNING]
            </span>
          </div>

          <button
            type="button"
            id="resetScanBtn"
            onClick={handleCancelScan}
            className="self-end text-label-md font-label-md text-on-surface-variant hover:text-tertiary underline uppercase tracking-widest cursor-pointer"
          >
            [ {isEs ? 'CANCELAR ESCANEO' : 'CANCEL SCAN'} ]
          </button>
        </div>
      )}

      {/* INSTRUCTIONS & 3 VISUAL RULE CHIPS */}
      {!result && (
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-tertiary text-lg">radar</span>
              <span className="font-title-md text-title-md uppercase tracking-tight text-on-surface">
                {isEs ? 'POSICIONA TU FOTO' : 'POSITION YOUR FACE'}
              </span>
            </div>
            <span className="font-label-md text-label-md text-on-surface-variant">
              {previewImage ? 'STEP 02/02' : 'STEP 01/02'}
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {isEs
              ? 'Usa la cámara o sube una fotografía desde tu galería para evaluar tu puntuación de aura.'
              : 'Center yourself inside the HUD targeting mask or upload a photo for AI aura scoring.'}
          </p>

          <div className="grid grid-cols-3 gap-space-xs mt-space-xs">
            <div className="bg-surface-container-low p-space-xs flex flex-col items-center text-center gap-1 shadow-[2px_2px_0px_#000000]">
              <div className="w-7 h-7 bg-surface-container-high flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined text-base">light_mode</span>
              </div>
              <span className="font-title-md text-[11px] leading-tight text-on-surface uppercase font-bold">
                {isEs ? 'Buena Luz' : 'Good Light'}
              </span>
              <span className="font-label-md text-[9px] text-tertiary tracking-wider uppercase">OPTIMAL</span>
            </div>
            <div className="bg-surface-container-low p-space-xs flex flex-col items-center text-center gap-1 shadow-[2px_2px_0px_#000000]">
              <div className="w-7 h-7 bg-surface-container-high flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-base">center_focus_strong</span>
              </div>
              <span className="font-title-md text-[11px] leading-tight text-on-surface uppercase font-bold">
                {isEs ? 'Centrado' : 'Centered'}
              </span>
              <span className="font-label-md text-[9px] text-primary tracking-wider uppercase">LOCKED</span>
            </div>
            <div className="bg-surface-container-low p-space-xs flex flex-col items-center text-center gap-1 shadow-[2px_2px_0px_#000000]">
              <div className="w-7 h-7 bg-surface-container-high flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-base">visibility</span>
              </div>
              <span className="font-title-md text-[11px] leading-tight text-on-surface uppercase font-bold">
                {isEs ? 'Vibra Clara' : 'Clear Eyes'}
              </span>
              <span className="font-label-md text-[9px] text-secondary tracking-wider uppercase">
                {isEs ? 'LISTO' : 'NO SHADES'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ACTION CTAS */}
      {!result && (
        <div className="flex flex-col gap-space-xs pt-space-xs">
          {previewImage ? (
            <button
              type="button"
              id="captureBtn"
              disabled={isScanning}
              onClick={handleScanAura}
              className="w-full bg-tertiary text-on-tertiary-container py-space-sm px-space-md flex items-center justify-between shadow-[4px_4px_0px_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all group cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 bg-on-tertiary-container text-tertiary flex items-center justify-center shadow-[2px_2px_0px_#000000]">
                  <span className="material-symbols-outlined text-2xl">bolt</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-headline-md text-headline-md leading-tight text-on-tertiary-container uppercase font-extrabold tracking-tight">
                    {isScanning
                      ? isEs
                        ? 'ESCANEANDO...'
                        : 'SCANNING...'
                      : isEs
                      ? 'ESCANEAR AURA'
                      : 'SCAN AURA'}
                  </span>
                  <span className="font-label-md text-label-md text-on-tertiary-container tracking-wider uppercase font-bold opacity-85">
                    {isEs ? 'ANÁLISIS CON IA EN TIEMPO REAL ⚡' : 'REAL-TIME AI ANALYSIS ⚡'}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-2xl text-on-tertiary-container">arrow_forward</span>
            </button>
          ) : cameraActive ? (
            <button
              type="button"
              id="captureBtn"
              disabled={!cameraReady}
              onClick={handleCaptureSnapshot}
              className="w-full bg-primary-container text-on-primary-container py-space-sm px-space-md flex items-center justify-between shadow-[4px_4px_0px_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all group cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 bg-on-primary-container text-primary-container flex items-center justify-center shadow-[2px_2px_0px_#000000]">
                  <span className="material-symbols-outlined text-2xl">shutter_speed</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-headline-md text-headline-md leading-tight uppercase font-extrabold tracking-tight">
                    {cameraReady
                      ? isEs
                        ? 'CAPTURAR FOTO'
                        : 'TAKE MY AURA PIC'
                      : isEs
                      ? 'INICIALIZANDO...'
                      : 'INITIALIZING...'}
                  </span>
                  <span className="font-label-md text-label-md tracking-wider uppercase font-bold opacity-85">
                    {isEs ? 'PRESIONA PARA CONGELAR EL AURA ⚡' : 'TAP TO CAPTURE FRAME ⚡'}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-2xl">photo_camera</span>
            </button>
          ) : (
            <button
              type="button"
              id="captureBtn"
              disabled={cameraLoading}
              onClick={() => {
                playClickSound(settings.soundEnabled);
                startCamera();
              }}
              className="w-full bg-tertiary text-on-tertiary-container py-space-sm px-space-md flex items-center justify-between shadow-[4px_4px_0px_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all group cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 bg-on-tertiary-container text-tertiary flex items-center justify-center shadow-[2px_2px_0px_#000000]">
                  <span className="material-symbols-outlined text-2xl group-active:scale-90 transition-transform">
                    photo_camera
                  </span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-headline-md text-headline-md leading-tight text-on-tertiary-container uppercase font-extrabold tracking-tight">
                    {cameraLoading
                      ? isEs
                        ? 'ABRIENDO CÁMARA...'
                        : 'OPENING CAMERA...'
                      : isEs
                      ? 'ABRIR CÁMARA'
                      : 'TAKE MY AURA PIC'}
                  </span>
                  <span className="font-label-md text-label-md text-on-tertiary-container tracking-wider uppercase font-bold opacity-80">
                    {isEs ? 'TOMAR FOTO INSTANTÁNEA ⚡' : 'INSTANT AURA ANALYSIS ⚡'}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-2xl text-on-tertiary-container">arrow_forward</span>
            </button>
          )}

          {cameraActive && (
            <button
              type="button"
              onClick={() => {
                playClickSound(settings.soundEnabled);
                stopCamera();
              }}
              className="w-full bg-surface-container-high text-error py-2 px-space-md flex items-center justify-center gap-space-xs shadow-[2px_2px_0px_#000000] cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">videocam_off</span>
              <span className="font-label-md uppercase tracking-wider">
                {isEs ? 'CERRAR CÁMARA' : 'CLOSE CAMERA'}
              </span>
            </button>
          )}

          <button
            type="button"
            id="uploadBtn"
            disabled={isScanning}
            onClick={() => {
              playClickSound(settings.soundEnabled);
              galleryInputRef.current?.click();
            }}
            className="w-full bg-surface-container text-on-surface hover:text-tertiary py-space-sm px-space-md flex items-center justify-center gap-space-xs shadow-[2px_2px_0px_#571bc1] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-xl text-secondary">drive_folder_upload</span>
            <span className="font-title-md text-title-md uppercase tracking-wider">
              {isEs ? 'SUBIR DESDE GALERÍA' : 'UPLOAD FROM CAMERA ROLL'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
