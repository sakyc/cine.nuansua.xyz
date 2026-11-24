export type SubtitlePosition = 'top' | 'middle' | 'bottom';

export function positionSubtitleVtt(text: string, position: SubtitlePosition): string {
  const line = position === 'top' ? 10 : position === 'middle' ? 50 : 90;
  return text.replace(/^(\s*\S+\s*-->\s*\S+)([^\n]*)$/gm, (_match, timing: string, settings: string) => {
    const retained = settings.replace(/(?:^|\s)line:\S+/g, '').trim();
    return `${timing} line:${line}%,center${retained ? ` ${retained}` : ''}`;
  });
}

export function subtitleToVtt(text: string): string {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!/^WEBVTT(?:[ \t][^\n]*)?(?:\n|$)/.test(normalized)) throw new Error('Format subtitle tidak valid.');
  return normalized;
}
