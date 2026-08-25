const WORDS_PER_MINUTE = 200;

/** Estimativa simples (conta palavras do markdown bruto, ignorando blocos de código). */
export function estimateReadingMinutes(markdown: string): number {
  const withoutCode = markdown.replace(/```[\s\S]*?```/g, ' ');
  const words = withoutCode.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
