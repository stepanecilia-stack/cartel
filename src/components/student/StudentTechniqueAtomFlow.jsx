import { useCallback, useEffect, useMemo, useState } from 'react'
import StudentPersonaChat from './StudentPersonaChat.jsx'
import StudentTechniqueVideoBlock from './StudentTechniqueVideoBlock.jsx'
import { buildAtomProgramHint } from '../../utils/portalAtomKnowledge.js'
import { resolveKnowledgeLearningSlides } from '../../utils/knowledgeLearningSlides.js'
import {
  buildTechniqueQuestionsOpener,
  getTechniqueInstructionSteps,
  techniqueInstructionAdvanceLabel,
  techniqueInstructionStepHint,
} from '../../utils/techniqueAtomInstruction.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   atom: object,
 *   personaId?: unknown,
 *   personaMemory?: import('../../utils/portalPersonaMemory.js').PortalPersonaMemory | null,
 *   trainingGoals?: unknown,
 *   isFirstAtom?: boolean,
 *   disabled?: boolean,
 *   saving?: boolean,
 *   onMarkComplete: () => void | Promise<void>,
 * }} props
 */
export default function StudentTechniqueAtomFlow({
  atom,
  personaId,
  personaMemory = null,
  trainingGoals = null,
  isFirstAtom = false,
  disabled = false,
  saving = false,
  onMarkComplete,
}) {
  const knowledgeSlides = useMemo(() => resolveKnowledgeLearningSlides(atom), [atom])
  const instructionSteps = useMemo(() => getTechniqueInstructionSteps(isFirstAtom), [isFirstAtom])

  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const step = instructionSteps[stepIndex] ?? 'questions'
  const advanceLabel = techniqueInstructionAdvanceLabel(step)

  const showVideo = step === 'video1' || step === 'video2'
  const activeSlide = step === 'video1' ? knowledgeSlides[0] : step === 'video2' ? knowledgeSlides[1] : null

  const programHint = useMemo(() => buildAtomProgramHint(atom), [atom])

  const handleAdvance = useCallback(() => {
    if (stepIndex >= instructionSteps.length - 1) return
    setStepIndex((i) => i + 1)
    setPlaying(false)
  }, [stepIndex, instructionSteps.length])

  useEffect(() => {
    if (showVideo && activeSlide) {
      setPlaying(activeSlide.media?.kind === 'webm')
    } else {
      setPlaying(false)
    }
  }, [showVideo, activeSlide?.key, activeSlide?.media?.kind])

  return (
    <div className="space-y-3">
      {step !== 'questions' ? (
        <p className={`${vk.mutedXs} rounded-lg bg-[#fafbfc] px-2.5 py-1.5`}>
          {techniqueInstructionStepHint(step, isFirstAtom)}
        </p>
      ) : null}

      {showVideo && activeSlide ? (
        <StudentTechniqueVideoBlock
          slide={activeSlide}
          playing={playing}
          onPlayingChange={setPlaying}
          autoPlayWebm={false}
          showLabel={false}
        />
      ) : null}

      {advanceLabel ? (
        <button type="button" disabled={disabled} onClick={handleAdvance} className={`w-full ${vk.btnPrimary}`}>
          {advanceLabel}
        </button>
      ) : null}

      {step === 'questions' ? (
        <div className="flex min-h-[min(560px,72dvh)] flex-col gap-3">
          <StudentPersonaChat
            key={`technique-qa-${atom.id}-${personaId}`}
            personaId={personaId}
            context="program"
            openingTrainerText={buildTechniqueQuestionsOpener(personaId, atom)}
            programHint={programHint}
            studyAtom={atom}
            trainingGoals={trainingGoals}
            personaMemory={personaMemory}
            disabled={disabled}
            minUserMessages={0}
            expanded
          />
          <button
            type="button"
            disabled={disabled || saving}
            onClick={() => void onMarkComplete()}
            className={`w-full shrink-0 ${vk.btnAdvancePulse}`}
          >
            {saving ? 'Сохранение…' : 'Понял'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
