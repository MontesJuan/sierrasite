
'use client'
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import theme from '../data/theme.json'

const links = [
  { href: '/sinopsis', label: 'Sinopsis' },
  { href: '/trailer', label: 'Tráiler' },
  { href: '/impacto', label: 'Impacto' },
  { href: '/equipo', label: 'Equipo' },
  { href: '/financiacion', label: 'Financiación' },
  { href: '/distribucion', label: 'Distribución' },
  { href: '/contacto', label: 'Contacto' },
  { href: '/prensa', label: 'Prensa' },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav>
      <Link href="/" style={{display:'inline-flex', alignItems:'center', gap:12}}>
        <Image src={theme.brand.logoPath} width={120} height={38} alt="Sierra" />
      </Link>
      {links.map(l => (
        <Link key={l.href} href={l.href} className={pathname === l.href ? 'active' : ''}>{l.label}</Link>
      ))}
      <div style={{marginLeft:'auto'}}>
        <a className="btn" href="/trailer">Ver tráiler</a>
      </div>
    </nav>
  )
}
