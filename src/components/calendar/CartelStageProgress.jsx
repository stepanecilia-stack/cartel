import { memo } from 'react'
import {
  CARTEL_DOCUMENT_DEFS,
  isCartelDocumentComplete,
  isCartelDocumentDateValid,
  normalizeCartelDocuments,
} from '../../data/cartelDocuments.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   stage: import('../../data/cartelParticipation.js').CartelStageId,
 *   documents?: import('../../data/cartelDocuments.js').CartelDocumentsMap,
 *   canSave?: boolean,
 *   busy?: boolean,
 *   onSaveDocuments?: (docs: import('../../data/cartelDocuments.js').CartelDocumentsMap) => void | Promise<void>,
 * }} props
 */
function CartelStageProgress({ stage, documents: documentsProp, canSave = false, busy = false, onSaveDocuments }) {
  if (stage !== 'documents' || !onSaveDocuments) return null

  const documents = normalizeCartelDocuments(documentsProp)

  const patchDoc = (key, patch) => {
    const prev = documents[key] ?? {}
    void onSaveDocuments({
      ...documents,
      [key]: { ...prev, ...patch },
    })
  }

  return (
    <div className="mt-3 rounded-lg border border-[#e7e8ec] bg-[#fafbfc] px-2.5 py-2.5">
      <p className="text-[12px] font-bold text-[#2c2d2e]">Документы</p>
      <ul className="mt-2 space-y-2">
        {CARTEL_DOCUMENT_DEFS.map((def) => {
          const row = documents[def.key] ?? {}
          const complete = isCartelDocumentComplete(documents, def.key)
          const dateInvalid =
            row.done && def.requiresDate && row.dateISO && !isCartelDocumentDateValid(row.dateISO, def)

          return (
            <li key={def.key} className="rounded-md border border-[#e7e8ec] bg-white px-2 py-2">
              <label className="flex items-start gap-2 text-[12px]">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={Boolean(row.done)}
                  disabled={!canSave || busy}
                  onChange={(e) => patchDoc(def.key, { done: e.target.checked })}
                />
                <span className={complete ? 'text-[#818c99] line-through' : 'text-[#2c2d2e]'}>
                  {def.label}
                  {def.hint ? (
                    <span className="mt-0.5 block text-[11px] font-normal text-[#818c99]">{def.hint}</span>
                  ) : null}
                </span>
              </label>
              {def.requiresDate ? (
                <div className="mt-1.5 pl-6">
                  <label className="text-[11px] text-[#818c99]">
                    Дата
                    <input
                      type="date"
                      className={`${vk.input} mt-0.5`}
                      value={row.dateISO ?? ''}
                      disabled={!canSave || busy}
                      onChange={(e) => patchDoc(def.key, { dateISO: e.target.value, done: row.done ?? false })}
                    />
                  </label>
                  {dateInvalid ? (
                    <p className="mt-1 text-[11px] text-rose-700">Срок действия истёк — обновите дату</p>
                  ) : null}
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default memo(CartelStageProgress)
