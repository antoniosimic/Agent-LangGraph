"use client";

import { useState } from "react";
import CameraCapture from "@/components/CameraCapture";
import AudioPlayer from "@/components/AudioPlayer";
import A11ySettings from "@/components/A11ySettings";

interface AnalysisResult {
  description: string;
  audio_url: string | null;
  context_tags: string[];
  confidence_score: number;
  error: string | null;
}

export default function Home() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = async (imageBlob: Blob) => {
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("image", imageBlob, "capture.jpg");
    formData.append("user_id", "demo_user");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/vision/analyze`,
        { method: "POST", body: formData },
      );
      const data: AnalysisResult = await response.json();
      setResult(data);
      if ("vibrate" in navigator) navigator.vibrate([60, 80, 60]);
    } catch {
      setError("Greška pri analizi slike. Provjerite konekciju.");
    } finally {
      setLoading(false);
    }
  };

  const speakIntro = () => {
    if (!("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(
      "Dobrodošli u Blaind. Pritisnite gumb za aktivaciju kamere, zatim dodirnite prikaz ili pritisnite razmaknicu za snimanje. Aplikacija će glasno opisati ono što kamera vidi.",
    );
    utter.lang = "hr-HR";
    window.speechSynthesis.speak(utter);
  };

  return (
    <>
      <A11ySettings />

      <main className="min-h-screen flex flex-col items-center p-4 sm:p-6 gap-8">
        <a
          href="#capture"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:p-3 focus:bg-yellow-400 focus:text-black focus:rounded-lg focus:font-semibold"
        >
          Preskoči na snimanje
        </a>

        <header className="text-center pt-16 sm:pt-20 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" aria-hidden="true" />
            AI vizualni asistent
          </div>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight bg-gradient-to-br from-white via-blue-100 to-blue-400 bg-clip-text text-transparent">
            Blaind
          </h1>
          <p className="text-gray-300 mt-4 text-lg sm:text-xl leading-relaxed">
            Usmjerite kameru, a sustav će <span className="text-blue-300 font-medium">opisati</span> što vidi —
            naglas i u realnom vremenu.
          </p>
          <button
            type="button"
            onClick={speakIntro}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-200 border border-blue-500/40 rounded-full hover:bg-blue-500/10 transition-colors"
          >
            <SpeakerIcon />
            Pročitaj upute naglas
          </button>
        </header>

        <div id="capture" className="w-full flex justify-center">
          <CameraCapture onCapture={handleCapture} disabled={loading} />
        </div>

        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="max-w-2xl w-full px-2"
        >
          {loading && (
            <div className="flex items-center justify-center gap-3 py-6 fade-in-up">
              <Spinner />
              <p className="text-blue-200 text-lg">Analiziram scenu...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-950/40 border-2 border-red-500/60 rounded-2xl p-5 fade-in-up">
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden="true">⚠</span>
                <p className="text-red-200 text-base font-medium">{error}</p>
              </div>
            </div>
          )}

          {result && !result.error && (
            <div className="flex flex-col gap-5 fade-in-up">
              <article className="relative bg-gradient-to-br from-gray-900/90 to-gray-950/90 rounded-3xl p-6 sm:p-8 border border-gray-700/60 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1 h-6 bg-blue-400 rounded-full" aria-hidden="true" />
                  <h2 className="text-xs font-semibold text-blue-300 uppercase tracking-widest">
                    Opis scene
                  </h2>
                </div>
                <p className="text-xl sm:text-2xl leading-relaxed text-gray-100">
                  {result.description}
                </p>
                {result.confidence_score > 0 && (
                  <div className="mt-5 flex items-center gap-3 text-xs text-gray-400">
                    <span>Pouzdanost</span>
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-300"
                        style={{ width: `${Math.round(result.confidence_score * 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-gray-300">
                      {Math.round(result.confidence_score * 100)}%
                    </span>
                  </div>
                )}
              </article>

              {result.audio_url && (
                <AudioPlayer
                  src={`${process.env.NEXT_PUBLIC_API_URL}${result.audio_url}`}
                />
              )}

              {result.context_tags.length > 0 && (
                <ul
                  aria-label="Kategorije scene"
                  className="flex flex-wrap gap-2 list-none p-0"
                >
                  {result.context_tags.map((tag) => (
                    <li
                      key={tag}
                      className="bg-blue-500/15 text-blue-200 text-sm px-3.5 py-1.5 rounded-full border border-blue-500/30"
                    >
                      #{tag}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <footer className="mt-auto pt-8 pb-4 text-center text-xs text-gray-500">
          Blaind · Univerzitetski projekt iz kolegija Programski agenti
        </footer>
      </main>
    </>
  );
}

function SpeakerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" className="animate-spin text-blue-400" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" fill="none" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}
