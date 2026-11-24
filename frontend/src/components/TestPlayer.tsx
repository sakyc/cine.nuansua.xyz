import { useState } from 'react';

const sampleUrl = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

export function TestPlayer() {
  const [showVideo, setShowVideo] = useState(false);
  const [failed, setFailed] = useState(false);

  return <section aria-labelledby="test-player-title" className="test-player">
    <h2 id="test-player-title">Uji player dengan video contoh</h2>
    <p>Video bunga dari MDN ini hanya untuk menguji pemutar, bukan film yang kamu pilih.</p>
    {failed ? <div role="alert"><p>Video contoh tidak dapat dimuat. Periksa koneksi, lalu coba lagi.</p><button type="button" className="button secondary" onClick={() => { setFailed(false); setShowVideo(false); }}>Coba lagi</button></div>
      : showVideo ? <video className="test-video" controls playsInline preload="metadata" aria-label="Video contoh bunga" onError={() => setFailed(true)}><source src={sampleUrl} type="video/mp4" />Browser kamu tidak mendukung video.</video>
        : <button type="button" className="button secondary" onClick={() => setShowVideo(true)}>Muat video contoh</button>}
    <p><a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video" target="_blank" rel="noopener noreferrer">Sumber video: MDN Web Docs</a></p>
  </section>;
}
