// The dynamic range of a stream, as a badge says it.
//
// Every server words this differently — Jellyfin has VideoRangeType, Plex has
// a colour transfer and a Dolby Vision flag — so each source reduces its own
// wording to one of these names and the card draws them all the same way.
// SDR is the ordinary case and earns no badge.
export function rangeLabel(raw) {
  const v = String(raw || '').toUpperCase().replace(/\s+/g, '');
  if (!v || v === 'SDR' || v === 'UNKNOWN') return '';
  if (v.includes('DOVI') || v.includes('DOLBYVISION')) return 'DV';
  if (v.includes('HDR10PLUS') || v.includes('HDR10+')) return 'HDR10+';
  if (v.includes('HDR10')) return 'HDR10';
  if (v === 'HLG') return 'HLG';
  if (v.includes('HDR')) return 'HDR';
  return '';
}

// What Plex says about the picture. Dolby Vision is a flag on the stream, and
// the rest is the transfer function: PQ is HDR10, HLG says its own name.
export function plexRange(session) {
  for (const media of (session?.Media || [])) {
    if (media.videoProfile && /dvh|dolby/i.test(media.videoProfile)) return 'DV';
    for (const part of (media.Part || [])) {
      for (const stream of (part.Stream || [])) {
        if (Number(stream.streamType) !== 1) continue;
        if (stream.DOVIPresent || stream.doviPresent) return 'DV';
        const trc = String(stream.colorTrc || '').toLowerCase();
        if (trc === 'smpte2084') return 'HDR10';
        if (trc.startsWith('arib-std-b67')) return 'HLG';
        const range = rangeLabel(stream.videoRange || stream.displayTitle);
        if (range) return range;
      }
    }
  }
  return '';
}
