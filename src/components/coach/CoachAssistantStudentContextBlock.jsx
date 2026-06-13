import { memo, useMemo } from 'react'
import { normalizePortalPersonaMemory } from '../../utils/portalPersonaMemory.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {string | null | undefined} iso
 */
function formatBriefUpdatedAt(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

/**
 * @param {{
 *   portalPersonaMemory?: unknown,
 *   liveBrief?: string,
 *   messageCount?: number,
 *   personaAnimal?: string,
 * }} props
 */
function CoachAssistantStudentContextBlock({
  portalPersonaMemory,
  liveBrief = '',
  messageCount = 0,
  personaAnimal = 'тренер',
}) {
  const memory = useMemo(
    () => normalizePortalPersonaMemory(portalPersonaMemory),
    [portalPersonaMemory],
  )

  const savedBrief = memory.coachColleagueBrief?.trim() ?? ''
  const previewBrief = liveBrief.trim()
  const showPreview = previewBrief && previewBrief !== savedBrief
  const updatedLabel = formatBriefUpdatedAt(memory.coachColleagueBriefAt)
  const userMessageCount = messageCount

  return (
    <div className="rounded-[10px] border border-[#dce8f7] bg-[#ecf3fc]/60 p-2.5 sm:p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-[#2c2d2e]">Контекст для кабинета ученика</p>
          <p className={`mt-0.5 ${vk.mutedXs}`}>
            Так {personaAnimal} понимает договорённости с очным тренером — без дословной цитаты чата.
          </p>
        </div>
        {userMessageCount > 0 ? (
          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium tabular-nums text-[#818c99]">
            {userMessageCount}{' '}
            {userMessageCount === 1
              ? 'сообщение'
              : userMessageCount < 5
                ? 'сообщения'
                : 'сообщений'}{' '}
            тренера
          </span>
        ) : null}
      </div>

      {savedBrief ? (
        <div className="mt-2 rounded-lg border border-[#e7e8ec] bg-white p-2.5">
          {updatedLabel ? (
            <p className="mb-1.5 text-[11px] font-medium text-[#818c99]">Сохранено: {updatedLabel}</p>
          ) : null}
          <pre className="whitespace-pre-wrap font-sans text-[13px] leading-snug text-[#2c2d2e]">{savedBrief}</pre>
        </div>
      ) : (
        <p className={`mt-2 ${vk.mutedXs}`}>
          Пока пусто — появится после ваших сообщений в чате и сохранится в карточке ученика.
        </p>
      )}

      {showPreview ? (
        <div className="mt-2 rounded-lg border border-dashed border-[#2d81e0]/40 bg-white/80 p-2.5">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#2d81e0]">
            Черновик (обновится после ответа)
          </p>
          <pre className="whitespace-pre-wrap font-sans text-[13px] leading-snug text-[#2c2d2e]">{previewBrief}</pre>
        </div>
      ) : null}
    </div>
  )
}

export default memo(CoachAssistantStudentContextBlock)
