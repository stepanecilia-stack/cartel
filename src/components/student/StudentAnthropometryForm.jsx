import { memo } from 'react'
import { formatBirthYearRu } from '../../utils/studentModel.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   anthropometry: {
 *     birthYear: string,
 *     birthDate: string,
 *     height: string,
 *     weight: string,
 *     reach: string,
 *     gender: string,
 *     date: string,
 *   },
 *   onChange: (patch: Partial<typeof anthropometry>) => void,
 *   saveError: string,
 *   saveOk: boolean,
 *   isSaving: boolean,
 *   canSave: boolean,
 *   onSave: () => void,
 * }} props
 */
function StudentAnthropometryForm({
  anthropometry,
  onChange,
  saveError,
  saveOk,
  isSaving,
  canSave,
  onSave,
}) {
  const set = (patch) => onChange(patch)

  return (
    <div className={vk.formGrid2}>
      <label className="block">
        <span className={vk.label}>Год рожд.</span>
        <input
          type="number"
          min={1900}
          max={new Date().getFullYear()}
          placeholder="2013"
          className={vk.input}
          value={anthropometry.birthYear}
          onChange={(e) => set({ birthYear: e.target.value })}
        />
        {formatBirthYearRu(anthropometry.birthYear) ? (
          <span className={`mt-0.5 block ${vk.mutedXs}`}>{formatBirthYearRu(anthropometry.birthYear)}</span>
        ) : null}
      </label>
      <label className="block">
        <span className={vk.label}>Дата рожд.</span>
        <input
          type="date"
          min="1900-01-01"
          max={new Date().toISOString().slice(0, 10)}
          className={vk.input}
          value={anthropometry.birthDate}
          onChange={(e) => set({ birthDate: e.target.value })}
        />
        {anthropometry.birthDate ? (
          <button type="button" className={`mt-0.5 ${vk.link}`} onClick={() => set({ birthDate: '' })}>
            Очистить
          </button>
        ) : null}
      </label>
      <label className="block">
        <span className={vk.label}>Рост, см</span>
        <input
          type="number"
          className={vk.input}
          value={anthropometry.height}
          onChange={(e) => set({ height: e.target.value })}
        />
      </label>
      <label className="block">
        <span className={vk.label}>Вес, кг</span>
        <input
          type="number"
          className={vk.input}
          value={anthropometry.weight}
          onChange={(e) => set({ weight: e.target.value })}
        />
      </label>
      <label className="block">
        <span className={vk.label}>Размах, см</span>
        <input
          type="number"
          className={vk.input}
          value={anthropometry.reach}
          onChange={(e) => set({ reach: e.target.value })}
        />
      </label>
      <label className="block">
        <span className={vk.label}>Пол</span>
        <select
          className={vk.select}
          value={anthropometry.gender}
          onChange={(e) => set({ gender: e.target.value })}
        >
          <option value="M">М</option>
          <option value="F">Ж</option>
        </select>
      </label>
      <label className="col-span-2 block">
        <span className={vk.label}>Дата измерения</span>
        <input
          type="date"
          className={vk.input}
          value={anthropometry.date}
          onChange={(e) => set({ date: e.target.value })}
        />
      </label>

      <div className="col-span-2 flex flex-wrap items-center gap-2 border-t border-[#e7e8ec] pt-2">
        {saveError ? (
          <p className={`flex-1 ${vk.error}`} role="alert">
            {saveError}
          </p>
        ) : null}
        {saveOk && !saveError ? <p className={`flex-1 ${vk.success}`}>Сохранено</p> : null}
        <button
          type="button"
          disabled={isSaving || !canSave}
          onClick={onSave}
          className={`ml-auto ${vk.btnPrimary}`}
        >
          {isSaving ? '…' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}

export default memo(StudentAnthropometryForm)
