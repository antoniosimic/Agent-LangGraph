"use client";

import { useEffect, useRef, useState } from "react";

interface AudioPlayerProps {
  src: string;
}

export default function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    audioRef.current?.play().catch(() => {});
    setPlaying(true);
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  return (
    <section
      aria-label="Reprodukcija audio opisa"
      className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 rounded-3xl p-5 border border-gray-700/60 shadow-xl flex items-center gap-5"
    >
      <button
        type="button"
        onClick={toggle}
        className="relative w-16 h-16 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 rounded-full shadow-lg shadow-blue-500/40 transition-transform active:scale-95"
        aria-label={playing ? "Pauziraj audio opis" : "Reproduciraj audio opis"}
        aria-pressed={playing}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>

      <div className="flex-1">
        <p className="text-base font-semibold text-gray-100">Audio opis</p>
        <div className="flex items-end gap-1 mt-2 h-6" aria-hidden="true">
          {[3, 6, 4, 7, 5, 8, 4, 6, 3, 5, 7].map((h, i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-blue-400/70 origin-bottom"
              style={{
                height: `${h * 3}px`,
                animation: playing ? `pulse-bar 1.2s ease-in-out ${i * 0.08}s infinite` : "none",
              }}
            />
          ))}
        </div>
        <style jsx>{`
          @keyframes pulse-bar {
            0%, 100% { transform: scaleY(0.5); }
            50% { transform: scaleY(1.4); }
          }
        `}</style>
      </div>

      <audio
        ref={audioRef}
        src={src}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </section>
  );
}

function PlayIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
