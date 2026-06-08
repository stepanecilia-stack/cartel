import { useMemo, useState, useEffect } from 'react'
import { BackToHomeBar } from '../components/layout/BackToHomeLink.jsx'
import TechnicalAtomMediaCarousel from '../components/TechnicalAtomMediaCarousel.jsx'
import TechnicalAtomMedia from '../components/TechnicalAtomMedia.jsx'
import AtomBookSheet from '../components/student/AtomBookSheet.jsx'
import { atomHasDetailMediaSlide } from '../utils/technicalAtomMediaSlides.js'
import { useTechnicalProgramAtoms } from '../hooks/useTechnicalProgramAtoms.js'
import {
  saveTechnicalProgramAtomMedia,
  saveTechnicalProgramTierCover,
} from '../services/technicalProgramAtomsService.js'
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
    detailWebmSrc: atom.media?.detailWebmSrc ?? '',
    detailEmbedUrl: atom.media?.detailEmbedUrl ?? '',
    detailVideoLink: atom.media?.detailVideoLink ?? '',
    howTo: atom.howTo ?? '',
    whyHowTo: atom.whyHowTo ?? '',
    mistakes: atom.mistakes ?? '',
    whyMistakes: atom.whyMistakes ?? '',
  }
}

function formToPreviewAtom(atom, form) {
  return {
    ...atom,
    embedUrl: form.embedUrl,
    videoLink: form.videoLink,
    media: {
      ...atom.media,
      webmSrc: form.webmSrc,
      detailWebmSrc: form.detailWebmSrc,
      detailEmbedUrl: form.detailEmbedUrl,
      detailVideoLink: form.detailVideoLink,
    },
  }
}

const TIER_COVER_LABELS = {
  1: 'Ур.1 — программа',
  2: 'Ур.2',
  3: 'Комбо',
}

export default function TechnicalElementsPage() {
  const { orderedLevel1, orderedLevel2, orderedLevel3, tierCovers, syncError } =
    useTechnicalProgramAtoms()
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [tier, setTier] = useState(1)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(null)
  const [tierCoverInput, setTierCoverInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingCover, setSavingCover] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const list =
    tier === 3 ? orderedLevel3 : tier === 2 ? orderedLevel2 : orderedLevel1

  const activeTierCover = tierCovers?.[tier] ?? ''

  useEffect(() => {
    setTierCoverInput(activeTierCover)
  }, [tier, activeTierCover])

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

  const handleSaveTierCover = async () => {
    setSavingCover(true)
    setError('')
    setOk('')
    try {
      await saveTechnicalProgramTierCover(tier, tierCoverInput)
      setOk('Обложка уровня сохранена')
    } catch (err) {
      setError(formatFirestoreErrorMessage(err))
    } finally {
      setSavingCover(false)
    }
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
          <p className={vk.mutedXs}>
            Здесь задаётся всё, что видит ученик на этапе «Знание»: два ролика карусели, тексты под роликами и
            материал для проверки тренером после «Понял». Сохранение — в Firestore (
            <span className="font-mono">technical_program_atoms</span>).
          </p>
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

        <section className={`${vk.cardPadded} space-y-2`}>
          <h2 className={vk.h2}>Обложка уровня — {TIER_COVER_LABELS[tier]}</h2>
          <p className={vk.mutedXs}>
            Одна картинка (URL) для всего уровня. Показывается на карточках без WebM и под иконкой play.
          </p>
          <div className="flex flex-wrap items-start gap-3">
            <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-[#e7e8ec] bg-[#f0f2f5]">
              {tierCoverInput.trim() ? (
                <img
                  src={tierCoverInput.trim()}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-[11px] text-[#aeb7c2]">
                  Нет обложки
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <label className="block">
                <span className={vk.label}>URL картинки (JPG, PNG, WebP)</span>
                <input
                  className={vk.input}
                  value={tierCoverInput}
                  onChange={(e) => {
                    setTierCoverInput(e.target.value)
                    setError('')
                  }}
                  placeholder="https://…"
                />
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={savingCover}
                  onClick={() => void handleSaveTierCover()}
                  className={vk.btnPrimary}
                >
                  {savingCover ? 'Сохранение…' : 'Сохранить обложку'}
                </button>
                {activeTierCover || tierCoverInput.trim() ? (
                  <button
                    type="button"
                    disabled={savingCover}
                    onClick={() => {
                      setTierCoverInput('')
                      setSavingCover(true)
                      setError('')
                      void saveTechnicalProgramTierCover(tier, '')
                        .then(() => setOk('Обложка удалена'))
                        .catch((err) => setError(formatFirestoreErrorMessage(err)))
                        .finally(() => setSavingCover(false))
                    }}
                    className={vk.btnSecondary}
                  >
                    Убрать
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

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
              <TechnicalAtomMediaCarousel
                atom={formToPreviewAtom(editingAtom, form)}
                className="h-16 w-24"
                playing={previewPlaying}
                onPlayingChange={setPreviewPlaying}
                previewable
              />
            </div>
            <p className={`${vk.mutedXs} rounded-lg bg-[#f0f7ff] px-2.5 py-2`}>
              На портале ученика: тренер хвалит за тесты → карусель из 2 роликов → «Понял» → короткая проверка в
              чате → совет отработать перед зеркалом. Ниже — куда попадает каждое поле.
            </p>
            <fieldset className="space-y-2 rounded-lg border border-[#e7e8ec] p-2.5">
              <legend className="px-1 text-[13px] font-semibold text-[#2c2d2e]">
                1. Зрительный образ — первый ролик карусели
              </legend>
              <p className={vk.mutedXs}>Ученик смотрит форму без спешки. Достаточно одного поля (WebM или embed).</p>
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
            </fieldset>
            <fieldset className="space-y-2 rounded-lg border border-[#e7e8ec] p-2.5">
              <legend className="px-1 text-[13px] font-semibold text-[#2c2d2e]">
                2. Зрительный + логический — второй ролик (со звуком)
              </legend>
              <p className={vk.mutedXs}>
                Второй слайд карусели. Если видео не задано — повторится первый ролик, логику тренер озвучит текстом из
                блока 3. Карусель из двух слайдов появляется, когда заполнен хотя бы один ролик.
              </p>
            <label className="block">
              <span className={vk.label}>WebM (URL)</span>
              <input className={vk.input} value={form.detailWebmSrc} onChange={(e) => updateField('detailWebmSrc', e.target.value)} placeholder="https://…webm" />
            </label>
            <label className="block">
              <span className={vk.label}>Встраивание (Kinescope embed)</span>
              <input className={vk.input} value={form.detailEmbedUrl} onChange={(e) => updateField('detailEmbedUrl', e.target.value)} placeholder="https://kinescope.io/embed/…" />
            </label>
            <label className="block">
              <span className={vk.label}>Ссылка на видео</span>
              <input className={vk.input} value={form.detailVideoLink} onChange={(e) => updateField('detailVideoLink', e.target.value)} />
            </label>
            </fieldset>
            <fieldset className="space-y-2 rounded-lg border border-[#e7e8ec] p-2.5">
              <legend className="px-1 text-[13px] font-semibold text-[#2c2d2e]">
                3. Тексты для ученика и тренера
              </legend>
              <p className={vk.mutedXs}>
                Идут в «книжный лист» под роликами, в реплики тренера на 2-м слайде и в вопросы после «Понял».
              </p>
              <label className="block">
                <span className={vk.label}>Как выполнять (howTo)</span>
                <textarea
                  className={`${vk.input} min-h-[6rem] resize-y font-serif leading-relaxed`}
                  value={form.howTo}
                  onChange={(e) => updateField('howTo', e.target.value)}
                  placeholder="Пошагово: что делать, на что смотреть ученику…"
                />
                <span className={`mt-1 block ${vk.mutedXs}`}>
                  Книжный лист + второй вопрос тренера («суть своими словами»).
                </span>
              </label>
              <label className="block">
                <span className={vk.label}>Зачем / логика (whyHowTo)</span>
                <textarea
                  className={`${vk.input} min-h-[5rem] resize-y leading-relaxed`}
                  value={form.whyHowTo}
                  onChange={(e) => updateField('whyHowTo', e.target.value)}
                  placeholder="Почему элемент важен, из чего состоит логика приёма…"
                />
                <span className={`mt-1 block ${vk.mutedXs}`}>
                  Реплика тренера на слайде «Зрительный + логический».
                </span>
              </label>
              <label className="block">
                <span className={vk.label}>Типичные ошибки (mistakes)</span>
                <textarea
                  className={`${vk.input} min-h-[4rem] resize-y leading-relaxed`}
                  value={form.mistakes}
                  onChange={(e) => updateField('mistakes', e.target.value)}
                  placeholder="Чего избегать при выполнении…"
                />
                <span className={`mt-1 block ${vk.mutedXs}`}>
                  Пока для справки тренера; позже — в подсказки квиза.
                </span>
              </label>
              <label className="block">
                <span className={vk.label}>Почему это ошибки (whyMistakes)</span>
                <textarea
                  className={`${vk.input} min-h-[3rem] resize-y leading-relaxed`}
                  value={form.whyMistakes}
                  onChange={(e) => updateField('whyMistakes', e.target.value)}
                  placeholder="К чему приводят ошибки…"
                />
              </label>
              <div className="rounded-lg bg-[#f5f6f8] p-2">
                <p className="mb-2 text-[11px] font-medium text-[#818c99]">Предпросмотр книжного листа</p>
                <AtomBookSheet
                  number={editingAtom.number}
                  name={editingAtom.name}
                  description={form.howTo || form.whyHowTo}
                  chainPreview={editingAtom.chainPreview}
                  compact
                />
              </div>
            </fieldset>
            <fieldset className="space-y-1 rounded-lg border border-dashed border-[#d3d9de] bg-[#fafbfc] p-2.5">
              <legend className="px-1 text-[13px] font-semibold text-[#2c2d2e]">4. Проверка после «Понял»</legend>
              <p className={vk.mutedXs}>
                Отдельных полей нет: тренер спрашивает название приёма и суть по текстам из блока 3. Первый вопрос —
                «{editingAtom.name}». Второй — по полю «Как выполнять», если оно заполнено.
              </p>
            </fieldset>
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
                          : activeTierCover
                            ? 'Обложка уровня'
                            : 'Без медиа'}
                    {atomHasDetailMediaSlide(atom) ? ' · + подробное' : ''}
                    {atom.howTo?.trim() ? ' · как' : ''}
                    {atom.whyHowTo?.trim() ? ' · логика' : ''}
                    {atom.mistakes?.trim() ? ' · ошибки' : ''}
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
