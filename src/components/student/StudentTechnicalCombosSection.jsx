import { memo } from 'react'
import { TECH_DOMINANCE_OPTIONS, normalizeTechnicalDominanceKey } from '../../utils/ksrUtils.js'
import { buildComboChainPreview, REQUIRED_LEVEL3_COMBO_IDS } from '../../utils/techniqueCatalog.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   combinations: { id: string, name: string, steps: string[] }[],
 *   atomByIdLookup: Map<string, { name?: string }>,
 *   technicalData: Record<string, { level?: string }>,
 *   technicalSavingKey: string | null,
 *   canSave: boolean,
 *   onLevelChange: (comboId: string, level: string) => void,
 *   onSaveCombo: (combo: { id: string, name: string }) => void,
 *   onDeleteCombo: (comboId: string) => void,
 *   onOpenCreateModal: () => void,
 *   modalOpen: boolean,
 *   onCloseModal: () => void,
 *   draftName: string,
 *   onDraftNameChange: (value: string) => void,
 *   draftSteps: string[],
 *   pickTier: string,
 *   onPickTierChange: (tier: string) => void,
 *   pickAtomId: string,
 *   onPickAtomIdChange: (id: string) => void,
 *   pickOptions: { value: string, label: string }[],
 *   onAddStep: () => void,
 *   onMoveStep: (index: number, direction: 'up' | 'down') => void,
 *   onRemoveStep: (index: number) => void,
 *   onConfirmCreate: () => void,
 *   createBusy: boolean,
 * }} props
 */
function StudentTechnicalCombosSection({
  combinations,
  atomByIdLookup,
  technicalData,
  technicalSavingKey,
  canSave,
  onLevelChange,
  onSaveCombo,
  onDeleteCombo,
  onOpenCreateModal,
  modalOpen,
  onCloseModal,
  draftName,
  onDraftNameChange,
  draftSteps,
  pickTier,
  onPickTierChange,
  pickAtomId,
  onPickAtomIdChange,
  pickOptions,
  onAddStep,
  onMoveStep,
  onRemoveStep,
  onConfirmCreate,
  createBusy,
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className={vk.mutedXs}>Обязательные: двойка подшаг, двойка толчок</p>
        <button type="button" disabled={!canSave} onClick={onOpenCreateModal} className={vk.btnSecondary}>
          + Комбинация
        </button>
      </div>
      <ul className={vk.list}>
        {combinations.map((combo) => {
          const chain = buildComboChainPreview(combo.steps, atomByIdLookup)
          const atomLevelKey = normalizeTechnicalDominanceKey(technicalData[combo.id]?.level)
          const reqNum = REQUIRED_LEVEL3_COMBO_IDS.indexOf(combo.id)
          const isRequiredCombo = reqNum >= 0
          const comboSaving = technicalSavingKey === `technical:${combo.id}`
          return (
            <li
              key={combo.id}
              id={`technical-combo-${combo.id}`}
              className={`scroll-mt-40 border-t border-[#e7e8ec] first:border-t-0 ${
                isRequiredCombo ? 'bg-[#fffbeb]' : 'bg-white'
              }`}
            >
              <div className="px-2.5 py-2">
                <div className="flex items-center gap-1.5">
                  <h3 className="min-w-0 flex-1 truncate text-[15px] font-medium text-[#2c2d2e]">
                    {isRequiredCombo ? (
                      <span className="mr-1 text-[10px] font-bold text-amber-800">#{reqNum + 1}</span>
                    ) : (
                      <span className="mr-0.5 text-[#6f3ff5]">∑</span>
                    )}
                    {combo.name}
                  </h3>
                  {!isRequiredCombo ? (
                    <button
                      type="button"
                      disabled={!canSave || Boolean(technicalSavingKey)}
                      onClick={() => onDeleteCombo(combo.id)}
                      className="shrink-0 text-[12px] font-medium text-[#e64646] disabled:opacity-40"
                    >
                      Удалить
                    </button>
                  ) : null}
                </div>
                <p className={`mt-0.5 line-clamp-2 ${vk.mutedXs}`} title={chain}>
                  {chain}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <select
                    className={`${vk.select} min-w-0 flex-1`}
                    value={atomLevelKey}
                    aria-label="Уровень освоения"
                    onChange={(e) => onLevelChange(combo.id, e.target.value)}
                  >
                    {TECH_DOMINANCE_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!canSave || comboSaving}
                    onClick={() =>
                      onSaveCombo({
                        id: combo.id,
                        name: combo.name,
                      })
                    }
                    className={vk.btnCompact}
                  >
                    {comboSaving ? '…' : 'Сохранить'}
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-3 sm:items-center"
          role="presentation"
          onClick={onCloseModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="combo-modal-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="combo-modal-title" className="text-base font-semibold text-slate-900">
              Новая комбинация
            </h4>
            <p className="mt-1 text-xs text-slate-600">
              Выберите атомы уровня 1 или 2 и выстройте цепочку слева направо, как на тренировке.
            </p>
            <label className="mt-4 block space-y-1">
              <span className="text-xs font-semibold text-slate-700">Название</span>
              <input
                type="text"
                value={draftName}
                onChange={(e) => onDraftNameChange(e.target.value)}
                placeholder="Например: двойка подшаг"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
              />
            </label>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Конструктор</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <select
                  value={pickTier}
                  onChange={(e) => {
                    onPickTierChange(e.target.value)
                    onPickAtomIdChange('')
                  }}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
                >
                  <option value="1">Уровень 1</option>
                  <option value="2">Уровень 2</option>
                </select>
                <select
                  value={pickAtomId}
                  onChange={(e) => onPickAtomIdChange(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
                >
                  <option value="">— выберите блок —</option>
                  {pickOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!pickAtomId}
                  onClick={onAddStep}
                  className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
                >
                  В цепочку
                </button>
              </div>
              {draftSteps.length > 0 ? (
                <ul className="mt-3 flex flex-wrap items-center gap-1.5">
                  {draftSteps.map((stepId, idx) => {
                    const label = atomByIdLookup.get(stepId)?.name ?? stepId
                    return (
                      <li
                        key={`${stepId}-${idx}`}
                        className="inline-flex items-center gap-0.5 rounded-md border border-violet-200 bg-white px-1.5 py-1 text-[11px]"
                      >
                        <span className="max-w-[140px] truncate" title={label}>
                          {label}
                        </span>
                        <button
                          type="button"
                          className="rounded px-0.5 text-slate-500 hover:text-slate-800"
                          aria-label="Выше"
                          disabled={idx === 0}
                          onClick={() => onMoveStep(idx, 'up')}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="rounded px-0.5 text-slate-500 hover:text-slate-800"
                          aria-label="Ниже"
                          disabled={idx >= draftSteps.length - 1}
                          onClick={() => onMoveStep(idx, 'down')}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="rounded px-0.5 text-red-600 hover:text-red-800"
                          aria-label="Убрать из цепочки"
                          onClick={() => onRemoveStep(idx)}
                        >
                          ×
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-slate-500">Цепочка пока пуста.</p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={onCloseModal} className={vk.btnSecondary}>
                Отмена
              </button>
              <button
                type="button"
                disabled={createBusy}
                onClick={() => void onConfirmCreate()}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-45"
              >
                Сохранить комбинацию
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default memo(StudentTechnicalCombosSection)
