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
    minAge: 19,
    maxAge: 40,
    label: 'Мужчины 19–40',
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
    minAge: 19,
    maxAge: 40,
    label: 'Женщины 19–40',
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

/** Взрослые: 19–40 (ЧМО). С 19 лет — параллельно и юниоры 19–22 (ПМО). */
export const SENIOR_MIN_AGE = 19

/**
 * @param {number | null | undefined} ageInt
 * @param {AthleteGender | string | null | undefined} gender
 */
/**
 * Все возрастные группы, в которые попадает спортсмен (с 19 лет — и 19–22, и 19–40).
 * @param {number | null | undefined} ageInt
 * @param {AthleteGender | string | null | undefined} gender
 * @returns {FederationCalendarCohort[]}
 */
export function matchFederationCalendarCohorts(ageInt, gender) {
  if (ageInt == null || !Number.isFinite(ageInt)) return []
  const age = Math.floor(ageInt)
  if (age < 13 || age > 40) return []
  const g = gender === 'F' ? 'F' : 'M'

  return FEDERATION_CALENDAR_2026.filter(
    (cohort) => cohort.gender === g && age >= cohort.minAge && age <= cohort.maxAge,
  ).sort((a, b) => a.maxAge - a.minAge - (b.maxAge - b.minAge))
}

/** Узкая группа (для подсказок): самый узкий диапазон. */
export function matchFederationCalendarCohort(ageInt, gender) {
  const list = matchFederationCalendarCohorts(ageInt, gender)
  return list[0] ?? null
}

/**
 * @param {FederationCalendarCohort} cohort
 * @param {FederationCalendarEvent} e
 * @param {number} index
 */
function federationEventToOrientir(cohort, e, index) {
  return {
    id: e.id,
    dateISO: e.dateISO,
    dateEndISO: e.dateEndISO,
    title: e.title,
    track: e.track,
    stage: e.stage,
    newLadderCycle: index === 0,
    dateStatus: /** @type {'orientir'} */ ('orientir'),
    orientirCohortId: cohort.id,
    orientirAgeLabels: [cohort.label],
  }
}

/**
 * @param {number | null | undefined} ageInt
 * @param {AthleteGender | string | null | undefined} gender
 * @returns {import('../utils/plannedCompetitions.js').PlannedCompetition[]}
 */
/** Все ориентиры 2026 — отдельная запись на каждую возрастную группу (накладки видны разными цветами). */
export function buildAllFederationOrientirCompetitions() {
  /** @type {import('../utils/plannedCompetitions.js').PlannedCompetition[]} */
  const out = []
  for (const cohort of FEDERATION_CALENDAR_2026) {
    cohort.events.forEach((e, index) => {
      out.push(federationEventToOrientir(cohort, e, index))
    })
  }
  return out.sort((a, b) => a.dateISO.localeCompare(b.dateISO))
}

/** Ориентиры для спортсмена: все подходящие группы (19+ — и 19–22, и 19–40). */
export function buildFederationOrientirCompetitions(ageInt, gender) {
  const cohorts = matchFederationCalendarCohorts(ageInt, gender)
  if (!cohorts.length) return []

  /** @type {import('../utils/plannedCompetitions.js').PlannedCompetition[]} */
  const out = []
  for (const cohort of cohorts) {
    cohort.events.forEach((e, index) => {
      out.push(federationEventToOrientir(cohort, e, index))
    })
  }
  return out.sort((a, b) => a.dateISO.localeCompare(b.dateISO))
}

export function federationCalendarHint(ageInt, gender) {
  const cohorts = matchFederationCalendarCohorts(ageInt, gender)
  if (!cohorts.length) {
    return 'Возраст 13–40 и пол на вкладке «Карта» — подставим ориентиры 2026 (ПМО/ЧМО → край → зона → Россия).'
  }
  const labels = cohorts.map((c) => c.label).join(' + ')
  const hasSenior = cohorts.some((c) => c.id.endsWith('-19-40'))
  const hasYouth = cohorts.some((c) => !c.id.endsWith('-19-40'))
  const ladder =
    hasSenior && hasYouth
      ? 'ПМО/ЧМО → край → зона → Россия'
      : hasSenior
        ? 'ЧМО → край → зона → Россия'
        : 'ПМО → край → зона → Россия'
  return `${labels} · ${ladder} · ориентир 2026. Удалите лишние старты.`
}
