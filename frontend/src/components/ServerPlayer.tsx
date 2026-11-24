import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { ExternalLink, Play } from 'lucide-react';
import { HlsPlayer } from './HlsPlayer';
import { EmbedPlayer } from './EmbedPlayer';

function safeUrl(value: string): string | null {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
const isVideonode = (url: string | null) => !!url && new URL(url).hostname.toLowerCase() === 'videonode.de';
// HYDRAX (up to 1080p) is listed first so it is the default; P2P (480p) is the fallback.
const rank = (name: string) => (name === 'HYDRAX' ? 0 : name === 'P2P' ? 1 : 2);
const label = (name: string, url: string | null) => isVideonode(url) ? (name === 'HYDRAX' ? 'HYDRAX · HD' : name === 'P2P' ? 'P2P · 480p' : name) : name;

/**
 * Player with a server picker for a movie or a series episode.
 * videonode.de pages refuse to be framed: its P2P server plays through our HLS proxy and its HYDRAX
 * server through the real player the backend resolves; CAST only allows its own domains, so it is hidden.
 */
export function ServerPlayer({ type, slug, streams, sourceUrl }: {
  type: 'movie' | 'episode'; slug: string; streams: { provider: string; url: string }[]; sourceUrl?: string | null;
}) {
  const [provider, setProvider] = useState(0);
  const [playing, setPlaying] = useState(false);
  // P2P plays through this server's HLS proxy, which production servers may switch off (PLAYBACK_ENABLED).
  const features = useQuery({ queryKey: ['config'], queryFn: ({ signal }) => api.config(signal), staleTime: 10 * 60_000 });
  const proxyEnabled = features.data?.data.playback ?? true;
  const providers = streams.map(entry => ({ ...entry, safe: safeUrl(entry.url) })).filter(entry => entry.safe)
    .filter(entry => (entry.provider === 'P2P' && proxyEnabled) || entry.provider === 'HYDRAX' || !isVideonode(entry.safe))
    .sort((a, b) => rank(a.provider) - rank(b.provider));
  const selected = providers[provider] || providers[0];
  const isEmbed = selected?.provider === 'HYDRAX' && isVideonode(selected.safe);
  const isProxy = selected?.provider === 'P2P' && isVideonode(selected.safe);
  const p2pIndex = providers.findIndex(entry => entry.provider === 'P2P');

  return <>
    <div className="player">
      {isProxy ? <HlsPlayer type={type} slug={slug} />
        : isEmbed ? <EmbedPlayer type={type} slug={slug} provider="HYDRAX" onFallback={p2pIndex >= 0 ? () => { setProvider(p2pIndex); setPlaying(false); } : undefined} />
          : selected && playing ? <iframe title={`Player ${selected.provider}`} src={selected.safe || undefined} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            : <div className="player-placeholder">{selected
              ? <><button className="play-button" type="button" aria-label="Mulai menonton" onClick={() => setPlaying(true)}><Play size={25} fill="currentColor" /></button><span>Pilih tombol putar untuk memuat player</span></>
              : <span>Player belum tersedia untuk judul ini.</span>}</div>}
    </div>
    {isProxy && sourceUrl && <div className="server-bar"><a className="external" href={sourceUrl} target="_blank" rel="noopener noreferrer">Buka halaman sumber <ExternalLink size={14} /></a></div>}
    {providers.length > 1 && <div className="server-bar"><span>Pilih server</span>
      {providers.map((entry, index) => <button key={`${entry.provider}-${index}`} className={`chip ${selected === entry ? 'active' : ''}`} onClick={() => { setProvider(index); setPlaying(false); }}>{label(entry.provider, entry.safe)}</button>)}
      {selected?.safe && !isProxy && !isEmbed && <a href={selected.safe} target="_blank" rel="noopener noreferrer" className="external">Buka player <ExternalLink size={14} /></a>}
    </div>}
    {isEmbed ? <p className="server-note">Pilih kualitas lewat ikon ⚙ di pojok kanan bawah player (360p–1080p). Jika player tidak muncul, pilih server P2P.</p>
      : isProxy ? <p className="server-note">Kualitas mengikuti sumber (umumnya 480p).{providers.length > 1 ? ' Pilih HYDRAX untuk kualitas lebih tinggi.' : ''}</p>
        : providers.length > 1 && <p className="server-note">Server ini memakai player penyedia; kualitas dan iklan di luar kendali kami.</p>}
  </>;
}
