/** Общая схема четырёх этапов формирования навыка. */
export const MOTOR_SKILL_STAGES_ILLUSTRATION = '/student-portal/motor-skill-stages-4-blocks.png'

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
