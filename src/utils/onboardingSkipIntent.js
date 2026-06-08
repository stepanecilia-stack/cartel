import { MARKER_ONBOARDING_SKIP } from './personaChatMarkers.js'

/** Ученик хочет пропустить теорию / инструктаж и сразу к программе. */
export function detectOnboardingSkipIntent(text) {
  const lower = String(text ?? '').trim().toLowerCase()
  if (!lower || lower.length < 6) return false
  return (
    /не нужн|не надо|нафиг|нахер|нахуй|скучн|хочу сразу|сразу трен|сразу к|к делу|без теори|без болтов|пропуст|скип|пропуск/i.test(
      lower,
    ) ||
    /достал.*(теори|болтов|инструкт)|хватит.*(теори|разгов|болтов)|к программ|к тренир|хочу тренир|давай тренир/i.test(
      lower,
    ) ||
    /мне это все не нужно|все это не нужно|не хочу теори/i.test(lower)
  )
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 */
export function buildOnboardingSkipAllowReply(personaId) {
  if (personaId === 'vasily') {
    return `Ладно. Без лирики — иди тренируйся. Только потом не ной, что этапов не знаешь. ${MARKER_ONBOARDING_SKIP}\n\nЖми «К тренировкам» внизу.`
  }
  if (personaId === 'arkady') {
    return `Друг, вижу нетерпение. Ок — сразу к программе. Но образы мы потом всё равно закроем, без обид. ${MARKER_ONBOARDING_SKIP}\n\nЖми «К тренировкам» внизу.`
  }
  if (personaId === 'gleb') {
    return `Понял. Переходим к практике — теорию доберём по ходу. ${MARKER_ONBOARDING_SKIP}\n\nКнопка «К тренировкам» внизу.`
  }
  return `Хорошо. Переходим к программе. ${MARKER_ONBOARDING_SKIP}\n\nЖми «К тренировкам» внизу.`
}
