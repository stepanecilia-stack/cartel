import { useMemo, useState, useCallback } from 'react'
import { BackToHomeBar } from '../components/layout/BackToHomeLink.jsx'
import TechnicalAtomMedia from '../components/TechnicalAtomMedia.jsx'
import { useTechnicalProgramAtoms } from '../hooks/useTechnicalProgramAtoms.js'
import { saveTechnicalProgramAtomMedia } from '../services/technicalProgramAtomsService.js'
import { formatFirestoreErrorMessage } from '../utils/firestoreErrorMessage'
import { vk } from '../utils/vkUi.js'

const TIER_TABS = [
  { id: 1, label: 'Ур.1' },
  { id: 2, label: 'Ур.2' },
  { id: 3, label: 'Комбо' },
]

function atomToForm(atom) {
  return {
    webmSrc: atom.media?.webmSrc ?? '',
    embedUrl: atom.embedUrl ?? '',
    videoLink: atom.videoLink ?? '',
    howTo: atom.howTo ?? '',
    mistakes: atom.mistakes ?? '',
  }
}

export default function TechnicalElementsPage() {
  const { orderedLevel1, orderedLevel2, orderedLevel3, syncError } = useTechnicalProgramAtoms()
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const togglePreviewPlaying = useCallback(() => setPreviewPlaying((p) => !p), [])
  const [tier, setTier] = useState(1)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const list =
    tier === 3 ? orderedLevel3 : tier === 2 ? orderedLevel2 : orderedLevel1

  const editingAtom = useMemo(
    () => list.find((a) => a.id === editingId) ?? null,
    [list, editingId],
  )

  const openEdit = (atom) => {
    setEditingId(atom.id)
    setForm(atomToForm(atom))
    setPreviewPlaying(false)
    setError('')
    setOk('')
  }

  const closeEdit = () => {
    setEditingId(null)
    setForm(null)
  }

  const updateField = (key, value) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
    setError('')
  }

  const handleSave = async () => {
    if (!editingAtom || !form) return
    setSaving(true)
    setError('')
    setOk('')
    try {
      await saveTechnicalProgramAtomMedia(editingAtom.id, tier, form)
      setOk('Сохранено')
      closeEdit()
    } catch (err) {
      setError(formatFirestoreErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className={`${vk.pageWithNav} ${vk.pagePad}`}>
      <div className={`${vk.containerMid} max-w-3xl`}>
        <BackToHomeBar />
        <header>
          <h1 className={vk.h1Lg}>Технические элементы</h1>
          <p className={vk.mutedXs}>WebM — воспроизведение по нажатию play; повторный тап — на весь экран.</p>
        </header>

        {syncError ? (
          <p className={vk.noticeWarn}>
            {syncError} Список элементов показан из программы по умолчанию; медиа из облака не подтянулись.
          </p>
        ) : (
          <p className={vk.mutedXs}>
            Медиа хранятся в Firestore: коллекция <span className="font-mono">technical_program_atoms</span> (общая для
            всех тренеров клуба).
          </p>
        )}

        <nav className={vk.segmentBar} aria-label="Уровень программы">
          {TIER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setTier(tab.id)
                closeEdit()
              }}
              className={`${vk.segmentBtn} flex-1 ${
                tier === tab.id ? vk.segmentBtnActive : vk.segmentBtnInactive
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {error ? <p className={vk.error}>{error}</p> : null}
        {ok ? <p className={vk.success}>{ok}</p> : null}

        {editingAtom && form ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleSave()
            }}
            className={`${vk.cardPadded} space-y-2`}
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className={vk.h2}>
                  {tier === 3 ? (
                    <>
                      <span className="text-[#818c99]">Комбо {editingAtom.number}</span> {editingAtom.name}
                    </>
                  ) : (
                    <>
                      #{editingAtom.number} {editingAtom.name}
                    </>
                  )}
                </p>
                {tier === 3 && editingAtom.chainPreview ? (
                  <p className={vk.mutedXs}>Цепочка: {editingAtom.chainPreview}</p>
                ) : null}
              </div>
              <TechnicalAtomMedia
                atom={{
                  ...editingAtom,
                  media: { webmSrc: form.webmSrc },
                  embedUrl: form.embedUrl,
                  videoLink: form.videoLink,
                }}
                className="h-16 w-24"
                playing={previewPlaying}
                onTogglePlay={togglePreviewPlaying}
                previewable
              />
            </div>
            <label className="block">
              <span className={vk.label}>WebM (URL)</span>
              <input className={vk.input} value={form.webmSrc} onChange={(e) => updateField('webmSrc', e.target.value)} placeholder="https://…webm" />
            </label>
            <label className="block">
              <span className={vk.label}>Встраивание (Kinescope embed)</span>
              <input className={vk.input} value={form.embedUrl} onChange={(e) => updateField('embedUrl', e.target.value)} placeholder="https://kinescope.io/embed/…" />
            </label>
            <label className="block">
              <span className={vk.label}>Ссылка на видео</span>
              <input className={vk.input} value={form.videoLink} onChange={(e) => updateField('videoLink', e.target.value)} />
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button type="submit" disabled={saving} className={vk.btnPrimary}>
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
              <button type="button" onClick={closeEdit} className={vk.btnSecondary}>
                Отмена
              </button>
            </div>
          </form>
        ) : null}

        <ul className={vk.list}>
          {list.map((atom) => (
            <li key={atom.id} className="border-t border-[#e7e8ec] first:border-t-0">
              <button
                type="button"
                onClick={() => openEdit(atom)}
                className="flex w-full touch-manipulation items-center gap-2 px-2.5 py-2 text-left active:bg-[#f5f6f8]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-[#2c2d2e]">
                    {tier === 3 ? (
                      <>
                        <span className="text-[#818c99]">Комбо {atom.number}</span> {atom.name}
                      </>
                    ) : (
                      <>
                        <span className="text-[#818c99]">#{atom.number}</span> {atom.name}
                      </>
                    )}
                  </p>
                  {tier === 3 && atom.chainPreview ? (
                    <p className={`${vk.mutedXs} truncate`}>{atom.chainPreview}</p>
                  ) : null}
                  <p className={vk.mutedXs}>
                    {atom.media?.webmSrc
                      ? 'WebM'
                      : atom.embedUrl
                        ? 'Embed'
                        : atom.videoLink
                          ? 'Ссылка'
                          : 'Без медиа'}
                  </p>
                </div>
                <TechnicalAtomMedia atom={atom} className="h-12 w-[4rem]" previewable />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
