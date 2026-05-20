"use client";

import { useEffect, useState } from "react";

type Contrast = "normal" | "high";
type TextSize = "normal" | "large";

const STORAGE_KEY = "blaind-a11y";

interface Settings {
  contrast: Contrast;
  textSize: TextSize;
}

const DEFAULTS: Settings = { contrast: "normal", textSize: "normal" };

function applyToDocument(settings: Settings) {
  const root = document.documentElement;
  root.dataset.contrast = settings.contrast;
  root.dataset.text = settings.textSize;
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
      // localStorage can be unavailable in private browsing.
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="a11y-panel"
        aria-label="Open accessibility settings"
        className="fixed left-3 top-28 z-40 min-h-11 rounded-full border border-white/20 bg-black/75 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur transition-colors hover:bg-white/10"
      >
        Settings
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <div
            id="a11y-panel"
            role="dialog"
            aria-label="Accessibility settings"
            className="fixed inset-x-3 bottom-4 z-50 mx-auto flex max-h-[calc(100dvh-2rem)] max-w-md flex-col gap-7 overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950 p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-white">Accessibility</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close accessibility settings"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white hover:bg-white/10"
              >
                X
              </button>
            </div>

            <fieldset className="flex flex-col gap-4">
              <legend className="mb-1 text-lg font-bold text-zinc-100">Contrast</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["normal", "high"] as const).map((contrast) => (
                  <button
                    key={contrast}
                    type="button"
                    onClick={() => update({ contrast })}
                    aria-pressed={settings.contrast === contrast}
                    data-selected={settings.contrast === contrast}
                    className={`rounded-xl border-2 px-3 py-4 text-sm font-bold transition-colors ${
                      settings.contrast === contrast
                        ? "border-blue-300 bg-blue-600 text-white"
                        : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-400"
                    }`}
                  >
                    {contrast === "normal" ? "Standard" : "High"}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-4">
              <legend className="mb-1 text-lg font-bold text-zinc-100">Text size</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["normal", "large"] as const).map((textSize) => (
                  <button
                    key={textSize}
                    type="button"
                    onClick={() => update({ textSize })}
                    aria-pressed={settings.textSize === textSize}
                    data-selected={settings.textSize === textSize}
                    className={`rounded-xl border-2 px-3 py-4 font-bold transition-colors ${
                      settings.textSize === textSize
                        ? "border-blue-300 bg-blue-600 text-white"
                        : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-400"
                    } ${textSize === "large" ? "text-lg" : "text-sm"}`}
                  >
                    {textSize === "normal" ? "Normal" : "Large"}
                  </button>
                ))}
              </div>
            </fieldset>

            <p className="border-t border-zinc-800 pt-3 text-sm leading-relaxed text-zinc-400">
              Settings are saved in this browser. High contrast uses a black and white interface
              with stronger focus colors.
            </p>
          </div>
        </>
      )}
    </>
  );
}
