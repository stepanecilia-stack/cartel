/** @typedef {'foundation' | 'advance' | 'peak'} SeasonGoalId */

/** @type {Array<{ id: SeasonGoalId, title: string, line: string }>} */
export const SIMPLE_SEASON_GOALS = [
  {
    id: 'foundation',
    title: 'Для себя',
    line: 'Техника и здоровье, без жёсткого «пика» к одному бою',
  },
  {
    id: 'advance',
    title: 'Повыступать',
    line: 'Больше боёв, пройти отборы дальше',
  },
  {
    id: 'peak',
    title: 'Выигрывать',
    line: 'Главный турнир сезона — пик формы к дате',
  },
]

/** @type {Record<string, string>} */
export const PHASE_PLAIN_RU = {
  ofp: 'База: кросс, школа бокса, снаряды — наращиваем выносливость',
  sfp: 'Боевой темп: отрезки, скорость, снаряды быстро',
  sttm: 'Перед боем: спарринги, тактика, пик формы',
  taper: 'Разгрузка: мало объёма, свежесть',
  preFight: 'За день-два: вес, активация, без нового',
  fight: 'День боя',
  transition: 'Лёгкая неделя: восстановление',
}

/**
 * @param {string} [reason]
 */
export function plainBlockReason(reason) {
  if (!reason) return 'Пока нельзя автоматически расставить подготовку на календаре.'
  return reason
    .replace(/ОФП/g, 'база')
    .replace(/СФП/g, 'боевой темп')
    .replace(/СТТМ/g, 'спарринги')
    .replace(/микроцикл/gi, 'план к бою')
    .replace(/Минспорта/g, 'федерации')
}
