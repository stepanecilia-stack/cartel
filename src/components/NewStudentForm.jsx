import { useState } from 'react'
import { addStudent } from '../services/firebaseService'
import { calculateEffectiveKSR, calculateKsrAndKsp, getWeights } from '../utils/ksrUtils'
import { formatBirthYearRu, normalizeBirthYearNumber } from '../utils/studentModel'

const initialForm = {
  fullName: '',
  birthYear: '',
  gender: 'M',
  height: '',
  reach: '',
  weight: '',
}

function NewStudentForm({ onSuccess, onCancel, compact = false }) {
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState(initialForm)

  const onChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validate = () => {
    if (!formData.fullName.trim()) return 'Введите ФИО'
    const by = normalizeBirthYearNumber(formData.birthYear)
    if (!by) return 'Укажите год рождения (четыре цифры)'
    const yNow = new Date().getFullYear()
    if (by < 1990 || by > yNow) return 'Укажите реалистичный год рождения'
    if (!formData.height || Number(formData.height) < 100) return 'Укажите корректный рост'
    if (!formData.reach || Number(formData.reach) < 100) return 'Укажите корректный размах рук'
    if (!formData.weight || Number(formData.weight) < 20) return 'Укажите корректный вес'
    return ''
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setIsSaving(true)
    try {
      const height = Number(formData.height)
      const reach = Number(formData.reach)
      const weight = Number(formData.weight)
      const birthYear = normalizeBirthYearNumber(formData.birthYear)
      const athlete = {
        height,
        reach,
        weight,
        birthYear,
        gender: formData.gender,
      }
      const weights = getWeights(athlete)
      const { baseKSR, ksp, kspZ, kspH, kspIdealHeight } = calculateKsrAndKsp(athlete, {
        техника: 0,
        физика: 0,
        функционал: 0,
      })
      const kd = 0.25
      const effectiveKSR = calculateEffectiveKSR(baseKSR, kd)

      await addStudent({
        name: formData.fullName.trim(),
        fullName: formData.fullName.trim(),
        gender: formData.gender,
        birthYear,
        birthYearLabel: formatBirthYearRu(birthYear),
        height,
        reach,
        weight,
        archetype: weights.archetype,
        archetypeSmart: weights.archetypeSmart,
        archetypeFull: weights.archetypeFull ?? null,
        apeIndex: weights.apeIndex,
        baseKSR,
        ksp,
        kspZ,
        kspH,
        kspIdealHeight: kspIdealHeight ?? null,
        kd,
        kdAtomCount: 0,
        kdAutomationPercent: 25,
        effectiveKSR,
        scores: { техника: 0, физика: 0, функционал: 0 },
      })
      setFormData(initialForm)
      onSuccess?.()
    } catch (submitError) {
      console.error(submitError)
      setError('Не удалось сохранить ученика. Проверьте авторизацию тренера.')
    } finally {
      setIsSaving(false)
    }
  }

  const gridClass = compact ? 'mt-4 grid max-h-[min(60vh,520px)] gap-3 overflow-y-auto pr-1 sm:grid-cols-2' : 'mt-6 grid gap-4 md:grid-cols-2'

  return (
    <form className={gridClass} onSubmit={onSubmit}>
      <label className={compact ? 'sm:col-span-2' : 'md:col-span-2'}>
        <span className="mb-1 block text-sm font-medium text-slate-700">ФИО</span>
        <input
          name="fullName"
          type="text"
          value={formData.fullName}
          onChange={onChange}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
        />
      </label>

      <label className={compact ? 'sm:col-span-2' : 'md:col-span-2'}>
        <span className="mb-1 block text-sm font-medium text-slate-700">Год рождения</span>
        <div className="flex flex-wrap items-center gap-3">
          <input
            name="birthYear"
            type="number"
            min={1990}
            max={new Date().getFullYear()}
            placeholder="2012"
            value={formData.birthYear}
            onChange={onChange}
            className="w-full max-w-[200px] rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
          />
          <span className="text-sm text-slate-600">{formatBirthYearRu(formData.birthYear) || '—'}</span>
        </div>
      </label>

      <label>
        <span className="mb-1 block text-sm font-medium text-slate-700">Пол (чтобы подобрать нормы тестов)</span>
        <select
          name="gender"
          value={formData.gender}
          onChange={onChange}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="M">Мужской</option>
          <option value="F">Женский</option>
        </select>
      </label>

      <label>
        <span className="mb-1 block text-sm font-medium text-slate-700">Рост (см)</span>
        <input
          name="height"
          type="number"
          value={formData.height}
          onChange={onChange}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
        />
      </label>

      <label>
        <span className="mb-1 block text-sm font-medium text-slate-700">Размах рук (см)</span>
        <input
          name="reach"
          type="number"
          value={formData.reach}
          onChange={onChange}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
        />
      </label>

      <label>
        <span className="mb-1 block text-sm font-medium text-slate-700">Вес (кг)</span>
        <input
          name="weight"
          type="number"
          value={formData.weight}
          onChange={onChange}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
        />
      </label>

      {error && (
        <div
          className={`rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 ${compact ? 'sm:col-span-2' : 'md:col-span-2'}`}
        >
          {error}
        </div>
      )}

      <div className={`flex justify-end gap-3 ${compact ? 'sm:col-span-2' : 'md:col-span-2'}`}>
        <button
          type="button"
          onClick={() => onCancel?.()}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {isSaving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </form>
  )
}

export default NewStudentForm
