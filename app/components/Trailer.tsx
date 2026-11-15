"use client";
import Icon from "./Icon";
import { useState } from "react";
export default function Trailer({ en = false }: { en?: boolean }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="trailer-player">
      {playing ? (
        <video
          aria-label={en ? 'SIERRA — official trailer' : 'SIERRA — tráiler oficial'}
          src="/media/sierra-trailer-v06-20261110.mp4"
          controls
          autoPlay
          playsInline
          preload="metadata"
          poster="/editorial/noche-cabras.webp"
        >
          <a href="/media/sierra-trailer-v06-20261110.mp4">{en ? 'Open the trailer' : 'Abrir el tráiler'}</a>
        </video>
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={
            en
              ? "Play the official trailer"
              : "Reproducir el tráiler oficial"
          }
        >
          <img
            src="/editorial/noche-cabras.webp"
            alt="Las cabras en la noche serrana"
            loading="lazy"
          />
          <span className="play-circle" aria-hidden="true">
            <Icon name="play" />
          </span>
          <span className="trailer-label">
            {en ? "Play trailer · 3:15" : "Reproducir tráiler · 3:15"}
          </span>
        </button>
      )}
    </div>
  );
}
