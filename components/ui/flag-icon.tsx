// Banderas dibujadas a mano en SVG, en vez de emoji.
//
// Windows no trae glifos de bandera: Chrome sobre Windows degrada 🇨🇱 a dos
// letras diminutas ("ᴄʟ") porque la fuente del sistema no tiene el dibujo,
// solo el texto alternativo. Un SVG no depende de ninguna fuente — se ve
// igual en cualquier sistema operativo o navegador.
//
// Simplificadas a propósito (sin escudos ni el sol de Argentina con rayos
// completos): a este tamaño el detalle fino no se percibe y solo agrega
// peso. El nombre del país siempre va al lado, así que la bandera refuerza
// el reconocimiento visual pero no es la única forma de identificarlo.
//
// Todas comparten el mismo lienzo (viewBox 0 0 3 2, proporción 3:2) para
// que se alineen parejas dentro de un mismo contenedor.

import type { SVGProps } from 'react';

type Iso = 'CL' | 'VE' | 'PE' | 'CO' | 'BO' | 'HT' | 'AR' | 'BR' | 'EC' | 'DO';

function Chile() {
  return (
    <>
      <rect width="3" height="1" y="0" fill="#fff" />
      <rect width="3" height="1" y="1" fill="#D52B1E" />
      <rect width="1" height="1" y="0" fill="#0033A0" />
      <polygon
        fill="#fff"
        points="0.5,0.22 0.61,0.55 0.96,0.55 0.68,0.75 0.79,1.08 0.5,0.88 0.21,1.08 0.32,0.75 0.04,0.55 0.39,0.55"
      />
    </>
  );
}

function Venezuela() {
  const xs = [0.55, 0.85, 1.15, 1.45, 1.5, 1.8, 2.1, 2.4];
  return (
    <>
      <rect width="3" height="0.667" y="0" fill="#FCD116" />
      <rect width="3" height="0.667" y="0.667" fill="#00247D" />
      <rect width="3" height="0.667" y="1.333" fill="#CF142B" />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy="1" r="0.06" fill="#fff" />
      ))}
    </>
  );
}

function Peru() {
  return (
    <>
      <rect width="1" height="2" x="0" fill="#D91023" />
      <rect width="1" height="2" x="1" fill="#fff" />
      <rect width="1" height="2" x="2" fill="#D91023" />
    </>
  );
}

function Colombia() {
  return (
    <>
      <rect width="3" height="1" y="0" fill="#FCD116" />
      <rect width="3" height="0.5" y="1" fill="#003893" />
      <rect width="3" height="0.5" y="1.5" fill="#CE1126" />
    </>
  );
}

function Bolivia() {
  return (
    <>
      <rect width="3" height="0.667" y="0" fill="#D52B1E" />
      <rect width="3" height="0.667" y="0.667" fill="#F9E300" />
      <rect width="3" height="0.667" y="1.333" fill="#007A33" />
    </>
  );
}

function Haiti() {
  return (
    <>
      <rect width="3" height="1" y="0" fill="#00209F" />
      <rect width="3" height="1" y="1" fill="#D21034" />
      <rect width="0.9" height="0.6" x="1.05" y="0.7" fill="#fff" />
    </>
  );
}

function Argentina() {
  return (
    <>
      <rect width="3" height="0.667" y="0" fill="#75AADB" />
      <rect width="3" height="0.667" y="0.667" fill="#fff" />
      <rect width="3" height="0.667" y="1.333" fill="#75AADB" />
      <circle cx="1.5" cy="1" r="0.16" fill="#F6B40E" stroke="#85340A" strokeWidth="0.02" />
    </>
  );
}

function Brasil() {
  return (
    <>
      <rect width="3" height="2" fill="#009739" />
      <polygon fill="#FEDD00" points="1.5,0.2 2.75,1 1.5,1.8 0.25,1" />
      <circle cx="1.5" cy="1" r="0.42" fill="#012169" />
    </>
  );
}

function Ecuador() {
  return (
    <>
      <rect width="3" height="1" y="0" fill="#FCD116" />
      <rect width="3" height="0.5" y="1" fill="#003893" />
      <rect width="3" height="0.5" y="1.5" fill="#CE1126" />
      <circle cx="1.5" cy="1" r="0.24" fill="#F5F1E6" stroke="#8A6A50" strokeWidth="0.02" />
    </>
  );
}

function RepublicaDominicana() {
  return (
    <>
      <rect width="3" height="2" fill="#fff" />
      <rect width="1.2" height="0.85" x="0" y="0" fill="#002D62" />
      <rect width="1.2" height="0.85" x="1.8" y="0" fill="#CE1126" />
      <rect width="1.2" height="0.85" x="0" y="1.15" fill="#CE1126" />
      <rect width="1.2" height="0.85" x="1.8" y="1.15" fill="#002D62" />
    </>
  );
}

const BANDERAS: Record<Iso, () => React.JSX.Element> = {
  CL: Chile,
  VE: Venezuela,
  PE: Peru,
  CO: Colombia,
  BO: Bolivia,
  HT: Haiti,
  AR: Argentina,
  BR: Brasil,
  EC: Ecuador,
  DO: RepublicaDominicana,
};

export function FlagIcon({
  iso,
  className,
  ...props
}: { iso: string } & SVGProps<SVGSVGElement>) {
  const Bandera = BANDERAS[iso as Iso];
  if (!Bandera) return null;
  return (
    <svg
      viewBox="0 0 3 2"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <Bandera />
    </svg>
  );
}
