"use client";

import { useState } from "react";
import CameraCapture from "@/components/CameraCapture";
import AudioPlayer from "@/components/AudioPlayer";

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
        { method: "POST", body: formData }
      );
      const data: AnalysisResult = await response.json();
      setResult(data);
    } catch (err) {
      setError("Greška pri analizi slike. Provjerite konekciju.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-start p-4 gap-6">
      <header className="text-center pt-8">
        <h1 className="text-4xl font-bold tracking-tight">Blaind</h1>
        <p className="text-gray-400 mt-2">Usmjeri kameru i aktiviraj analizu</p>
      </header>

      <CameraCapture onCapture={handleCapture} disabled={loading} />

      {loading && (
        <div className="text-center">
          <p className="text-blue-400 animate-pulse">Analiziranje slike...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 max-w-md w-full">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {result && !result.error && (
        <div className="max-w-md w-full flex flex-col gap-4">
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-700">
            <h2 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">
              Opis scene
            </h2>
            <p className="text-lg leading-relaxed">{result.description}</p>
          </div>

          {result.audio_url && (
            <AudioPlayer
              src={`${process.env.NEXT_PUBLIC_API_URL}${result.audio_url}`}
            />
          )}

          {result.context_tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {result.context_tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-blue-900/40 text-blue-300 text-xs px-3 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
