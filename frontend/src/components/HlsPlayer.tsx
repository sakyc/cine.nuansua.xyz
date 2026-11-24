import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Play } from 'lucide-react';
import type Hls from 'hls.js';
import { api } from '../services/api';
import type { SubtitleOption } from '../services/api';
import { positionSubtitleVtt, subtitleToVtt } from '../services/subtitles';
import type { SubtitlePosition } from '../services/subtitles';

export function HlsPlayer({ type, slug }: { type: string; slug: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [subtitle, setSubtitle] = useState<{ url: string; name: string; text: string; language: string } | null>(null);
  const [subtitleOptions, setSubtitleOptions] = useState<SubtitleOption[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState('');
  const [subtitleStatus, setSubtitleStatus] = useState('Mencari subtitle otomatis…');
  const [subtitleEnabled, setSubtitleEnabled] = useState(true);
  const [subtitleError, setSubtitleError] = useState('');
  const [resolution, setResolution] = useState('');
  const [subtitleSize, setSubtitleSize] = useState('100%');
  const [subtitleColor, setSubtitleColor] = useState('#ffffff');
  const [subtitlePosition, setSubtitlePosition] = useState<SubtitlePosition>('bottom');
  const subtitlePositionRef = useRef<SubtitlePosition>('bottom');

  const configureTrack = (track: TextTrack, enabled: boolean) => {
    track.mode = enabled ? 'showing' : 'disabled';
  };

  useEffect(() => () => { if (subtitle) URL.revokeObjectURL(subtitle.url); }, [subtitle]);
  useEffect(() => {
    const tracks = video.current?.textTracks;
    if (!tracks || !subtitle) return;
    for (const track of Array.from(tracks)) {
      if (track.label === subtitle.name) configureTrack(track, subtitleEnabled);
    }
  }, [subtitle, subtitleEnabled, state]);

  useEffect(() => {
    if (state !== 'ready') return;
    const controller = new AbortController();
    void api.subtitles(type, slug, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setSubtitleOptions(result.data);
      const preferred = result.data.find(item => item.language === 'id') || result.data[0];
      if (preferred) { setSelectedSubtitle(preferred.token); setSubtitleStatus('Memuat subtitle…'); }
      else setSubtitleStatus('Subtitle tidak ditemukan.');
    }).catch(error => { if (!controller.signal.aborted) setSubtitleStatus(error instanceof Error ? error.message : 'Subtitle tidak tersedia.'); });
    return () => controller.abort();
  }, [type, slug, state]);

  useEffect(() => {
    if (!selectedSubtitle || state !== 'ready') return;
    const controller = new AbortController();
    const option = subtitleOptions.find(item => item.token === selectedSubtitle);
    if (!option) return;
    void api.subtitle(slug, selectedSubtitle, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      const text = subtitleToVtt(result);
      const name = option.language === 'id' ? 'Bahasa Indonesia' : 'English';
      setSubtitle({ name, language: option.language, text, url: URL.createObjectURL(new Blob([positionSubtitleVtt(text, subtitlePositionRef.current)], { type: 'text/vtt' })) });
      setSubtitleError(''); setSubtitleStatus('');
    }).catch(error => { if (!controller.signal.aborted) { setSubtitle(null); setSubtitleStatus(''); setSubtitleError(error instanceof Error ? error.message : 'Subtitle tidak tersedia.'); } });
    return () => controller.abort();
  }, [slug, selectedSubtitle, subtitleOptions, state]);

  useEffect(() => {
    if (attempt === 0) return;
    const controller = new AbortController();
    let player: Hls | undefined;
    const start = async () => {
      try {
        const result = await api.playback(type, slug, controller.signal);
        const element = video.current;
        if (!element || controller.signal.aborted) return;
        const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
        const origin = new URL(apiBase, window.location.origin).origin;
        const playlist = new URL(result.data.url, origin).href;
        if (element.canPlayType('application/vnd.apple.mpegurl')) {
          element.src = playlist;
          setState('ready');
        } else {
          const { default: HlsClass } = await import('hls.js');
          if (controller.signal.aborted) return;
          if (!HlsClass.isSupported()) throw new Error('Unsupported browser');
          player = new HlsClass();
          player.on(HlsClass.Events.ERROR, (_event, data) => { if (data.fatal) setState('error'); });
          player.on(HlsClass.Events.MANIFEST_PARSED, () => setState('ready'));
          player.loadSource(playlist);
          player.attachMedia(element);
        }
      } catch { if (!controller.signal.aborted) setState('error'); }
    };
    void start();
    return () => { controller.abort(); player?.destroy(); };
  }, [type, slug, attempt]);

  return <div className="hls-player">
    {attempt > 0 && <video ref={video} controls playsInline aria-label="Player film" onError={() => setState('error')} onResize={event => { const el = event.currentTarget; if (el.videoWidth && el.videoHeight) setResolution(`${el.videoWidth} × ${el.videoHeight}`); }} style={{ width: '100%', height: '100%', display: state === 'ready' ? 'block' : 'none', '--subtitle-size': subtitleSize, '--subtitle-color': subtitleColor } as CSSProperties}>
      {subtitle && <track key={subtitle.url} kind="subtitles" src={subtitle.url} srcLang={subtitle.language} label={subtitle.name} default onLoad={event => configureTrack(event.currentTarget.track, subtitleEnabled)} onError={() => setSubtitleError('Subtitle tidak dapat dimuat oleh browser.')} />}
    </video>}
    {state !== 'ready' && <div className="player-placeholder">
      {state === 'error' ? <><span>Video belum dapat dimuat. Sumber mungkin tidak tersedia.</span><button className="button secondary" onClick={() => { setState('loading'); setAttempt(value => value + 1); }}>Coba lagi</button></>
        : state === 'loading' ? <span role="status">Menyiapkan video…</span>
          : <><button className="play-button" type="button" aria-label="Siapkan video" onClick={() => { setState('loading'); setAttempt(value => value + 1); }}><Play size={25} fill="currentColor" /></button><span>Tekan untuk menyiapkan video</span></>}
    </div>}
    {state === 'ready' && <div className="hls-tools" aria-label="Pengaturan video">
      <label>Kualitas <select aria-label="Kualitas video" disabled value="original"><option value="original">Asli{resolution ? ` (${resolution})` : ''}</option></select></label>
      <label>Subtitle <select aria-label="Pilihan subtitle" value={subtitleEnabled && selectedSubtitle ? selectedSubtitle : 'off'} onChange={event => { const value = event.target.value; if (value === 'off') setSubtitleEnabled(false); else { setSubtitleEnabled(true); if (value !== selectedSubtitle) { setSubtitle(null); setSubtitleStatus('Memuat subtitle…'); setSelectedSubtitle(value); } } }}><option value="off">Mati</option>{subtitleOptions.map(option => <option key={option.token} value={option.token}>{option.language === 'id' ? 'Indonesia' : 'English'}{option.release ? ` · ${option.release}` : ''}</option>)}</select></label>
      {subtitle && <details className="subtitle-settings"><summary>Atur subtitle</summary><div>
        <label>Ukuran <select aria-label="Ukuran subtitle" value={subtitleSize} onChange={event => setSubtitleSize(event.target.value)}><option value="80%">Kecil</option><option value="100%">Normal</option><option value="130%">Besar</option><option value="160%">Sangat besar</option></select></label>
        <label>Warna <select aria-label="Warna subtitle" value={subtitleColor} onChange={event => setSubtitleColor(event.target.value)}><option value="#ffffff">Putih</option><option value="#ffff00">Kuning</option></select></label>
        <label>Posisi <select aria-label="Posisi subtitle" value={subtitlePosition} onChange={event => { const position = event.target.value as SubtitlePosition; subtitlePositionRef.current = position; setSubtitlePosition(position); setSubtitle({ ...subtitle, url: URL.createObjectURL(new Blob([positionSubtitleVtt(subtitle.text, position)], { type: 'text/vtt' })) }); }}><option value="top">Atas</option><option value="middle">Tengah</option><option value="bottom">Bawah</option></select></label>
      </div></details>}
      {subtitleStatus && <span role="status">{subtitleStatus}</span>}
      {subtitleError && <span role="alert">{subtitleError}</span>}
      {subtitle && <a href="https://www.opensubtitles.com/" target="_blank" rel="noopener noreferrer">Subtitle: OpenSubtitles</a>}
    </div>}
  </div>;
}
