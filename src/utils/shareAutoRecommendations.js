/** Чем меньше — тем выше приоритет в подборе «зон роста». */
function normGrowthPriority(item) {
  if (!item?.hasResult) return 10000
  const tier = { red: 0, bronze: 1, silver: 2, gold: 3, empty: 99 }
  const t = tier[item.status] ?? 50
  const score = Number(item.normalizedScore)
  const scorePart = Number.isFinite(score) ? score : 0
  return t * 1000 - scorePart
}

function technicalGrowthPriority(atom) {
  const pct = Number(atom.levelPercent)
  const p = Number.isFinite(pct) ? pct : 0
  const k = atom.levelKey || ''
  const tie = k === 'NOT_LEARNED' ? 0 : k === 'KNOWLEDGE' ? 1 : k === 'MOTOR_SKILL_LEVEL_1' ? 2 : k === 'MOTOR_SKILL_LEVEL_2' ? 3 : 4
  return p * 10 + tie
}

/**
 * Короткие нейтральные рекомендации для публичной страницы (семья + спортсмен).
 * Тон: зоны роста, без давления и медицинских ярлыков.
 */
export function buildShareAutoRecommendations({
  physicalItems = [],
  functionalItems = [],
  technicalItems = [],
  duelRows = [],
}) {
  const intro =
    'Ниже — автоматические ориентиры по текущим данным карточки. Они подсказывают, на что обратить внимание, и не заменяют индивидуальный план тренера.'

  const bullets = []
  const allNormsRaw = [...physicalItems, ...functionalItems]
    .filter((i) => i.hasResult && ['red', 'bronze', 'silver'].includes(i.status))
    .sort((a, b) => normGrowthPriority(a) - normGrowthPriority(b))

  const seenIds = new Set()
  const allNorms = []
  for (const n of allNormsRaw) {
    const id = String(n.id ?? '')
    if (id && seenIds.has(id)) continue
    if (id) seenIds.add(id)
    allNorms.push(n)
  }

  const normPick = allNorms.slice(0, 3)
  for (const n of normPick) {
    const name = String(n.name || 'норматив').trim()
    if (n.status === 'red') {
      bullets.push(
        `По «${name}» сейчас ниже нормы: результат необходимо подтянуть к целям норматива — опирайтесь на задания тренера и регулярность занятий.`,
      )
    } else if (n.status === 'bronze') {
      bullets.push(
        `«${name}» — уже близко к устойчивой норме; небольшой шаг вперёд часто даёт заметный скачок уверенности и в других упражнениях.`,
      )
    } else {
      bullets.push(
        `«${name}» — хороший задел; если удастся чуть приблизить к «золоту», это усилит общий баланс подготовки.`,
      )
    }
  }

  const techCandidates = [...technicalItems]
    .filter((a) => a.levelKey && a.levelKey !== 'AUTOMATED')
    .sort((a, b) => technicalGrowthPriority(a) - technicalGrowthPriority(b))
    .slice(0, 2)

  if (techCandidates.length > 0) {
    const names = techCandidates
      .map((a) => {
        const num = a.number ? `#${a.number} ` : ''
        return `${num}${String(a.name || 'элемент').trim()}`
      })
      .filter(Boolean)
    if (names.length === 1) {
      bullets.push(`В технике приоритетной зоной роста выглядит ${names[0]} — спокойная повторяемость на тренировке даёт лучший эффект, чем редкие «рывки».`)
    } else if (names.length === 2) {
      bullets.push(
        `В технике сейчас логично поддержать ${names[0]} и ${names[1]}: короткие повторы и внимание к деталям, которые подсвечивает тренер, обычно дают самый ровный прогресс.`,
      )
    }
  }

  const heightRow = Array.isArray(duelRows) ? duelRows.find((r) => r.key === 'height') : null
  if (
    heightRow &&
    Number.isFinite(heightRow.delta) &&
    Number.isFinite(heightRow.athleteValue) &&
    heightRow.athleteValue > 0 &&
    heightRow.delta <= -4 &&
    bullets.length < 6
  ) {
    bullets.push(
      'Рост отличается от усреднённого эталона по таблице программы — это обычная индивидуальность. Тренер уже подстраивает работу под фактические данные; вопросы лучше обсудить очно.',
    )
  }

  if (bullets.length === 0) {
    bullets.push(
      'По внесённым данным явных «узких мест» не выделяется — сохраняйте регулярность, и при появлении новых результатов подсказки обновятся автоматически.',
    )
  }

  return { intro, bullets: bullets.slice(0, 6) }
}
