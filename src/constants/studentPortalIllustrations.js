/** Метаданные бейджей образов на роликах (читаемые подписи + цвет карточки). */
export const KNOWLEDGE_VIDEO_BADGES = {
  vision: {
    shortLabel: 'Зрение',
    title: 'Зрительный образ',
    chipClass: 'border-emerald-500/40 bg-emerald-50 text-emerald-800',
    iconClass: 'text-emerald-600',
  },
  logic: {
    shortLabel: 'Логика',
    title: 'Логический образ',
    chipClass: 'border-[#2d81e0]/35 bg-[#ecf3fc] text-[#1e5a9e]',
    iconClass: 'text-[#2d81e0]',
  },
  kinesthesia: {
    shortLabel: 'Тело',
    title: 'Кинестетический образ',
    chipClass: 'border-red-400/40 bg-red-50 text-red-900',
    iconClass: 'text-red-500',
  },
}

/** @type {Array<{ key: string, title: string, text: string, imageSrc: string, ringClass: string }>} */
export const KNOWLEDGE_IMAGE_CARDS = [
  {
    key: 'logic',
    title: 'Логический образ',
    text: 'Понимаешь, почему элемент выполняется именно так — можешь объяснить своими словами.',
    imageSrc: '/student-portal/knowledge-logic.png',
    ringClass: 'ring-[#2d81e0]/30',
  },
  {
    key: 'vision',
    title: 'Зрительный образ',
    text: 'Видишь правильное выполнение — на видео, у тренера или в голове.',
    imageSrc: '/student-portal/knowledge-vision.png',
    ringClass: 'ring-emerald-500/30',
  },
  {
    key: 'kinesthesia',
    title: 'Кинестетика',
    text: 'Прочувствовал элемент в теле — знаешь ощущения в мышцах.',
    imageSrc: '/student-portal/knowledge-kinesthesia.png',
    ringClass: 'ring-red-400/35',
  },
]

/** Общая схема четырёх этапов формирования навыка. */
export const MOTOR_SKILL_STAGES_ILLUSTRATION = '/student-portal/motor-skill-stages-4-blocks.png'
