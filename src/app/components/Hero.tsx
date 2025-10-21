'use client'
import React from 'react'

export default function Hero({ imageSrc = '/hero-large.jpg' }: { imageSrc?: string }) {
  return (
    <header
      className="full-bleed-hero"
      style={{
        backgroundImage: `url(${imageSrc})`,
        backgroundSize: 'cover',
        backgroundPosition: '50% 40%',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh'
      }}
    >
      <div className="hero-overlay" />

      <div className="relative z-10 flex items-end md:items-center h-full px-6 md:px-12 pb-10 md:pb-0">
        <div className="max-w-4xl">
          <h1 className="text-4xl md:text-6xl leading-tight text-white drop-shadow-md">SIERRA</h1>
          <p className="mt-4 text-sm md:text-base text-white/90 max-w-prose">Un documental de Juan F. Montes — memoria, paisaje y poesía</p>

          <div className="mt-6">
            <a href="#trailer" className="inline-block px-5 py-3 border border-white/80 text-white rounded-md text-sm backdrop-blur-sm">Ver tráiler</a>
            <a href="#galeria" className="inline-block ml-3 px-5 py-3 text-white/90 text-sm">Ver galería</a>
          </div>
        </div>
      </div>
    </header>
  )
}
