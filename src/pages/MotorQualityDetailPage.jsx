import { useCallback, useEffect, useState } from 'react'
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
import TechnicalAtomMedia from '../components/TechnicalAtomMedia.jsx'
import ExerciseContraindicationMark, {
  hasExerciseContraindications,
} from '../components/ExerciseContraindicationMark.jsx'
import { formatFirestoreErrorMessage } from '../utils/firestoreErrorMessage'
import { pickDoseForAge } from '../utils/exerciseDoseByAge.js'
import { isMotorQualitySensitiveForAge } from '../utils/sensitivePeriods.js'
import {
  clearTodayMotorQualityWorkCompletion,
  recordMotorQualityWorkCompletion,
} from '../services/motorQualityWorkLogService.js'
import { vk } from '../utils/vkUi.js'

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
  contraindications: '',
  minAge: '',
  maxAge: '',
  doseUnder12: '',
  dose13to15: '',
  dose16Plus: '',
  gifSrc: '',
  webmSrc: '',
}

const textareaClass = `${vk.input} min-h-[4.5rem] resize-y py-2`

function exerciseToForm(ex) {
  return {
    title: ex.title ?? '',
    intent: ex.intent ?? '',
    cues: ex.cues ?? '',
    avoid: ex.avoid ?? '',
    contraindications: ex.contraindications ?? '',
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
    <form onSubmit={onSubmit} className={`${vk.cardPadded} space-y-2`}>
      <h3 className={vk.h2}>{title}</h3>
      <label className="block">
        <span className={vk.label}>Название *</span>
        <input
          type="text"
          required
          value={form.title}
          onChange={(e) => onFieldChange('title', e.target.value)}
          className={vk.input}
        />
      </label>
      <label className="block">
        <span className={vk.label}>Цель / смысл *</span>
        <textarea
          required
          rows={2}
          value={form.intent}
          onChange={(e) => onFieldChange('intent', e.target.value)}
          className={textareaClass}
        />
      </label>
      <label className="block">
        <span className={vk.label}>Подсказки</span>
        <textarea
          rows={2}
          value={form.cues}
          onChange={(e) => onFieldChange('cues', e.target.value)}
          className={textareaClass}
        />
      </label>
      <label className="block">
        <span className={vk.label}>Избегать</span>
        <textarea
          rows={2}
          value={form.avoid}
          onChange={(e) => onFieldChange('avoid', e.target.value)}
          className={textareaClass}
        />
      </label>
      <label className="block">
        <span className={vk.label}>Противопоказания</span>
        <textarea
          rows={2}
          value={form.contraindications}
          onChange={(e) => onFieldChange('contraindications', e.target.value)}
          placeholder="Например: лишний вес, травма колена"
          className={textareaClass}
        />
        <p className={`mt-0.5 ${vk.mutedXs}`}>Если заполнено — в списке появится красный «!».</p>
      </label>
      <div className={`${vk.previewCard} space-y-2`}>
        <p className="text-[13px] font-semibold text-[#2c2d2e]">Объём по возрасту</p>
        <label className="block">
          <span className={vk.label}>До 12 лет</span>
          <input
            type="text"
            value={form.doseUnder12}
            onChange={(e) => onFieldChange('doseUnder12', e.target.value)}
            placeholder="2×5, отдых 1–2 мин"
            className={vk.input}
          />
        </label>
        <label className="block">
          <span className={vk.label}>13–15 лет</span>
          <input
            type="text"
            value={form.dose13to15}
            onChange={(e) => onFieldChange('dose13to15', e.target.value)}
            placeholder="3×6–8"
            className={vk.input}
          />
        </label>
        <label className="block">
          <span className={vk.label}>16+ лет</span>
          <input
            type="text"
            value={form.dose16Plus}
            onChange={(e) => onFieldChange('dose16Plus', e.target.value)}
            placeholder="4×6"
            className={vk.input}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className={vk.label}>Возраст от</span>
          <input
            type="number"
            min={0}
            max={99}
            value={form.minAge}
            onChange={(e) => onFieldChange('minAge', e.target.value)}
            className={vk.input}
          />
        </label>
        <label className="block">
          <span className={vk.label}>Возраст до</span>
          <input
            type="number"
            min={0}
            max={99}
            value={form.maxAge}
            onChange={(e) => onFieldChange('maxAge', e.target.value)}
            className={vk.input}
          />
        </label>
      </div>
      <label className="block">
        <span className={vk.label}>Ссылка WebM</span>
        <input
          type="url"
          value={form.webmSrc}
          onChange={(e) => onFieldChange('webmSrc', e.target.value)}
          placeholder="https://..."
          className={vk.input}
        />
      </label>
      <label className="block">
        <span className={vk.label}>Ссылка GIF</span>
        <input
          type="url"
          value={form.gifSrc}
          onChange={(e) => onFieldChange('gifSrc', e.target.value)}
          placeholder="https://..."
          className={vk.input}
        />
      </label>
      {formError ? (
        <p className="text-[13px] text-[#e64646]" role="alert">
          {formError}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        <button type="submit" disabled={saving} className={vk.btnPrimary}>
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
        <button type="button" onClick={onCancel} className={vk.btnSecondary}>
          Отмена
        </button>
      </div>
    </form>
  )
}

function ExerciseCard({
  ex,
  isEditingThis,
  isSelected,
  canPersist,
  deletingId,
  onSelect,
  onEdit,
  onDelete,
}) {
  const webm = ex.media?.webmSrc
  const gif = ex.media?.gifSrc
  const hasVideo = typeof webm === 'string' && webm.trim().length > 0
  const hasGif = typeof gif === 'string' && gif.trim().length > 0
  const ageLabel =
    ex.minAge != null || ex.maxAge != null
      ? [ex.minAge != null ? `от ${ex.minAge}` : null, ex.maxAge != null ? `до ${ex.maxAge}` : null]
          .filter(Boolean)
          .join(' ')
      : null

  const rowClass = [
    'overflow-hidden rounded-[10px] border bg-white',
    isEditingThis ? 'border-[#2d81e0] ring-1 ring-[#aec8e8]' : '',
    isSelected ? 'border-[#2d81e0] bg-[#ecf3fc]' : 'border-[#e7e8ec]',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li>
      <div className={rowClass}>
        <div className="flex w-full gap-2 p-2">
          {(hasVideo || hasGif) && (
            <TechnicalAtomMedia
              atom={{ media: { gifSrc: hasGif ? gif : null, webmSrc: hasVideo ? webm : null } }}
              className="h-10 w-14"
              title={ex.title}
            />
          )}
          <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left active:bg-[#f5f6f8]">
            <div className="flex items-center gap-1.5">
              <h3 className={`min-w-0 flex-1 truncate ${vk.listItemTitle}`}>{ex.title}</h3>
              <ExerciseContraindicationMark text={ex.contraindications} />
            </div>
            {ageLabel ? <p className={vk.mutedXs}>Возраст: {ageLabel} лет</p> : null}
            {hasExerciseContraindications(ex) ? (
              <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-[#e64646]">
                Противопоказания: {ex.contraindications.trim()}
              </p>
            ) : null}
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-[#818c99]">{ex.intent}</p>
            {ex.doseUnder12 || ex.dose13to15 || ex.dose16Plus ? (
              <p className={`mt-0.5 line-clamp-1 ${vk.mutedXs}`}>
                {[ex.doseUnder12 && `≤12: ${ex.doseUnder12}`, ex.dose13to15 && `13–15: ${ex.dose13to15}`, ex.dose16Plus && `16+: ${ex.dose16Plus}`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
          </button>
        </div>
        {canPersist ? (
          <div className="flex gap-3 border-t border-[#e7e8ec] px-2.5 py-1.5">
            <button type="button" onClick={onEdit} className={`text-[12px] font-medium ${vk.link}`}>
              Изменить
            </button>
            <button
              type="button"
              disabled={deletingId === ex.id}
              onClick={onDelete}
              className="text-[12px] font-medium text-[#e64646] disabled:opacity-50"
            >
              {deletingId === ex.id ? 'Удаление…' : 'Удалить'}
            </button>
          </div>
        ) : null}
      </div>
    </li>
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
  const [exercisesPickerOpen, setExercisesPickerOpen] = useState(true)
  const [completionBusyId, setCompletionBusyId] = useState(null)
  const [completionError, setCompletionError] = useState('')

  useEffect(() => {
    if (selectedExerciseId) setExercisesPickerOpen(false)
  }, [selectedExerciseId])

  const catalog = getMotorQualitiesCatalog()
  const selectedExercise =
    selectedExerciseId != null
      ? exercises.find((ex) => ex.id === selectedExerciseId) ?? null
      : null

  const handleToggleCompletion = useCallback(
    async (student, checked) => {
      if (!item?.slug || !selectedExercise || !student?.id) return false
      if (!isFirebaseConfigured) {
        setCompletionError('Отметка доступна только при подключённой базе Firebase.')
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
            `${prev ?? ''} Только на этом устройстве — опубликуйте firestore.rules для общего банка.`,
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
    <main className={`${vk.pageWithNav} ${vk.pagePad}`}>
      <div className={`${vk.containerMid} max-w-3xl`}>
        <BackToHomeBar />

        {studentReturn ? (
          <div className={vk.noticeInfo}>
            <Link to={studentReturn.to} className={vk.link}>
              ←{' '}
              {studentReturn.studentName
                ? `К ученику: ${studentReturn.studentName}`
                : 'К карточке ученика'}
            </Link>
          </div>
        ) : null}

        <nav className={vk.mutedXs}>
          <Link to="/qualities" state={linkState} className={vk.link}>
            База упражнений
          </Link>
          <span className="mx-1.5 text-[#c4c8cc]">/</span>
          <span className="text-[#2c2d2e]">{item.title}</span>
        </nav>

        <header className="space-y-1.5">
          <h1 className={vk.h1Lg}>{item.title}</h1>
          {item.sensitiveAgeSet?.size > 0 ? (
            <SensitiveAgeScale sensitiveAges={item.sensitiveAgeSet} compact className="max-w-md" />
          ) : null}
        </header>

        <section className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={vk.h2}>Упражнения</h2>
            {canPersist ? (
              <button
                type="button"
                onClick={() => (formOpen && !editingId ? closeForm() : openAddForm())}
                className={vk.btnSecondary}
              >
                {formOpen && !editingId ? 'Скрыть' : 'Добавить'}
              </button>
            ) : null}
          </div>

          {selectedExercise && !exercisesPickerOpen ? (
            <div className={`${vk.cardPadded} space-y-1 py-2`}>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className={`min-w-0 flex-1 truncate ${vk.listItemTitle}`}>{selectedExercise.title}</p>
                    <ExerciseContraindicationMark text={selectedExercise.contraindications} />
                  </div>
                </div>
              <button
                type="button"
                onClick={() => setExercisesPickerOpen(true)}
                className={vk.btnCompactSecondary}
              >
                Сменить
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedExerciseId(null)
                  setExercisesPickerOpen(true)
                }}
                className={vk.btnGhost}
              >
                Снять
              </button>
              </div>
              {hasExerciseContraindications(selectedExercise) ? (
                <p className="text-[12px] leading-4 text-[#e64646]">
                  <span className="font-semibold">Противопоказания:</span> {selectedExercise.contraindications.trim()}
                </p>
              ) : null}
            </div>
          ) : null}

          {storageMode === 'local' ? (
            <p className={vk.noticeWarn}>
              Облако недоступно — только этот браузер. Коллекция{' '}
              <span className="font-mono">motor_quality_exercises</span>.
            </p>
          ) : null}

          {saveNotice ? <p className={vk.success}>{saveNotice}</p> : null}

          {formOpen && canPersist ? (
            <ExerciseForm
              title={editingId ? 'Редактирование' : 'Новое упражнение'}
              form={form}
              formError={formError}
              saving={saving}
              onFieldChange={updateField}
              onSubmit={handleSaveExercise}
              onCancel={closeForm}
            />
          ) : null}

          {(!selectedExercise || exercisesPickerOpen) && exercises.length === 0 ? (
            <p className={vk.emptyState}>Пока пусто. Нажмите «Добавить».</p>
          ) : null}

          {(!selectedExercise || exercisesPickerOpen) && exercises.length > 0 ? (
            <ul
              className={`space-y-1 ${selectedExercise ? 'max-h-40 overflow-y-auto rounded-[10px] border border-[#e7e8ec] bg-white p-1' : ''}`}
            >
              {exercises.map((ex) => (
                <ExerciseCard
                  key={ex.id}
                  ex={ex}
                  isEditingThis={editingId === ex.id}
                  isSelected={selectedExerciseId === ex.id}
                  canPersist={canPersist}
                  deletingId={deletingId}
                  onSelect={() => {
                    setSelectedExerciseId((prev) => (prev === ex.id ? null : ex.id))
                    if (ex.id !== selectedExerciseId) setExercisesPickerOpen(false)
                  }}
                  onEdit={(e) => {
                    e.stopPropagation()
                    openEditForm(ex)
                  }}
                  onDelete={(e) => {
                    e.stopPropagation()
                    handleDeleteExercise(ex.id, ex.title)
                  }}
                />
              ))}
            </ul>
          ) : null}

          {!selectedExercise ? (
            <p className={vk.mutedXs}>Выберите упражнение — ниже появятся спортсмены для отметки.</p>
          ) : null}
        </section>

        {selectedExercise ? (
          <div className="space-y-2">
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

            {otherStudents.length > 0 ? (
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
          </div>
        ) : (
          <>
            <QualitySensitiveStudentsPanel
              qualityTitle={item.title}
              qualitySlug={item.slug}
              students={sensitiveStudents}
              loading={sensitiveStudentsLoading}
              error={sensitiveStudentsError}
              selectedExercise={null}
              onOpenStudent={onOpenStudent}
            />
            {otherStudents.length > 0 ? (
              <QualitySensitiveStudentsPanel
                variant="others"
                qualityTitle={item.title}
                qualitySlug={item.slug}
                students={otherStudents}
                loading={sensitiveStudentsLoading}
                error=""
                selectedExercise={null}
                onOpenStudent={onOpenStudent}
              />
            ) : null}
          </>
        )}

        <section>
          <h2 className={`mb-1.5 ${vk.h2}`}>Другие качества</h2>
          <ul className="flex flex-wrap gap-1">
            {catalog
              .filter((q) => q.slug !== item.slug)
              .map((q) => (
                <li key={q.slug}>
                  <Link
                    to={{ pathname: `/qualities/${q.slug}`, state: linkState }}
                    className={`inline-block rounded-lg px-2.5 py-1 text-[12px] font-medium ${vk.categoryTabIdle} border border-[#e7e8ec] active:bg-[#f5f6f8]`}
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
