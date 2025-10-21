import React from 'react'
import Hero from './components/Hero'

export default function Page() {
  return (
    <main>
      <Hero imageSrc="/hero-large.jpg" />
      <section id="sinopsis" className="max-w-4xl mx-auto p-8">
        <h2 className="text-2xl font-serif">Sinopsis</h2>
        <p className="mt-3 text-base">(Aquí irá la sinopsis — la completamos más adelante.)</p>
      </section>
    </main>
  )
}
