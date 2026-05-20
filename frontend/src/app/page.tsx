"use client";

import { type MouseEvent, useCallback, useRef, useState } from "react";
import CameraCapture from "@/components/CameraCapture";
import A11ySettings from "@/components/A11ySettings";

interface AnalysisResult {
  description: string;
  audio_url: string | null;
  context_tags: string[];
  confidence_score: number;
  error: string | null;
}

const INSTRUCTIONS =
  "Blaind is a mobile camera assistant for blind and low-vision users. Tap anywhere on the camera view to take a picture. After the description appears, tap outside the Repeat description button to return to the camera. Descriptions are AI-generated and may not be fully accurate. Use your own judgment, especially in safety-critical situations.";
const SPEECH_RATE = 1.25;
const ANALYZING_SPEECH_DELAY_MS = 1500;

export default function Home() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [status, setStatus] = useState("Camera starting");
  const [lastDescription, setLastDescription] = useState("");
  const analyzingSpeechTimerRef = useRef<number | null>(null);

  const speak = useCallback(
    (text: string, interrupt = true) => {
      if (!soundEnabled || !("speechSynthesis" in window)) return;
      if (interrupt) window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = SPEECH_RATE;
      window.speechSynthesis.speak(utterance);
    },
    [soundEnabled],
  );

  const speakSequence = useCallback(
    (parts: string[]) => {
      if (!soundEnabled || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      for (const part of parts) {
        const utterance = new SpeechSynthesisUtterance(part);
        utterance.lang = "en-US";
        utterance.rate = SPEECH_RATE;
        window.speechSynthesis.speak(utterance);
      }
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
    if (analyzingSpeechTimerRef.current !== null) {
      window.clearTimeout(analyzingSpeechTimerRef.current);
    }
    analyzingSpeechTimerRef.current = window.setTimeout(() => {
      speak("Analyzing picture");
      analyzingSpeechTimerRef.current = null;
    }, ANALYZING_SPEECH_DELAY_MS);

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
      if (analyzingSpeechTimerRef.current !== null) {
        window.clearTimeout(analyzingSpeechTimerRef.current);
        analyzingSpeechTimerRef.current = null;
      }
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
      if (analyzingSpeechTimerRef.current !== null) {
        window.clearTimeout(analyzingSpeechTimerRef.current);
        analyzingSpeechTimerRef.current = null;
      }
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

  const repeatDescription = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (lastDescription) {
      speakSequence(["Repeat description", lastDescription]);
    }
  };

  const closeDescription = () => {
    setResult(null);
    setError(null);
    setStatus("Camera active");
    speak("Camera active");
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

  const showingDescription = Boolean(result && !result.error);

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-black text-white">
      <CameraCapture
        disabled={loading || showingDescription}
        holdPreview={loading || showingDescription}
        onCameraActive={handleCameraActive}
        onCapture={handleCapture}
        onPictureTaken={handlePictureTaken}
      />

      <div
        className="pointer-events-none fixed left-4 top-16 z-30 rounded-full bg-black/70 px-3 py-2 text-lg font-black tracking-tight text-white shadow-lg backdrop-blur"
        aria-hidden="true"
      >
        Bl<span className="text-blue-300">AI</span>nd
      </div>

      <div className="pointer-events-none fixed right-3 top-3 z-30 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={speakInstructions}
          className="pointer-events-auto min-h-11 rounded-full border border-white/20 bg-black/75 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur transition-colors hover:bg-white/10"
          aria-label="Read instructions aloud"
        >
          Instructions
        </button>
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={soundEnabled}
          className="pointer-events-auto flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-black/75 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur transition-colors hover:bg-white/10"
          aria-label={soundEnabled ? "Turn sound off" : "Turn sound on"}
        >
          {soundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
          {soundEnabled ? "Sound" : "Muted"}
        </button>
      </div>

      <A11ySettings />

      {showingDescription && (
        <section
          role="dialog"
          aria-label="Scene description"
          aria-live="polite"
          aria-atomic="true"
          onClick={closeDescription}
          className="fixed inset-0 z-20 flex items-end bg-gradient-to-t from-black via-black/75 to-transparent px-4 pb-6 pt-28"
        >
          <article className="mx-auto w-full max-w-md rounded-2xl border border-white/15 bg-zinc-950/95 p-5 shadow-2xl backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">
              Description
            </p>
            <p className="mt-3 text-xl leading-relaxed text-white">{result?.description}</p>
            <button
              type="button"
              onClick={repeatDescription}
              className="mt-5 w-full rounded-xl bg-white px-4 py-4 text-base font-bold text-black transition-colors hover:bg-blue-100"
            >
              Repeat description
            </button>
            <p className="mt-3 text-center text-xs text-zinc-400">
              Tap outside the button to return to the camera.
            </p>
          </article>
        </section>
      )}

      {error && (
        <section
          role="alert"
          aria-live="assertive"
          className="fixed inset-x-4 bottom-6 z-30 mx-auto max-w-md rounded-2xl border border-red-400/60 bg-red-950/90 p-4 shadow-2xl"
        >
          <p className="text-base font-semibold text-red-100">{error}</p>
          <button
            type="button"
            onClick={closeDescription}
            className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-base font-bold text-black"
          >
            Return to camera
          </button>
        </section>
      )}

      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {status}
      </span>
    </main>
  );
}

function SoundOnIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function SoundOffIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="m23 9-6 6" />
      <path d="m17 9 6 6" />
    </svg>
  );
}
