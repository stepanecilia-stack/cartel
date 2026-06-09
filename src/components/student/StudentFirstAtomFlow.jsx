import { useCallback, useMemo, useRef, useState } from 'react'
import StudentPersonaAvatar from './StudentPersonaAvatar.jsx'
import StudentPersonaChat from './StudentPersonaChat.jsx'
import StudentTechniqueVideoBlock from './StudentTechniqueVideoBlock.jsx'
import { StudentTechniqueKnowledgeVisual } from './StudentTechniqueKnowledgeVisual.jsx'
import { formatPortalPersonaName, getPortalPersona } from '../../constants/studentPortalPersonas.js'
import { resolveKnowledgeLearningSlides } from '../../utils/knowledgeLearningSlides.js'
import { getTechniqueKnowledgeVisual } from '../../utils/techniqueAtomInstruction.js'
import {
  buildFirstAtomWelcome,
  buildLogicSlideTrainerLine,
  buildProgramAtomHint,
  buildProgramAtomMirrorLine,
  buildProgramAtomQuizOpener,
  buildVisualSlideTrainerLine,
  getAtomQuizQuestionCount,
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
    const slide = knowledgeSlides[slideIndex]
    const isLastVideo = slideIndex >= knowledgeSlides.length - 1
    const knowledgeVisual = getTechniqueKnowledgeVisual(slideIndex === 0 ? 'video1' : 'video2', true)

    return (
      <div className="space-y-3">
        <p className={`${vk.mutedXs} rounded-lg bg-[#fafbfc] px-2.5 py-1.5`}>
          {slideIndex === 0
            ? 'Шаг 1 из 2: первый ролик — зрительный образ.'
            : 'Шаг 2 из 2: второй ролик — зрительный + логический (со звуком).'}
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

        {knowledgeVisual ? (
          <StudentTechniqueKnowledgeVisual
            imageKeys={knowledgeVisual.keys}
            caption={knowledgeVisual.caption}
          />
        ) : null}

        <StudentTechniqueVideoBlock
          slide={slide}
          playing={playing}
          onPlayingChange={setPlaying}
          className="h-[min(60dvh,520px)] w-full"
          autoPlayWebm={false}
        />

        {isLastVideo ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setPhase('quiz')}
            className={`w-full ${vk.btnPrimary}`}
          >
            Понял
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setSlideIndex(1)
              setPlaying(false)
            }}
            className={`w-full ${vk.btnPrimary}`}
          >
            Дальше — второй ролик
          </button>
        )}
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
