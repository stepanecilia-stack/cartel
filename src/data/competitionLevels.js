/**
 * Ветка отбора + ступень (город / край / округ / Россия).
 * @typedef {'federation' | 'spartakiad' | 'society' | 'experience' | 'match'} CompetitionTrackId
 * @typedef {'pmo' | 'chmo' | 'city' | 'krai' | 'district' | 'russia'} CompetitionStageId
 */

/** @type {Array<{ id: CompetitionTrackId, label: string, short: string, ladder: boolean, microPrep: boolean, chip: string }>} */
export const COMPETITION_TRACKS = [
  {
    id: 'federation',
    label: 'Первенства',
    short: '',
    ladder: true,
    microPrep: true,
    chip: 'bg-rose-50 border-rose-200 text-rose-950',
  },
  {
    id: 'spartakiad',
    label: 'Спартакиада',
    short: 'сп',
    ladder: true,
    microPrep: true,
    chip: 'bg-violet-50 border-violet-300 text-violet-950',
  },
  {
    id: 'society',
    label: 'Общество',
    short: 'общ',
    ladder: true,
    microPrep: true,
    chip: 'bg-indigo-50 border-indigo-300 text-indigo-950',
  },
  {
    id: 'experience',
    label: 'Водокачка',
    short: 'оп',
    ladder: false,
    microPrep: false,
    chip: 'bg-slate-100 border-slate-300 text-slate-800',
  },
  {
    id: 'match',
    label: 'Боевая практика',
    short: 'бп',
    ladder: false,
    microPrep: false,
    chip: 'bg-slate-50 border-slate-200 text-slate-700',
  },
]

/** @type {Array<{ id: CompetitionStageId, label: string, short: string, defaultDays: number, chip: string }>} */
export const COMPETITION_STAGES = [
  { id: 'pmo', label: 'ПМО', short: 'ПМО', defaultDays: 3, chip: 'bg-amber-50 border-amber-300 text-amber-950' },
  { id: 'chmo', label: 'ЧМО', short: 'ЧМО', defaultDays: 3, chip: 'bg-amber-100 border-amber-400 text-amber-950' },
  { id: 'krai', label: 'Область / край', short: 'край', defaultDays: 7, chip: 'bg-orange-50 border-orange-300 text-orange-950' },
  { id: 'district', label: 'Зона России', short: 'зона', defaultDays: 7, chip: 'bg-sky-50 border-sky-300 text-sky-950' },
  { id: 'russia', label: 'Россия', short: 'РФ', defaultDays: 10, chip: 'bg-rose-50 border-rose-300 text-rose-950' },
]

const TRACK_BY_ID = Object.fromEntries(COMPETITION_TRACKS.map((t) => [t.id, t]))
const STAGE_BY_ID = Object.fromEntries(COMPETITION_STAGES.map((s) => [s.id, s]))

/** @param {CompetitionTrackId} trackId */
export function stagesForTrack(trackId) {
  if (trackId === 'federation') return COMPETITION_STAGES
  if (trackId === 'spartakiad' || trackId === 'society') {
    return COMPETITION_STAGES.filter((s) => s.id !== 'pmo' && s.id !== 'chmo')
  }
  return []
}

/**
 * @param {{ track?: string, stage?: string | null, level?: string }} raw
 * @returns {{ track: CompetitionTrackId, stage: CompetitionStageId | null }}
 */
export function normalizeCompetitionTrackStage(raw) {
  const title = ''
  if (raw.track && TRACK_BY_ID[raw.track]) {
    const track = raw.track
    const stages = stagesForTrack(track)
    let stage =
      raw.stage && stages.some((s) => s.id === raw.stage) ? raw.stage : stages[stages.length - 1]?.id ?? null
    if (stage === 'city') stage = 'pmo'
    return { track, stage }
  }

  const legacy = raw.level ?? ''
  if (legacy === 'spartakiad') return { track: 'spartakiad', stage: guessStageFromTitle(title) ?? 'russia' }
  if (legacy === 'society') return { track: 'society', stage: guessStageFromTitle(title) ?? 'russia' }
  if (legacy === 'experience') return { track: 'experience', stage: null }
  if (legacy === 'match') return { track: 'match', stage: null }
  if (STAGE_BY_ID[legacy]) return { track: 'federation', stage: legacy }

  return { track: 'federation', stage: 'krai' }
}

/**
 * @param {{ track: CompetitionTrackId, stage: CompetitionStageId | null, title?: string }} c
 */
export function getCompetitionMeta(c) {
  const track = TRACK_BY_ID[c.track] ?? TRACK_BY_ID.federation
  const stageKey = c.stage === 'city' ? 'pmo' : c.stage
  const stage = stageKey ? STAGE_BY_ID[stageKey] : null

  if (!stage) {
    return {
      track: track.id,
      stage: null,
      label: track.label,
      short: track.short,
      chip: track.chip,
      defaultDays: track.id === 'match' ? 1 : 2,
      microPrep: track.microPrep,
      ladder: track.ladder,
    }
  }

  const short = track.short ? `${track.short}·${stage.short}` : stage.short
  const label =
    track.id === 'federation'
      ? stage.label
      : `${track.label} · ${stage.label}`

  const chip = track.id === 'federation' ? stage.chip : track.chip

  return {
    track: track.id,
    stage: stage.id,
    label,
    short,
    chip,
    defaultDays: stage.defaultDays,
    microPrep: track.microPrep,
    ladder: track.ladder,
  }
}

/** @deprecated use getCompetitionMeta */
export function getCompetitionLevel(id) {
  return getCompetitionMeta({ track: 'federation', stage: id })
}

/** @param {string | null | undefined} id */
export function getCompetitionTrack(id) {
  return TRACK_BY_ID[id] ?? TRACK_BY_ID.federation
}

/** @param {string} dateISO @param {number} addDays */
export function addDaysISO(dateISO, addDays) {
  const d = new Date(dateISO + 'T12:00:00')
  d.setDate(d.getDate() + addDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function normalizeCompetitionRange(startISO, endISO) {
  const start = startISO
  const end = endISO && endISO >= start ? endISO : start
  return { dateISO: start, dateEndISO: end }
}

/** @param {{ dateISO: string, dateEndISO?: string }} c */
export function competitionDateRange(c) {
  const start = c.dateISO
  const end = c.dateEndISO && c.dateEndISO >= start ? c.dateEndISO : start
  const out = []
  let cursor = start
  let guard = 0
  while (cursor <= end && guard < 31) {
    out.push(cursor)
    if (cursor === end) break
    cursor = addDaysISO(cursor, 1)
    guard++
  }
  return out
}

/** @param {{ dateISO: string, dateEndISO?: string }} c */
export function formatCompetitionRange(c) {
  const end = c.dateEndISO && c.dateEndISO !== c.dateISO ? c.dateEndISO : null
  const a = c.dateISO.slice(5)
  if (!end) return a
  return `${a}–${end.slice(5)}`
}

/** @param {string} title */
export function guessStageFromTitle(title) {
  const t = title.toLowerCase()
  if (/россия|чр\b|первенство рф|финал/i.test(t)) return 'russia'
  if (/юфо|округ|чюфо|пюфо/i.test(t)) return 'district'
  if (/край|област|чкк|пкк/i.test(t)) return 'krai'
  if (/\bчмо\b|чемпионат мо/i.test(t)) return 'chmo'
  if (/\bпмо\b|первенство мо|город|муницип/i.test(t)) return 'pmo'
  return null
}

/**
 * @param {string} title
 * @param {string | null | undefined} legacyLevel
 */
export function guessCompetitionFromTitle(title, legacyLevel = null) {
  const t = title.toLowerCase()
  const stage = guessStageFromTitle(title) ?? 'russia'

  if (legacyLevel === 'spartakiad' || /спартакиад/i.test(t)) {
    return { track: 'spartakiad', stage: guessStageFromTitle(title) ?? 'russia' }
  }
  if (legacyLevel === 'society' || /спартак|динамо|юность/i.test(t)) {
    return { track: 'society', stage: guessStageFromTitle(title) ?? 'russia' }
  }
  if (legacyLevel === 'match' || /матчев/i.test(t)) return { track: 'match', stage: null }
  if (legacyLevel === 'experience') return { track: 'experience', stage: null }

  if (/спартакиад/i.test(t)) return { track: 'spartakiad', stage }
  if (/спартак|динамо|юность/i.test(t)) return { track: 'society', stage }
  if (/матчев/i.test(t)) return { track: 'match', stage: null }

  return { track: 'federation', stage }
}
