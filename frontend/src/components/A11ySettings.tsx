"use client";

// Postavke pristupačnosti — perzistirane u localStorage i primijenjene na <html>
// preko data-* atributa koje koristi globals.css.

import { useEffect, useState } from "react";

type Contrast = "normal" | "high";
type TextSize = "normal" | "large";

const STORAGE_KEY = "blaind-a11y";

interface Settings {
  contrast: Contrast;
  textSize: TextSize;
}

const DEFAULTS: Settings = { contrast: "normal", textSize: "normal" };

function applyToDocument(s: Settings) {
  const root = document.documentElement;
  root.dataset.contrast = s.contrast;
  root.dataset.text = s.textSize;
}

export default function A11ySettings() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const loaded = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
      setSettings(loaded);
      applyToDocument(loaded);
    } catch {
      applyToDocument(DEFAULTS);
    }
  }, []);

  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    applyToDocument(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage nedostupan (privatni mode) — ignoriramo
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="a11y-panel"
        aria-label="Otvori postavke pristupačnosti"
        className="fixed top-4 right-4 z-50 w-12 h-12 flex items-center justify-center bg-gray-900/80 hover:bg-gray-800 backdrop-blur-md border border-gray-600/80 rounded-full shadow-lg transition-colors"
      >
        <GearIcon />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <div
            id="a11y-panel"
            role="dialog"
            aria-label="Postavke pristupačnosti"
            className="fixed top-20 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-700 rounded-2xl p-5 shadow-2xl flex flex-col gap-5 fade-in-up"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-100">Pristupačnost</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Zatvori postavke"
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 text-gray-400 hover:text-gray-100"
              >
                ✕
              </button>
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-semibold text-gray-300 mb-1">Kontrast</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["normal", "high"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => update({ contrast: c })}
                    aria-pressed={settings.contrast === c}
                    className={`py-3 px-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                      settings.contrast === c
                        ? "bg-blue-600 border-blue-400 text-white"
                        : "bg-gray-800/50 border-gray-700 hover:border-gray-500 text-gray-300"
                    }`}
                  >
                    {c === "normal" ? "Standardni" : "Visoki"}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-semibold text-gray-300 mb-1">Veličina teksta</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["normal", "large"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update({ textSize: t })}
                    aria-pressed={settings.textSize === t}
                    className={`py-3 px-3 rounded-xl border-2 font-semibold transition-colors ${
                      settings.textSize === t
                        ? "bg-blue-600 border-blue-400 text-white"
                        : "bg-gray-800/50 border-gray-700 hover:border-gray-500 text-gray-300"
                    } ${t === "large" ? "text-base" : "text-sm"}`}
                  >
                    {t === "normal" ? "Aa Normalna" : "Aa Velika"}
                  </button>
                ))}
              </div>
            </fieldset>

            <p className="text-xs text-gray-500 leading-relaxed border-t border-gray-800 pt-3">
              Postavke se pamte u pregledniku. Visoki kontrast koristi crno-bijelu shemu sa žutim akcentima.
            </p>
          </div>
        </>
      )}
    </>
  );
}

function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
