type YouTubeProps = {
  id: string;           // ID del video (p.ej. "dQw4w9WgXcQ")
  title?: string;
  className?: string;
};

export default function YouTube({ id, title = "YouTube video", className }: YouTubeProps) {
  const src = `https://www.youtube.com/embed/${encodeURIComponent(id)}`;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        paddingTop: "56.25%", // 16:9
        overflow: "hidden",
        borderRadius: 8,
      }}
    >
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          border: 0,
        }}
      />
    </div>
  );
}