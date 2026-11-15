import Icon from "./components/Icon";
import type { Metadata } from "next";
import Link from "next/link";
import Trailer from "./components/Trailer";
import Gallery from "./components/Gallery";

export const ROUTES = [
  "/",
  "/sinopsis",
  "/trailer",
  "/impacto",
  "/equipo",
  "/financiacion",
  "/distribucion",
  "/estado-actual",
  "/galeria",
  "/contacto",
  "/prensa",
  "/privacidad",
  "/en",
  "/en/synopsis",
  "/en/trailer",
  "/en/social-impact",
  "/en/team",
  "/en/collaborate",
  "/en/distribution",
  "/en/current-status",
  "/en/gallery",
  "/en/contact",
  "/en/press",
] as const;
export const STATIC_SLUGS = ROUTES.filter(
  (p) => p !== "/" && p !== "/prensa",
).map((p) => ({ slug: p.slice(1).split("/") }));
const base = "https://sierradoc.site";
export function metadataFor(path: string): Metadata {
  const en = path.startsWith("/en");
  const title =
    path.includes("prensa") || path.includes("press")
      ? "Prensa · SIERRA"
      : path.includes("galeria") || path.includes("gallery")
        ? "Imágenes · SIERRA"
        : "SIERRA · Un documental de Juan F. Montes";
  return {
    metadataBase: new URL(base),
    title,
    description: en
      ? "A documentary by Juan F. Montes. Poetry, memory and life in the mountains of San Juan, Argentina."
      : "Un documental de Juan F. Montes. La poesía, la memoria y la vida en las sierras de San Juan, Argentina.",
    alternates: { canonical: path, languages: { es: "/", en: "/en" } },
    openGraph: {
      title,
      url: base + path,
      type: "website",
      images: [
        { url: "/prensa/SIERRA-Afiche-16x9.jpg", width: 3840, height: 2160 },
      ],
    },
    twitter: { card: "summary_large_image" },
  };
}
const A = "/editorial/";
export const photos = [
  ["cuaderno-manos", "Las manos de Reyes sobre su cuaderno"],
  ["nino-capucha", "Un niño en la sierra"],
  ["escuela-cuadernos", "Los alumnos leen los cuadernos de Reyes"],
  ["noche-cabras", "Las cabras y la noche serrana"],
  ["cresta-arrieros", "Arrieros en la cresta de la montaña"],
  ["reyes-ladera", "Reyes en la ladera"],
];
function Film({ en = false }: { en?: boolean }) {
  return (
    <section className="film section" id="pelicula">
      <div className="film-intro">
        <h2>
          {en ? (
            <>
              Where the mountain
              <br />
              becomes <em>poetry.</em>
            </>
          ) : (
            <>
              Donde la montaña
              <br />
              se vuelve <em>palabra.</em>
            </>
          )}
        </h2>
        <div className="synopsis">
          <p>
            {en
              ? "Reyes lives in the mountains. He is a herdsman and a poet. Between the animals, the paths and his notebooks, he records a world that is changing."
              : "Reyes vive en la sierra. Es puestero y poeta. Entre los animales, los senderos y sus cuadernos, guarda la memoria de un mundo que cambia."}
          </p>
          <p>
            {en
              ? "At the rural school, his poems pass into other hands. SIERRA follows the voices, daily gestures and knowledge that sustain life in this territory."
              : "En la escuela rural, sus poemas pasan a otras manos. SIERRA acompaña las voces, los gestos cotidianos y los saberes que sostienen la vida en este territorio."}
          </p>
          <Link className="text-link" href={en ? "/en/team" : "/equipo"}>
            {en ? "Meet the filmmakers" : "Una película de Juan F. Montes"}{" "}
            <span>
              <Icon name="arrow" />
            </span>
          </Link>
        </div>
      </div>
      <figure className="wide-image">
        <img
          src={A + "reyes-escribe.webp"}
          alt="Reyes escribe en su cuaderno"
          loading="lazy"
          width="1600"
          height="900"
        />
        <figcaption>
          {en
            ? "A notebook. A way of remembering."
            : "Un cuaderno. Una manera de recordar."}
        </figcaption>
      </figure>
    </section>
  );
}
function People({ en = false }: { en?: boolean }) {
  return (
    <section className="people section" id="voces">
      <div className="people-heading">
        <h2>
          {en ? (
            <>
              Lives that leave
              <br />a <em>trace.</em>
            </>
          ) : (
            <>
              Vidas que dejan
              <br />
              <em>huella.</em>
            </>
          )}
        </h2>
        <img
          className="ink"
          src={A + "reyesescribe.webp"}
          alt="Ilustración original de Reyes escribiendo"
          loading="lazy"
        />
      </div>
      <div className="portraits">
        {[
          [
            "reyes-perfil",
            "Reyes",
            en
              ? "The herdsman and the written word."
              : "El puestero y la palabra escrita.",
          ],
          [
            "hilado",
            "Rosalía",
            en
              ? "Water, the garden, the thread of memory."
              : "El agua, la huerta, el hilo de la memoria.",
          ],
          [
            "poncho",
            "Margarita",
            en
              ? "Hands that weave a way of life."
              : "Las manos que tejen una forma de vivir.",
          ],
        ].map(([img, name, caption]) => (
          <figure key={name}>
            <img
              src={A + img + ".webp"}
              alt={
                name === "Rosalía"
                  ? "Rosalía hilando"
                  : name === "Margarita"
                    ? "Margarita con su poncho"
                    : "Reyes de perfil"
              }
              width="1600"
              height="900"
              loading="lazy"
            />
            <figcaption>
              <h3>{name}</h3>
              <p>{caption}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
function Territory({ en = false }: { en?: boolean }) {
  return (
    <section className="territory">
      <img
        src={A + "canon-arrieros.webp"}
        alt="Arrieros cruzando el cañón serrano"
        loading="lazy"
      />
      <div className="territory-copy">
        <h2>
          {en ? (
            <>
              Another way
              <br />
              of inhabiting <em>time.</em>
            </>
          ) : (
            <>
              Otra forma
              <br />
              de habitar <em>el tiempo.</em>
            </>
          )}
        </h2>
        <p>
          {en
            ? "A landscape that is a home. A path, a school, the animals. The mountain holds its own rhythm."
            : "Un paisaje que es casa. El camino, la escuela, los animales. La montaña guarda su propio ritmo."}
        </p>
      </div>
    </section>
  );
}
function Contact({ en = false }: { en?: boolean }) {
  return (
    <section className="contact section" id="contacto">
      <img
        src={A + "chivo.webp"}
        alt="Sello original del chivo de SIERRA"
        loading="lazy"
      />
      <div>
        <h2>
          {en ? (
            <>
              Let’s bring SIERRA
              <br />
              to <em>new screens.</em>
            </>
          ) : (
            <>
              Llevemos SIERRA
              <br />a <em>otras pantallas.</em>
            </>
          )}
        </h2>
        <p>
          {en
            ? "Screenings, festivals, press and conversations about the film. Contact the production team."
            : "Funciones, festivales, prensa y conversaciones alrededor de la película. Escribile al equipo de producción."}
        </p>
        <a className="contact-mail" href="mailto:montesjuanfrancisco@gmail.com">
          montesjuanfrancisco@gmail.com <Icon name="arrow" />
        </a>
        <div className="contact-links">
          <a
            href="https://www.instagram.com/sierra.docu/"
            target="_blank"
            rel="noreferrer"
          >
            Instagram <Icon name="arrow" />
          </a>
          <Link href={en ? "/en/press" : "/prensa"}>
            {en ? "Press materials" : "Material de prensa"}{" "}
            <Icon name="arrow" />
          </Link>
        </div>
      </div>
    </section>
  );
}
function Home({ en = false }: { en?: boolean }) {
  return (
    <>
      <section
        className="hero"
        aria-label="SIERRA, un documental de Juan F. Montes"
      >
        <img
          className="hero-art"
          src={A + "portada-16x9.webp"}
          alt="Afiche de SIERRA: Rosalía y Reyes, la escuela y los arrieros en la montaña al atardecer"
          fetchPriority="high"
          width="1672"
          height="941"
        />
        <div className="hero-title">
          <h1>
            <img src={A + "logo.webp"} alt="SIERRA" />
          </h1>
        </div>
        <div className="hero-foot">
          <span>
            {en
              ? "A film born in the mountains"
              : "Una película nacida en la montaña"}
          </span>
          <a href="#trailer" className="button button-light">
            <span aria-hidden="true">
              <Icon name="play" />
            </span>{" "}
            {en ? "Watch trailer" : "Ver tráiler"}
          </a>
        </div>
      </section>
      <section className="store-invitation section"><div><h2>{en ? "Take SIERRA with you." : "La sierra, puesta."}</h2><p>{en ? "Oversized tees, three books and the original film poster. Shipped from San Juan across Argentina." : "Remeras oversize, tres libros y el afiche original de la película. Desde San Juan, a toda Argentina."}</p></div><Link href="/tienda" className="button">{en ? "Explore the shop" : "Explorar la tienda"} <Icon name="arrow" /></Link></section>
      <Film en={en} />
      <People en={en} />
      <Territory en={en} />
      <section className="game-invitation section" aria-labelledby="game-title">
        <div>
          <h2 id="game-title">
            {en ? "A story you can play." : "Una historia para jugar."}
          </h2>
          <p>
            {en
              ? "Follow the filmmakers through the mountains and help Reyes’s words become a book. A browser adventure in Spanish, for schools and families."
              : "Acompañá a los documentalistas por la sierra y ayudá a que las palabras de Reyes lleguen a un libro. Una aventura en el navegador, para escuelas y familias."}
          </p>
        </div>
        <a className="button" href="/jugar">
          {en ? "Play the adventure" : "Jugar la aventura"}{" "}
          <Icon name="arrow" />
        </a>
      </section>
      <section className="trailer section" id="trailer">
        <h2>
          {en ? (
            <>
              Enter <em>SIERRA.</em>
            </>
          ) : (
            <>
              Entrar en <em>SIERRA.</em>
            </>
          )}
        </h2>
        <Trailer en={en} />
      </section>
      <section className="press-band section">
        <div>
          <h2>
            {en
              ? "For those who share cinema."
              : "Para quienes comparten el cine."}
          </h2>
          <p>
            {en
              ? "The dossier, poster and images from the film."
              : "El dossier, el afiche y las imágenes de la película."}
          </p>
        </div>
        <Link className="button" href={en ? "/en/press" : "/prensa"}>
          {en ? "Explore press materials" : "Explorar materiales"}{" "}
          <Icon name="arrow" />
        </Link>
      </section>
      <Contact en={en} />
    </>
  );
}
function Press({ en = false }: { en?: boolean }) {
  return (
    <div className="page-wrap section">
      <h1>
        {en ? (
          <>
            SIERRA.
            <br />
            <em>Press room.</em>
          </>
        ) : (
          <>
            SIERRA.
            <br />
            <em>Sala de prensa.</em>
          </>
        )}
      </h1>
      <p className="page-lead">
        {en
          ? "A closer look at the film, its territory and its people."
          : "Una mirada a la película, su territorio y sus protagonistas."}
      </p>
      <div className="press-layout">
        <img
          src="/prensa/SIERRA-Afiche-16x9.jpg"
          alt="Afiche horizontal SIERRA"
          width="3840"
          height="2160"
        />
        <div>
          <h2>{en ? "The film, on paper." : "La película, en papel."}</h2>
          <p>
            {en
              ? "Landscape dossier, poster and selected frames for an editorial introduction to SIERRA."
              : "Dossier apaisado, afiche y fotogramas seleccionados para acercarse al universo de SIERRA."}
          </p>
          <ul className="download-list">
            <li>
              <a download href="/prensa/SIERRA-Dossier-16x9-v005.pdf">
                Dossier PDF · 16:9{" "}
                <span>
                  <Icon name="download" />
                </span>
              </a>
            </li>
            <li>
              <a download href="/prensa/SIERRA-Afiche-16x9.jpg">
                {en ? "Landscape poster" : "Afiche horizontal"} · JPG{" "}
                <span>
                  <Icon name="download" />
                </span>
              </a>
            </li>
            <li>
              <Link href={en ? "/en/gallery" : "/galeria"}>
                {en ? "Selected images" : "Selección de imágenes"}{" "}
                <span>
                  <Icon name="arrow" />
                </span>
              </Link>
            </li>
          </ul>
          <p className="editorial-note">
            {en
              ? "Review edition. For publication, screening links and final technical materials, please contact production."
              : "Edición de revisión. Para publicación, visionado y materiales técnicos definitivos, contactá a producción."}
          </p>
        </div>
      </div>
      <Contact en={en} />
    </div>
  );
}
function Team({ en = false }: { en?: boolean }) {
  const credits = [
    ["Dirección y guion", "Juan F. Montes"],
    ["Producción", "Ciro Néstor Novelli"],
    ["Dirección de fotografía", "Nicolás Farina · Juan F. Montes"],
    ["Cámara", "Bruno Sesto"],
    ["Sonido en rodaje", "Javier Ruiz · Bernardo Blanco"],
    ["Diseño de sonido", "Alejandro Zogbe"],
    ["Música original", "Juan F. Montes"],
    ["Edición y postproducción", "Juan F. Montes · Andrés Jones"],
    ["Antropología", "Diego Garcés"],
    ["Asistencia de producción", "Adrián Salas Abrego"],
    ["Diseño gráfico", "Hermanos Kutter"],
  ];
  return (
    <div className="page-wrap section">
      <h1>
        {en ? (
          <>
            A film.
            <br />
            <em>Many voices.</em>
          </>
        ) : (
          <>
            Una película.
            <br />
            <em>Muchas voces.</em>
          </>
        )}
      </h1>
      <p className="page-lead">
        {en
          ? "A documentary by Juan F. Montes, made in the mountains of San Juan."
          : "Un documental de Juan F. Montes, realizado en las sierras de San Juan."}
      </p>
      <div className="credits">
        {credits.map(([role, name]) => (
          <div key={role}>
            <span>{role}</span>
            <p>{name}</p>
          </div>
        ))}
      </div>
      <Contact en={en} />
    </div>
  );
}
export function renderRoute(path: string) {
  const en = path.startsWith("/en");
  if (path === "/" || path === "/en") return <Home en={en} />;
  if (/prensa|press/.test(path)) return <Press en={en} />;
  if (/galeria|gallery/.test(path))
    return (
      <div className="page-wrap section">
        <h1>
          {en ? (
            <>
              The film,
              <br />
              <em>in images.</em>
            </>
          ) : (
            <>
              La película,
              <br />
              <em>en imágenes.</em>
            </>
          )}
        </h1>
        <p className="page-lead">
          {en
            ? "Selected frames and moments from the shoot."
            : "Fotogramas y momentos del rodaje. Una selección del archivo de SIERRA."}
        </p>
        <Gallery photos={photos} en={en} />
      </div>
    );
  if (/equipo|team/.test(path)) return <Team en={en} />;
  if (/sinopsis|synopsis|impacto|social-impact/.test(path))
    return (
      <div className="page-wrap">
        <Film en={en} />
        <People en={en} />
      </div>
    );
  if (/trailer/.test(path))
    return (
      <div className="page-wrap section">
        <h1>{en ? "Official trailer" : "Tráiler oficial"}</h1>
        <Trailer en={en} />
      </div>
    );
  if (path === "/privacidad")
    return (
      <article className="page-wrap section legal">
        <h1>Privacidad</h1>
        <p>
          La tienda guarda los datos que completás para cotizar, cobrar, preparar y enviar tu pedido. Los pagos se procesan en Mercado Pago; SIERRA no recibe los datos de tu tarjeta. El enlace privado del pedido permite consultar su estado: no lo compartas públicamente. Correo Argentino recibe los datos necesarios para entregar el paquete. Podés consultar, corregir o solicitar la eliminación de tus datos escribiéndonos, según las obligaciones de conservación aplicables. El asistente consulta una selección pública sobre SIERRA. No envíes
          información personal o documentos privados. Las consultas se procesan
          para responderte; esta versión no guarda el historial en una base de
          datos. El proveedor de alojamiento puede conservar registros técnicos.
        </p>
        <p>
          El tráiler se aloja en este sitio y se carga cuando elegís reproducirlo. Instagram y el correo abren servicios externos con sus
          propias políticas.
        </p>
        <p>
          Contacto y solicitudes sobre tus datos:{" "}
          <a href="mailto:montesjuanfrancisco@gmail.com">montesjuanfrancisco@gmail.com</a>
          .
        </p>
      </article>
    );
  return (
    <div className="page-wrap">
      <Contact en={en} />
    </div>
  );
}
