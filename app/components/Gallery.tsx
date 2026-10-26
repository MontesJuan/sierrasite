"use client";
import Icon from "./Icon";
import { useRef, useState } from "react";
export default function Gallery({
  photos,
  en = false,
}: {
  photos: string[][];
  en?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<string[]>(photos[0]);
  return (
    <>
      <div className="gallery">
        {photos.map(([file, alt]) => (
          <figure key={file}>
            <button
              onClick={() => {
                setSelected([file, alt]);
                ref.current?.showModal();
              }}
              aria-label={`${en ? "Enlarge" : "Ampliar"}: ${alt}`}
            >
              <img
                src={"/editorial/" + file + ".webp"}
                alt={alt}
                loading="lazy"
                width="1600"
                height="900"
              />
              <span aria-hidden="true">
                <Icon name="arrow" />
              </span>
            </button>
            <figcaption>{alt}</figcaption>
          </figure>
        ))}
      </div>
      <dialog
        className="lightbox"
        ref={ref}
        onClick={(e) => {
          if (e.target === ref.current) ref.current.close();
        }}
      >
        <button
          autoFocus
          className="close"
          onClick={() => ref.current?.close()}
          aria-label={en ? "Close image" : "Cerrar imagen"}
        >
          <Icon name="close" />
        </button>
        <img src={"/editorial/" + selected[0] + ".webp"} alt={selected[1]} />
        <p>{selected[1]}</p>
        <a download href={"/editorial/" + selected[0] + ".webp"}>
          {en ? "Download image" : "Descargar imagen"} <Icon name="download" />
        </a>
      </dialog>
    </>
  );
}
