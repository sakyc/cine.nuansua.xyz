import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

/**
 * Shows a provider's own player (e.g. HYDRAX, up to 1080p) whose real URL the backend resolves.
 * The sandbox keeps scripts and fullscreen working but blocks pop-up ads and top-page redirects.
 */
export function EmbedPlayer({ type, slug, provider, onFallback }: { type: string; slug: string; provider: string; onFallback?: () => void }) {
  const query = useQuery({
    queryKey: ['embed', type, slug, provider],
    queryFn: ({ signal }) => api.embed(type, slug, provider, signal),
    staleTime: 10 * 60_000,
    retry: 1,
  });
  if (query.isPending) return <div className="player-placeholder"><span role="status">Menyiapkan player…</span></div>;
  if (query.isError) return <div className="player-placeholder"><span>Player {provider} untuk judul ini belum tersedia.</span>{onFallback ? <button className="button light" onClick={onFallback}>Putar lewat P2P</button> : null}<button className="button secondary" onClick={() => void query.refetch()}>Coba lagi</button></div>;
  return <iframe
    key={query.data.data.url}
    title={`Player ${provider}`}
    src={query.data.data.url}
    sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
    allow="autoplay; fullscreen; picture-in-picture"
    allowFullScreen
    referrerPolicy="strict-origin-when-cross-origin"
  />;
}
