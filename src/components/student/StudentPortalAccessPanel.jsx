import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  clearStudentPortalDeviceBinding,
  ensureStudentPortalAccess,
  resetStudentPortalPin,
  revokeStudentPortalAccess,
} from '../../services/studentPortalService.js'
import { isValidSixDigitShortId } from '../../services/firebaseService.js'
import { useTechnicalProgramAtoms } from '../../hooks/useTechnicalProgramAtoms.js'
import { formatShortIdDisplay } from '../../utils/studentModel.js'
import { formatFirestoreErrorMessage } from '../../utils/firestoreErrorMessage.js'
import { mapCombinationsToDisplayAtoms } from '../../utils/techniqueCatalog.js'
import { summarizeStudentPortalProgress } from '../../utils/studentPortalProgress.js'
import { normalizePortalKnowledgeData } from '../../utils/portalKnowledgeData.js'
import { isPortalOnboardingComplete, trainingGoalsLabels } from '../../constants/studentPortalOnboarding.js'
import { portalPersonaDisplayName } from '../../constants/studentPortalPersonas.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{ student: object, onPortalChange?: (patch: Record<string, unknown>) => void }} props
 */
export default function StudentPortalAccessPanel({ student, onPortalChange }) {
  const [pin, setPin] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [enabled, setEnabled] = useState(false)
  const { orderedLevel1, orderedLevel2, orderedLevel3 } = useTechnicalProgramAtoms()

  const shortId = isValidSixDigitShortId(student?.short_id) ? String(student.short_id) : null

  const orderedL3 = useMemo(
    () => mapCombinationsToDisplayAtoms(student?.technicalCombinations, orderedLevel3, orderedLevel1),
    [student?.technicalCombinations, orderedLevel3, orderedLevel1],
  )

  const portalSummary = useMemo(() => {
    const pk = normalizePortalKnowledgeData(student?.portalKnowledgeData)
    return summarizeStudentPortalProgress(orderedLevel1, orderedLevel2, orderedL3, pk)
  }, [student?.portalKnowledgeData, orderedLevel1, orderedLevel2, orderedL3])

  const goalLabels = trainingGoalsLabels(student?.portalTrainingGoals ?? student?.portalTrainingGoal)
  const personaLabel = portalPersonaDisplayName(student?.portalPersonaId)
  const onboardingDone = isPortalOnboardingComplete(student)

  const runEnable = useCallback(async () => {
    if (!student?.id || !shortId) {
      setError('Сначала сохраните 6-значный код ученика в карточке.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await ensureStudentPortalAccess(student.id, shortId)
      setPin(res.pin)
      setEnabled(true)
      onPortalChange?.({ portalEnabled: true })
    } catch (e) {
      setError(formatFirestoreErrorMessage(e) || e?.message)
    } finally {
      setBusy(false)
    }
  }, [student?.id, shortId, onPortalChange])

  useEffect(() => {
    setPin(null)
    setError('')
  }, [student?.id])

  const onResetPin = async () => {
    if (!student?.id || !shortId) return
    if (!window.confirm('Выдать новый PIN? Старый перестанет работать.')) return
    setBusy(true)
    setError('')
    try {
      const res = await resetStudentPortalPin(student.id, shortId)
      setPin(res.pin)
      setEnabled(true)
      onPortalChange?.({ portalEnabled: true })
    } catch (e) {
      setError(formatFirestoreErrorMessage(e) || e?.message)
    } finally {
      setBusy(false)
    }
  }

  const onUnbindDevice = async () => {
    if (!student?.id || !shortId) return
    if (
      !window.confirm(
        'Сбросить привязку к телефону/браузеру? Ученик сможет войти с нового устройства с тем же кодом и PIN. Прогресс самостоятельного обучения сохранится.',
      )
    ) {
      return
    }
    setBusy(true)
    setError('')
    try {
      await clearStudentPortalDeviceBinding(student.id)
      onPortalChange?.({ portalAuthUid: undefined, portalEnabled: true })
    } catch (e) {
      setError(formatFirestoreErrorMessage(e) || e?.message)
    } finally {
      setBusy(false)
    }
  }

  const onRevoke = async () => {
    if (!student?.id || !shortId) return
    if (!window.confirm('Отключить кабинет ученика?')) return
    setBusy(true)
    setError('')
    try {
      await revokeStudentPortalAccess(student.id, shortId)
      setPin(null)
      setEnabled(false)
      onPortalChange?.({ portalAuthUid: undefined, portalEnabled: false })
    } catch (e) {
      setError(formatFirestoreErrorMessage(e) || e?.message)
    } finally {
      setBusy(false)
    }
  }

  if (!shortId) {
    return (
      <div className={`${vk.noticeWarn} mt-2`}>
        Кабинет ученика: дождитесь появления 6-значного кода в шапке карточки.
      </div>
    )
  }

  return (
    <div className={`${vk.cardPadded} mt-2 space-y-2`}>
      <h3 className={vk.h2}>Кабинет ученика (PIN)</h3>
      <p className={vk.mutedXs}>
        Код: <span className="font-semibold tabular-nums">{formatShortIdDisplay(shortId)}</span> · вход на{' '}
        <span className="font-mono text-[11px]">/student-login</span>. В кабинете ученик проходит
        самостоятельное обучение «Знание» — отдельно от ваших отметок в зале.
      </p>

      <div className="rounded-lg border border-[#e7e8ec] bg-[#fafbfc] px-2.5 py-2">
        <p className="text-[12px] font-semibold text-[#2c2d2e]">Самостоятельное обучение</p>
        {!portalSummary.started ? (
          <p className={`mt-1 ${vk.mutedXs}`}>Ученик ещё не начинал проходить программу в кабинете.</p>
        ) : (
          <>
            <ul className="mt-1.5 space-y-1">
              {portalSummary.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="text-[#2c2d2e]">{item.label}</span>
                  <span className="shrink-0 tabular-nums font-medium text-[#818c99]">
                    {item.done}/{item.total}
                    {item.complete ? ' ✓' : ''}
                  </span>
                </li>
              ))}
            </ul>
            {portalSummary.focusAtom ? (
              <p className={`mt-1.5 ${vk.mutedXs}`}>
                Сейчас в кабинете:{' '}
                <span className="font-medium text-[#2c2d2e]">
                  #{portalSummary.focusAtom.number} {portalSummary.focusAtom.name}
                </span>
              </p>
            ) : null}
          </>
        )}
        {onboardingDone ? (
          <p className={`mt-1.5 ${vk.mutedXs}`}>
            Онбординг пройден · виртуальный наставник:{' '}
            <span className="font-medium text-[#2c2d2e]">{personaLabel}</span>
            {goalLabels.length > 0 ? (
              <>
                {' '}
                · цели: <span className="font-medium text-[#2c2d2e]">{goalLabels.join(', ')}</span>
              </>
            ) : null}
          </p>
        ) : (
          <p className={`mt-1.5 ${vk.mutedXs}`}>Онбординг в кабинете ещё не пройден.</p>
        )}
      </div>

      {pin ? (
        <p className="rounded-lg bg-[#ecf3fc] px-2 py-1.5 text-[14px] font-semibold tabular-nums text-[#2d81e0]">
          PIN: {pin}
        </p>
      ) : null}
      {student?.portalAuthUid ? (
        <p className={vk.mutedXs}>
          Кабинет активен. «Сбросить устройство» — только если ученик не может войти с нового телефона (код и PIN те же).
        </p>
      ) : null}
      {error ? <p className={vk.error}>{error}</p> : null}
      <div className="flex flex-wrap gap-1.5">
        <button type="button" disabled={busy} onClick={() => void runEnable()} className={vk.btnPrimary}>
          {busy ? '…' : pin ? 'Обновить доступ' : 'Включить кабинет'}
        </button>
        {pin || enabled || student?.portalEnabled ? (
          <>
            {(student?.portalAuthUid || student?.portalEnabled) && (
              <button type="button" disabled={busy} onClick={() => void onUnbindDevice()} className={vk.btnSecondary}>
                Сбросить устройство
              </button>
            )}
            <button type="button" disabled={busy} onClick={() => void onResetPin()} className={vk.btnSecondary}>
              Новый PIN
            </button>
            <button type="button" disabled={busy} onClick={() => void onRevoke()} className={vk.btnGhost}>
              Отключить
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
