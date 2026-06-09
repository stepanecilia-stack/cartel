/** Три квадрата в ряд — зрительный / логический / кинестетический. */
export const KNOWLEDGE_IMAGE_ROW_ITEMS = [
  {
    key: 'vision',
    title: 'Зрительный образ',
    shortLabel: 'Зрительный',
    imageSrc: '/student-portal/knowledge-row-vision.png',
    activeSurface: 'bg-emerald-50',
    activeBorder: 'border-emerald-400/60',
    activeGlow: 'shadow-[inset_0_0_0_1px_rgba(52,211,153,0.25),0_0_14px_rgba(52,211,153,0.18)]',
    indicatorClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.95)]',
    iconClass: 'text-emerald-600',
    labelClass: 'text-emerald-800',
    text: 'Видишь правильное выполнение — на видео, у тренера или в голове.',
  },
  {
    key: 'logic',
    title: 'Логический образ',
    shortLabel: 'Логический',
    imageSrc: '/student-portal/knowledge-row-logic.png',
    activeSurface: 'bg-[#ecf3fc]',
    activeBorder: 'border-[#2d81e0]/45',
    activeGlow: 'shadow-[inset_0_0_0_1px_rgba(45,129,224,0.2),0_0_14px_rgba(45,129,224,0.16)]',
    indicatorClass: 'bg-[#2d81e0] shadow-[0_0_8px_rgba(45,129,224,0.9)]',
    iconClass: 'text-[#2d81e0]',
    labelClass: 'text-[#1e5a9e]',
    text: 'Понимаешь, почему элемент выполняется именно так — можешь объяснить своими словами.',
  },
  {
    key: 'kinesthesia',
    title: 'Кинестетический образ',
    shortLabel: 'Кинестетика',
    imageSrc: '/student-portal/knowledge-row-kinesthesia.png',
    activeSurface: 'bg-red-50',
    activeBorder: 'border-red-400/55',
    activeGlow: 'shadow-[inset_0_0_0_1px_rgba(248,113,113,0.22),0_0_14px_rgba(248,113,113,0.16)]',
    indicatorClass: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.95)]',
    iconClass: 'text-red-500',
    labelClass: 'text-red-900',
    text: 'Ощущение в мышцах — выполнил элемент сам, знаешь, как это чувствуется в теле.',
  },
]

/** Общая схема четырёх этапов формирования навыка. */
export const MOTOR_SKILL_STAGES_ILLUSTRATION = '/student-portal/motor-skill-stages-4-blocks.png'
