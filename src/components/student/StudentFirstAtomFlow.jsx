import { useCallback, useMemo, useRef, useState } from 'react'
import TechnicalAtomMediaCarousel from '../TechnicalAtomMediaCarousel.jsx'
import AtomBookSheet from './AtomBookSheet.jsx'
import StudentPersonaAvatar from './StudentPersonaAvatar.jsx'
import StudentPersonaChat from './StudentPersonaChat.jsx'
import { formatPortalPersonaName, getPortalPersona } from '../../constants/studentPortalPersonas.js'
import { resolveKnowledgeLearningSlides } from '../../utils/knowledgeLearningSlides.js'
import {
  buildFirstAtomWelcome,
  buildLogicSlideTrainerLine,
  buildProgramAtomHint,
  buildProgramAtomMirrorLine,
  buildProgramAtomQuizOpener,
  buildVisualSlideTrainerLine,
  getAtomQuizQuestionCount,
  getAtomTeachingCopy,
} from '../../utils/programAtomChat.js'
import { vk } from '../../utils/vkUi.js'

/** @typedef {'intro' | 'study' | 'quiz' | 'mirror'} FirstAtomPhase */

/**
 * @param {{
 *   atom: object,
 *   personaId?: unknown,
 *   personaMemory?: import('../../utils/portalPersonaMemory.js').PortalPersonaMemory | null,
 *   trainingGoals?: unknown,
 *   disabled?: boolean,
 *   saving?: boolean,
 *   onMarkComplete: () => void | Promise<void>,
 * }} props
 */
export default function StudentFirstAtomFlow({
  atom,
  personaId,
  personaMemory = null,
  trainingGoals = null,
  disabled = false,
  saving = false,
  onMarkComplete,
}) {
  const persona = getPortalPersona(personaId)
  const name = formatPortalPersonaName(persona)
  const teaching = useMemo(() => getAtomTeachingCopy(atom), [atom])
  const knowledgeSlides = useMemo(() => resolveKnowledgeLearningSlides(atom), [atom])
  const quizTotal = getAtomQuizQuestionCount(atom)

  const [phase, setPhase] = useState(/** @type {FirstAtomPhase} */ ('intro'))
  const [slideIndex, setSlideIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [quizPasses, setQuizPasses] = useState(0)
  /** @type {import('react').RefObject<import('./StudentPersonaChat.jsx').default>} */
  const chatRef = useRef(null)

  const trainerLine =
    phase === 'study'
      ? slideIndex === 0
        ? buildVisualSlideTrainerLine(persona.id, atom)
        : buildLogicSlideTrainerLine(persona.id, atom)
      : null

  const handleQuizSignals = useCallback(
    ({ stagesQuizPassCount, quizPass }) => {
      if (typeof stagesQuizPassCount === 'number') {
        setQuizPasses(Math.min(quizTotal, stagesQuizPassCount))
        if (stagesQuizPassCount >= quizTotal) setPhase('mirror')
        return
      }
      if (quizPass) {
        setQuizPasses((n) => {
          const next = Math.min(quizTotal, n + 1)
          if (next >= quizTotal) setPhase('mirror')
          return next
        })
      }
    },
    [quizTotal],
  )

  if (phase === 'intro') {
    return (
      <div className="space-y-3">
        <div className="flex gap-2.5">
          <StudentPersonaAvatar personaId={persona.id} size="md" />
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 text-[11px] font-semibold text-[#2d81e0]">{name}</p>
            <div className="rounded-2xl rounded-tl-md border border-[#e7e8ec] bg-white px-3 py-2 text-[14px] leading-snug text-[#2c2d2e]">
              {buildFirstAtomWelcome(persona.id)}
            </div>
          </div>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setPhase('study')}
          className={`w-full ${vk.btnAdvancePulse}`}
        >
          Начинаем
        </button>
      </div>
    )
  }

  if (phase === 'study') {
    return (
      <div className="space-y-3">
        <p className={`${vk.mutedXs} rounded-lg bg-[#fafbfc] px-2.5 py-1.5`}>
          Элемент #{atom.number}: два ролика — зрительный, затем зрительный + логический
        </p>

        <div className="flex gap-2.5">
          <StudentPersonaAvatar personaId={persona.id} size="md" />
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 text-[11px] font-semibold text-[#2d81e0]">{name}</p>
            <div className="rounded-2xl rounded-tl-md border border-[#e7e8ec] bg-white px-3 py-2 text-[14px] leading-snug text-[#2c2d2e]">
              {trainerLine}
            </div>
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-lg bg-[#0f0f0f]">
          <TechnicalAtomMediaCarousel
            atom={atom}
            slides={knowledgeSlides}
            className="h-[min(60dvh,520px)] w-full"
            playing={playing}
            onPlayingChange={setPlaying}
            previewable
            autoPlay
            onSlideChange={setSlideIndex}
          />
        </div>

        <AtomBookSheet
          number={atom.number}
          name={teaching.name}
          description={
            [teaching.howTo, teaching.whyHowTo].filter(Boolean).join('\n\n') || undefined
          }
        />

        <button
          type="button"
          disabled={disabled}
          onClick={() => setPhase('quiz')}
          className={`w-full ${vk.btnPrimary}`}
        >
          Понял
        </button>
      </div>
    )
  }

  if (phase === 'quiz') {
    return (
      <div className="space-y-2">
        <p className={`${vk.mutedXs} rounded-lg bg-[#fafbfc] px-2.5 py-1.5`}>
          {quizPasses >= quizTotal
            ? 'Проверка пройдена — закрепи приём перед зеркалом.'
            : `Проверка: ${quizPasses} из ${quizTotal} — ответь тренеру.`}
        </p>
        <StudentPersonaChat
          ref={chatRef}
          key={`atom-quiz-${atom.id}-${persona.id}`}
          personaId={persona.id}
          context="program_atom"
          studyAtom={atom}
          openingTrainerText={buildProgramAtomQuizOpener(persona.id, atom)}
          programHint={buildProgramAtomHint(atom)}
          trainingGoals={trainingGoals}
          personaMemory={personaMemory}
          disabled={disabled}
          onTrainerSignals={handleQuizSignals}
          advanceHint={
            quizPasses >= quizTotal
              ? null
              : `Принято ${quizPasses} из ${quizTotal}. Ответь на вопросы тренера.`
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2.5">
        <StudentPersonaAvatar personaId={persona.id} size="md" />
        <div className="min-w-0 flex-1">
          <p className="mb-0.5 text-[11px] font-semibold text-[#2d81e0]">{name}</p>
          <div className="rounded-2xl rounded-tl-md border border-[#e7e8ec] bg-white px-3 py-2 text-[14px] leading-snug text-[#2c2d2e]">
            {buildProgramAtomMirrorLine(persona.id, atom)}
          </div>
        </div>
      </div>
      <button
        type="button"
        disabled={disabled || saving}
        onClick={() => void onMarkComplete()}
        className={`w-full ${vk.btnAdvancePulse}`}
      >
        {saving ? 'Сохранение…' : 'Готово'}
      </button>
    </div>
  )
}
