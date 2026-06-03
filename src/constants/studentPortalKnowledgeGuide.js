/** Текст инструкции «Знание» для кабинета ученика. */
export const STUDENT_KNOWLEDGE_INTRO_STORAGE_KEY = 'cartel_student_knowledge_intro_v1'

export const MOTOR_SKILL_STAGES = [
  { key: 'knowledge', label: 'Знание', active: true },
  { key: 'skill', label: 'Умение', active: false },
  { key: 'habit', label: 'Навык', active: false },
  { key: 'automation', label: 'Автоматизация', active: false },
]

export const KNOWLEDGE_THREE_IMAGES = [
  {
    key: 'logic',
    title: 'Логика',
    text: 'Понимаешь, почему приём делается именно так и можешь объяснить.',
  },
  {
    key: 'vision',
    title: 'Зрение',
    text: 'Видишь в голове правильное выполнение — ролик, демонстрация тренера.',
  },
  {
    key: 'kinesthesia',
    title: 'Кинестетика',
    text: 'Прочувствовал движение своим телом — знаешь ощущения в мышцах.',
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
