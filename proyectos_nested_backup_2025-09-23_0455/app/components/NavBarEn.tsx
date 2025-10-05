'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function NavBarEn() {
  return (
    <nav style={{ display:'flex', alignItems:'center', gap:12, padding:'4px 12px', minHeight:50 }}>
      <Link href="/en" style={{ display:'inline-flex', alignItems:'center', gap:12 }}>
        <Image
          src="/assets/logos/sierra-wordmark.png"
          alt="SIERRA"
          width={150}
          height={44}
          sizes="(max-width: 768px) 35vw, 150px"
          style={{ width:'auto', height:34 }}
        />
      </Link>

      <Link href="/en/synopsis" className="" style={{ fontSize:'82%', lineHeight:1, padding:'4px 6px', display:'inline-block' }}>SYNOPSIS</Link>
      <Link href="/en/trailer" className="" style={{ fontSize:'82%', lineHeight:1, padding:'4px 6px', display:'inline-block' }}>TRAILER</Link>
      <Link href="/en/social-impact" className="" style={{ fontSize:'82%', lineHeight:1, padding:'4px 6px', display:'inline-block' }}>SOCIAL IMPACT</Link>
      <Link href="/en/team" className="" style={{ fontSize:'82%', lineHeight:1, padding:'4px 6px', display:'inline-block' }}>TEAM</Link>
      <Link href="/en/collaborate" className="" style={{ fontSize:'82%', lineHeight:1, padding:'4px 6px', display:'inline-block' }}>COLLABORATE</Link>
      <Link href="/en/distribution" className="" style={{ fontSize:'82%', lineHeight:1, padding:'4px 6px', display:'inline-block' }}>DISTRIBUTION</Link>
      <Link href="/en/current-status" className="" style={{ fontSize:'82%', lineHeight:1, padding:'4px 6px', display:'inline-block' }}>CURRENT STATUS</Link>
      <Link href="/en/gallery" className="" style={{ fontSize:'82%', lineHeight:1, padding:'4px 6px', display:'inline-block' }}>GALLERY</Link>
      <Link href="/en/contact" className="" style={{ fontSize:'82%', lineHeight:1, padding:'4px 6px', display:'inline-block' }}>CONTACT</Link>
      <Link href="/en/press" className="" style={{ fontSize:'82%', lineHeight:1, padding:'4px 6px', display:'inline-block' }}>PRESS</Link>

      <div style={{ marginLeft:'auto', display:'flex', flexDirection:'column', alignItems:'flex-end', justifyContent:'center', gap:2 }}>
        <Link href="/en/trailer" className="btn" style={{ padding:'6px 12px', lineHeight:1 }}>WATCH TRAILER</Link>
        <div style={{ display:'flex', gap:6, fontSize:'72%', opacity:0.9 }}>
          <Link href="/" rel="nofollow">ES</Link>
          <span style={{ opacity:0.5 }}>•</span>
          <Link href="/en" rel="nofollow">EN</Link>
        </div>
      </div>
    </nav>
  )
}