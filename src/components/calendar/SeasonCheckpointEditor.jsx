import { memo, useState } from 'react'
import { SEASON_CHECKPOINT_KIND_STYLES } from '../../data/seasonPlanKinds.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   mode: 'create' | 'edit',
 *   dateISO: string,
 *   initialTitle?: string,
 *   initialKind?: import('../../utils/seasonPlan.js').SeasonCheckpointKind,
 *   initialDone?: boolean,
 *   onCancel: () => void,
 *   onSave: (payload: {
 *     title: string,
 *     kind: import('../../utils/seasonPlan.js').SeasonCheckpointKind,
 *     dateISO: string,
 *     done: boolean,
 *   }) => void | Promise<void>,
 *   onDelete?: () => void | Promise<void>,
 *   busy?: boolean,
 *   error?: string,
 *   disabled?: boolean,
 * }} props
 */
function SeasonCheckpointEditor({
  mode,
  dateISO,
  initialTitle = '',
  initialKind = 'other',
  initialDone = false,
  onCancel,
  onSave,
  onDelete,
  busy = false,
  error = '',
  disabled = false,
}) {
  const [done, setDone] = useState(Boolean(initialDone))

  return (
    <form
      className="rounded-lg border border-rose-200 bg-rose-50/30 p-2.5 space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const title = String(fd.get('title') ?? '').trim()
        const kind = String(fd.get('kind') ?? 'other')
        if (!title) return
        const validKind =
          kind in SEASON_CHECKPOINT_KIND_STYLES
            ? /** @type {import('../../utils/seasonPlan.js').SeasonCheckpointKind} */ (kind)
            : 'other'
        void onSave({ title, kind: validKind, dateISO, done })
      }}
    >
      <p className="text-[12px] font-semibold text-[#2c2d2e]">
        {mode === 'create' ? 'Контрольная точка' : 'Контрольная точка'} · {dateISO}
      </p>

      <div>
        <label className={vk.label} htmlFor="season-cp-title">
          Название
        </label>
        <input
          id="season-cp-title"
          name="title"
          className={vk.input}
          defaultValue={initialTitle}
          placeholder="Медосмотр"
          disabled={disabled || busy}
          required
        />
      </div>

      <div>
        <span className={vk.label}>Тип</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {Object.entries(SEASON_CHECKPOINT_KIND_STYLES).map(([id, style]) => (
            <label key={id} className="inline-flex cursor-pointer items-center gap-1 text-[12px]">
              <input
                type="radio"
                name="kind"
                value={id}
                defaultChecked={initialKind === id}
                disabled={disabled || busy}
              />
              <span className={`rounded border px-1.5 py-0.5 ${style.chip}`}>{style.label}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-[12px]">
        <input
          type="checkbox"
          checked={done}
          onChange={(e) => setDone(e.target.checked)}
          disabled={disabled || busy}
        />
        Выполнено
      </label>

      {error ? <p className={vk.noticeWarn}>{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className={vk.btnPrimary} disabled={disabled || busy}>
          {busy ? 'Сохранение…' : 'Сохранить'}
        </button>
        <button type="button" className={vk.btnSecondary} onClick={onCancel} disabled={busy}>
          Отмена
        </button>
        {mode === 'edit' && onDelete ? (
          <button
            type="button"
            className="ml-auto text-[13px] font-medium text-rose-600 disabled:opacity-50"
            disabled={busy}
            onClick={() => void onDelete()}
          >
            Удалить
          </button>
        ) : null}
      </div>
    </form>
  )
}

export default memo(SeasonCheckpointEditor)
