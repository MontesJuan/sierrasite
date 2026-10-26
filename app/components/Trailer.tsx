"use client";
import Icon from "./Icon";
import { useState } from "react";
export default function Trailer({ en = false }: { en?: boolean }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="trailer-player">
      {playing ? (
        <iframe
          title="SIERRA — tráiler oficial"
          src="https://www.youtube-nocookie.com/embed/69gDyIS-qMI?autoplay=1"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={
            en
              ? "Play the official trailer on YouTube"
              : "Reproducir el tráiler oficial en YouTube"
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
            {en ? "Play trailer · YouTube" : "Reproducir tráiler · YouTube"}
          </span>
        </button>
      )}
    </div>
  );
}
