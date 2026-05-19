"use client";

import { useEffect, useRef, useState } from "react";

interface AudioPlayerProps {
  src: string;
}

export default function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    audioRef.current?.play();
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
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-700 flex items-center gap-4">
      <button
        onClick={toggle}
        className="w-12 h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-700 rounded-full transition-colors text-xl"
        aria-label={playing ? "Pauziraj" : "Reproduciraj"}
      >
        {playing ? "⏸" : "▶"}
      </button>
      <div>
        <p className="text-sm font-medium">Audio opis</p>
        <p className="text-xs text-gray-400">Automatski reproduciran</p>
      </div>
      <audio
        ref={audioRef}
        src={src}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </div>
  );
}
