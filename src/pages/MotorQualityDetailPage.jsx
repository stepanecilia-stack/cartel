import { useCallback, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import QualitySensitiveStudentsPanel from '../components/QualitySensitiveStudentsPanel'
import SensitiveAgeScale from '../components/SensitiveAgeScale'
import { useStudentsInSensitivePeriodForQuality } from '../hooks/useStudentsInSensitivePeriodForQuality'
import { getMotorQualityBySlug, getMotorQualitiesCatalog } from '../data/motorQualitiesCatalog'
import { useMotorQualityExercisesForSlug } from '../hooks/useMotorQualityExercises'
import {
  addMotorQualityExercise,
  deleteMotorQualityExercise,
  getMotorQualityExercisesStorageMode,
  updateMotorQualityExercise,
} from '../services/motorQualityExercisesService'
import { isFirebaseConfigured } from '../services/firebaseService'
import { BackToHomeBar } from '../components/layout/BackToHomeLink.jsx'
import { formatFirestoreErrorMessage } from '../utils/firestoreErrorMessage'
import { pickDoseForAge } from '../utils/exerciseDoseByAge.js'
import { isMotorQualitySensitiveForAge } from '../utils/sensitivePeriods.js'
import {
  clearTodayMotorQualityWorkCompletion,
  recordMotorQualityWorkCompletion,
} from '../services/motorQualityWorkLogService.js'

function parseStudentQualityReturn(state) {
  const raw = state?.studentQualityReturn
  if (!raw || typeof raw !== 'object') return null
  if (raw.returnPath !== '/') return null
  const name = raw.studentName
  const studentName =
    typeof name === 'string' && name.trim() ? name.trim().slice(0, 120) : undefined
  return { to: '/', studentName }
}

const EMPTY_FORM = {
  title: '',
  intent: '',
  cues: '',
  avoid: '',
  minAge: '',
  maxAge: '',
  doseUnder12: '',
  dose13to15: '',
  dose16Plus: '',
  gifSrc: '',
  webmSrc: '',
}

function exerciseToForm(ex) {
  return {
    title: ex.title ?? '',
    intent: ex.intent ?? '',
    cues: ex.cues ?? '',
    avoid: ex.avoid ?? '',
    minAge: ex.minAge != null ? String(ex.minAge) : '',
    maxAge: ex.maxAge != null ? String(ex.maxAge) : '',
    doseUnder12: ex.doseUnder12 ?? '',
    dose13to15: ex.dose13to15 ?? '',
    dose16Plus: ex.dose16Plus ?? '',
    gifSrc: ex.media?.gifSrc ?? '',
    webmSrc: ex.media?.webmSrc ?? '',
  }
}

function ExerciseForm({ title, form, formError, saving, onFieldChange, onSubmit, onCancel }) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-900 sm:space-y-4 sm:rounded-xl sm:p-5"
    >
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Название *</span>
        <input
          type="text"
          required
          value={form.title}
          onChange={(e) => onFieldChange('title', e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Цель / смысл *</span>
        <textarea
          required
          rows={2}
          value={form.intent}
          onChange={(e) => onFieldChange('intent', e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Подсказки</span>
        <textarea
          rows={2}
          value={form.cues}
          onChange={(e) => onFieldChange('cues', e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Избегать</span>
        <textarea
          rows={2}
          value={form.avoid}
          onChange={(e) => onFieldChange('avoid', e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
        />
      </label>
      <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/50">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Объём по возрасту</p>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">До 12 лет</span>
          <input
            type="text"
            value={form.doseUnder12}
            onChange={(e) => onFieldChange('doseUnder12', e.target.value)}
            placeholder="например: 2×5, отдых 1–2 мин"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">13–15 лет</span>
          <input
            type="text"
            value={form.dose13to15}
            onChange={(e) => onFieldChange('dose13to15', e.target.value)}
            placeholder="например: 3×6–8"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">16+ лет</span>
          <input
            type="text"
            value={form.dose16Plus}
            onChange={(e) => onFieldChange('dose16Plus', e.target.value)}
            placeholder="например: 4×6"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Возраст от (лет)</span>
          <input
            type="number"
            min={0}
            max={99}
            value={form.minAge}
            onChange={(e) => onFieldChange('minAge', e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Возраст до (лет)</span>
          <input
            type="number"
            min={0}
            max={99}
            value={form.maxAge}
            onChange={(e) => onFieldChange('maxAge', e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          />
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Ссылка WebM</span>
        <input
          type="url"
          value={form.webmSrc}
          onChange={(e) => onFieldChange('webmSrc', e.target.value)}
          placeholder="https://..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Ссылка GIF</span>
        <input
          type="url"
          value={form.gifSrc}
          onChange={(e) => onFieldChange('gifSrc', e.target.value)}
          placeholder="https://..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
        />
      </label>
      {formError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {formError}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          Отмена
        </button>
      </div>
    </form>
  )
}

function MotorQualityDetailPage({ coachId, onOpenStudent }) {
  const { slug } = useParams()
  const location = useLocation()
  const item = getMotorQualityBySlug(slug ?? '')
  const exercises = useMotorQualityExercisesForSlug(item?.slug)
  const {
    students: sensitiveStudents,
    loading: sensitiveStudentsLoading,
    error: sensitiveStudentsError,
    otherStudents,
    patchStudent,
  } = useStudentsInSensitivePeriodForQuality(coachId, item?.title)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [formError, setFormError] = useState(null)
  const [saveNotice, setSaveNotice] = useState(null)
  const [selectedExerciseId, setSelectedExerciseId] = useState(null)
  const [completionBusyId, setCompletionBusyId] = useState(null)
  const [completionError, setCompletionError] = useState('')

  const catalog = getMotorQualitiesCatalog()
  const selectedExercise =
    selectedExerciseId != null
      ? exercises.find((ex) => ex.id === selectedExerciseId) ?? null
      : null

  const handleToggleCompletion = useCallback(
    async (student, checked) => {
      if (!item?.slug || !selectedExercise || !student?.id) return false
      if (!isFirebaseConfigured) {
        setCompletionError('Отметка выполнения доступна только при подключённой базе Firebase.')
        return false
      }
      setCompletionError('')
      setCompletionBusyId(student.id)
      try {
        const inSensitive = isMotorQualitySensitiveForAge(item.title, student.ageInt)
        const dose = pickDoseForAge(student.ageInt, selectedExercise)
        const nextLog = checked
          ? await recordMotorQualityWorkCompletion(student.id, {
              qualitySlug: item.slug,
              exerciseId: selectedExercise.id,
              exerciseTitle: selectedExercise.title,
              doseText: dose?.text ?? null,
              inSensitivePeriod: inSensitive,
            })
          : await clearTodayMotorQualityWorkCompletion(
              student.id,
              item.slug,
              selectedExercise.id,
            )
        patchStudent(student.id, { motorQualityWorkLog: nextLog })
        return true
      } catch (err) {
        console.error(err)
        setCompletionError(formatFirestoreErrorMessage(err))
        return false
      } finally {
        setCompletionBusyId(null)
      }
    },
    [item?.slug, item?.title, selectedExercise, patchStudent],
  )

  if (!item) {
    return <Navigate to="/qualities" replace />
  }
  const studentReturn = parseStudentQualityReturn(location.state)
  const linkState = location.state && Object.keys(location.state).length > 0 ? location.state : undefined
  const canPersist = isFirebaseConfigured || typeof localStorage !== 'undefined'
  const storageMode = getMotorQualityExercisesStorageMode()

  const closeForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormOpen(false)
    setFormError(null)
  }

  const openAddForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormOpen(true)
    setFormError(null)
    setSaveNotice(null)
  }

  const openEditForm = (ex) => {
    setForm(exerciseToForm(ex))
    setEditingId(ex.id)
    setFormOpen(true)
    setFormError(null)
    setSaveNotice(null)
  }

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFormError(null)
  }

  const handleSaveExercise = async (e) => {
    e.preventDefault()
    if (!canPersist) {
      setFormError('Сохранение недоступно: нет Firebase и localStorage.')
      return
    }
    setSaving(true)
    setFormError(null)
    setSaveNotice(null)
    try {
      if (editingId) {
        await updateMotorQualityExercise(editingId, item.slug, form)
        setSaveNotice('Изменения сохранены.')
      } else {
        await addMotorQualityExercise(item.slug, form)
        setSaveNotice('Упражнение добавлено.')
      }
      if (getMotorQualityExercisesStorageMode() === 'local') {
        setSaveNotice(
          (prev) =>
            `${prev ?? ''} Данные сохранены на этом устройстве (облако недоступно). Опубликуйте правила Firestore для общего банка.`,
        )
      }
      closeForm()
    } catch (err) {
      setFormError(formatFirestoreErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteExercise = async (exerciseId, title) => {
    if (!canPersist) return
    const ok = window.confirm(`Удалить упражнение «${title}»?`)
    if (!ok) return
    setDeletingId(exerciseId)
    try {
      await deleteMotorQualityExercise(exerciseId)
    } catch (err) {
      window.alert(formatFirestoreErrorMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="min-h-[calc(100vh-48px)] bg-[#edeef0] px-2 py-2 text-[#2c2d2e] sm:px-4 sm:py-3">
      <div className="mx-auto max-w-3xl space-y-2 sm:space-y-4 md:space-y-6">
        <BackToHomeBar />
        {studentReturn ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50/90 px-3 py-2.5 dark:border-blue-900/60 dark:bg-blue-950/40 sm:rounded-xl sm:px-4 sm:py-3">
            <Link
              to={studentReturn.to}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800 hover:text-blue-950 sm:gap-2 sm:text-sm dark:text-blue-200 dark:hover:text-blue-100"
            >
              <span className="text-base leading-none" aria-hidden>
                ←
              </span>
              <span>
                {studentReturn.studentName
                  ? `К ученику: ${studentReturn.studentName}`
                  : 'К карточке ученика'}
              </span>
            </Link>
            <p className="mt-1 text-xs text-blue-900/80 dark:text-blue-300/90">
              Вы перешли из рекомендаций тренера; выбранный ученик остаётся открытым на главной.
            </p>
          </div>
        ) : null}

        <nav className="text-xs text-slate-600 sm:text-sm dark:text-slate-400">
          <Link
            to="/qualities"
            state={linkState}
            className="font-medium text-[#2d81e0] hover:opacity-90 dark:text-blue-400"
          >
            Двигательные качества
          </Link>
          <span className="mx-2 text-slate-400">/</span>
          <span className="text-slate-900 dark:text-slate-200">{item.title}</span>
        </nav>

        <header className="space-y-2 sm:space-y-3">
          <h1 className="text-xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl">{item.title}</h1>
          {item.sensitiveAgeSet?.size > 0 ? (
            <SensitiveAgeScale sensitiveAges={item.sensitiveAgeSet} className="w-full max-w-xl" />
          ) : null}
        </header>

        {selectedExercise ? (
          <div className="sticky top-14 z-20 -mx-0.5 rounded-lg border border-emerald-300 bg-emerald-50/95 px-2.5 py-2 shadow-sm backdrop-blur-sm dark:border-emerald-800 dark:bg-emerald-950/90 sm:static sm:mx-0 sm:border-emerald-200 sm:bg-emerald-50/60 sm:px-3 sm:py-2.5 sm:shadow-none">
            <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
              Выбрано упражнение
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-emerald-950 dark:text-emerald-100">
              {selectedExercise.title}
            </p>
            <button
              type="button"
              onClick={() => setSelectedExerciseId(null)}
              className="mt-1.5 text-[11px] font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-300"
            >
              Снять выбор
            </button>
          </div>
        ) : null}

        <QualitySensitiveStudentsPanel
          qualityTitle={item.title}
          qualitySlug={item.slug}
          students={sensitiveStudents}
          loading={sensitiveStudentsLoading}
          error={sensitiveStudentsError}
          selectedExercise={selectedExercise}
          completionBusyId={completionBusyId}
          completionError={completionError}
          onOpenStudent={onOpenStudent}
          onToggleCompletion={isFirebaseConfigured ? handleToggleCompletion : undefined}
        />

        {selectedExercise && otherStudents.length > 0 ? (
          <QualitySensitiveStudentsPanel
            variant="others"
            qualityTitle={item.title}
            qualitySlug={item.slug}
            students={otherStudents}
            loading={sensitiveStudentsLoading}
            error=""
            selectedExercise={selectedExercise}
            completionBusyId={completionBusyId}
            onOpenStudent={onOpenStudent}
            onToggleCompletion={isFirebaseConfigured ? handleToggleCompletion : undefined}
          />
        ) : null}

        <section className="space-y-3 sm:space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-sm dark:text-slate-400">
                Банк упражнений
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:mt-2 sm:text-sm dark:text-slate-400">
                Нажмите карточку — в списке выше появится объём и «Отметить».
              </p>
            </div>
            {canPersist ? (
              <button
                type="button"
                onClick={() => (formOpen && !editingId ? closeForm() : openAddForm())}
                className="w-full shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-600 sm:w-auto sm:px-4 sm:text-sm"
              >
                {formOpen && !editingId ? 'Скрыть форму' : 'Добавить упражнение'}
              </button>
            ) : null}
          </div>

          {storageMode === 'local' ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
              Облако недоступно: упражнения сохраняются только в этом браузере. Опубликуйте правила Firestore
              (коллекция <span className="font-mono">motor_quality_exercises</span>) — см. файл{' '}
              <span className="font-mono">firestore.rules</span> в проекте.
            </p>
          ) : null}

          {saveNotice ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200">
              {saveNotice}
            </p>
          ) : null}

          {formOpen && canPersist ? (
            <ExerciseForm
              title={editingId ? 'Редактирование упражнения' : 'Новое упражнение'}
              form={form}
              formError={formError}
              saving={saving}
              onFieldChange={updateField}
              onSubmit={handleSaveExercise}
              onCancel={closeForm}
            />
          ) : null}

          {exercises.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
              Пока нет упражнений для этого качества. Нажмите «Добавить упражнение», чтобы создать первое.
            </p>
          ) : (
            <ul className="space-y-3 sm:space-y-4">
              {exercises.map((ex) => {
                const webm = ex.media?.webmSrc
                const gif = ex.media?.gifSrc
                const hasVideo = typeof webm === 'string' && webm.trim().length > 0
                const hasGif = typeof gif === 'string' && gif.trim().length > 0
                const ageLabel =
                  ex.minAge != null || ex.maxAge != null
                    ? [
                        ex.minAge != null ? `от ${ex.minAge}` : null,
                        ex.maxAge != null ? `до ${ex.maxAge}` : null,
                      ]
                        .filter(Boolean)
                        .join(' ')
                    : null
                const isEditingThis = editingId === ex.id
                const isSelected = selectedExerciseId === ex.id
                return (
                  <li key={ex.id}>
                    <div
                      className={`overflow-hidden rounded-lg border bg-white dark:bg-slate-900 sm:rounded-xl ${
                        isEditingThis
                          ? 'border-blue-400 ring-2 ring-blue-200 dark:border-blue-500 dark:ring-blue-900/50'
                          : isSelected
                            ? 'border-emerald-500 ring-2 ring-emerald-200 dark:border-emerald-500 dark:ring-emerald-900/50'
                            : 'border-slate-200 dark:border-slate-600'
                      }`}
                    >
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedExerciseId((prev) => (prev === ex.id ? null : ex.id))
                      }
                      className="block w-full text-left"
                    >
                    <div className="aspect-[16/10] max-h-44 w-full border-b border-slate-100 bg-slate-100 sm:aspect-video sm:max-h-none dark:border-slate-700 dark:bg-slate-800">
                      {hasVideo ? (
                        <video
                          className="h-full w-full object-cover"
                          controls
                          playsInline
                          preload="metadata"
                          src={webm.trim()}
                        >
                          Ваш браузер не поддерживает воспроизведение WebM.
                        </video>
                      ) : hasGif ? (
                        <img
                          src={gif.trim()}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-slate-500 dark:text-slate-400">
                          <span className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-medium uppercase tracking-wide dark:border-slate-500">
                            Демонстрация
                          </span>
                          <span>Добавьте ссылку WebM или GIF в режиме редактирования.</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 p-2.5 sm:space-y-2 sm:p-4 md:p-5">
                      <h3 className="text-sm font-semibold leading-snug text-slate-900 sm:text-base dark:text-slate-100">
                        {ex.title}
                      </h3>
                      {ageLabel ? (
                        <p className="text-[10px] text-slate-500 sm:text-xs dark:text-slate-400">
                          Возраст: {ageLabel} лет
                        </p>
                      ) : null}
                      <p className="line-clamp-3 text-xs leading-relaxed text-slate-600 sm:line-clamp-none sm:text-sm dark:text-slate-400">
                        {ex.intent}
                      </p>
                      {ex.doseUnder12 || ex.dose13to15 || ex.dose16Plus ? (
                        <div className="space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {ex.doseUnder12 ? <p>до 12: {ex.doseUnder12}</p> : null}
                          {ex.dose13to15 ? <p>13–15: {ex.dose13to15}</p> : null}
                          {ex.dose16Plus ? <p>16+: {ex.dose16Plus}</p> : null}
                        </div>
                      ) : null}
                      {ex.cues ? (
                        <p className="line-clamp-2 text-xs text-slate-700 sm:line-clamp-none sm:text-sm dark:text-slate-300">
                          <span className="font-medium text-slate-800 dark:text-slate-200">Подсказки: </span>
                          {ex.cues}
                        </p>
                      ) : null}
                      {ex.avoid ? (
                        <p className="line-clamp-2 text-xs text-amber-800 sm:line-clamp-none sm:text-sm dark:text-amber-200/90">
                          <span className="font-medium">Избегать: </span>
                          {ex.avoid}
                        </p>
                      ) : null}
                    </div>
                    </button>
                    {canPersist ? (
                      <div className="flex gap-4 border-t border-slate-100 px-2.5 py-2 sm:px-4 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditForm(ex)
                          }}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === ex.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteExercise(ex.id, ex.title)
                          }}
                          className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                        >
                          {deletingId === ex.id ? 'Удаление…' : 'Удалить'}
                        </button>
                      </div>
                    ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-xs font-semibold text-slate-800 sm:mb-3 sm:text-sm dark:text-slate-200">
            Другие качества
          </h2>
          <ul className="flex flex-wrap gap-2">
            {catalog
              .filter((q) => q.slug !== item.slug)
              .map((q) => (
                <li key={q.slug}>
                  <Link
                    to={{ pathname: `/qualities/${q.slug}`, state: linkState }}
                    className="inline-block rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {q.title}
                  </Link>
                </li>
              ))}
          </ul>
        </section>

      </div>
    </main>
  )
}

export default MotorQualityDetailPage
