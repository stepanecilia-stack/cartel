export const STUDENT_PORTAL_RECEPTION = {
  gymHallSrc: '/student-portal/gym-hall.jpg',
  sceneSrc: '/student-portal/reception-scene.png',
  bunnySrc: '/student-portal/reception-bunny.png',
  adminName: 'Администратор',
  adminRole: 'Ресепшен Cartel',
  welcomeMonologue:
    'Привет! Добро пожаловать на учебную платформу академии бокса Картель. Я помогу с первым шагом. Давай начнём: заполни короткую анкету, это займёт меньше минуты.',
  welcomeTitle: 'Добро пожаловать на учебную платформу академии бокса Картель',
  welcomeSubtitle: 'Здесь ты можешь самостоятельно пройти обучение технике бокса.',
  questionnaireTitle: 'Анкета ученика',
  questionnaireSubtitle: 'Цель занятий — отметь одну или несколько',
  questionnaireHint: 'Нажми на строку, чтобы поставить галочку',
  trainersIntroMonologue:
    'Анкета принята! Выбери виртуального наставника. У каждого свой стиль преподавания:\n1. Строгость\n2. Поддержка\n3. Прагматизм\nМогу рассказать про каждого.',
}

/** @type {Record<import('./studentPortalPersonas.js').PortalPersonaId, string>} */
export const TRAINER_RECEPTION_INTROS = {
  vasily:
    'Это Кабан Петрович. Сарказм, подкол, ноль сюсюканья — объяснит один раз, второй уже с «ты серьёзно?». Похвала: «уже лучше» — и то через зубы. Если нужен тренер, который не кормит сказками — выбирай.',
  arkady:
    'Это Медведь Михайлович. Тепло, «друг», бесконечное терпение — объяснит хоть десятый раз без вздоха. Не давит, но «потом» не принимает: мягко тащит, пока не сделаешь. Если важна вера, что получится — он твой.',
  gleb:
    'Это Сокол Станиславович. Живой протокол: критерий, чек-лист, «засчитано» или «не засчитано». Без уговоров и без лирики. Если нужен холодный прагматизм и ясный стандарт — выбирай его.',
}

/** @param {import('./studentPortalPersonas.js').PortalPersonaId} personaId */
export function trainerReceptionIntro(personaId) {
  return TRAINER_RECEPTION_INTROS[personaId] ?? ''
}
