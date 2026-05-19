"use client";

// CameraCapture — kada je kamera aktivna, CIJELI prikaz postaje gumb za snimanje.
// Ovo je ključno za slijepe korisnike: ne moraju ciljati malu metu.

import { useRef, useState, useCallback, useEffect } from "react";

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  disabled?: boolean;
}

export default function CameraCapture({ onCapture, disabled }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setStreaming(true);
      setError(null);
    } catch {
      setError("Nije moguće pristupiti kameri. Provjerite dozvole.");
    }
  }, []);

  // Stream se priključuje na <video> tek nakon što ga React montira.
  useEffect(() => {
    if (streaming && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [streaming]);

  // Pri unmount-u zaustavljamo tracks da se kamera oslobodi.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = useCallback(() => {
    if (disabled) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    if ("vibrate" in navigator) navigator.vibrate(50);

    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.9,
    );
  }, [onCapture, disabled]);

  useEffect(() => {
    if (!streaming) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && !disabled) {
        e.preventDefault();
        capture();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [streaming, capture, disabled]);

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-2xl">
      {error && (
        <p
          role="alert"
          className="text-red-300 text-base font-medium bg-red-950/40 border border-red-500/50 rounded-xl px-4 py-3 w-full text-center"
        >
          {error}
        </p>
      )}

      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {!streaming ? (
        <button
          type="button"
          onClick={startCamera}
          className="glow group relative w-full px-8 py-8 sm:py-10 bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 rounded-3xl text-2xl sm:text-3xl font-bold transition-all shadow-2xl shadow-blue-500/30"
          aria-label="Aktiviraj kameru za analizu okoline"
        >
          <span className="flex items-center justify-center gap-4">
            <CameraIcon />
            Aktiviraj kameru
          </span>
          <span className="block mt-2 text-sm font-normal text-blue-100/80">
            Trebamo pristup kameri da bismo opisali okolinu
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={capture}
          disabled={disabled}
          aria-label={
            disabled
              ? "Analiza u tijeku, pričekajte"
              : "Snimi sliku — pritisak razmaknice ili dodir bilo gdje na prikazu kamere"
          }
          aria-busy={disabled}
          className="relative w-full aspect-video bg-gray-950 rounded-3xl overflow-hidden border-4 border-blue-500/80 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:border-yellow-400 shadow-2xl shadow-blue-500/20 transition-transform active:scale-[0.99]"
        >
          <video
            ref={videoRef}
            className="w-full h-full object-cover pointer-events-none"
            playsInline
            muted
            autoPlay
            aria-hidden="true"
          />

          {/* Gornji indikator UŽIVO */}
          <span
            className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 bg-black/60 backdrop-blur rounded-full text-xs font-bold uppercase tracking-wider text-red-400 pointer-events-none"
            aria-hidden="true"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Uživo
          </span>

          {/* Crosshair u sredini */}
          <span
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-hidden="true"
          >
            <span className="w-20 h-20 border-2 border-white/50 rounded-2xl" />
          </span>

          {/* CTA traka na dnu */}
          <span
            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent text-white pt-12 pb-5 px-5 pointer-events-none"
            aria-hidden="true"
          >
            <span className="flex items-center justify-center gap-3 text-xl font-bold">
              {disabled ? (
                <>
                  <SpinnerSmall />
                  Analiza u tijeku...
                </>
              ) : (
                <>
                  <ShutterIcon />
                  Dodirni za analizu
                </>
              )}
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function ShutterIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  );
}

function SpinnerSmall() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" fill="none" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}
