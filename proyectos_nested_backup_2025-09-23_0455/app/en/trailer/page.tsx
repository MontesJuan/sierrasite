import React from 'react';

export default function Page() {
  return (
    <main className="section">
      <div className="container">
        <h1>TRAILER</h1>

        <h2>TRAILER 1</h2>
        <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 12, overflow: 'hidden' }}>
          <iframe
            src="https://www.youtube.com/embed/69gDyIS-qMI"
            title="Trailer 2"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        </div>

        <div style={{ height: 32 }} />

        <h2>TRAILER 2</h2>
        <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 12, overflow: 'hidden' }}>
          <iframe
            src="https://www.youtube.com/embed/D9eAYHrvDjc"
            title="Official trailer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        </div>
      </div>
    </main>
  );
}