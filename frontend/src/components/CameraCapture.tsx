"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface CameraCaptureProps {
  disabled?: boolean;
  holdPreview?: boolean;
  onCameraActive?: () => void;
  onCapture: (blob: Blob) => void;
  onPictureTaken?: () => void;
}

export default function CameraCapture({
  disabled,
  holdPreview,
  onCameraActive,
  onCapture,
  onPictureTaken,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onCameraActiveRef = useRef(onCameraActive);
  const [streaming, setStreaming] = useState(false);
  const [permissionState, setPermissionState] = useState<"requesting" | "denied" | "ready">("requesting");
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const facingModeRef = useRef<"environment" | "user">("environment");

  useEffect(() => {
    onCameraActiveRef.current = onCameraActive;
  }, [onCameraActive]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async (isSwitch = false) => {
    if (!isSwitch) setPermissionState("requesting");
    try {
      stopCamera();

      // Try enumerating devices for more reliable switching on Android
      let videoConstraint: MediaTrackConstraints = { facingMode: { ideal: facingModeRef.current } };
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        if (videoDevices.length > 1) {
          const idx = facingModeRef.current === "environment" ? 0 : videoDevices.length - 1;
          const deviceId = videoDevices[idx]?.deviceId;
          if (deviceId) videoConstraint = { deviceId: { exact: deviceId } };
        }
      } catch {
        // fall back to facingMode
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: videoConstraint });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setStreaming(true);
      setPermissionState("ready");
      setTorch(false);
      const track = stream.getVideoTracks()[0];
      const caps = (track.getCapabilities as (() => Record<string, unknown>) | undefined)?.();
      setTorchSupported(!!caps?.torch);
      setCameraReady(true);
      setTimeout(() => setCameraReady(false), 500);
      onCameraActiveRef.current?.();
    } catch {
      setStreaming(false);
      if (!isSwitch) setPermissionState("denied");
    }
  }, [stopCamera]);

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (streaming && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [streaming]);

  useEffect(() => {
    if (!holdPreview) setCapturedPreview(null);
  }, [holdPreview]);

  const toggleTorch = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torch;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await track.applyConstraints({ advanced: [{ torch: next } as any] });
      setTorch(next);
    } catch {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (track as any).applyConstraints({ torch: next });
        setTorch(next);
      } catch {
        setTorchSupported(false);
      }
    }
  }, [torch]);

  const switchCamera = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = facingModeRef.current === "environment" ? "user" : "environment";
    facingModeRef.current = next;
    setFacingMode(next);
    setTorch(false);
    setCapturedPreview(null);
    stopCamera();
    setStreaming(false);
    await new Promise((r) => setTimeout(r, 150));
    startCamera(true);
  }, [startCamera, stopCamera]);

  const capture = useCallback(() => {
    if (disabled || !streaming) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    setCapturedPreview(canvas.toDataURL("image/jpeg", 0.9));
    onPictureTaken?.();
    if ("vibrate" in navigator) navigator.vibrate(50);
    canvas.toBlob((blob) => { if (blob) onCapture(blob); }, "image/jpeg", 0.9);
  }, [disabled, onCapture, onPictureTaken, streaming]);

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
  }, [capture, disabled, streaming]);

  return (
    <section className="relative h-[100dvh] w-full overflow-hidden bg-black text-white">
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {/* Camera ready flash */}
      {cameraReady && (
        <div className="pointer-events-none absolute inset-0 z-20 animate-ping bg-white/20" aria-hidden="true" />
      )}

      {/* Full-screen tap-to-capture button */}
      <button
        type="button"
        onClick={capture}
        disabled={!streaming || disabled}
        aria-label={disabled ? "Camera paused" : "Tap anywhere to capture"}
        aria-busy={disabled}
        className="absolute inset-0 h-full w-full touch-manipulation bg-black disabled:cursor-default"
      >
        <video
          ref={videoRef}
          className={`h-full w-full object-cover ${capturedPreview ? "invisible" : ""}`}
          playsInline muted autoPlay aria-hidden="true"
        />
        {capturedPreview && (
          <img src={capturedPreview} alt="" className="absolute inset-0 h-full w-full object-cover" aria-hidden="true" />
        )}
        {/* Gradient overlay — stronger at top and bottom */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70" />
      </button>

      {/* Bottom control bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center gap-3 px-4 pb-8">
        {/* Flash button — always visible on mobile, hidden on desktop */}
        <button
          type="button"
          onClick={toggleTorch}
          aria-label={torch ? "Turn flash off" : "Turn flash on"}
          aria-pressed={torch}
          className="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/70 backdrop-blur transition-colors hover:bg-white/10 sm:hidden"
        >
          <FlashIcon on={torch} />
        </button>

        {/* Center pill */}
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 rounded-full bg-white/90 px-5 py-3 text-sm font-bold text-black shadow-2xl backdrop-blur sm:px-8 sm:py-5 sm:text-xl">
            {disabled ? <><SpinnerSmall />Analyzing…</> : <><ShutterIcon />Tap to analyze</>}
          </div>
        </div>

        {/* Camera switch button — mobile only */}
        <button
          type="button"
          onClick={switchCamera}
          aria-label={facingMode === "environment" ? "Switch to front camera" : "Switch to back camera"}
          className="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/70 backdrop-blur transition-colors hover:bg-white/10 sm:hidden"
        >
          <SwitchCameraIcon />
        </button>
      </div>

      {/* Permission overlay */}
      {permissionState !== "ready" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 px-5 backdrop-blur">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-zinc-950 p-6 shadow-2xl">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white">
              <CameraIcon />
            </div>
            <h1 className="text-2xl font-bold text-white">Blaind needs camera access</h1>
            <p className="mt-3 text-base leading-relaxed text-zinc-300">
              Allow camera permission so Blaind can capture a picture and describe what is in front of you.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Descriptions are AI-generated and may not be fully accurate. Use your own judgment, especially in safety-critical situations.
            </p>
            <button
              type="button"
              onClick={() => startCamera()}
              className="mt-6 w-full rounded-xl bg-blue-500 px-5 py-4 text-base font-bold text-white transition-colors hover:bg-blue-400"
            >
              {permissionState === "requesting" ? "Requesting camera…" : "Enable camera"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function CameraIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function ShutterIcon() {
  return (
    <svg className="h-5 w-5 sm:h-7 sm:w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  );
}

function SwitchCameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 7h-3a2 2 0 0 1-2-2V2" />
      <path d="M9 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5" />
      <path d="M14 2v5h6" />
      <circle cx="10" cy="13" r="3" />
    </svg>
  );
}

function FlashIcon({ on }: { on: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon
        points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
        fill={on ? "currentColor" : "none"}
        className={on ? "text-yellow-300" : "text-white"}
        stroke={on ? "#fde047" : "currentColor"}
      />
    </svg>
  );
}

function SpinnerSmall() {
  return (
    <svg className="h-5 w-5 animate-spin sm:h-7 sm:w-7" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" fill="none" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}
