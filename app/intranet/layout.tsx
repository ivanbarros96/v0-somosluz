import { League_Spartan, Open_Sans } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { MembersProvider } from '@/lib/members-store';
import { IdiomaProvider } from '@/lib/idioma';

// Tipografías del Manual de Marca (Equipo Creativo, 2026):
//   · League Spartan → títulos secundarios
//   · Open Sans      → subtítulos y texto corrido
//
// Se cargan ACÁ y no en el layout raíz para que el home no las descargue: la
// landing sigue con su tipografía editorial hasta que Iván la revise.
//
// La tercera del manual, Brittany (título primario, manuscrita), es de pago y
// no está en Google Fonts. En la intranet no hace falta —es una herramienta de
// trabajo, no una pieza de comunicación— así que queda pendiente solo para la
// landing. Ver docs/PLAN-SEO-MARCA.md.
const leagueSpartan = League_Spartan({
  subsets: ['latin'],
  variable: '--font-titulo',
  display: 'swap',
});

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-cuerpo',
  display: 'swap',
});

export default function IntranetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <MembersProvider>
        {/* El idioma envuelve TAMBIÉN el acceso, no sólo el panel: el
            Co-pastor debe poder leer en portugués desde la pantalla de
            contraseña, cuando todavía no hay sesión. */}
        <IdiomaProvider>
          {/* `marca-intranet` acota los colores del manual a la intranet, para
              no alterar la landing (ver app/globals.css). */}
          <div className={`marca-intranet ${leagueSpartan.variable} ${openSans.variable}`}>
            {children}
          </div>
        </IdiomaProvider>
      </MembersProvider>
    </AuthProvider>
  );
}
