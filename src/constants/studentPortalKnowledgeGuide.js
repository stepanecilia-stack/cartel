/** Текст инструкции «Знание» для кабинета ученика. */
export const STUDENT_KNOWLEDGE_INTRO_STORAGE_KEY = 'cartel_student_knowledge_intro_v1'

export const MOTOR_SKILL_STAGES = [
  { key: 'knowledge', label: 'Знание', active: true, locked: false },
  { key: 'skill', label: 'Умение', active: false, locked: true },
  { key: 'habit', label: 'Навык', active: false, locked: true },
  { key: 'automation', label: 'Автоматизация', active: false, locked: true },
]

export const KNOWLEDGE_THREE_IMAGES = [
  {
    key: 'logic',
    title: 'Логический образ',
    text: 'Понимаешь, почему технический элемент выполняется именно так и можешь объяснить.',
  },
  {
    key: 'vision',
    title: 'Зрительный образ',
    text: 'Видишь и представляешь правильное выполнение — ролик, демонстрация тренера.',
  },
  {
    key: 'kinesthesia',
    title: 'Кинестетика',
    text: 'Прочувствовал технический элемент своим телом — знаешь ощущения в мышцах.',
  },
]

export const STUDENT_KNOWLEDGE_INTRO_IMAGE = '/student-knowledge-three-images.png'

export function isStudentKnowledgeIntroDismissed(studentId) {
  if (!studentId) return false
  try {
    return localStorage.getItem(`${STUDENT_KNOWLEDGE_INTRO_STORAGE_KEY}_${studentId}`) === '1'
  } catch {
    return false
  }
}

export function dismissStudentKnowledgeIntro(studentId) {
  if (!studentId) return
  try {
    localStorage.setItem(`${STUDENT_KNOWLEDGE_INTRO_STORAGE_KEY}_${studentId}`, '1')
  } catch {
    /* ignore */
  }
}
