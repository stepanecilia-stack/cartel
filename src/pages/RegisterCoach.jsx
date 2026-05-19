import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerCoach } from '../services/firebaseService'
import { formatFirebaseAuthError } from '../utils/firebaseAuthMessages'
import { BackToHomeBar } from '../components/layout/BackToHomeLink.jsx'
import { vk } from '../utils/vkUi.js'

const initialForm = {
  firstName: '',
  lastName: '',
  city: '',
  email: '',
  password: '',
}

function RegisterCoach() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState(initialForm)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateForm = () => {
    if (!formData.firstName.trim()) return 'Введите имя'
    if (!formData.lastName.trim()) return 'Введите фамилию'
    if (!formData.city.trim()) return 'Введите город'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Введите корректную электронную почту'
    if (formData.password.length < 6) return 'Пароль должен быть не менее 6 символов'
    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      await registerCoach(formData.email, formData.password, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        city: formData.city.trim(),
      })
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
        <h1 className={vk.h1Lg}>Регистрация тренера</h1>
        <p className={`mt-1 ${vk.muted}`}>
          Заполните поля — программа создаст ваш аккаунт и сохранит имя и город в облаке.
        </p>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <label className="block">
            <span className={vk.label}>Имя</span>
            <input name="firstName" type="text" value={formData.firstName} onChange={handleChange} className={vk.input} />
          </label>
          <label className="block">
            <span className={vk.label}>Фамилия</span>
            <input name="lastName" type="text" value={formData.lastName} onChange={handleChange} className={vk.input} />
          </label>
          <label className="block">
            <span className={vk.label}>Город</span>
            <input name="city" type="text" value={formData.city} onChange={handleChange} className={vk.input} />
          </label>
          <label className="block">
            <span className={vk.label}>Электронная почта (будет логином)</span>
            <input name="email" type="email" value={formData.email} onChange={handleChange} className={vk.input} />
          </label>
          <label className="block">
            <span className={vk.label}>Пароль</span>
            <input name="password" type="password" value={formData.password} onChange={handleChange} className={vk.input} />
          </label>
          {error && <div className={vk.error}>{error}</div>}
          <button type="submit" disabled={isSubmitting} className={`w-full ${vk.btnPrimary}`}>
            {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>
        <p className={`mt-3 ${vk.muted}`}>
          Уже есть аккаунт?{' '}
          <Link to="/login" className={vk.link}>
            Войти
          </Link>
        </p>
        </div>
      </div>
    </main>
  )
}

export default RegisterCoach

