import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

const dateFormat = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Update days and latest episode of a series, estimated from its recent episode uploads. */
export function SchedulePanel({ slug }: { slug: string }) {
  const query = useQuery({ queryKey: ['schedule', slug], queryFn: ({ signal }) => api.schedule(slug, signal), staleTime: 30 * 60_000, retry: 1 });
  if (query.isPending) return <div className="schedule">Memeriksa jadwal update…</div>;
  if (query.isError || !query.data.data.lastEpisode) return null;
  const { days, lastEpisode, active, basedOn } = query.data.data;
  const last = new Date(`${lastEpisode.published}Z`);
  return <div className="schedule">
    <strong className={active ? 'live' : undefined}>{active ? '● Masih update' : 'Belum ada episode baru'}</strong>
    {days.length > 0 && <>Biasanya update: <b>{days.join(', ')}</b><br /></>}
    {lastEpisode.title} diunggah {Number.isNaN(last.getTime()) ? lastEpisode.published : dateFormat.format(last)}
    <small>Perkiraan dari {basedOn} episode terakhir yang diunggah sumber.{active ? '' : ' Tidak ada episode baru dalam 2 minggu terakhir.'}</small>
  </div>;
}
