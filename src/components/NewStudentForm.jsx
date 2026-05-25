import { useMemo, useState } from 'react'
import { addStudent } from '../services/firebaseService'
import { calculateEffectiveKSR, calculateKsrAndKsp, getWeights } from '../utils/ksrUtils'
import {
  duplicateStudentSummary,
  findLikelyDuplicateStudents,
} from '../utils/studentDuplicateMatch.js'
import { formatBirthYearRu, normalizeBirthYearNumber } from '../utils/studentModel'
import { vk } from '../utils/vkUi.js'

const initialForm = {
  fullName: '',
  birthYear: '',
  gender: 'M',
  height: '',
  reach: '',
  weight: '',
}

function NewStudentForm({
  onSuccess,
  onCancel,
  compact = false,
  existingStudents = [],
  onOpenExisting,
}) {
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState(initialForm)
  const [forceCreateDespiteDuplicates, setForceCreateDespiteDuplicates] = useState(false)

  const likelyDuplicates = useMemo(
    () =>
      findLikelyDuplicateStudents(existingStudents, {
        fullName: formData.fullName,
        birthYear: formData.birthYear,
      }),
    [existingStudents, formData.fullName, formData.birthYear],
  )

  const showDuplicateWarning = likelyDuplicates.length > 0 && !forceCreateDespiteDuplicates

  const onChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setForceCreateDespiteDuplicates(false)
  }

  const validate = () => {
    if (!formData.fullName.trim()) return 'Введите ФИО'
    const by = normalizeBirthYearNumber(formData.birthYear)
    if (!by) return 'Укажите год рождения (четыре цифры)'
    const yNow = new Date().getFullYear()
    if (by < 1900 || by > yNow) return 'Укажите реалистичный год рождения'
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

    const duplicates = findLikelyDuplicateStudents(existingStudents, {
      fullName: formData.fullName,
      birthYear: formData.birthYear,
    })
    if (duplicates.length > 0 && !forceCreateDespiteDuplicates) {
      setError('')
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
      setForceCreateDespiteDuplicates(false)
      onSuccess?.()
    } catch (submitError) {
      console.error(submitError)
      setError('Не удалось сохранить ученика. Проверьте авторизацию тренера.')
    } finally {
      setIsSaving(false)
    }
  }

  const span2 = compact ? 'sm:col-span-2' : 'md:col-span-2'
  const gridClass = compact
    ? 'mt-3 grid max-h-[min(60vh,520px)] gap-2.5 overflow-y-auto pr-0.5 sm:grid-cols-2'
    : 'mt-4 grid gap-2.5 md:grid-cols-2'

  return (
    <form className={gridClass} onSubmit={onSubmit}>
      <label className={span2}>
        <span className={vk.label}>ФИО</span>
        <input name="fullName" type="text" value={formData.fullName} onChange={onChange} className={vk.input} />
      </label>

      <label className={span2}>
        <span className={vk.label}>Год рождения</span>
        <div className="flex flex-wrap items-center gap-2">
          <input
            name="birthYear"
            type="number"
            min={1900}
            max={new Date().getFullYear()}
            placeholder="2012"
            value={formData.birthYear}
            onChange={onChange}
            className={`${vk.input} max-w-[140px]`}
          />
          <span className={vk.muted}>{formatBirthYearRu(formData.birthYear) || '—'}</span>
        </div>
      </label>

      <label>
        <span className={vk.label}>Пол (для норм тестов)</span>
        <select name="gender" value={formData.gender} onChange={onChange} className={vk.select}>
          <option value="M">Мужской</option>
          <option value="F">Женский</option>
        </select>
      </label>

      <label>
        <span className={vk.label}>Рост (см)</span>
        <input name="height" type="number" value={formData.height} onChange={onChange} className={vk.input} />
      </label>

      <label>
        <span className={vk.label}>Размах рук (см)</span>
        <input name="reach" type="number" value={formData.reach} onChange={onChange} className={vk.input} />
      </label>

      <label>
        <span className={vk.label}>Вес (кг)</span>
        <input name="weight" type="number" value={formData.weight} onChange={onChange} className={vk.input} />
      </label>

      {showDuplicateWarning ? (
        <div
          className={`rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-950 ${span2}`}
          role="status"
        >
          <p className="font-semibold">Похоже, этот ученик уже есть в вашем списке</p>
          <p className="mt-1 text-amber-900/90">
            Одна школа и разное время тренировок — не повод заводить вторую карточку: вся история КСР, тестов и сезона
            хранится в одной записи.
          </p>
          <ul className="mt-2 space-y-1.5">
            {likelyDuplicates.map((student) => {
              const { name, birth, code } = duplicateStudentSummary(student)
              return (
                <li
                  key={student.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] bg-white/80 px-2 py-1.5"
                >
                  <span>
                    {name}
                    {birth ? ` · ${birth}` : ''}
                    {code ? ` · код ${code}` : ''}
                  </span>
                  {typeof onOpenExisting === 'function' ? (
                    <button
                      type="button"
                      className={vk.btnSecondary}
                      onClick={() => onOpenExisting(student)}
                    >
                      Открыть
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              className={vk.btnSecondary}
              onClick={() => setForceCreateDespiteDuplicates(true)}
            >
              Всё равно создать нового
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className={`${vk.error} ${span2}`} role="alert">
          {error}
        </div>
      ) : null}

      <div className={`flex justify-end gap-2 ${span2}`}>
        <button type="button" onClick={() => onCancel?.()} className={vk.btnSecondary}>
          Отмена
        </button>
        <button type="submit" disabled={isSaving || showDuplicateWarning} className={vk.btnPrimary}>
          {isSaving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </form>
  )
}

export default NewStudentForm
