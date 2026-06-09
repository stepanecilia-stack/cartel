import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadNormsOnce } from '../../data/normsCache.js'
import { saveStudentPortalNormSelfReport } from '../../services/studentPortalService.js'
import { getNormsForAthlete } from '../../utils/ksrUtils.js'
import { migrateStudentTests } from '../../utils/normsCategory.js'
import {
  buildPortalNormsOpener,
  buildPortalNormsProgramHint,
  buildPortalNormsSnapshot,
} from '../../utils/portalNormsChat.js'
import { studentAthleteShape } from '../../utils/studentModel.js'
import { vk } from '../../utils/vkUi.js'
import StudentPortalNormsGoldList from './StudentPortalNormsGoldList.jsx'
import StudentNormsPageShell from './StudentNormsPageShell.jsx'
import StudentPersonaChat from './StudentPersonaChat.jsx'

const sectionCard = 'rounded-[10px] border border-[#e7e8ec] bg-white shadow-sm'

/**
 * @param {{
 *   student: object,
 *   personaId: import('../../constants/studentPortalPersonas.js').PortalPersonaId | unknown,
 *   personaMemory?: import('../../utils/portalPersonaMemory.js').PortalPersonaMemory | null,
 *   trainingGoals?: unknown,
 *   onNormSelfReportsChange?: (saved: {
 *     portalNormSelfReports: import('../../utils/portalNormSelfReports.js').PortalNormSelfReport[],
 *     tests?: { physical: Record<string, unknown>, functional: Record<string, unknown> },
 *   }) => void,
 *   onBack: () => void,
 * }} props
 */
export default function StudentPortalNormsPanel({
  student,
  personaId,
  personaMemory = null,
  trainingGoals = null,
  onNormSelfReportsChange = null,
  onBack,
}) {
  const chatRef = useRef(/** @type {import('./StudentPersonaChat.jsx').default | null} */ (null))
  const [activeNormTestId, setActiveNormTestId] = useState(/** @type {string | null} */ (null))
  const [allNorms, setAllNorms] = useState(/** @type {object[]} */ ([]))
  const [loadingNorms, setLoadingNorms] = useState(true)
  const [normsError, setNormsError] = useState('')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const norms = await loadNormsOnce()
        if (cancelled) return
        setAllNorms(Array.isArray(norms) ? norms : [])
        setNormsError('')
      } catch (e) {
        console.error(e)
        if (!cancelled) {
          setNormsError('Таблица нормативов не загрузилась. Проверьте интернет.')
        }
      } finally {
        if (!cancelled) setLoadingNorms(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const athlete = useMemo(() => studentAthleteShape(student), [student])
  const tests = useMemo(() => migrateStudentTests(student?.tests), [student?.tests])
  const norms = useMemo(
    () => getNormsForAthlete(allNorms, athlete, 'physical'),
    [allNorms, athlete],
  )
  const normsSnapshot = useMemo(
    () => buildPortalNormsSnapshot(norms, tests.physical, student?.portalNormSelfReports),
    [norms, tests.physical, student?.portalNormSelfReports],
  )
  const normsProgramHint = useMemo(() => buildPortalNormsProgramHint(normsSnapshot), [normsSnapshot])
  const normsOpener = useMemo(
    () => buildPortalNormsOpener(personaId, normsSnapshot),
    [personaId, normsSnapshot],
  )

  const [saveNotice, setSaveNotice] = useState('')

  const handleNormSelfReport = useCallback(
    async (payload) => {
      if (!student?.id) throw new Error('Сессия ученика не найдена.')
      setSaveNotice('')
      const saved = await saveStudentPortalNormSelfReport(student.id, payload, {
        existingReports: student.portalNormSelfReports,
        student,
        norms,
      })
      onNormSelfReportsChange?.(saved)
      setSaveNotice('Результат сохранён в карточку.')
      return saved
    },
    [student, norms, onNormSelfReportsChange],
  )

  const handleSelectNorm = useCallback((item) => {
    chatRef.current?.beginNormSubmit?.(item)
  }, [])

  return (
    <StudentNormsPageShell>
      <main className={`px-2 py-3 sm:px-4 ${vk.pageWithNav}`}>
        <div className="mx-auto w-full max-w-2xl space-y-3">
          <header className={`flex flex-wrap items-center gap-2 ${sectionCard} p-2.5 sm:p-3`}>
            <div className="min-w-0 flex-1">
              <h1 className={vk.h1Lg}>Нормативы</h1>
              <p className={vk.mutedXs}>Зона контроля · секундомер и блокнот</p>
            </div>
            <button type="button" onClick={onBack} className={vk.btnSecondary}>
              В зал
            </button>
          </header>

          <section className={`${sectionCard} space-y-3 p-3 sm:p-4`}>
            {normsError ? (
              <p className={`${vk.mutedXs} rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-amber-900`}>
                {normsError}
              </p>
            ) : null}
            {saveNotice ? (
              <p className={`${vk.mutedXs} rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-emerald-900`}>
                {saveNotice}
              </p>
            ) : null}

            {loadingNorms ? (
              <p className={vk.muted}>Загрузка нормативов…</p>
            ) : norms.length === 0 ? (
              <p className={vk.mutedXs}>
                Нет нормативов для вашего возраста и пола. Попросите тренера проверить год рождения и пол в карточке.
              </p>
            ) : (
              <>
                <StudentPortalNormsGoldList
                  snapshot={normsSnapshot}
                  activeTestId={activeNormTestId}
                  onSelectNorm={handleSelectNorm}
                />

                <div className="flex min-h-[min(420px,52dvh)] flex-col border-t border-[#e7e8ec] pt-3">
                  <StudentPersonaChat
                    ref={chatRef}
                    key={`norms-chat-${personaId}-${normsSnapshot.passed}-${normsSnapshot.empty}-${normsSnapshot.red}`}
                    personaId={personaId}
                    context="norms"
                    openingTrainerText={normsOpener}
                    programHint={normsProgramHint}
                    personaMemory={personaMemory}
                    trainingGoals={trainingGoals}
                    normsSnapshot={normsSnapshot}
                    onNormSelfReport={handleNormSelfReport}
                    onNormSubmitFlowChange={setActiveNormTestId}
                    minUserMessages={0}
                    showTrainerIdentity
                    onGymScene
                    expanded
                    advanceHint="Нажми норматив в списке — тренер проведёт сдачу по шагам."
                  />
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </StudentNormsPageShell>
  )
}
