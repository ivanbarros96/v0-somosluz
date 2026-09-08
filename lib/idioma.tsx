'use client';

// Español / Português para el perfil Co-pastor.
//
// El pastor Aloísio es brasileño (plan de trabajo, 07/09/2026). Su perfil debe
// poder usarse en los dos idiomas DESDE LA PANTALLA DE CONTRASEÑA — o sea,
// antes de que exista sesión —, así que el idioma vive acá y no en el usuario.
//
// Por qué un diccionario propio y no una librería de i18n:
//  · Son DOS idiomas y un solo perfil. next-intl o i18next traen enrutado por
//    idioma (/es, /pt), negociación de locale y carga por espacios de nombres:
//    todo eso sobra y obligaría a reestructurar las rutas de la intranet.
//  · El resto de la app queda intacta: quien no toca el selector no nota nada.
//
// Regla al agregar textos: la clave se escribe en español (es el idioma en que
// se piensa el producto) y `pt` es la traducción. Si falta una clave en `pt`,
// `t()` devuelve el español en vez de romper o mostrar la clave cruda — un
// texto en español se entiende; "panel.titulo" no.

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Idioma = 'es' | 'pt';

const CLAVE_STORAGE = 'sl_idioma';

// ── Diccionario ─────────────────────────────────────────────────────────────
//
// Traducciones al portugués de Brasil. PENDIENTE: que Aloísio las revise — el
// vocabulario de iglesia cambia entre países y él es quien sabe cuál se usa
// (ej. "discipulado" vs "discipulado", "retiro" vs "retiro/acampamento").
const PT: Record<string, string> = {
  // Acceso
  'Volver': 'Voltar',
  'Cambiar perfil': 'Trocar perfil',
  'Sistema de Gestión Interna': 'Sistema de Gestão Interna',
  'Selecciona tu perfil de acceso': 'Selecione seu perfil de acesso',
  'Ingresa tu contraseña': 'Digite sua senha',
  'Entrar': 'Entrar',
  'Verificando…': 'Verificando…',
  'Contraseña incorrecta': 'Senha incorreta',
  'Mostrar contraseña': 'Mostrar senha',
  'Ocultar contraseña': 'Ocultar senha',
  'Calendario de la iglesia': 'Calendário da igreja',
  // Con la flecha incluida: la clave tiene que ser el texto EXACTO que está en
  // pantalla. Sin ella, t() no encontraba nada y devolvía el español.
  '← Volver al sitio principal': '← Voltar ao site principal',
  'Cargando panel operativo': 'Carregando painel operacional',

  // Roles y accesos
  'Co-pastor': 'Copastor',
  'Seguimiento y cuidado de las personas': 'Acompanhamento e cuidado das pessoas',
  'Acceso pastoral': 'Acesso pastoral',

  // Menú
  'Panel Principal': 'Painel Principal',
  'Agenda': 'Agenda',
  'Cuidado pastoral': 'Cuidado pastoral',
  'Seguimiento': 'Acompanhamento',
  'Fidelización': 'Fidelização',
  'Retiros': 'Afastamentos',
  'Congregación': 'Congregação',
  'Miembros': 'Membros',
  'Asistencia': 'Presença',
  'Mapa de asistencia': 'Mapa de presença',
  'Cerrar sesión': 'Sair',
  '← Volver al sitio': '← Voltar ao site',
  'Nuevo': 'Novo',

  // Panel del Co-pastor
  'Bienvenido': 'Bem-vindo',
  'Panel de cuidado · Somos Luz Iglesia': 'Cuidado pastoral · Somos Luz Iglesia',
  'Visitas por acompañar': 'Visitantes a acompanhar',
  'Quienes ya vinieron varias veces y aún no son miembros':
    'Quem já veio várias vezes e ainda não é membro',
  'No hay visitas registradas.': 'Não há visitantes registrados.',
  'Ver todas las visitas': 'Ver todos os visitantes',
  'Nuevos en la fe': 'Novos na fé',
  'Recién conocen el evangelio y necesitan acompañamiento':
    'Acabam de conhecer o evangelho e precisam de acompanhamento',
  'Nadie por ahora.': 'Ninguém por enquanto.',
  'Ver la lista y contactar': 'Ver a lista e entrar em contato',
  'Accesos rápidos': 'Acessos rápidos',

  // Bloque de seguimiento (lo comparte con el panel del Pastor; para él sigue
  // en español porque su idioma nunca cambia).
  'Quién necesita seguimiento': 'Quem precisa de acompanhamento',
  'Según ausencias seguidas, caída de asistencia y antigüedad':
    'Conforme faltas seguidas, queda de presença e tempo de casa',
  'persona en riesgo alto': 'pessoa em risco alto',
  'personas en riesgo alto': 'pessoas em risco alto',
  'en atención': 'em atenção',
  'al día': 'em dia',
  'Ver la lista y llamar': 'Ver a lista e ligar',
  // Sueltas, para la lista de nombres ("… y 16 más").
  'y': 'e',
  'más': 'mais',
  'A quién llamar': 'Quem ligar',
  'Quién asiste poco': 'Quem vem pouco',
  'Buscar una ficha': 'Buscar um cadastro',
  'Notificaciones': 'Notificações',
  'Estás al día': 'Você está em dia',
  'No hay nada nuevo por ahora.': 'Não há nada de novo por enquanto.',
  'Marcar vistas': 'Marcar como vistas',

  // Idioma
  'Idioma': 'Idioma',
  'Español': 'Espanhol',
  'Portugués': 'Português',
};

const DICCIONARIOS: Record<Idioma, Record<string, string>> = { es: {}, pt: PT };

// ── Contexto ────────────────────────────────────────────────────────────────

interface Ctx {
  idioma: Idioma;
  setIdioma: (i: Idioma) => void;
  /** Traduce. Si no hay traducción, devuelve el español tal cual. */
  t: (texto: string) => string;
}

const IdiomaContext = createContext<Ctx>({
  idioma: 'es',
  setIdioma: () => {},
  t: (s) => s,
});

export function IdiomaProvider({ children }: { children: React.ReactNode }) {
  // Arranca SIEMPRE en español, también para quien ya eligió portugués: leer
  // localStorage durante el render del servidor no es posible, y pintar un
  // idioma y cambiarlo al instante provoca el parpadeo clásico. Se ajusta en
  // el efecto de abajo, antes de que se alcance a leer nada.
  const [idioma, setIdiomaEstado] = useState<Idioma>('es');

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_STORAGE);
      if (guardado === 'pt' || guardado === 'es') setIdiomaEstado(guardado);
    } catch {
      // Storage bloqueado (modo privado): se queda en español.
    }
  }, []);

  const setIdioma = useCallback((i: Idioma) => {
    setIdiomaEstado(i);
    try {
      localStorage.setItem(CLAVE_STORAGE, i);
    } catch {
      // No persiste entre recargas, pero funciona mientras dure la sesión.
    }
  }, []);

  const t = useCallback(
    (texto: string) => DICCIONARIOS[idioma][texto] ?? texto,
    [idioma],
  );

  return (
    <IdiomaContext.Provider value={{ idioma, setIdioma, t }}>
      {children}
    </IdiomaContext.Provider>
  );
}

export function useIdioma(): Ctx {
  return useContext(IdiomaContext);
}

/**
 * Idioma que le corresponde a un perfil al elegirlo en el acceso.
 * Sólo el Co-pastor entra en portugués; el resto sigue en español.
 * Se puede cambiar después con el selector — la idea es que no tenga que
 * buscarlo, no que quede encerrado en un idioma.
 */
export function idiomaDePerfil(role: string): Idioma {
  return role === 'copastor' ? 'pt' : 'es';
}
