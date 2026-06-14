# Методбаза Cartel v1 (черновик)

Документ описывает **структуру знаний** для персональной программы: год → неделя → день.  
Не заменяет `season-plan-spec.md` и не дублирует код в `annualPrepCycle.js` / `juniorPrepTracks.js` — задаёт **что извлечь из книг** и **какие правила** должны жить в системе.

---

## 1. Иерархия источников

При конфликте решение принимается сверху вниз:

| Приоритет | Источник | Роль |
|-----------|----------|------|
| 1 | **Cartel canon** — уже в приложении: Альманах, План УТС, `season-plan-spec` | Якорь продукта, не переписывается книгами |
| 2 | **Филимонов** (теория, практика, планы подготовки) | Бокс: циклы, фазы, структура тренировки, СТТМ |
| 3 | **Градополов** | Возраст, многолетка, объём/интенсивность, педагогика, ограничения |
| 4 | **Аэробика** (учебник) | Содержание **аэробного блока** внутри ОФП/восстановления |
| 5 | **Override тренера** | Всегда сильнее автоматики |

**Правило:** аэробика и Градополов **не задают** тактику боя и структуру СТТМ — только фильтруют и наполняют ОФП/восстановление.

---

## 2. Горизонты планирования

```
Точка B (год)     → macro: полугодия, задача сезона, якоря стартов
       ↓
Meso (4–8 нед)    → фаза подготовки, акценты, контрольные точки
       ↓
Micro (≤21 дн)    → ОФП→СФП→СТТМ→подводка (как в juniorPrepTracks)
       ↓
Неделя            → распределение типов по trainingDays[]
       ↓
День / сессия     → слоты: разминка, техника, ОФП, СТТМ, восстановление
```

| Горизонт | Когда детально | Главный вход |
|----------|----------------|--------------|
| Год | Всегда (дорожная карта) | `seasonGoal`, возраст, Cartel-этап, календарь стартов |
| Meso | Есть цель через 4–12 нед | Якорь + macro-период |
| Micro | Бой/старт ≤ ~21 дня | Подтверждённая дата |
| Неделя | Есть `studentTrainingWeekPlan` | Дни + режим недели |
| День | После approve тренера | Шаблон сессии + персональные атомы/нормативы |

---

## 3. Структура методбазы (разделы)

### 3.1 `meta`

- версия (`v1.0.0`), дата ревью тренером  
- возрастные полосы Cartel: `13–14`, `15–16`, `17–18`, `19–22`, `19–40`  
- связь с `CARTEL_STAGES` (база / подготовка / соревнования)

### 3.2 `macro_year` — годичный цикл

**Из:** Альманах (есть), Филимонов «Теория и практика» гл. многолетка.

| Поле правила | Пример |
|--------------|--------|
| `periodId` | `prep-spring`, `comp-summer`, … |
| `months` | март–апрель |
| `dominantWork` | ОФП↑, техника, без пика |
| `forbidden` | спарринги на полную, пик вне стартов |
| `typicalSessionMix` | `{ ofp: 0.4, tech: 0.4, sfp: 0.2 }` |

**Точка B на год** = набор `{ periodId → целевые акценты }` + 1–3 якоря стартов + `seasonGoal`.

### 3.3 `age_limits` — фильтр Градополова

**Из:** Градополов (приоритет над объёмом из «взрослых» планов).

| Правило | Тип | Пример |
|---------|-----|--------|
| `maxSessionsPerWeek` | cap | 13–14: не более 5 тяжёлых |
| `maxSparringRounds` | cap | по возрасту |
| `forbiddenMethods` | list | то, что нельзя юниору |
| `volumeCeiling` | enum | low / medium / high для meso |

Применяется **после** генерации черновика — режет лишнее.

### 3.4 `phase_micro` — фазы до боя

**Из:** Филимонов, План УТС (частично в `CARTEL_PREP_PHASE_MAP`).

| `phaseId` | `daysUntilFight` | Домinant | Объём ОФП |
|-----------|------------------|----------|-----------|
| `ofp` | 21+ | кросс, школа, вход на снаряды | высокий |
| `sfp` | 14–20 | спец. отрезки, комплексы | средний |
| `sttm` | 7–13 | СТТМ, спарринги | низкий ОФП |
| `taper` | 4–6 | подводка | минимум |
| `preFight` | 1–3 | вес, острота | — |

Шаблоны слотов дня → `filimonovPrepPhases` / `buildFilimonovDaySlots`.

### 3.5 `week_patterns` — N дней в неделю

**Из:** План УТС, здравый смысл + Cartel.

| `sessionsPerWeek` | `weekdayPattern` (пн=0) | `typeSequence` |
|-------------------|-------------------------|----------------|
| 2 | [0, 3] | tech, ofp |
| 3 | [0, 2, 4] | tech, ofp, sttm |
| 4 | [0, 1, 3, 4] | tech, ofp, sfp, sttm |
| … | … | … |

Правила:

- минимум **1 день отдыха** (7 − N ≥ 1)  
- не два **тяжёлых СФП** подряд  
- в **transition**-месяцах (авг, фев) — не более 2 тяжёлых (как в `seasonTasksAutoSchedule`)

### 3.6 `session_templates` — каркас одной тренировки

**Из:** Филимонов (структура занятия), УТС (комплексы).

```yaml
sessionTemplateId: tech_ofp_standard
durationMin: 90
blocks:
  - id: warmup
    min: 15
    source: filimonov_general
  - id: tech
    min: 35
    source: cartel_atoms  # из программы ученика
  - id: ofp_aerobic
    min: 25
    source: aerobics_canon
  - id: cooldown
    min: 10
```

Варианты: `tech_only`, `sfp_intervals`, `sttm_sparring`, `recovery_light`.

### 3.7 `aerobics_canon` — блок из книги по аэробике

**Из:** учебник по аэробике (только этот раздел).

| Правило | Содержание |
|---------|------------|
| `whenToUse` | далеко от боя, transition, лёгкий день после СФП |
| `whenNotToUse` | taper, preFight, день СТТМ-спарринг |
| `formats` | continuous Z2, intervals, circuit — с длительностью |
| `placement` | всегда внутри блока `ofp_aerobic`, не отдельная «тренировка бокса» |

### 3.8 `personalization_hooks` — не из книг

Связь с данными ученика в приложении:

| Hook | Источник в app | Влияние |
|------|----------------|---------|
| `techniqueQueue` | stop point, portalKnowledge, КД | блок `tech` |
| `normWeakness` | нормативы | блок `ofp` / `sfp` |
| `cartelStage` | cartelStage | macro vs micro |
| `trainingDays` | studentTrainingWeekPlan | какие дни заполнять |
| `wellbeing` | bridge / форма | downgrade intensity |
| `coachOverride` | UI тренера | замена типа дня |

### 3.9 `rationale_templates` — объяснение «зачем»

Каждый пункт программы → одна строка для UI:

- «ОФП: кросс 20′ Z2 — фаза OFP, до старта 28 дней, норматив бег −12%»  
- «Техника: атом X — следующий в программе Ур.2»

---

## 4. Типы правил (формат для кодирования)

Каждое правило — запись в JSON/YAML:

```yaml
id: week.sfp.no_consecutive_heavy
source: filimonov_uts
priority: 80
when:
  all:
    - phase_micro in [sfp, sttm]
    - sessionsPerWeek >= 3
then:
  forbid: adjacent_days_with_type [sfp_heavy]
else: allow
rationale: "Восстановление между спец. днями"
```

**Типы `when`:**

- `daysUntilFight`, `periodId`, `ageBand`, `sessionsPerWeek`  
- `cartelStage`, `seasonGoal`, `ladderClosed`  
- `hasConfirmedAnchor`, `wellbeingLevel`

**Типы `then`:**

- `assignSessionTemplate`  
- `setBlockDuration`  
- `cap`, `forbid`, `requireRest`  
- `pickTechniqueAtoms(n)`  
- `pickNormFocus(testId)`

Целевой объём v1: **150–250 правил** (не пересказ книг).

---

## 5. Что извлекать из книг **в первую очередь**

### Филимонов (пакет книг + уже имеющиеся txt)

| # | Тема | Куда в методбазе |
|---|------|------------------|
| 1 | Границы фаз до соревнования (недели/дни) | `phase_micro` |
| 2 | Соотношение ОФП / СФП / СТТМ по фазам | `phase_micro`, `macro_year` |
| 3 | Структура одной тренировки (блоки, порядок) | `session_templates` |
| 4 | Комплексы / типовые связки (1–11 УТС) | `session_templates.blocks` |
| 5 | Подводка и предстарт | `phase_micro` taper/preFight |
| 6 | Переходные периоды | `macro_year` transition |

### Градополов

| # | Тема | Куда |
|---|------|------|
| 1 | Возрастные группы и допустимый объём | `age_limits` |
| 2 | Многолетние этапы (что в каком возрасте главное) | `macro_year` + точка B |
| 3 | Ограничения на соревновательную и спец. нагрузку | `age_limits.forbidden` |
| 4 | Педагогические принципы (не перегружать, чередование) | `week_patterns`, rest rules |

### Аэробика

| # | Тема | Куда |
|---|------|------|
| 1 | Виды аэробной работы и длительность | `aerobics_canon.formats` |
| 2 | Пульсовые зоны / субъективная нагрузка | `aerobics_canon.intensity` |
| 3 | Место в недельном цикле | `aerobics_canon.whenToUse` |
| 4 | Противопоказания / после тяжёлого дня | `aerobics_canon.whenNotToUse` |

**Не извлекать в v1:** история бокса, биографии, общая философия без if/then.

---

## 6. Точка B на год (алгоритм словами)

**Вход:**

- ученик: возраст, пол, стаж, KSR/КД, нормативы, Cartel-этап  
- сезон: `seasonGoal`, `ladderClosed`, `nextSeasonGoal`  
- календарь: подтверждённые старты (0–3)  
- реальность: `sessionsPerWeek` (среднее из графиков или цель)

**Выход `yearPlan`:**

```yaml
yearPlan:
  pointA:
    cartelStage: foundation
    techniqueStop: "Ур.1, атом 12/19"
    normsGap: ["бег 3км", "пресс"]
  pointB:
    targetStage: competition
    targetAnchors: [{ level: krai, dateISO: "2026-11-..." }]
    techniqueTarget: "Ур.2 closed, Ур.3 started"
    normsTarget: ["бег: норма категории"]
  quarters:
    - { from: "2026-03", to: "2026-05", macro: prep-spring, focus: "база+техника" }
    - { from: "2026-05", to: "2026-07", macro: comp-summer, focus: "отборы" }
    # ...
  mesoMilestones:
    - { weekISO: "2026-06-15", note: "контрольная: город" }
```

Книги задают **форму** quarters и типичные focus-строки; профиль ученика — **содержание** pointA/pointB.

---

## 7. Заполнение недели (алгоритм словами)

**Вход:** `trainingDays[]`, `yearPlan`, `daysUntilNearestAnchor`, `wellbeing`, `techniqueQueue`, `normWeakness`

**Шаги:**

1. Определить `weekMode`: macro | meso | micro (по якорю).  
2. Взять `week_patterns[sessionsPerWeek]`, наложить на `trainingDays`.  
3. Для каждого дня назначить `sessionTemplate` по фазе + macro-периоду.  
4. Наполнить блоки: атомы из `techniqueQueue`, ОФП из `normWeakness` + `aerobics_canon`.  
5. Прогнать `age_limits` и rest-rules — обрезать.  
6. Сгенерировать `rationale` на каждый блок.  
7. Статус `draft` → тренер `approved` → ученик.

---

## 8. RAG vs правила

| Задача | Инструмент |
|--------|------------|
| Распределение типов по дням, фазы, caps | **Детерминированные правила** |
| «Почему сегодня аэробика, а не интервалы?» | **rationale_templates** + опционально цитата RAG |
| Редкий кейс вне таблицы | RAG → предложение тренеру, не автоприменение |

Сырые PDF в продакшен-RAG — только при правах; в репозитории хранить **извлечённые правила**, не книги целиком.

---

## 9. MVP методбазы (что сделать первым)

**Фаза A — канон (без новых книг):**

1. Фormalize `week_patterns` 2–6 дней.  
2. Связать `studentTrainingWeekPlan` → тип дня (tech/ofp/sttm).  
3. `techniqueQueue` из stop point.  
4. Rationale в одну строку.

**Фаза B — книги:**

5. Дополнить `phase_micro` из полного Филимонова (сверка с `CARTEL_PREP_PHASE_MAP`).  
6. `age_limits` из Градополова для 13–16.  
7. `aerobics_canon` — 5–10 форматов с when/whenNot.

**Фаза C — год:**

8. `yearPlan` / pointB UI на вкладке «Сезон».  
9. Meso-milestones от якорей.

---

## 10. Критерий «методически верно»

План v1 считается valid, если:

- [ ] каждый тренировочный день имеет тип и ≥1 блок с rationale  
- [ ] соблюдены `age_limits` и min rest  
- [ ] фаза micro не строится без подтверждённой даты якоря  
- [ ] техника берётся из программы Cartel, не «из головы»  
- [ ] тренер может override без поломки недели  
- [ ] источник правила указан (`filimonov` / `gradopolov` / `aerobics` / `cartel_canon`)

---

## 11. Связь с кодом (ориентиры)

| Раздел методбазы | Уже в коде | Доработать |
|------------------|------------|------------|
| macro_year | `annualPrepCycle.js` | pointB UI |
| phase_micro | `juniorPrepTracks`, `filimonovPrepPhases` | привязка к неделе без якоря |
| week_patterns | `seasonTasksAutoSchedule.js` | + studentTrainingWeekPlan |
| session_templates | `buildFilimonovDaySlots` | шаблоны вне micro |
| personalization | KSR, atoms, norms, bridge | `weekPlan` entity |
| age_limits | — | новый модуль |

---

*Черновик для согласования с тренером. Следующий шаг: воркшоп 2–3 ч — выписать первые 50 правил в YAML из Альманаха + одной книги Филимонова.*
