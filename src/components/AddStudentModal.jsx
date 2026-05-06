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

  return (
    <div className="mt-4 space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">Шесть цифр личного кода (без пробелов)</span>
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
          className={`w-full max-w-xs rounded-lg border px-3 py-2 font-mono text-lg tracking-widest outline-none focus:ring-2 focus:ring-blue-200 ${
            showLengthError || searchError ? 'border-red-400 bg-red-50/50' : 'border-slate-200 bg-white'
          }`}
        />
        {showLengthError && (
          <span className="text-xs font-medium text-red-600">Нужно 6 цифр (сейчас {code.length}).</span>
        )}
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          disabled={isSearching || code.length !== 6}
          onClick={runSearch}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {isSearching ? 'Поиск…' : 'Найти и добавить'}
        </button>
        <button
          type="button"
          onClick={() => onCancel?.()}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Отмена
        </button>
        <p className="text-xs text-slate-500 sm:ml-1 sm:flex-1 sm:self-center">
          Сначала нажмите кнопку — программа найдёт ученика. Потом проверьте фото и имя и подтвердите.
        </p>
      </div>

      {searchError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{searchError}</p>
      )}

      {preview && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center gap-4">
            {photo ? (
              <img
                src={photo}
                alt=""
                className="h-16 w-16 shrink-0 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-bold text-slate-600"
                aria-hidden
              >
                {studentInitials(preview)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-600">Подтвердите добавление в свой список:</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">Добавить {name}?</p>
            </div>
          </div>
          {attachError && (
            <p className="mt-3 text-sm font-medium text-red-700">{attachError}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isAttaching}
              onClick={confirmAttach}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-300"
            >
              {isAttaching ? 'Добавляем…' : 'Да, добавить'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPreview(null)
                setSearchError('')
              }}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AddStudentModal({ open, onClose, coachId, studentIds, onListChanged }) {
  const [mode, setMode] = useState('create')

  useEffect(() => {
    if (!open) {
      setMode('create')
    }
  }, [open])

  if (!open) return null

  const knownStudentIds = new Set(studentIds || [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-student-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="add-student-modal-title" className="text-xl font-bold text-slate-900">
            Добавить ученика
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
              mode === 'create' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Новый ученик
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
              mode === 'join' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Присоединить существующего
          </button>
        </div>

        {mode === 'create' && (
          <>
            <p className="mt-3 text-sm text-slate-600">
              Заполните анкету — появится карточка ученика и <strong>личный шестизначный код</strong>. Этот код можно
              дать другому тренеру, чтобы он добавил того же человека к себе в список.
            </p>
            <NewStudentForm
              compact
              onCancel={onClose}
              onSuccess={() => {
                onListChanged?.()
                onClose()
              }}
            />
          </>
        )}

        {mode === 'join' && (
          <>
            <p className="mt-3 text-sm text-slate-600">
              Введите шесть цифр подряд — такой код показан в карточке ученика у другого тренера (кнопка «скопировать»).
              Буквы и пробелы не нужны, только цифры.
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
