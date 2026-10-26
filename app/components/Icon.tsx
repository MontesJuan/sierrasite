type Name = "arrow" | "play" | "close" | "plus" | "minus" | "send" | "download";
const paths: Record<Name, string> = {
  arrow: "M6 18 18 6M6 6h12v12",
  play: "m8 5 11 7-11 7V5Z",
  close: "m6 6 12 12M6 18 18 6",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  send: "m6 11 6-6 6 6M12 5v14",
  download: "M12 4v12m-5-5 5 5 5-5M5 20h14",
};
export default function Icon({ name }: { name: Name }) {
  return (
    <svg
      className="icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
