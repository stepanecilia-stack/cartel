const INTERNAL_LEVEL1_RAW = [
  {
    number: '1',
    name: 'Фронтальная стойка',
    videoLink: 'https://kinescope.io/crkhdpg2H4pfNF9QAe7K6j',
    embedUrl: 'https://kinescope.io/embed/crkhdpg2H4pfNF9QAe7K6j',
  },
  {
    number: '2',
    name: 'Передвижение по кругу во фронтальной стойке',
    embedUrl: 'https://kinescope.io/embed/vDRLRniefWjxUmQyNG7fZM',
  },
  {
    number: '3',
    name: 'Боевая стойка',
    embedUrl: 'https://kinescope.io/embed/p8MLL24riz3iuAGvLY4g9z',
  },
  { number: '4', name: 'Передвижение в боевой стойке (вперед-назад, влево-вправо)' },
  {
    number: '5',
    name: 'Оттяжка шагом',
    embedUrl: 'https://kinescope.io/embed/4LuHw7D1T17fYLr7pHuLGm',
  },
  {
    number: '6',
    name: 'Оттяжка отскоком',
    embedUrl: 'https://kinescope.io/embed/iQQFRyGacsVqaXBk4Z7Sy3',
  },
  {
    number: '7',
    name: 'Прямой передней в голову',
    embedUrl: 'https://kinescope.io/embed/hkwnizBx29e45w5pTr3mX2',
  },
  {
    number: '8',
    name: 'Защита подставкой (голова)',
    embedUrl: 'https://kinescope.io/embed/2jyTWAK5oJNNSrstRuJm1b',
  },
  {
    number: '9',
    name: 'Прямой передней в туловище',
    embedUrl: 'https://kinescope.io/embed/dKDcGJynHenVUWGMC4Qrpa',
  },
  {
    number: '10',
    name: 'Защита подставкой локтя (туловище)',
    embedUrl: 'https://kinescope.io/embed/2DM8d7gqZV3BjiNUwCi3Ln',
  },
  {
    number: '11',
    name: 'Прямой сильной в голову',
    embedUrl: 'https://kinescope.io/embed/8Ge7BHUg2XGriAKZzMpz5G',
  },
  {
    number: '12',
    name: 'Защита подставкой плеча',
    embedUrl: 'https://kinescope.io/embed/qa7oF5o56MZhUoK6b7ppYz',
  },
  {
    number: '13',
    name: 'Прямой сильной в туловище',
    embedUrl: 'https://kinescope.io/embed/4ckN6vucDuVBiPxJzZX4E4',
  },
  {
    number: '14',
    name: 'Удары во фронтальной стойке на скрёстном шаге',
    embedUrl: 'https://kinescope.io/embed/37HbpoPt3hhCUuZKRcATi5',
  },
  {
    number: '15',
    name: 'Защита уклоном',
    embedUrl: 'https://kinescope.io/embed/fWvsuo2cZJKmHQ3dV3xKP1',
  },
  {
    number: '16',
    name: 'Защита отбивом (внутрь/наружу)',
    embedUrl: 'https://kinescope.io/embed/bvAPLEh1kXa62Sasip7hRi',
  },
  {
    number: '17',
    name: 'Сайдстеп',
    embedUrl: 'https://kinescope.io/embed/mFSdWcFinzZKdnxyGreLnQ',
  },
  {
    number: '18',
    name: 'Нырок',
    embedUrl: 'https://kinescope.io/embed/jExABSf5iqH8ix9wpugktt',
  },
  {
    number: '19',
    name: 'Разворот (в боевой стойке)',
    embedUrl: '',
  },
]

const INTERNAL_LEVEL2_RAW = [
  { number: '2.1', name: 'Передней сбоку' },
  { number: '2.2', name: 'Сильной сбоку' },
  { number: '2.3', name: 'Подставка (от боковых)' },
  { number: '2.4', name: 'Передней снизу в корпус' },
  { number: '2.5', name: 'Сильной снизу в корпус' },
  { number: '2.6', name: 'Передней снизу в голову' },
  { number: '2.7', name: 'Сильной снизу в голову' },
  { number: '2.8', name: 'Передней сбоку (на выходе)' },
]

function emptyAtomMedia() {
  return {
    posterSrc: null,
    webmSrc: null,
    detailPosterSrc: null,
    detailWebmSrc: null,
    detailEmbedUrl: null,
    detailVideoLink: null,
  }
}

function normalizeLevel1(item) {
  return {
    id: `atom_${item.number}`,
    number: item.number,
    name: item.name,
    howTo: item.howTo ?? '',
    whyHowTo: item.whyHowTo ?? '',
    mistakes: item.mistakes ?? '',
    whyMistakes: item.whyMistakes ?? '',
    videoLink: item.videoLink ?? '',
    embedUrl: item.embedUrl ?? '',
    media: emptyAtomMedia(),
  }
}

function normalizeLevel2(item, idx) {
  return {
    id: `lvl2_${idx + 1}`,
    number: item.number,
    name: item.name,
    howTo: '',
    whyHowTo: '',
    mistakes: '',
    whyMistakes: '',
    videoLink: '',
    embedUrl: '',
    techniqueTier: 2,
    media: emptyAtomMedia(),
  }
}

export const DEFAULT_TECHNICAL_LEVEL1 = INTERNAL_LEVEL1_RAW.map(normalizeLevel1)
export const DEFAULT_TECHNICAL_LEVEL2 = INTERNAL_LEVEL2_RAW.map(normalizeLevel2)

export function getDefaultTechnicalProgramAtoms() {
  return {
    level1: DEFAULT_TECHNICAL_LEVEL1,
    level2: DEFAULT_TECHNICAL_LEVEL2,
  }
}
