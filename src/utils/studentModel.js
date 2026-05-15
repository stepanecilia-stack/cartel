/** Единое отображение имени: новый формат (name) и legacy (firstName + lastName). */
export function displayNameFromStudent(s) {
  if (!s || typeof s !== 'object') return 'Без имени'
  if (typeof s.name === 'string' && s.name.trim()) return s.name.trim()
  if (typeof s.fullName === 'string' && s.fullName.trim()) return s.fullName.trim()
  const fn = [s.firstName, s.lastName].filter(Boolean).join(' ').trim()
  if (fn) return fn
  return 'Без имени'
}

export function coerceScores(raw) {
  if (!raw || typeof raw !== 'object') {
    return { техника: 0, физика: 0, функционал: 0 }
  }
  return {
    техника: Number(raw.техника ?? 0) || 0,
    физика: Number(raw.физика ?? 0) || 0,
    функционал: Number(raw.функционал ?? 0) || 0,
  }
}

/** Число из Firestore / строки (в т.ч. "2012 г.р."). */
export function normalizeBirthYearNumber(raw) {
  if (raw === null || raw === undefined || raw === '') return 0
  if (typeof raw === 'string') {
    const m = raw.match(/(19|20)\d{2}/)
    if (m) return Number(m[0])
  }
  const n = Number(raw)
  if (Number.isFinite(n) && n >= 1900 && n <= 2100) return Math.floor(n)
  return 0
}

/** Возраст в полных годах: текущий календарный год минус год рождения. */
export function computeAthleteAgeYears(birthYear) {
  const y = normalizeBirthYearNumber(birthYear)
  if (!y) return null
  return new Date().getFullYear() - y
}

/** Единый формат отображения и хранения подписи года. */
export function formatBirthYearRu(year) {
  const y = normalizeBirthYearNumber(year)
  return y ? `${y} г.р.` : ''
}

/** Рост / размах / вес → число для расчётов. */
export function normalizeAnthropometryNumber(val) {
  if (val === null || val === undefined || val === '') return 0
  const n = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : Number(val)
  return Number.isFinite(n) ? n : 0
}

/** Значение для инпута (строка), из любого типа поля Firestore. */
export function anthropometryFieldToInputString(val) {
  const n = normalizeAnthropometryNumber(val)
  if (!n && n !== 0) return ''
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n))
  return String(n)
}

/** Год рождения для поля ввода (только цифры года). */
export function birthYearToInputString(year) {
  const y = normalizeBirthYearNumber(year)
  return y ? String(y) : ''
}

/** YYYY-MM-DD для `input[type=date]` из Firestore / ISO / Date / Timestamp. */
export function birthDateToInputString(val) {
  if (val == null || val === '') return ''
  let raw = val
  if (typeof raw === 'object' && typeof raw.toDate === 'function') {
    raw = raw.toDate()
  }
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return ''
    const y = raw.getFullYear()
    const m = String(raw.getMonth() + 1).padStart(2, '0')
    const d = String(raw.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const s = String(raw).trim()
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const parsed = new Date(s)
  if (Number.isNaN(parsed.getTime())) return ''
  const y = parsed.getFullYear()
  const m = String(parsed.getMonth() + 1).padStart(2, '0')
  const d = String(parsed.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Дата рождения для хранения (YYYY-MM-DD) или `null`, если поле пустое / невалидное.
 * @param {unknown} input
 * @returns {string | null}
 */
export function normalizeBirthDateISO(input) {
  const s = birthDateToInputString(input)
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null
  const now = new Date()
  if (y < 1900 || y > now.getFullYear()) return null
  if (dt.getTime() > now.getTime()) return null
  return s
}

/** Совпадает ли год в полной дате с указанным годом рождения. */
export function birthDateMatchesBirthYear(birthDateISO, birthYear) {
  const y = normalizeBirthYearNumber(birthYear)
  if (!y || !birthDateISO) return true
  return Number(String(birthDateISO).slice(0, 4)) === y
}

/** Поля для расчёта весов / КСР с безопасными числами. */
export function studentAthleteShape(s) {
  if (!s || typeof s !== 'object') {
    return {
      name: 'Без имени',
      height: 0,
      reach: 0,
      weight: 0,
      birthYear: 0,
      birthYearLabel: '',
      gender: 'M',
      scores: coerceScores(null),
    }
  }
  const fromYear =
    normalizeBirthYearNumber(s.birthYear) ||
    normalizeBirthYearNumber(s.birthYearLabel) ||
    (s.birthDate ? normalizeBirthYearNumber(new Date(s.birthDate).getFullYear()) : 0)
  const birthYear = fromYear
  return {
    ...s,
    name: displayNameFromStudent(s),
    height: normalizeAnthropometryNumber(s.height),
    reach: normalizeAnthropometryNumber(s.reach),
    weight: normalizeAnthropometryNumber(s.weight),
    birthYear,
    birthYearLabel: formatBirthYearRu(birthYear) || (typeof s.birthYearLabel === 'string' ? s.birthYearLabel : ''),
    gender: s.gender === 'F' || s.gender === 'Ж' ? 'F' : 'M',
    scores: coerceScores(s.scores),
  }
}

/** 6-значный код для UI: «123 456». */
export function formatShortIdDisplay(shortId) {
  const n = Number(shortId)
  if (!Number.isFinite(n) || n < 100000 || n > 999999) return '—'
  const s = String(Math.floor(n)).padStart(6, '0')
  return `${s.slice(0, 3)} ${s.slice(3)}`
}

/** Только цифры, максимум 6 символов (ввод кода ученика). */
export function sanitizeShortIdInput(raw) {
  if (raw == null || raw === '') return ''
  return String(raw).replace(/\D/g, '').slice(0, 6)
}

/** URL фото ученика (если поле задано в карточке). */
export function studentPhotoUrl(s) {
  if (!s || typeof s !== 'object') return ''
  const u = s.photoURL ?? s.avatarUrl ?? s.photo ?? ''
  return typeof u === 'string' && u.trim() ? u.trim() : ''
}

/** Инициалы для плейсхолдера аватара (1–2 символа). */
export function studentInitials(s) {
  const name = displayNameFromStudent(s)
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2)
  if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase()
  return name.slice(0, 2).toUpperCase() || '?'
}
