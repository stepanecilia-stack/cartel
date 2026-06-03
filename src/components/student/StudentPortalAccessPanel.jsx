import { useCallback, useEffect, useState } from 'react'
import {
  clearStudentPortalDeviceBinding,
  ensureStudentPortalAccess,
  resetStudentPortalPin,
  revokeStudentPortalAccess,
} from '../../services/studentPortalService.js'
import { isValidSixDigitShortId } from '../../services/firebaseService.js'
import { formatShortIdDisplay } from '../../utils/studentModel.js'
import { formatFirestoreErrorMessage } from '../../utils/firestoreErrorMessage.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{ student: object, onPortalChange?: (patch: Record<string, unknown>) => void }} props
 */
export default function StudentPortalAccessPanel({ student, onPortalChange }) {
  const [pin, setPin] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [enabled, setEnabled] = useState(false)

  const shortId = isValidSixDigitShortId(student?.short_id) ? String(student.short_id) : null

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
        'Сбросить привязку к телефону/браузеру? Ученик сможет войти с нового устройства с тем же кодом и PIN. Прогресс в программе сохранится.',
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
        <span className="font-mono text-[11px]">/student-login</span>. Ученик отмечает этапы только как «Знание».
      </p>
      {pin ? (
        <p className="rounded-lg bg-[#ecf3fc] px-2 py-1.5 text-[14px] font-semibold tabular-nums text-[#2d81e0]">
          PIN: {pin}
        </p>
      ) : null}
      {student?.portalAuthUid ? (
        <p className={vk.mutedXs}>
          Устройство привязано. Если ученик сменил телефон или очистил данные браузера — нажмите «Сбросить устройство».
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
