"use client";

import { useCallback, useState } from "react";
import CameraCapture from "@/components/CameraCapture";

interface AnalysisResult {
  description: string;
  audio_url: string | null;
  context_tags: string[];
  confidence_score: number;
  error: string | null;
}

const INSTRUCTIONS =
  "Blaind is ready. Tap anywhere on the camera view to take a picture. Descriptions are AI-generated and may not be fully accurate. Use your own judgment, especially in safety-critical situations.";

export default function Home() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [status, setStatus] = useState("Camera starting");
  const [lastDescription, setLastDescription] = useState("");

  const speak = useCallback(
    (text: string) => {
      if (!soundEnabled || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    },
    [soundEnabled],
  );

  const handleCameraActive = useCallback(() => {
    setStatus("Camera active");
    speak("Camera active");
  }, [speak]);

  const handlePictureTaken = useCallback(() => {
    setStatus("Picture taken");
    speak("Picture taken");
  }, [speak]);

  const handleCapture = async (imageBlob: Blob) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setStatus("Analyzing picture");
    window.setTimeout(() => speak("Analyzing picture"), 700);

    const formData = new FormData();
    formData.append("image", imageBlob, "capture.jpg");
    formData.append("user_id", "demo_user");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/vision/analyze`,
        { method: "POST", body: formData },
      );

      if (!response.ok) {
        throw new Error(`Analysis failed with status ${response.status}`);
      }

      const data: AnalysisResult = await response.json();
      setResult(data);

      if (data.error) {
        setError(data.error);
        setStatus("Error");
        speak("Error");
        return;
      }

      const description = data.description || "No description was generated.";
      setLastDescription(description);
      setStatus("Result ready");
      speak(description);
      if ("vibrate" in navigator) navigator.vibrate([60, 80, 60]);
    } catch {
      const message = "Analysis failed. Check the connection and try again.";
      setError(message);
      setStatus("Error");
      speak(message);
    } finally {
      setLoading(false);
    }
  };

  const speakInstructions = () => {
    speak(INSTRUCTIONS);
  };

  const repeatDescription = () => {
    if (lastDescription) {
      speak(lastDescription);
    }
  };

  const toggleSound = () => {
    setSoundEnabled((enabled) => {
      const next = !enabled;
      if (enabled && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  };

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-black text-white">
      <CameraCapture
        disabled={loading}
        onCameraActive={handleCameraActive}
        onCapture={handleCapture}
        onPictureTaken={handlePictureTaken}
      />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 bg-gradient-to-b from-black/80 to-transparent px-4 pb-12 pt-4">
        <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Blaind</p>
            <p className="mt-1 text-sm font-medium text-white/90" aria-live="polite">
              {status}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={speakInstructions}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white shadow-lg backdrop-blur transition-colors hover:bg-white/10"
              aria-label="Read instructions aloud"
            >
              <InfoIcon />
            </button>
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={soundEnabled}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white shadow-lg backdrop-blur transition-colors hover:bg-white/10"
              aria-label={soundEnabled ? "Turn sound off" : "Turn sound on"}
            >
              {soundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
            </button>
          </div>
        </div>
      </div>

      <section
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/85 to-transparent px-4 pb-5 pt-24"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="pointer-events-auto mx-auto flex max-w-md flex-col gap-3">
          {error && (
            <div role="alert" className="rounded-2xl border border-red-400/60 bg-red-950/85 p-4">
              <p className="text-base font-semibold text-red-100">{error}</p>
            </div>
          )}

          {result && !result.error && (
            <article className="rounded-2xl border border-white/15 bg-zinc-950/90 p-4 shadow-2xl backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">
                Description
              </p>
              <p className="mt-2 text-lg leading-relaxed text-white">{result.description}</p>
              {lastDescription && (
                <button
                  type="button"
                  onClick={repeatDescription}
                  className="mt-4 w-full rounded-xl bg-white px-4 py-3 text-base font-bold text-black transition-colors hover:bg-blue-100"
                >
                  Repeat description
                </button>
              )}
            </article>
          )}

          <p className="text-center text-xs leading-relaxed text-white/55">
            AI-generated descriptions may be inaccurate. Use judgment in safety-critical
            situations.
          </p>
        </div>
      </section>

      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {status}
      </span>
    </main>
  );
}

function InfoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function SoundOnIcon() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function SoundOffIcon() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="m23 9-6 6" />
      <path d="m17 9 6 6" />
    </svg>
  );
}
