import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginCoach } from '../services/firebaseService'

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
      setError('Не удалось войти. Проверьте почту, пароль и раскладку клавиатуры.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-slate-50 px-6 py-10 text-slate-900">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Вход для тренера</h1>
        <p className="mt-2 text-sm text-slate-600">Войдите в аккаунт, чтобы открыть дашборд.</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Электронная почта (логин)</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isSubmitting ? 'Входим...' : 'Войти'}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          Нет аккаунта?{' '}
          <Link to="/register" className="font-medium text-blue-600 hover:text-blue-700">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </main>
  )
}

export default LoginCoach

