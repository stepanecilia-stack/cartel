// ============================================
// GOOGLE SHEETS NORMS LOADER (SHARED MODULE)
// Загрузка и парсинг нормативов из Google Sheets
// Используется на страницах physical.html и functional.html
// ============================================

const NORMS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSznwbE_UU03tW5O2ps783zQ_V6lXjGnx7IdqYCTfF7XRN6ioJ7EQ4kclNSyrok2Yu2CGXr4M4qGzcs/pub?gid=1658605285&single=true&output=csv';

/**
 * Парсинг CSV с учётом кавычек
 * @param {string} csvText - Сырой текст CSV
 * @returns {Array} Массив объектов нормативов
 */
function parseNormsCsv(csvText) {
    console.log('🔄 Парсинг CSV...');
    console.log('CSV Preview:', csvText.substring(0, 300) + '...');
    
    // Правильный парсинг CSV с учётом кавычек
    const rows = csvText.split('\n').map(row => {
        const cells = [];
        let current = '';
        let insideQuotes = false;
        
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            
            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                cells.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        cells.push(current.trim());
        
        return cells;
    });
    
    console.log(`📊 Всего строк в CSV: ${rows.length}`);
    
    const dataRows = rows.slice(1); // Пропускаем заголовок
    
    const norms = [];
    dataRows.forEach((row, index) => {
        // ✅ СОГЛАСОВАНО: 11 колонок (включая measureType)
        if (row.length < 11) {
            console.warn(`⚠️ Строка ${index + 2} пропущена (колонок: ${row.length}, нужно 11)`);
            return;
        }
        
        const [category, testId, testName, description, ageGroup, gender, gold, silver, bronze, unit, measureType] = row;
        
        // Пропускаем пустые строки
        if (!testName || testName === '') {
            return;
        }
        
        norms.push({
            category: category.trim(),
            testId: testId.trim(),
            testName: testName.trim(),
            description: description.trim(),
            ageGroup: ageGroup.trim(),
            gender: gender.trim(),
            gold: parseFloat(gold),
            silver: parseFloat(silver),
            bronze: parseFloat(bronze),
            unit: unit.trim(),
            measureType: measureType.trim()
        });
    });
    
    console.log(`✅ Загружено нормативов: ${norms.length}`);
    
    return norms;
}

/**
 * Загрузка нормативов из Google Sheets
 * @returns {Promise<Array>} Массив нормативов
 */
async function loadNorms() {
    try {
        console.log('🔄 Загрузка нормативов из Google Sheets...');
        console.log('URL:', NORMS_SHEET_URL);
        
        const response = await fetch(NORMS_SHEET_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        
        return parseNormsCsv(csvText);
    } catch (error) {
        console.error('❌ Ошибка загрузки нормативов из Google Sheets:', error);
        return [];
    }
}

/**
 * Получить нормативы для конкретного спортсмена
 * @param {Array} allNorms - Все нормативы
 * @param {Object} athlete - Объект спортсмена
 * @param {string} category - Категория ('physical' или 'functional')
 * @returns {Array} Отфильтрованные нормативы
 */
function getAthletNorms(allNorms, athlete, category) {
    const age = new Date().getFullYear() - Number(athlete.birthYear);
    
    console.log(`🔍 Поиск нормативов: возраст=${age}, пол=${athlete.gender}, категория=${category}`);
    
    const filtered = allNorms.filter(norm => {
        if (norm.category !== category) return false;
        if (norm.gender !== athlete.gender) return false;
        
        const ageParts = norm.ageGroup.split('-');
        if (ageParts.length !== 2) {
            console.warn(`⚠️ Некорректный формат возрастной группы: ${norm.ageGroup}`);
            return false;
        }
        
        const minAge = parseInt(ageParts[0]);
        const maxAge = parseInt(ageParts[1]);
        
        return age >= minAge && age <= maxAge;
    });
    
    console.log(`📋 Найдено нормативов для спортсмена: ${filtered.length}`);
    
    return filtered;
}

console.log('📦 norms-sheet.js загружен');