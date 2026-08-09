"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  PALETTE_HUES,
  PALETTE_KEYS,
  PALETTE_STOPS_BY_HUE,
  type PaletteHue,
  type PaletteOverride,
} from "@/modules/core/organisation/theme-palette-schema";

type ThemeMode = "light" | "dark";

type Palettes = {
  light: PaletteOverride;
  dark: PaletteOverride;
};

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** Normalizes a CSS color (hex or rgb()) to #rrggbb for use as an <input type="color"> value. Returns null if unparseable. */
function toHexColor(value: string): string | null {
  const trimmed = value.trim();
  if (HEX_PATTERN.test(trimmed)) return trimmed;

  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `#${[r, g, b].map((c) => Number(c).toString(16).padStart(2, "0")).join("")}`;
  }
  return null;
}

/** Reads the CSS-defined default (not overridden) --frappe-{key} values for a given theme, via a detached probe element. */
function readDefaultColors(mode: ThemeMode): PaletteOverride {
  const probe = document.createElement("div");
  probe.style.display = "none";
  if (mode === "dark") probe.dataset.theme = "dark";
  document.body.appendChild(probe);

  const computed = getComputedStyle(probe);
  const result: PaletteOverride = {};
  for (const key of PALETTE_KEYS) {
    const value = computed.getPropertyValue(`--frappe-${key}`).trim();
    if (value) result[key] = value;
  }

  document.body.removeChild(probe);
  return result;
}

function applyPreview(mode: ThemeMode, palette: PaletteOverride) {
  if (mode !== "light") return;
  for (const [key, value] of Object.entries(palette)) {
    document.documentElement.style.setProperty(`--frappe-${key}`, value);
  }
}

function clearPreview(palette: PaletteOverride) {
  for (const key of Object.keys(palette)) {
    document.documentElement.style.removeProperty(`--frappe-${key}`);
  }
}

export function TokenPaletteEditor() {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [palettes, setPalettes] = useState<Palettes>({ light: {}, dark: {} });
  const [defaultColors, setDefaultColors] = useState<Record<ThemeMode, PaletteOverride>>({
    light: {},
    dark: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    setDefaultColors({
      light: readDefaultColors("light"),
      dark: readDefaultColors("dark"),
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/theme-settings")
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        const data = body?.data ?? body;
        setPalettes({
          light: data?.lightPalette ?? {},
          dark: data?.darkPalette ?? {},
        });
      })
      .catch(() => setError("Could not load current theme settings."))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      clearPreview(palettes.light);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only clear on unmount
  }, []);

  function updateColor(hue: PaletteHue, stop: number, value: string) {
    const key = `${hue}-${stop}`;
    setPalettes((current) => {
      const next = {
        ...current,
        [mode]: { ...current[mode], [key]: value },
      };
      applyPreview(mode, { [key]: value });
      return next;
    });
  }

  function resetHue(hue: PaletteHue) {
    setPalettes((current) => {
      const nextForMode = { ...current[mode] };
      const removedKeys: string[] = [];
      for (const stop of PALETTE_STOPS_BY_HUE[hue]) {
        const key = `${hue}-${stop}`;
        if (key in nextForMode) {
          removedKeys.push(key);
          delete nextForMode[key];
        }
      }
      if (mode === "light") {
        for (const key of removedKeys) {
          document.documentElement.style.removeProperty(`--frappe-${key}`);
        }
      }
      return { ...current, [mode]: nextForMode };
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      const res = await fetch("/api/admin/theme-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lightPalette: palettes.light,
          darkPalette: palettes.dark,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSavedMessage("Saved. Changes now apply organisation-wide.");
    } catch {
      setError("Could not save theme settings. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="ds-font-family">Loading palette editor…</p>;
  }

  const currentPalette = palettes[mode];

  return (
    <div className="ds-palette-editor">
      <div className="ds-palette-editor-toolbar">
        <div className="mnx-dev-filter-group" role="group" aria-label="Theme mode">
          {(["light", "dark"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={mode === value ? "is-active" : ""}
              onClick={() => setMode(value)}
            >
              {value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save & Publish"}
        </Button>
      </div>

      {error ? <p className="ds-font-family">{error}</p> : null}
      {savedMessage ? <p className="ds-font-family">{savedMessage}</p> : null}

      {PALETTE_HUES.map((hue) => (
        <section className="ds-palette-hue" key={hue}>
          <div className="ds-palette-hue-header">
            <p className="ds-type-heading">{hue}</p>
            <Button size="sm" variant="outline" onClick={() => resetHue(hue)}>
              Reset
            </Button>
          </div>
          <div className="ds-palette-stops">
            {PALETTE_STOPS_BY_HUE[hue].map((stop) => {
              const key = `${hue}-${stop}`;
              const value = currentPalette[key] ?? "";
              const defaultValue = defaultColors[mode][key] ?? "";
              const swatchValue = toHexColor(value) ?? toHexColor(defaultValue) ?? "#ffffff";
              return (
                <div className="ds-palette-stop" key={key}>
                  <label htmlFor={`palette-${mode}-${key}`}>
                    <code>{key}</code>
                  </label>
                  <input
                    id={`palette-${mode}-${key}`}
                    type="color"
                    value={swatchValue}
                    onChange={(event) => updateColor(hue, stop, event.target.value)}
                  />
                  <input
                    type="text"
                    className="mnx-field-control"
                    placeholder={defaultValue || "inherited"}
                    value={value}
                    onChange={(event) => updateColor(hue, stop, event.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
