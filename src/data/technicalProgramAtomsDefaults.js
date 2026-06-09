const INTERNAL_LEVEL1_RAW = [
  { number: '1', name: 'Фронтальная стойка' },
  { number: '2', name: 'Передвижение по кругу во фронтальной стойке' },
  { number: '3', name: 'Боевая стойка' },
  { number: '4', name: 'Передвижение в боевой стойке (вперед-назад, влево-вправо)' },
  { number: '5', name: 'Оттяжка шагом' },
  { number: '6', name: 'Оттяжка отскоком' },
  { number: '7', name: 'Прямой передней в голову' },
  { number: '8', name: 'Защита подставкой (голова)' },
  { number: '9', name: 'Прямой передней в туловище' },
  { number: '10', name: 'Защита подставкой локтя (туловище)' },
  { number: '11', name: 'Прямой сильной в голову' },
  { number: '12', name: 'Защита подставкой плеча' },
  { number: '13', name: 'Прямой сильной в туловище' },
  { number: '14', name: 'Удары во фронтальной стойке на скрёстном шаге' },
  { number: '15', name: 'Защита уклоном' },
  { number: '16', name: 'Защита отбивом (внутрь/наружу)' },
  { number: '17', name: 'Сайдстеп' },
  { number: '18', name: 'Нырок' },
  { number: '19', name: 'Разворот (в боевой стойке)' },
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
