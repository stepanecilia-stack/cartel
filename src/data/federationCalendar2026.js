/**
 * Ориентировочный календарь 2026 (федерация).
 * Лестница: ПМО (юниоры) / ЧМО (19–40) → область/край → зона России → Россия.
 * Без городов в названиях — только уровень и даты.
 * @typedef {'M' | 'F'} AthleteGender
 */

/** @typedef {import('./competitionLevels.js').CompetitionStageId} CompetitionStageId */

/** @typedef {{
 *   id: string,
 *   dateISO: string,
 *   dateEndISO: string,
 *   title: string,
 *   track: import('./competitionLevels.js').CompetitionTrackId,
 *   stage: CompetitionStageId | null,
 * }} FederationCalendarEvent
 */

/** @typedef {{
 *   id: string,
 *   gender: AthleteGender,
 *   minAge: number,
 *   maxAge: number,
 *   label: string,
 *   events: FederationCalendarEvent[],
 * }} FederationCalendarCohort
 */

/** @type {Record<string, string>} */
const STAGE_TITLE = {
  pmo: 'ПМО',
  chmo: 'ЧМО',
  krai: 'Первенство области / края',
  district: 'Первенство зоны России',
  russia: 'Первенство России',
  russiaSenior: 'Чемпионат России',
}

/**
 * @param {string} cohortKey
 * @param {Array<{ suffix: string, stage: CompetitionStageId, dateISO: string, dateEndISO: string, title?: string, track?: import('./competitionLevels.js').CompetitionTrackId }>} steps
 */
function ladderOrientirs(cohortKey, steps) {
  return steps.map((s, index) => ({
    id: `orientir-2026-${cohortKey}-${s.suffix}`,
    dateISO: s.dateISO,
    dateEndISO: s.dateEndISO,
    title: s.title ?? STAGE_TITLE[s.stage] ?? s.stage,
    track: s.track ?? 'federation',
    stage: s.stage,
  }))
}

/** Юниоры 13–40 (кроме взрослых): ПМО → край → зона → ПР */
function youthLadder(cohortKey, pmo, krai, zone, russia, extra = []) {
  return ladderOrientirs(cohortKey, [
    { suffix: 'pmo', stage: 'pmo', ...pmo },
    { suffix: 'krai', stage: 'krai', ...krai },
    { suffix: 'zone', stage: 'district', ...zone },
    { suffix: 'russia', stage: 'russia', ...russia },
    ...extra.map((e) => ({ ...e, track: e.track ?? 'federation' })),
  ])
}

/** Взрослые 19–40: ЧМО → край → зона → ЧР */
function seniorLadder(cohortKey, chmo, krai, zone, russia, extra = []) {
  return ladderOrientirs(cohortKey, [
    { suffix: 'chmo', stage: 'chmo', title: STAGE_TITLE.chmo, ...chmo },
    { suffix: 'krai', stage: 'krai', ...krai },
    { suffix: 'zone', stage: 'district', ...zone },
    {
      suffix: 'russia',
      stage: 'russia',
      title: STAGE_TITLE.russiaSenior,
      ...russia,
    },
    ...extra.map((e) => ({ ...e, track: e.track ?? 'federation' })),
  ])
}

/** @type {FederationCalendarCohort[]} */
export const FEDERATION_CALENDAR_2026 = [
  {
    id: 'M-13-14',
    gender: 'M',
    minAge: 13,
    maxAge: 14,
    label: 'Юноши 13–14',
    events: youthLadder(
      'M-13-14',
      { dateISO: '2026-02-20', dateEndISO: '2026-02-27' },
      { dateISO: '2026-03-08', dateEndISO: '2026-03-15' },
      { dateISO: '2026-03-29', dateEndISO: '2026-04-05' },
      { dateISO: '2026-05-14', dateEndISO: '2026-05-24' },
    ),
  },
  {
    id: 'F-13-14',
    gender: 'F',
    minAge: 13,
    maxAge: 14,
    label: 'Девушки 13–14',
    events: youthLadder(
      'F-13-14',
      { dateISO: '2026-02-20', dateEndISO: '2026-02-27' },
      { dateISO: '2026-03-08', dateEndISO: '2026-03-15' },
      { dateISO: '2026-03-29', dateEndISO: '2026-04-05' },
      { dateISO: '2026-05-14', dateEndISO: '2026-05-24' },
    ),
  },
  {
    id: 'M-15-16',
    gender: 'M',
    minAge: 15,
    maxAge: 16,
    label: 'Юноши 15–16',
    events: youthLadder(
      'M-15-16',
      { dateISO: '2026-02-10', dateEndISO: '2026-02-17' },
      { dateISO: '2026-02-24', dateEndISO: '2026-03-03' },
      { dateISO: '2026-03-05', dateEndISO: '2026-03-11' },
      { dateISO: '2026-04-17', dateEndISO: '2026-04-26' },
      [
        {
          suffix: 'spart',
          stage: 'russia',
          dateISO: '2026-06-28',
          dateEndISO: '2026-07-05',
          title: 'Спартакиада',
          track: 'spartakiad',
        },
      ],
    ),
  },
  {
    id: 'F-15-16',
    gender: 'F',
    minAge: 15,
    maxAge: 16,
    label: 'Девушки 15–16',
    events: youthLadder(
      'F-15-16',
      { dateISO: '2026-02-10', dateEndISO: '2026-02-17' },
      { dateISO: '2026-02-24', dateEndISO: '2026-03-03' },
      { dateISO: '2026-03-05', dateEndISO: '2026-03-11' },
      { dateISO: '2026-04-17', dateEndISO: '2026-04-26' },
      [
        {
          suffix: 'spart',
          stage: 'russia',
          dateISO: '2026-06-28',
          dateEndISO: '2026-07-05',
          title: 'Спартакиада',
          track: 'spartakiad',
        },
      ],
    ),
  },
  {
    id: 'M-17-18',
    gender: 'M',
    minAge: 17,
    maxAge: 18,
    label: 'Юниоры 17–18',
    events: youthLadder(
      'M-17-18',
      { dateISO: '2026-03-01', dateEndISO: '2026-03-08' },
      { dateISO: '2026-03-22', dateEndISO: '2026-03-29' },
      { dateISO: '2026-04-11', dateEndISO: '2026-04-18' },
      { dateISO: '2026-05-04', dateEndISO: '2026-05-15' },
    ),
  },
  {
    id: 'F-17-18',
    gender: 'F',
    minAge: 17,
    maxAge: 18,
    label: 'Юниорки 17–18',
    events: youthLadder(
      'F-17-18',
      { dateISO: '2026-03-01', dateEndISO: '2026-03-08' },
      { dateISO: '2026-03-22', dateEndISO: '2026-03-29' },
      { dateISO: '2026-04-11', dateEndISO: '2026-04-18' },
      { dateISO: '2026-05-04', dateEndISO: '2026-05-15' },
    ),
  },
  {
    id: 'M-19-22',
    gender: 'M',
    minAge: 19,
    maxAge: 22,
    label: 'Юниоры 19–22',
    events: youthLadder(
      'M-19-22',
      { dateISO: '2026-04-01', dateEndISO: '2026-04-08' },
      { dateISO: '2026-04-20', dateEndISO: '2026-04-27' },
      { dateISO: '2026-05-15', dateEndISO: '2026-05-22' },
      { dateISO: '2026-06-01', dateEndISO: '2026-06-14' },
    ),
  },
  {
    id: 'F-19-22',
    gender: 'F',
    minAge: 19,
    maxAge: 22,
    label: 'Юниорки 19–22',
    events: youthLadder(
      'F-19-22',
      { dateISO: '2026-04-01', dateEndISO: '2026-04-08' },
      { dateISO: '2026-04-20', dateEndISO: '2026-04-27' },
      { dateISO: '2026-05-15', dateEndISO: '2026-05-22' },
      { dateISO: '2026-06-01', dateEndISO: '2026-06-14' },
    ),
  },
  {
    id: 'M-19-40',
    gender: 'M',
    minAge: 23,
    maxAge: 40,
    label: 'Мужчины 23–40',
    events: seniorLadder(
      'M-19-40',
      { dateISO: '2026-05-01', dateEndISO: '2026-05-08' },
      { dateISO: '2026-05-20', dateEndISO: '2026-05-27' },
      { dateISO: '2026-06-29', dateEndISO: '2026-07-05' },
      { dateISO: '2026-08-26', dateEndISO: '2026-09-06' },
      [
        {
          suffix: 'spart',
          stage: 'russia',
          dateISO: '2026-08-02',
          dateEndISO: '2026-08-09',
          title: 'Спартакиада',
          track: 'spartakiad',
        },
      ],
    ),
  },
  {
    id: 'F-19-40',
    gender: 'F',
    minAge: 23,
    maxAge: 40,
    label: 'Женщины 23–40',
    events: seniorLadder(
      'F-19-40',
      { dateISO: '2026-05-01', dateEndISO: '2026-05-08' },
      { dateISO: '2026-05-20', dateEndISO: '2026-05-27' },
      { dateISO: '2026-06-29', dateEndISO: '2026-07-05' },
      { dateISO: '2026-10-01', dateEndISO: '2026-10-15' },
      [
        {
          suffix: 'spart',
          stage: 'russia',
          dateISO: '2026-08-02',
          dateEndISO: '2026-08-09',
          title: 'Спартакиада',
          track: 'spartakiad',
        },
      ],
    ),
  },
]

/** Взрослые: 23–40 (ЧМО). Юниоры 19–22 остаются с ПМО. */
export const SENIOR_MIN_AGE = 23

/**
 * @param {number | null | undefined} ageInt
 * @param {AthleteGender | string | null | undefined} gender
 */
export function matchFederationCalendarCohort(ageInt, gender) {
  if (ageInt == null || !Number.isFinite(ageInt)) return null
  const age = Math.floor(ageInt)
  if (age < 13 || age > 40) return null
  const g = gender === 'F' ? 'F' : 'M'

  let best = null
  for (const cohort of FEDERATION_CALENDAR_2026) {
    if (cohort.gender !== g) continue
    if (age < cohort.minAge || age > cohort.maxAge) continue
    if (!best || cohort.maxAge - cohort.minAge < best.maxAge - best.minAge) {
      best = cohort
    }
  }
  return best
}

/**
 * @param {number | null | undefined} ageInt
 * @param {AthleteGender | string | null | undefined} gender
 * @returns {import('../utils/plannedCompetitions.js').PlannedCompetition[]}
 */
export function buildFederationOrientirCompetitions(ageInt, gender) {
  const cohort = matchFederationCalendarCohort(ageInt, gender)
  if (!cohort) return []

  return cohort.events.map((e, index) => ({
    id: e.id,
    dateISO: e.dateISO,
    dateEndISO: e.dateEndISO,
    title: e.title,
    track: e.track,
    stage: e.stage,
    newLadderCycle: index === 0,
    dateStatus: /** @type {'orientir'} */ ('orientir'),
  }))
}

export function federationCalendarHint(ageInt, gender) {
  const cohort = matchFederationCalendarCohort(ageInt, gender)
  if (!cohort) {
    return 'Возраст 13–40 и пол на вкладке «Карта» — подставим ориентиры 2026 (ПМО/ЧМО → край → зона → Россия).'
  }
  const ladder =
    cohort.minAge >= SENIOR_MIN_AGE ? 'ЧМО → край → зона → Россия' : 'ПМО → край → зона → Россия'
  return `${cohort.label} · ${ladder} · ориентир 2026. Удалите лишние старты.`
}
