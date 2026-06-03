import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BackToHomeBar } from '../components/layout/BackToHomeLink.jsx'
import {
  STUDENT_PORTAL_CONSENT_DETAILS,
  STUDENT_PORTAL_CONSENT_LABEL,
} from '../constants/studentPortalConsent.js'
import { loginStudentPortal } from '../services/studentPortalService.js'
import FirebaseAuthSetupHint from '../components/FirebaseAuthSetupHint.jsx'
import { formatFirebaseAuthError } from '../utils/firebaseAuthMessages.js'
import { formatFirestoreErrorMessage } from '../utils/firestoreErrorMessage.js'
import { vk } from '../utils/vkUi.js'

function isFirebaseSetupError(err) {
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
  return (
    code === 'auth/admin-restricted-operation' ||
    code === 'auth/operation-not-allowed' ||
    /admin-restricted-operation/i.test(String(err?.message ?? ''))
  )
}

export default function StudentPortalLoginPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [pin, setPin] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [showFirebaseSetup, setShowFirebaseSetup] = useState(false)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!consent) {
      setError('Нужно принять согласие на обработку персональных данных.')
      return
    }
    setBusy(true)
    try {
      await loginStudentPortal({
        shortIdInput: code,
        pinInput: pin,
        consentAccepted: consent,
      })
      navigate('/learn', { replace: true })
    } catch (err) {
      console.error(err)
      const authCode = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
      setShowFirebaseSetup(isFirebaseSetupError(err))
      setError(
        authCode.startsWith('auth/')
          ? formatFirebaseAuthError(err)
          : formatFirestoreErrorMessage(err) || err?.message || 'Не удалось войти.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className={`${vk.pageWithNav} ${vk.pagePad}`}>
      <div className={`${vk.containerMid} max-w-md space-y-3`}>
        <BackToHomeBar to="/welcome" />
        <div className={vk.cardPadded}>
          <h1 className={vk.h1Lg}>Кабинет ученика</h1>
          <p className={vk.mutedXs}>
            Код и PIN выдаёт тренер. В программе вы отмечаете этапы только как «Знание» — оценку на тренировке ставит
            тренер.
          </p>

          <form className="mt-3 space-y-3" onSubmit={onSubmit}>
            <label className="block">
              <span className={vk.label}>Код (6 цифр)</span>
              <input
                className={vk.input}
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
              />
            </label>
            <label className="block">
              <span className={vk.label}>PIN (4 цифры)</span>
              <input
                className={vk.input}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
              />
            </label>

            <div className="rounded-lg border border-[#e7e8ec] bg-[#fafbfc] p-2.5">
              <label className="flex cursor-pointer gap-2 touch-manipulation">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#c5cad1]"
                />
                <span className="text-[12px] leading-snug text-[#2c2d2e]">{STUDENT_PORTAL_CONSENT_LABEL}</span>
              </label>
              <ul className={`mt-2 list-disc space-y-1 pl-4 ${vk.mutedXs}`}>
                {STUDENT_PORTAL_CONSENT_DETAILS.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>

            {error ? <p className={vk.error}>{error}</p> : null}
            {showFirebaseSetup ? <FirebaseAuthSetupHint /> : null}

            <button type="submit" disabled={busy} className={`w-full ${vk.btnPrimary}`}>
              {busy ? 'Вход…' : 'Войти в программу'}
            </button>
          </form>

          <p className={`mt-3 text-center ${vk.mutedXs}`}>
            <Link to="/login" className={vk.link}>
              Вход для тренера
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
