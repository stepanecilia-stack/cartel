import { useCallback, useEffect, useMemo, useState } from 'react'
import StudentKnowledgeImageRow from './StudentKnowledgeImageRow.jsx'
import StudentMotorStagesHighlight from './StudentMotorStagesHighlight.jsx'
import StudentPersonaChat from './StudentPersonaChat.jsx'
import StudentTechniqueVideoBlock from './StudentTechniqueVideoBlock.jsx'
import { buildAtomProgramHint } from '../../utils/portalAtomKnowledge.js'
import { resolveKnowledgeLearningSlides } from '../../utils/knowledgeLearningSlides.js'
import {
  buildTechniqueQuestionsOpener,
  getTechniqueActiveKnowledgeKeys,
  getTechniqueInstructionSteps,
  techniqueInstructionAdvanceLabel,
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
  const activeKnowledgeKeys = getTechniqueActiveKnowledgeKeys(step)

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
      <StudentKnowledgeImageRow activeKeys={activeKnowledgeKeys} />

      {showVideo && activeSlide ? (
        <StudentTechniqueVideoBlock
          slide={activeSlide}
          playing={playing}
          onPlayingChange={setPlaying}
          autoPlayWebm={false}
          showLabel={false}
          showCornerBadges={false}
        />
      ) : null}

      {step === 'motorStages' ? <StudentMotorStagesHighlight /> : null}

      {advanceLabel ? (
        <button type="button" disabled={disabled} onClick={handleAdvance} className={`w-full ${vk.btnPrimary}`}>
          {advanceLabel}
        </button>
      ) : null}

      {step === 'questions' ? (
        <>
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
          />
          <button
            type="button"
            disabled={disabled || saving}
            onClick={() => void onMarkComplete()}
            className={`w-full ${vk.btnAdvancePulse}`}
          >
            {saving ? 'Сохранение…' : 'Понял'}
          </button>
        </>
      ) : null}
    </div>
  )
}
