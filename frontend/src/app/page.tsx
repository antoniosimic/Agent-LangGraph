"use client";

import { type MouseEvent, useCallback, useRef, useState } from "react";
import CameraCapture from "@/components/CameraCapture";
import A11ySettings from "@/components/A11ySettings";
import AudioPlayer from "@/components/AudioPlayer";

interface AnalysisResult {
  description: string;
  audio_url: string | null;
  context_tags: string[];
  confidence_score: number;
  error: string | null;
}

const INSTRUCTIONS =
  "Blaind is a mobile camera assistant for blind and low-vision users. Tap anywhere on the camera view to take a picture. After the description appears, tap outside the card to return to the camera. Descriptions are AI-generated and may not be fully accurate.";
const SPEECH_RATE = 1.25;
const ANALYZING_SPEECH_DELAY_MS = 1500;

export default function Home() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [a11yOpen, setA11yOpen] = useState(false);
  const [status, setStatus] = useState("Camera starting");
  const [lastDescription, setLastDescription] = useState("");
  const analyzingSpeechTimerRef = useRef<number | null>(null);

  const speak = useCallback(
    (text: string, interrupt = true) => {
      if (!soundEnabled || !("speechSynthesis" in window)) return;
      if (interrupt) window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "en-US";
      utt.rate = SPEECH_RATE;
      window.speechSynthesis.speak(utt);
    },
    [soundEnabled],
  );

  const speakSequence = useCallback(
    (parts: string[]) => {
      if (!soundEnabled || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      for (const part of parts) {
        const utt = new SpeechSynthesisUtterance(part);
        utt.lang = "en-US";
        utt.rate = SPEECH_RATE;
        window.speechSynthesis.speak(utt);
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vision/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);

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
      if (!data.audio_url) speak(description);
      if ("vibrate" in navigator) navigator.vibrate([60, 80, 60]);
    } catch {
      if (analyzingSpeechTimerRef.current !== null) {
        window.clearTimeout(analyzingSpeechTimerRef.current);
        analyzingSpeechTimerRef.current = null;
      }
      const message = "Analysis failed. Check connection and try again.";
      setError(message);
      setStatus("Error");
      speak(message);
    } finally {
      setLoading(false);
    }
  };

  const repeatDescription = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (lastDescription) speakSequence(["Repeat description", lastDescription]);
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
      if (enabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
      return next;
    });
  };

  const showingDescription = Boolean(result && !result.error);

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-black text-white">
      <CameraCapture
        disabled={loading || showingDescription}
        holdPreview={loading || showingDescription}
        onCameraActive={handleCameraActive}
        onCapture={handleCapture}
        onPictureTaken={handlePictureTaken}
      />

      {/* Top bar — logo left, controls right */}
      <div className="pointer-events-none fixed left-0 right-0 top-0 z-30 flex items-center justify-between px-3 pb-3 pt-4">
        {/* Left: logo + settings */}
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-black/70 px-3 py-2 text-base font-black tracking-tight text-white shadow-lg backdrop-blur" aria-hidden="true">
            Bl<span className="text-blue-300">AI</span>nd
          </div>
          <button
            type="button"
            onClick={() => setA11yOpen((v) => !v)}
            aria-label="Accessibility settings"
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/70 shadow backdrop-blur transition-colors hover:bg-white/10"
          >
            <SettingsIcon />
          </button>
        </div>

        {/* Right: info + sound */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => speak(INSTRUCTIONS)}
            aria-label="Read instructions aloud"
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/70 shadow backdrop-blur transition-colors hover:bg-white/10"
          >
            <InfoIcon />
          </button>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundEnabled}
            aria-label={soundEnabled ? "Mute sound" : "Unmute sound"}
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/70 shadow backdrop-blur transition-colors hover:bg-white/10"
          >
            {soundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
          </button>
        </div>
      </div>

      <A11ySettings open={a11yOpen} onOpenChange={setA11yOpen} />

      {/* Description overlay */}
      {showingDescription && (
        <section
          role="dialog"
          aria-label="Scene description"
          aria-live="polite"
          aria-atomic="true"
          onClick={closeDescription}
          className="fixed inset-0 z-20 flex items-end bg-gradient-to-t from-black/95 via-black/60 to-transparent"
        >
          <article
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-3xl border-t border-white/10 bg-zinc-950 px-5 pb-10 pt-5 shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
              Description
            </p>
            <p className="mt-3 text-lg leading-relaxed text-white">{result?.description}</p>
            {result?.audio_url && (
              <div className="mt-4">
                <AudioPlayer src={`${process.env.NEXT_PUBLIC_API_URL}${result.audio_url}`} />
              </div>
            )}
            <button
              type="button"
              onClick={repeatDescription}
              className="mt-4 w-full rounded-2xl bg-white px-4 py-4 text-base font-bold text-black transition-colors active:bg-zinc-100"
            >
              Repeat description
            </button>
            <button
              type="button"
              onClick={closeDescription}
              className="mt-3 w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-zinc-300 transition-colors active:bg-white/5"
            >
              Back to camera
            </button>
          </article>
        </section>
      )}

      {/* Error overlay */}
      {error && (
        <section
          role="alert"
          aria-live="assertive"
          className="fixed inset-x-4 bottom-24 z-30 mx-auto max-w-md rounded-2xl border border-red-400/50 bg-red-950/95 p-4 shadow-2xl"
        >
          <p className="text-sm font-semibold text-red-100">{error}</p>
          <button
            type="button"
            onClick={closeDescription}
            className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-black"
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

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function SoundOnIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function SoundOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}
