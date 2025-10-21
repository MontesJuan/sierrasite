'use client'
import React from 'react'

type Props = { imageSrc?: string }

export default function Hero({ imageSrc = '/hero-large.jpg' }: Props) {
  return (
    <header className="hero-wrap" role="banner">
      <div className="hero-frame">
        <figure className="hero-figure">
          <img src={imageSrc} alt="SIERRA — imagen principal" className="hero-image" />
          <figcaption className="hero-caption">Un documental de Juan F. Montes — memoria, paisaje y poesía</figcaption>
        </figure>

        <div className="hero-title-wrap">
          <h1 className="hero-title">SIERRA</h1>
          <div className="hero-ctas">
            <a href="#trailer" className="btn-ghost">Ver tráiler</a>
            <a href="#galeria" className="btn-link">Ver galería</a>
          </div>
        </div>
      </div>
    </header>
  )
}
