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


  // -- Seguimiento --
  'A quién contactar y qué pasó en cada llamada. Cada fila dice por qué está aquí.': 'Quem contatar e o que aconteceu em cada ligação. Cada linha diz por que está aqui.',
  'Trabajo de acompañamiento del Co-pastor: a quién ha contactado y cómo va cada caso.': 'Trabalho de acompanhamento do Copastor: quem já contatou e como está cada caso.',
  'Filtrar por motivo': 'Filtrar por motivo',
  'Todos': 'Todos',
  'Ausencia': 'Ausência',
  'Nuevo en la fe': 'Novo na fé',
  'Por contactar': 'Para contatar',
  'Nadie los ha llamado todavía': 'Ninguém ligou para eles ainda',
  'En proceso': 'Em andamento',
  'Ya hubo al menos un intento; abajo de cada uno está lo que pasó': 'Já houve pelo menos uma tentativa; embaixo de cada um está o que aconteceu',
  'Casos cerrados': 'Casos encerrados',
  'Últimos acompañamientos terminados': 'Últimos acompanhamentos concluídos',
  'Nada pendiente por acá.': 'Nada pendente por aqui.',
  'Cerrar caso': 'Encerrar caso',
  'Cerrar el caso': 'Encerrar o caso',
  'Cerrar el caso no da de baja a nadie. Si corresponde, hazlo desde Miembros con': 'Encerrar o caso não dá baixa em ninguém. Se for o caso, faça isso em Membros com',
  'Cerrando...': 'Encerrando...',
  'Anotar contacto': 'Anotar contato',
  'Con': 'Com',
  '¿Por dónde?': 'Por onde?',
  '¿Qué pasó?': 'O que aconteceu?',
  'Nota': 'Nota',
  'Solo la ven el Pastor y el Co-pastor.': 'Só o Pastor e o Copastor veem.',
  'Ej: Está enfermo, vuelve en dos semanas': 'Ex: Está doente, volta em duas semanas',
  'Llamar': 'Ligar',

  // -- Motivos generados en lib/seguimiento (ver useRazon) --
  'No viene hace {n} domingos seguidos': 'Não vem há {n} domingos seguidos',
  'No viene hace 2 domingos': 'Não vem há 2 domingos',
  'Su asistencia venía cayendo': 'A presença dele vinha caindo',
  'Es nuevo y ya está faltando': 'É novo e já está faltando',

  // -- Fidelización --
  'No hay personas en este nivel.': 'Não há pessoas neste nível.',
  'Confirmar llamada': 'Confirmar ligação',
  'Está a punto de llamar a': 'Você está prestes a ligar para',
  'al número': 'no número',

  // -- Retiros --
  'Sin candidatos a retiro': 'Sem candidatos a afastamento',
  'Todos los miembros han asistido en el último mes.': 'Todos os membros compareceram no último mês.',
  'Sin asistencias registradas': 'Sem presenças registradas',
  'Registrar retiro': 'Registrar afastamento',
  'Motivo del retiro': 'Motivo do afastamento',
  'Observaciones': 'Observações',
  'Escribe el motivo...': 'Escreva o motivo...',
  'Escribe el motivo': 'Escreva o motivo',
  'Detalles adicionales...': 'Detalhes adicionais...',
  'Error al guardar el retiro': 'Erro ao salvar o afastamento',
  'Dar de baja': 'Dar baixa',
  'y puede reactivarlo cuando quiera.': 'e pode reativá-lo quando quiser.',

  // -- Agenda --
  'Confirmar': 'Confirmar',
  'Rechazar': 'Recusar',
  'Confirmada': 'Confirmada',
  'Por confirmar': 'A confirmar',
  'Detalle de la solicitud de fecha': 'Detalhe da solicitação de data',
  'Ministerio:': 'Ministério:',
  'Lo solicita': 'Solicitado por',
  'Motivo del rechazo:': 'Motivo da recusa:',
  'Rechazar la fecha': 'Recusar a data',
  'Motivo': 'Motivo',
  'Ej: ese día choca con el retiro de mujeres.': 'Ex: esse dia coincide com o retiro de mulheres.',
  'Ver detalle': 'Ver detalhe',
  'No pudimos cargar la agenda.': 'Não conseguimos carregar a agenda.',
  'No pudimos actualizar el evento.': 'Não conseguimos atualizar o evento.',

  // -- Miembros --
  'Consulta la informacion de los miembros de la iglesia': 'Consulte as informações dos membros da igreja',
  'Adultos, jóvenes y niños separados en tabs.': 'Adultos, jovens e crianças separados em abas.',
  'Cargando miembros...': 'Carregando membros...',
  'Buscar por nombre, teléfono, email o comuna...': 'Buscar por nome, telefone, e-mail ou comuna...',
  'Adultos': 'Adultos',
  'Jóvenes': 'Jovens',
  'Niños': 'Crianças',
  'Adulto': 'Adulto',
  'Joven': 'Jovem',
  'Niño': 'Criança',
  'Visitas': 'Visitantes',
  'Visita': 'Visitante',
  'Pendientes': 'Pendentes',
  'También hay': 'Também há',
  'Ver en Visitas': 'Ver em Visitantes',
  'Nombre': 'Nome',
  'Tipo': 'Tipo',
  'Contacto': 'Contato',
  'Acciones': 'Ações',
  'Teléfono': 'Telefone',
  'Comuna': 'Comuna',
  'Edad': 'Idade',
  'Sin miembros registrados.': 'Sem membros cadastrados.',
  'Sin adultos registrados.': 'Sem adultos cadastrados.',
  'Sin jóvenes registrados.': 'Sem jovens cadastrados.',
  'Sin niños registrados.': 'Sem crianças cadastradas.',
  'Datos completos del registro.': 'Dados completos do cadastro.',
  'Fecha nacimiento': 'Data de nascimento',
  'Bautizado': 'Batizado',
  'Tiempo conversión': 'Tempo de conversão',
  'Apoderado': 'Responsável',
  'Tel. apoderado': 'Tel. do responsável',
  'Ver ficha': 'Ver cadastro',
  'Editar': 'Editar',
  'Editar miembro': 'Editar membro',
  'Actualiza los datos del registro.': 'Atualize os dados do cadastro.',
  'Eliminar miembro': 'Excluir membro',
  'Eliminar definitivamente': 'Excluir definitivamente',
  'Vas a eliminar a': 'Você vai excluir',
  ': conserva la ficha y se puede revertir.': ': mantém o cadastro e pode ser revertido.',
  'Eliminar requiere autorización. Ingresa la': 'Excluir exige autorização. Digite a',
  'contraseña del pastor': 'senha do pastor',
  'para continuar.': 'para continuar.',
  'Contraseña del pastor': 'Senha do pastor',
  'Eliminando...': 'Excluindo...',

  'Llamada': 'Ligação',
  'En persona': 'Pessoalmente',
  'Contestó': 'Atendeu',
  'No contestó': 'Não atendeu',
  'Dejé mensaje': 'Deixei recado',
  'Volvió a la iglesia': 'Voltou à igreja',
  'Se retiró': 'Saiu',
  'No se logró contacto': 'Não foi possível contatar',
  'Intento': 'Tentativa',
  'de': 'de',
  'Administra la lista de miembros de la iglesia': 'Administre a lista de membros da igreja',

  // -- Fidelizacion / graficas --
  'Fidelidad de Asistencia': 'Fidelidade de Presença',
  'Constancia de asistencia por persona desde que se unió': 'Constância de presença por pessoa desde que entrou',
  '· clic en una barra para ver el detalle': '· clique numa barra para ver o detalhe',
  'evaluadas': 'avaliadas',
  'Nadie tiene todavía cultos suficientes para evaluar su fidelidad. El cálculo empieza cuando una persona ya estaba registrada al momento de un culto.': 'Ninguém tem cultos suficientes ainda para avaliar sua fidelidade. O cálculo começa quando a pessoa já estava cadastrada no momento de um culto.',
  'Alta': 'Alta',
  'Media': 'Média',
  'Baja': 'Baixa',

  // -- Mapa de presenca --
  'Cada fila es una persona y cada columna un domingo. Se ven de un vistazo los patrones: quién viene una semana sí y otra no, y quién dejó de venir.': 'Cada linha é uma pessoa e cada coluna um domingo. Os padrões aparecem de relance: quem vem uma semana sim e outra não, e quem parou de vir.',
  'Todavía no hay domingos con asistencia registrada.': 'Ainda não há domingos com presença registrada.',
  'Persona': 'Pessoa',
  'Vino': 'Veio',
  'Asistió': 'Compareceu',
  'Faltó': 'Faltou',
  'Aún no era miembro': 'Ainda não era membro',
  '· Ordenado por menor asistencia primero': '· Ordenado por menor presença primeiro',

  // -- Visitantes --
  'Buscar persona...': 'Buscar pessoa...',
  'Cargando visitantes...': 'Carregando visitantes...',
  'Última visita': 'Última visita',
  'Convertir en miembro': 'Converter em membro',
  'Visita registrada': 'Visitante cadastrado',
  'Email': 'E-mail',
  'Veces que ha venido': 'Vezes que veio',
  'Editar visita': 'Editar visitante',
  'Una visita solo guarda nombre y contacto. La ficha completa se llena al convertirla en miembro.': 'Um visitante guarda só nome e contato. O cadastro completo se preenche ao convertê-lo em membro.',
  'Eliminar visita': 'Excluir visitante',
  'y sus': 'e suas',
  '. Sus asistencias anteriores se conservan y pasan a la ficha nueva.': '. As presenças anteriores são mantidas e passam para o novo cadastro.',
  'Conserva todo su historial de asistencia': 'Mantém todo o histórico de presença',

  // -- Pendientes --
  'Comparte este link para que la gente se registre sola. Lo que llegue aparece acá para que lo revises antes de que entre a la lista.': 'Compartilhe este link para que as pessoas se cadastrem sozinhas. O que chegar aparece aqui para você revisar antes de entrar na lista.',
  'Cargando...': 'Carregando...',
  'No hay registros esperando revisión.': 'Não há cadastros aguardando revisão.',
  'Posible duplicado': 'Possível duplicado',
  'Descartar': 'Descartar',
  '. Puedes aprobar igual y completarlo después desde Miembros.': '. Você pode aprovar mesmo assim e completar depois em Membros.',
  'Aprobar': 'Aprovar',
  'Ya hay un miembro con este mismo nombre': 'Já existe um membro com este mesmo nome',
  'Ver la ficha completa antes de aprobar': 'Ver o cadastro completo antes de aprovar',

  'N° visitas': 'N° de visitas',

  '% de cultos asistidos desde que cada persona se unió': '% de cultos frequentados desde que cada pessoa entrou',
  'personas': 'pessoas',
  'Personas': 'Pessoas',

  'Guardar': 'Salvar',
  'Eliminar': 'Excluir',
  'marca de asistencia': 'marca de presença',
  'marcas de asistencia': 'marcas de presença',
  ', para siempre. Esta acción no se puede deshacer.': ', para sempre. Esta ação não pode ser desfeita.',
  'Si lo que quieres es conservar su historial, cierra esto y usa': 'Se você quer manter o histórico, feche isto e use',
  'Elige la categoría y completa la ficha de': 'Escolha a categoria e complete o cadastro de',

  'Copiado': 'Copiado',
  'Copiar link': 'Copiar link',
  'Ver la ficha de': 'Ver o cadastro de',
  'Sin datos adicionales': 'Sem dados adicionais',
  'años': 'anos',
  'Se registró por el link público': 'Cadastrou-se pelo link público',
  'Falta': 'Falta',
  'Faltan': 'Faltam',
  'Youth': 'Jovem',
  'Sexo': 'Sexo',
  'masculino': 'masculino',
  'femenino': 'feminino',
  'Fecha de nacimiento': 'Data de nascimento',
  'WhatsApp': 'WhatsApp',
  'Región': 'Região',
  'Dirección': 'Endereço',
  'Nombre del apoderado': 'Nome do responsável',
  'Teléfono del apoderado': 'Telefone do responsável',
  'Primera iglesia': 'Primeira igreja',
  'Tiempo en el evangelio': 'Tempo no evangelho',
  'Sí': 'Sim',
  'No': 'Não',
  'Datos del Niño': 'Dados da Criança',
  'Datos Personales': 'Dados Pessoais',
  'Fe y Comunidad': 'Fé e Comunidade',


  // -- Notificaciones / resumen seguimiento --
  'Aún no hay datos suficientes para evaluar el seguimiento.': 'Ainda não há dados suficientes para avaliar o acompanhamento.',
  'Atención': 'Atenção',
  'Ábrelo en Asistencia y ciérralo para que las cifras cuadren.': 'Abra em Presença e feche para que os números batam.',
  'sin leer': 'não lidas',

  // -- Ficha de miembro --
  'Nombre Completo': 'Nome Completo',
  'Fecha de Nacimiento': 'Data de Nascimento',
  'Cambiar a Youth': 'Mudar para Jovem',
  'Cambiar a Niño': 'Mudar para Criança',
  'Cambiar a Adulto': 'Mudar para Adulto',
  '¿Es su primera vez en una iglesia cristiana?': 'É a primeira vez dele numa igreja cristã?',
  'Se marcará para el acompañamiento de quienes recién conocen el evangelio.': 'Será marcado para o acompanhamento de quem acabou de conhecer o evangelho.',
  'Tiempo de Conversión': 'Tempo de Conversão',
  'Meses': 'Meses',
  'Años': 'Anos',
  '¿Bautizado/a?': 'Batizado/a?',
  'Sí, está bautizado/a': 'Sim, está batizado/a',
  'Sin resultados. Registra primero al adulto.': 'Sem resultados. Cadastre primeiro o adulto.',
  'Ubicación': 'Localização',
  'Ficha enviada. Queda': 'Cadastro enviado. Fica',
  'esperando autorización de Secretaría': 'aguardando autorização da Secretaria',
  'antes de aparecer en los listados.': 'antes de aparecer nas listas.',
  'Ej: María Isabel García': 'Ex: Maria Isabel Garcia',
  'Día': 'Dia',
  'Mes': 'Mês',
  'Año': 'Ano',
  'Unidad': 'Unidade',
  'Buscar por nombre...': 'Buscar por nome...',
  'correo@ejemplo.com': 'email@exemplo.com',
  'Seleccione región...': 'Selecione a região...',
  'Ej: Av. Brasil 1234': 'Ex: Av. Brasil 1234',

  'Nueva solicitud de miembro': 'Nova solicitação de membro',
  'Sin nombre': 'Sem nome',
  'Nueva fecha propuesta': 'Nova data proposta',
  'Nueva petición de oración': 'Novo pedido de oração',
  'Anónimo': 'Anônimo',
  'Hay un culto sin cerrar': 'Há um culto sem fechar',
  'Culto': 'Culto',
  'del': 'de',
  'lleva': 'está há',
  'abierto': 'aberto',
  'días': 'dias',
  'horas': 'horas',

  'opcional': 'opcional',
  'Masculino': 'Masculino',
  'Femenino': 'Feminino',
  'Enero': 'Janeiro',
  'Febrero': 'Fevereiro',
  'Marzo': 'Março',
  'Abril': 'Abril',
  'Mayo': 'Maio',
  'Junio': 'Junho',
  'Julio': 'Julho',
  'Agosto': 'Agosto',
  'Septiembre': 'Setembro',
  'Octubre': 'Outubro',
  'Noviembre': 'Novembro',
  'Diciembre': 'Dezembro',
  'Visitante registrado en miembros nuevos': 'Visitante cadastrado em membros novos',
  'Miembro registrado exitosamente': 'Membro cadastrado com sucesso',
  'Guardar Cambios': 'Salvar Alterações',
  'Registrar Niño': 'Cadastrar Criança',
  'Registrar Youth': 'Cadastrar Jovem',
  'Registrar Visita': 'Cadastrar Visitante',
  'Registrar Miembro': 'Cadastrar Membro',

  'Todas': 'Todas',
  'persona': 'pessoa',
  'nivel': 'nível',
  'Llamar a': 'Ligar para',
  'Rechazada': 'Recusada',
  'Confirmadas': 'Confirmadas',
  'Rechazadas': 'Recusadas',
  'El calendario de la iglesia con las fechas de todos los ministerios.': 'O calendário da igreja com as datas de todos os ministérios.',
  'solicitud espera': 'solicitação aguarda',
  'solicitudes esperan': 'solicitações aguardam',
  'tu respuesta.': 'a sua resposta.',
  'No hay solicitudes esperando respuesta.': 'Não há solicitações aguardando resposta.',
  'No hay fechas con ese filtro.': 'Não há datas com esse filtro.',

  'Es su primera iglesia': 'É a primeira igreja dele',
  'Requiere seguimiento': 'Precisa de acompanhamento',
  'Lleva {n} {u} en el evangelio': 'Está há {n} {u} no evangelho',
  'mes': 'mês',
  'meses': 'meses',
  'año': 'ano',
  'Otro': 'Outro',
  'Nunca': 'Nunca',
  'No viene hace 3 domingos seguidos': 'Não vem há 3 domingos seguidos',

  'Se mudó de ciudad/país': 'Mudou de cidade/país',
  'Problemas personales': 'Problemas pessoais',
  'Cambio de iglesia': 'Mudança de igreja',
  'Enfermedad o salud': 'Doença ou saúde',
  'Trabajo / horario incompatible': 'Trabalho / horário incompatível',
  'Sin contacto (inubicable)': 'Sem contato (não localizado)',

  'Última vez': 'Última vez',


  'dejará de aparecer en los listados, en la asistencia de cada domingo y en las estadísticas. Su ficha y su historial se conservan: el pastor lo sigue viendo en': 'deixará de aparecer nas listas, na presença de cada domingo e nas estatísticas. O cadastro e o histórico são mantidos: o pastor continua vendo em',
  'visita ya vino': 'visitante já veio',
  'visitas ya vinieron': 'visitantes já vieram',
  'veces o más. Al convertirlos en miembros conservan todo su historial de asistencia.': 'vezes ou mais. Ao convertê-los em membros mantêm todo o histórico de presença.',
  'Esta persona tendría': 'Esta pessoa teria',
  'años según la fecha ingresada. ¿Seguro que corresponde al grupo Niño y no a Youth?': 'anos conforme a data informada. Tem certeza de que é do grupo Criança e não Jovem?',
  'cumplió 15 años': 'fez 15 anos',
  'Sigue registrada como Niño. Pásala a Youth.': 'Continua cadastrada como Criança. Mude-a para Jovem.',
  'Sigue registrado como Niño. Pásalo a Youth.': 'Continua cadastrado como Criança. Mude-o para Jovem.',
  'Llega a Youth. Secretaría actualizará su ficha.': 'Chega ao Jovem. A Secretaria atualizará a ficha.',
  'Ábrelo en Miembros y usa «Cambiar a Youth».': 'Abra em Membros e use «Mudar para Jovem».',
  'Su cumpleaños fue': 'O aniversário foi',
  'hoy': 'hoje',
  'ayer': 'ontem',
  'hace': 'há',
  'Los avisos automáticos de ese día ya salieron sin este cumpleaños. Puedes enviar el saludo desde la sección Cumpleaños.': 'Os avisos automáticos desse dia já saíram sem este aniversário. Você pode enviar a saudação pela seção Cumpleaños.',

  // -- Calendario --
  'enero': 'janeiro',
  'febrero': 'fevereiro',
  'marzo': 'março',
  'abril': 'abril',
  'mayo': 'maio',
  'junio': 'junho',
  'julio': 'julho',
  'agosto': 'agosto',
  'septiembre': 'setembro',
  'octubre': 'outubro',
  'noviembre': 'novembro',
  'diciembre': 'dezembro',
  'lunes': 'segunda-feira',
  'martes': 'terça-feira',
  'miércoles': 'quarta-feira',
  'jueves': 'quinta-feira',
  'viernes': 'sexta-feira',
  'sábado': 'sábado',
  'domingo': 'domingo',
  'Sin eventos': 'Sem eventos',
  'evento': 'evento',
  'eventos': 'eventos',
  'Hoy': 'Hoje',
  'Mes anterior': 'Mês anterior',
  'Mes siguiente': 'Mês seguinte',
  'Cerrar el detalle del día': 'Fechar o detalhe do dia',
  '· por confirmar': '· a confirmar',
  'hrs': 'hrs',

  'asistió': 'compareceu',
  'nino': 'criança',
  'adulto': 'adulto',
  'joven': 'jovem',


  // -- Inactivos / retiros --
  'Miembros sin asistencia en +{n} días · confirma y registra el motivo del retiro': 'Membros sem presença há mais de {n} dias · confirme e registre o motivo do afastamento',
  'personas ausentes': 'pessoas ausentes',
  'persona ausente': 'pessoa ausente',
  'Miembros inactivos': 'Membros inativos',
  'Fuera de los listados y de las estadísticas, pero conservados en la base con todo su historial — por si vuelven o para invitarlos a algo puntual': 'Fora das listas e das estatísticas, mas mantidos na base com todo o histórico — caso voltem ou para convidá-los para algo pontual',
  'No hay miembros dados de baja.': 'Não há membros com baixa.',
  'Baja el': 'Baixa em',
  'Reactivar': 'Reativar',
  'Reactivar miembro': 'Reativar membro',
  'Reactivando...': 'Reativando...',
  'volverá a aparecer en los listados y en las estadísticas, con todo su historial de asistencia intacto — nunca se borró.': 'voltará a aparecer nas listas e nas estatísticas, com todo o histórico de presença intacto — nunca foi apagado.',
  'y todo su historial de asistencia. Esto no es dar de baja: la persona desaparece de la base y no se puede recuperar.': 'e todo o histórico de presença. Isto não é dar baixa: a pessoa some da base e não dá para recuperar.',
  'Si solo quieres que deje de aparecer, cancela: ya está inactivo y así conservas sus datos.': 'Se você só quer que deixe de aparecer, cancele: já está inativo e assim mantém os dados.',

  'Eliminar para siempre': 'Excluir para sempre',

  '(del apoderado)': '(do responsável)',

  'Fecha registro': 'Data de cadastro',
  'Creado': 'Criado',

  '👤 Adulto': '👤 Adulto',
  '🧑 Youth': '🧑 Jovem',
  '🧒 Niño': '🧒 Criança',
  '✨ Visita': '✨ Visitante',
  '+18 años, en general': '+18 anos, em geral',
  '15–20 años': '15–20 anos',
  '14 años o menos — requiere un apoderado': '14 anos ou menos — precisa de um responsável',
  'Vino a la iglesia pero aún no es miembro': 'Veio à igreja mas ainda não é membro',
  'Datos de Youth': 'Dados do Jovem',
  'Datos del Visitante': 'Dados do Visitante',
  'Seleccione comuna...': 'Selecione a comuna...',
  'Primero seleccione región': 'Selecione a região primeiro',

  'Cada fila es una persona y cada columna uno de los últimos {n} domingos. Se ven de un vistazo los patrones: quién viene una semana sí y otra no, y quién dejó de venir.': 'Cada linha é uma pessoa e cada coluna um dos últimos {n} domingos. Os padrões aparecem de relance: quem vem uma semana sim e outra não, e quem parou de vir.',

  'visita': 'visita',
  'visitas': 'visitas',

  'Volvió': 'Voltou',
  'Sin contacto': 'Sem contato',
  'Error al registrar.': 'Erro ao cadastrar.',
  'Error al guardar.': 'Erro ao salvar.',

  'intento': 'tentativa',
  'intentos': 'tentativas',

  'Confirmar retiro': 'Confirmar afastamento',

  // -- Comunes --
  'Cancelar': 'Cancelar',
  'Cerrar': 'Fechar',
  'Guardando...': 'Salvando...',

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

/**
 * Traduce los motivos que arma `lib/seguimiento` con un numero dentro
 * ("No viene hace 6 domingos seguidos").
 *
 * Va aparte de `t()` porque el numero cambia y la clave no puede contenerlo:
 * habria que escribir una entrada por cada cantidad posible.
 */
export function useRazon() {
  const { t } = useIdioma();
  return (razon: string) => {
    const m = razon.match(/^No viene hace (\d+) domingos seguidos$/);
    if (m) return t('No viene hace {n} domingos seguidos').replace('{n}', m[1]);
    // "Lleva 3 meses en el evangelio": el numero varia y la unidad se traduce
    // aparte, igual que arriba.
    const c = razon.match(/^Lleva (\d+) (Meses|Años|Mes|Año|meses|años|mes|año) en el evangelio$/);
    if (c) {
      return t('Lleva {n} {u} en el evangelio')
        .replace('{n}', c[1])
        .replace('{u}', t(c[2]));
    }
    return t(razon);
  };
}
