import Icon from "./Icon";
import Link from "next/link";
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <img src="/editorial/logo.webp" alt="SIERRA" width="160" height="45" />
        <p>
          Un documental de Juan F. Montes
          <br />
          San Juan · Argentina
        </p>
        <a
          href="https://www.instagram.com/sierra.docu/"
          target="_blank"
          rel="noreferrer"
        >
          @sierra.docu <Icon name="arrow" />
        </a>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} SIERRA</span>
        <span>La memoria también habita el paisaje.</span>
        <Link href="/privacidad">Privacidad</Link>
      </div>
    </footer>
  );
}
