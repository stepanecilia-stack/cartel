import { memo, useState } from 'react'
import {
  CARTEL_STAGES,
  cartelStageMeta,
  compareCartelStage,
  nextCartelStage,
} from '../../data/cartelParticipation.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   currentStage: import('../../data/cartelParticipation.js').CartelStageId,
 *   eligibleStage?: import('../../data/cartelParticipation.js').CartelStageId,
 *   earlyAccess?: boolean,
 *   stageNote?: string,
 *   canSave?: boolean,
 *   busy?: boolean,
 *   onSetStage: (
 *     stage: import('../../data/cartelParticipation.js').CartelStageId,
 *     opts?: { earlyAccess?: boolean, note?: string },
 *   ) => void | Promise<void>,
 * }} props
 */
function CartelCoachStageControl({
  currentStage,
  eligibleStage = 'base',
  earlyAccess = false,
  stageNote = '',
  canSave = true,
  busy = false,
  onSetStage,
}) {
  const [openException, setOpenException] = useState(false)
  const [pickStage, setPickStage] = useState(
    /** @type {import('../../data/cartelParticipation.js').CartelStageId} */ ('competition'),
  )
  const [note, setNote] = useState(stageNote || '')

  const next = nextCartelStage(currentStage)
  const metricsSuggestHigher = compareCartelStage(eligibleStage, currentStage) > 0

  const confirmNextStep = () => {
    if (!next) return
    const meta = cartelStageMeta(next)
    const ok = window.confirm(
      `Открыть ученику этап «${meta.title}»?\n\n${meta.subtitle}\n\nЭто решение только тренера. Календарь стартов — на этапе «Соревнования».`,
    )
    if (!ok) return
    void onSetStage(next, { earlyAccess: false, note: '' })
  }

  const confirmException = () => {
    const meta = cartelStageMeta(pickStage)
    const isEarly = compareCartelStage(pickStage, eligibleStage) > 0
    const calendarOpens = pickStage === 'competition'
    const lines = [
      `Досрочно открыть этап «${meta.title}»?`,
      '',
      meta.subtitle,
      '',
      isEarly
        ? 'По цифрам карточки этап ещё не «созрел» — это исключение (как досрочный допуск к серьёзным стартам).'
        : 'Этап совпадает с показателями карточки.',
      calendarOpens ? 'Календарь стартов будет доступен.' : 'Календарь стартов пока закрыт.',
      '',
      'Продолжить?',
    ]
    if (!window.confirm(lines.join('\n'))) return
    void onSetStage(pickStage, {
      earlyAccess: isEarly,
      note: note.trim() || (isEarly ? 'Досрочный допуск (тренер)' : ''),
    })
    setOpenException(false)
  }

  const resetToTrain = () => {
    if (
      !window.confirm(
        'Вернуть ученика на этап «База»? Календарь стартов закроется. Используйте, если допуск был ошибочным.',
      )
    ) {
      return
    }
    void onSetStage('base', { earlyAccess: false, note: '' })
  }

  return (
    <div className="mt-4 rounded-lg border border-[#e7e8ec] bg-[#fafbfc] px-2.5 py-2.5">
      <p className="text-[12px] font-bold text-[#2c2d2e]">Доступ открывает только тренер</p>
      <p className="mt-1 text-[11px] leading-snug text-[#818c99]">
        Приложение подсказывает тренировки. Следующий этап и календарь — ваше решение. В исключительных
        случаях можно открыть даже «Отборы» или «Пик» досрочно.
      </p>

      {earlyAccess ? (
        <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-950">
          <span className="font-semibold">Досрочный допуск.</span>
          {stageNote ? ` ${stageNote}` : ' Решение тренера, не по автоматическим порогам.'}
        </p>
      ) : null}

      {metricsSuggestHigher && !earlyAccess ? (
        <p className="mt-2 text-[11px] text-[#818c99]">
          По карточке можно было бы открыть «{cartelStageMeta(eligibleStage).title}» — но только вы
          нажимаете кнопку ниже.
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {next ? (
          <button
            type="button"
            className={vk.btnPrimary}
            disabled={!canSave || busy}
            onClick={confirmNextStep}
          >
            Следующий этап: {cartelStageMeta(next).title}
          </button>
        ) : (
          <span className="text-[12px] text-[#818c99]">Максимальный этап уже открыт.</span>
        )}
        <button
          type="button"
          className={vk.btnSecondary}
          disabled={!canSave || busy}
          onClick={() => setOpenException((v) => !v)}
        >
          {openException ? 'Скрыть' : 'Досрочный допуск…'}
        </button>
      </div>

      {openException ? (
        <div className="mt-3 space-y-2 rounded-md border border-amber-200 bg-amber-50/60 p-2.5">
          <p className="text-[11px] font-medium text-amber-950">
            Исключение: открыть любой этап (например, сразу отборы при сильной мотивации и вашем
            сопровождении).
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CARTEL_STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={!canSave || busy}
                onClick={() => setPickStage(s.id)}
                className={`rounded-md border px-2 py-1 text-[11px] font-medium ${
                  pickStage === s.id
                    ? 'border-amber-500 bg-white text-amber-950'
                    : 'border-amber-200/80 bg-white/50 text-amber-900'
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
          <label className="block text-[11px] text-[#818c99]">
            Заметка (необязательно): кто / зачем
            <input
              type="text"
              className={`${vk.input} mt-1`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Напр.: досрочно — цель Спартакиада"
              disabled={!canSave || busy}
            />
          </label>
          <button
            type="button"
            className={`${vk.btnPrimary} w-full bg-amber-700 hover:bg-amber-800`}
            disabled={!canSave || busy}
            onClick={confirmException}
          >
            Открыть этап «{cartelStageMeta(pickStage).title}»
          </button>
        </div>
      ) : null}

      {currentStage !== 'base' ? (
        <button
          type="button"
          className="mt-3 text-[11px] text-rose-600 underline-offset-2 hover:underline disabled:opacity-50"
          disabled={!canSave || busy}
          onClick={resetToTrain}
        >
          Сбросить на «База»
        </button>
      ) : null}
    </div>
  )
}

export default memo(CartelCoachStageControl)
