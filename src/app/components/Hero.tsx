import React from 'react';
import Image from 'next/image';

const Hero = () => {
  return (
    <section className="relative h-screen w-full flex flex-col items-center justify-center text-white overflow-hidden">
      <Image
        src="/hero-large.jpg" // Asegúrate que este archivo existe en tu carpeta 'public'
        alt="Fondo de la película Sierra"
        layout="fill"
        objectFit="cover"
        quality={85}
        className="-z-10"
        priority
      />
      <div className="absolute top-0 left-0 w-full h-full bg-black opacity-50 -z-10"></div>
      <div className="z-10 text-center flex flex-col items-center">
        <div className="w-64 md:w-96 mb-8">
          <Image 
            src="/logos/sierra-wordmark.png" // Asegúrate que este archivo existe en 'public/logos'
            alt="Logo Sierra"
            width={500}
            height={150}
          />
        </div>
        <p className="mb-8 text-lg md:text-xl">
          UN DOCUMENTAL DE JUAN F. MONTES
        </p>
        <div className="w-24 md:w-32">
          <Image 
            src="/logos/mulanima.png" // Asegúrate que este archivo existe en 'public/logos'
            alt="Logo Mulanima"
            width={200}
            height={200}
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;