import { useEffect, useState } from 'react'
import {
  attachCoachToStudent,
  findStudentByShortId,
} from '../services/firebaseService'
import {
  displayNameFromStudent,
  sanitizeShortIdInput,
  studentInitials,
  studentPhotoUrl,
} from '../utils/studentModel'
import { vk } from '../utils/vkUi.js'
import NewStudentForm from './NewStudentForm'

function JoinByCodePanel({ coachId, knownStudentIds, onAttached, onCancel }) {
  const [code, setCode] = useState('')
  const [touched, setTouched] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [preview, setPreview] = useState(null)
  const [isAttaching, setIsAttaching] = useState(false)
  const [attachError, setAttachError] = useState('')

  const incomplete = code.length > 0 && code.length < 6
  const showLengthError = touched && incomplete

  useEffect(() => {
    setPreview(null)
    setSearchError('')
    setAttachError('')
  }, [code])

  const runSearch = async () => {
    setTouched(true)
    setSearchError('')
    setAttachError('')
    if (code.length !== 6) {
      setSearchError('Введите ровно 6 цифр кода.')
      return
    }
    setIsSearching(true)
    try {
      const found = await findStudentByShortId(code)
      if (!found) {
        setPreview(null)
        setSearchError('Ученик с таким кодом не найден.')
        return
      }
      if (knownStudentIds?.has(found.id)) {
        setPreview(null)
        setSearchError('Этот ученик уже в вашем списке.')
        return
      }
      setPreview(found)
    } catch (e) {
      console.error(e)
      setSearchError('Не удалось выполнить поиск. Проверьте сеть.')
    } finally {
      setIsSearching(false)
    }
  }

  const confirmAttach = async () => {
    if (!preview?.id || !coachId) return
    setAttachError('')
    setIsAttaching(true)
    try {
      const { status } = await attachCoachToStudent(preview.id, coachId)
      if (status === 'already') {
        setAttachError('Доступ уже был выдан ранее.')
        return
      }
      onAttached?.()
    } catch (e) {
      console.error(e)
      setAttachError('Не удалось добавить ученика: база данных не разрешила запись. Попросите администратора.')
    } finally {
      setIsAttaching(false)
    }
  }

  const photo = preview ? studentPhotoUrl(preview) : ''
  const name = preview ? displayNameFromStudent(preview) : ''

  const codeInputClass = [
    vk.input,
    'max-w-[10rem] font-mono text-[17px] tracking-[0.2em]',
    showLengthError || searchError ? 'ring-1 ring-[#e64646] bg-[#fff5f5]' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="mt-3 space-y-3">
      <label className="block">
        <span className={vk.label}>Шесть цифр личного кода (без пробелов)</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => {
            setCode(sanitizeShortIdInput(e.target.value))
            setTouched(true)
          }}
          onBlur={() => setTouched(true)}
          className={codeInputClass}
        />
        {showLengthError ? (
          <span className="mt-1 block text-[12px] text-[#e64646]">Нужно 6 цифр (сейчас {code.length}).</span>
        ) : null}
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          disabled={isSearching || code.length !== 6}
          onClick={runSearch}
          className={vk.btnPrimary}
        >
          {isSearching ? 'Поиск…' : 'Найти и добавить'}
        </button>
        <button type="button" onClick={() => onCancel?.()} className={vk.btnSecondary}>
          Отмена
        </button>
        <p className={`${vk.mutedXs} sm:ml-1 sm:flex-1 sm:self-center`}>
          Сначала нажмите кнопку — программа найдёт ученика. Потом проверьте фото и имя и подтвердите.
        </p>
      </div>

      {searchError ? <p className={vk.error}>{searchError}</p> : null}

      {preview ? (
        <div className={vk.previewCard}>
          <div className="flex flex-wrap items-center gap-3">
            {photo ? (
              <img
                src={photo}
                alt=""
                className="h-14 w-14 shrink-0 rounded-full border border-[#e7e8ec] object-cover"
              />
            ) : (
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#e7e8ec] bg-white text-[15px] font-semibold text-[#818c99]"
                aria-hidden
              >
                {studentInitials(preview)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className={vk.mutedXs}>Подтвердите добавление в свой список:</p>
              <p className="mt-0.5 text-[15px] font-semibold leading-5 text-[#2c2d2e]">Добавить {name}?</p>
            </div>
          </div>
          {attachError ? <p className="mt-2 text-[13px] font-medium text-[#e64646]">{attachError}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={isAttaching} onClick={confirmAttach} className={vk.btnPrimary}>
              {isAttaching ? 'Добавляем…' : 'Да, добавить'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPreview(null)
                setSearchError('')
              }}
              className={vk.btnSecondary}
            >
              Отмена
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function AddStudentModal({
  open,
  onClose,
  coachId,
  studentIds,
  existingStudents = [],
  onOpenExisting,
  onListChanged,
}) {
  const [mode, setMode] = useState('create')

  useEffect(() => {
    if (!open) {
      setMode('create')
    }
  }, [open])

  if (!open) return null

  const knownStudentIds = new Set(studentIds || [])

  const segmentClass = (active) =>
    [vk.segmentBtn, active ? vk.segmentBtnActive : vk.segmentBtnInactive].join(' ')

  return (
    <div
      className={vk.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-student-modal-title"
      onClick={onClose}
    >
      <div className={vk.modalPanel} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <h2 id="add-student-modal-title" className={vk.h1Lg}>
            Добавить ученика
          </h2>
          <button type="button" onClick={onClose} className={vk.btnGhost} aria-label="Закрыть">
            ✕
          </button>
        </div>

        <div className={`mt-3 ${vk.segmentBar}`}>
          <button type="button" onClick={() => setMode('create')} className={segmentClass(mode === 'create')}>
            Новый ученик
          </button>
          <button type="button" onClick={() => setMode('join')} className={segmentClass(mode === 'join')}>
            Присоединить
          </button>
        </div>

        {mode === 'create' ? (
          <>
            <p className={`mt-2.5 ${vk.muted}`}>
              Одна карточка на человека — даже если тренировки в разное время. После сохранения появится{' '}
              <strong className="font-medium text-[#2c2d2e]">шестизначный код</strong>: передайте его коллеге, чтобы он
              добавил того же ученика через вкладку «Присоединить», а не создавал дубликат.
            </p>
            <NewStudentForm
              compact
              existingStudents={existingStudents}
              onOpenExisting={(student) => {
                onOpenExisting?.(student)
                onClose()
              }}
              onCancel={onClose}
              onSuccess={() => {
                onListChanged?.()
                onClose()
              }}
            />
          </>
        ) : (
          <>
            <p className={`mt-2.5 ${vk.muted}`}>
              Если ученик уже заведён в школе (другим тренером или в другое время) — введите его код из карточки, не
              создавайте новую анкету. Шесть цифр подряд, без пробелов.
            </p>
            <JoinByCodePanel
              coachId={coachId}
              knownStudentIds={knownStudentIds}
              onCancel={onClose}
              onAttached={() => {
                onListChanged?.()
                onClose()
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default AddStudentModal
