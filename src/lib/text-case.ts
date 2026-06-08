function preserveWord(word: string) {
  if (!word) return word;
  if (word.includes("@")) return word.toLowerCase();
  if (/^[A-Z0-9&/-]+$/.test(word) && word.length <= 4) return word;
  if (/^[A-Z]{2,}[a-z]/.test(word)) return word;
  if (/^[0-9]+$/.test(word)) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function toDisplayTitleCase(value: string | null | undefined) {
  if (!value) return "-";

  return String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) =>
      token
        .split(/([/-])/)
        .map((part) => (/^[/-]$/.test(part) ? part : preserveWord(part)))
        .join(""),
    )
    .join(" ");
}
