// Curated public-only knowledge. Keep private vaults, correspondence and finances out.
export const knowledgeVersion = "sierra-public-2026-10-26";
export type AgentReply = {
  answer: string;
  sources: { title: string; url: string }[];
  handoff: boolean;
  version: string;
};
const topics = [
  {
    id: "trailer",
    match:
      /trailer|avance|ver la peli|ver sierra|watch|youtube|pelicula completa|online|stream/,
    title: "Tráiler oficial",
    url: "https://sierradoc.site/trailer",
    es: "Podés ver el tráiler oficial de SIERRA en https://sierradoc.site/trailer. Para solicitar un enlace de visionado de la película, escribí a mulanimavisual@gmail.com. No tengo una plataforma de streaming confirmada.",
    en: "Watch the official trailer at https://sierradoc.site/trailer. For a screening link, contact mulanimavisual@gmail.com. I have no confirmed streaming platform.",
  },
  {
    id: "press",
    match: /prensa|dossier|afiche|poster|press|foto|imagenes|stills|logo/,
    title: "Sala de prensa",
    url: "https://sierradoc.site/prensa",
    es: "En la sala de prensa de SIERRA están el dossier apaisado, el afiche 16:9 y una selección de imágenes. Son materiales en revisión; para publicación o archivos finales, contactá a producción en mulanimavisual@gmail.com.",
    en: "The press room includes the landscape dossier, 16:9 poster and selected images. These are review materials; contact production at mulanimavisual@gmail.com for publication or final files.",
  },
  {
    id: "screenings",
    match:
      /funcion|proyeccion|festival|estreno|cuando|donde.*ver|screening|release|cinema|programar|exhibir|cimiento/,
    title: "Proyecciones y contacto",
    url: "https://sierradoc.site/contacto",
    es: "No hay una próxima función confirmada en esta selección de información. Para organizar una proyección de SIERRA o consultar disponibilidad, escribí a mulanimavisual@gmail.com. Producción te confirmará fechas, condiciones y materiales.",
    en: "There is no confirmed upcoming screening in this information set. To arrange a screening or check availability, contact mulanimavisual@gmail.com. Production will confirm dates, terms and materials.",
  },
  {
    id: "people",
    match:
      /reyes|rosalia|margarita|protagon|personaje|poeta|poesia|poem|character/,
    title: "La película y sus protagonistas",
    url: "https://sierradoc.site/sinopsis",
    es: "Reyes es un puestero y poeta de las sierras de San Juan. Sus cuadernos llegan a la escuela rural. SIERRA también acompaña a Rosalía —la huerta y el hilado— y a Margarita —el tejido y el poncho—, y la vida de la comunidad serrana.",
    en: "Reyes is a herdsman and poet in the mountains of San Juan. His notebooks reach the rural school. SIERRA also follows Rosalía, her garden and spinning, and Margarita, her weaving and poncho, alongside the mountain community.",
  },
  {
    id: "team",
    match:
      /director|dirige|autor|montes|equipo|creditos|produccion|productor|crew|directed|filmmaker/,
    title: "Equipo de SIERRA",
    url: "https://sierradoc.site/equipo",
    es: "SIERRA es un documental con dirección y guion de Juan F. Montes y producción de Ciro Néstor Novelli. La fotografía es de Nicolás Farina y Juan F. Montes; la edición, de Juan F. Montes y Andrés Jones. Podés consultar el equipo en la web.",
    en: "SIERRA is written and directed by Juan F. Montes and produced by Ciro Néstor Novelli. Cinematography is by Nicolás Farina and Juan F. Montes; editing by Juan F. Montes and Andrés Jones. The website lists the crew.",
  },
  {
    id: "contact",
    match:
      /contact|instagram|correo|email|mail|escribir|redes|colabor|distribu/,
    title: "Contacto",
    url: "https://sierradoc.site/contacto",
    es: "Contactá al equipo de SIERRA en mulanimavisual@gmail.com. La cuenta de Instagram es @sierra.docu: https://www.instagram.com/sierra.docu/.",
    en: "Contact the SIERRA team at mulanimavisual@gmail.com. Instagram: @sierra.docu, https://www.instagram.com/sierra.docu/.",
  },
  {
    id: "film",
    match:
      /sierra|sinopsis|trata|pelicula|documental|film|story|historia|hola|hello|buenas|territorio|argentina|san juan/,
    title: "La película",
    url: "https://sierradoc.site/sinopsis",
    es: "SIERRA, un documental de Juan F. Montes, acompaña a Reyes, un puestero y poeta, y a una comunidad de las sierras de San Juan, Argentina. Entre cuadernos, animales, tejidos y la escuela, la película mira cómo se transmite una forma de vivir en un territorio que cambia.",
    en: "SIERRA, a documentary by Juan F. Montes, follows Reyes, a herdsman and poet, and a community in the mountains of San Juan, Argentina. Through notebooks, animals, weaving and the school, it explores how a way of life is passed on in a changing territory.",
  },
];
export function answerPublicQuestion(
  question: string,
  locale = "es",
): AgentReply {
  const q = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const en = locale === "en";
  const handoff = () => ({
    answer: en
      ? "I do not have verified public information to answer that. Please contact the SIERRA team at mulanimavisual@gmail.com. I can help with the film, trailer, characters and press materials."
      : "No tengo información pública verificada para responder eso. Podés consultar al equipo de SIERRA en mulanimavisual@gmail.com. Puedo ayudarte con la película, el tráiler, sus protagonistas y los materiales de prensa.",
    sources: [
      {
        title: en ? "Contact" : "Contacto",
        url: "https://sierradoc.site/contacto",
      },
    ],
    handoff: true,
    version: knowledgeVersion,
  });
  if (
    /presupuesto|transferencia|comprobante|deuda|denuncia|conflicto|abogado|incaa|inca\b|contrato|password|token|secreto|ignore|ignora|system prompt|instruccion|publica|publicar|elimina|borra|manda|envia|send|delete|publish|comprar|payment|pagar|premio|award|duracion|duration|cuanto dura/.test(
      q,
    )
  )
    return handoff();
  const topic = topics.find((t) => t.match.test(q));
  if (!topic) return handoff();
  return {
    answer: en ? topic.en : topic.es,
    sources: [{ title: topic.title, url: topic.url }],
    handoff: false,
    version: knowledgeVersion,
  };
}
