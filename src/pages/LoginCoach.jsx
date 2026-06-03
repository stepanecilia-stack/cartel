import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginCoach } from '../services/firebaseService'
import { formatFirebaseAuthError } from '../utils/firebaseAuthMessages'
import { BackToHomeBar } from '../components/layout/BackToHomeLink.jsx'
import { vk } from '../utils/vkUi.js'

function LoginCoach() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Введите почту и пароль')
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      await loginCoach(email.trim(), password)
      navigate('/')
    } catch (submitError) {
      console.error(submitError)
      setError(formatFirebaseAuthError(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className={`${vk.pageWithNav} px-4 py-6`}>
      <div className="mx-auto w-full max-w-md space-y-3">
        <BackToHomeBar to="/welcome" />
        <div className={vk.cardPadded}>
        <h1 className={vk.h1Lg}>Вход для тренера</h1>
        <p className={`mt-1 ${vk.muted}`}>Войдите в аккаунт, чтобы открыть главную.</p>
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <label className="block">
            <span className={vk.label}>Электронная почта (логин)</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={vk.input}
            />
          </label>
          <label className="block">
            <span className={vk.label}>Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={vk.input}
            />
          </label>
          {error && <div className={vk.error}>{error}</div>}
          <button type="submit" disabled={isSubmitting} className={`w-full ${vk.btnPrimary}`}>
            {isSubmitting ? 'Входим...' : 'Войти'}
          </button>
        </form>
        <p className={`mt-3 ${vk.muted}`}>
          <Link to="/student-login" className={vk.link}>
            Кабинет ученика
          </Link>
          {' · '}
          Нет аккаунта?{' '}
          <Link to="/register" className={vk.link}>
            Зарегистрироваться
          </Link>
        </p>
        </div>
      </div>
    </main>
  )
}

export default LoginCoach

