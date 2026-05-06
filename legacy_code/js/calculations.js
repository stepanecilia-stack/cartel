// ============================================
// CALCULATIONS MODULE (SHARED)
// Общие функции для расчетов
// ============================================

const BOXING_BENCHMARKS = {
    M: {
        '13-14': [
            { weight: 37, idealHeight: 153 },
            { weight: 40, idealHeight: 156 },
            { weight: 42, idealHeight: 158 },
            { weight: 44, idealHeight: 161 },
            { weight: 46, idealHeight: 164 },
            { weight: 48, idealHeight: 167 },
            { weight: 50, idealHeight: 170 },
            { weight: 52, idealHeight: 172 },
            { weight: 54, idealHeight: 174 },
            { weight: 57, idealHeight: 176 },
            { weight: 60, idealHeight: 178 },
            { weight: 63, idealHeight: 181 },
            { weight: 66, idealHeight: 183 },
            { weight: 70, idealHeight: 185 },
            { weight: 75, idealHeight: 188 },
            { weight: 80, idealHeight: 191 },
            { weight: 90, idealHeight: 194 }
        ],
        '15-16': [
            { weight: 44, idealHeight: 160 },
            { weight: 46, idealHeight: 162 },
            { weight: 48, idealHeight: 164 },
            { weight: 50, idealHeight: 167 },
            { weight: 52, idealHeight: 170 },
            { weight: 54, idealHeight: 172 },
            { weight: 57, idealHeight: 175 },
            { weight: 60, idealHeight: 177 },
            { weight: 63, idealHeight: 179 },
            { weight: 66, idealHeight: 181 },
            { weight: 70, idealHeight: 183 },
            { weight: 75, idealHeight: 186 },
            { weight: 80, idealHeight: 189 },
            { weight: 90, idealHeight: 192 }
        ],
        '17-18': [
            { weight: 48, idealHeight: 162 },
            { weight: 51, idealHeight: 165 },
            { weight: 54, idealHeight: 168 },
            { weight: 57, idealHeight: 171 },
            { weight: 60, idealHeight: 174 },
            { weight: 63.5, idealHeight: 176 },
            { weight: 67, idealHeight: 178 },
            { weight: 71, idealHeight: 181 },
            { weight: 75, idealHeight: 183 },
            { weight: 80, idealHeight: 186 },
            { weight: 86, idealHeight: 189 },
            { weight: 92, idealHeight: 192 },
            { weight: 100, idealHeight: 195 }
        ],
        '19-22': [
            { weight: 48, idealHeight: 162 },
            { weight: 51, idealHeight: 165 },
            { weight: 54, idealHeight: 168 },
            { weight: 57, idealHeight: 171 },
            { weight: 60, idealHeight: 174 },
            { weight: 63.5, idealHeight: 176 },
            { weight: 67, idealHeight: 178 },
            { weight: 71, idealHeight: 181 },
            { weight: 75, idealHeight: 183 },
            { weight: 80, idealHeight: 186 },
            { weight: 86, idealHeight: 189 },
            { weight: 92, idealHeight: 192 },
            { weight: 100, idealHeight: 195 }
        ]
    },
    F: {
        '13-14': [
            { weight: 34, idealHeight: 158 },
            { weight: 36, idealHeight: 161 },
            { weight: 38, idealHeight: 163 },
            { weight: 40, idealHeight: 165 },
            { weight: 42, idealHeight: 167 },
            { weight: 44, idealHeight: 169 },
            { weight: 46, idealHeight: 170 },
            { weight: 48, idealHeight: 172 },
            { weight: 51, idealHeight: 174 },
            { weight: 54, idealHeight: 176 },
            { weight: 57, idealHeight: 178 },
            { weight: 60, idealHeight: 180 },
            { weight: 64, idealHeight: 183 },
            { weight: 70, idealHeight: 185 }
        ],
        '15-16': [
            { weight: 44, idealHeight: 166 },
            { weight: 46, idealHeight: 168 },
            { weight: 48, idealHeight: 169 },
            { weight: 50, idealHeight: 171 },
            { weight: 52, idealHeight: 172 },
            { weight: 54, idealHeight: 173 },
            { weight: 57, idealHeight: 174 },
            { weight: 60, idealHeight: 175 },
            { weight: 63, idealHeight: 176 },
            { weight: 66, idealHeight: 177 },
            { weight: 70, idealHeight: 178 },
            { weight: 75, idealHeight: 180 },
            { weight: 80, idealHeight: 182 },
            { weight: 90, idealHeight: 185 }
        ],
        '17-18': [
            { weight: 48, idealHeight: 164 },
            { weight: 50, idealHeight: 168 },
            { weight: 52, idealHeight: 170 },
            { weight: 54, idealHeight: 171 },
            { weight: 57, idealHeight: 172 },
            { weight: 60, idealHeight: 173 },
            { weight: 63, idealHeight: 174 },
            { weight: 66, idealHeight: 175 },
            { weight: 70, idealHeight: 176 },
            { weight: 75, idealHeight: 178 },
            { weight: 81, idealHeight: 180 },
            { weight: 90, idealHeight: 183 }
        ],
        '19-22': [
            { weight: 48, idealHeight: 164 },
            { weight: 50, idealHeight: 168 },
            { weight: 52, idealHeight: 170 },
            { weight: 54, idealHeight: 171 },
            { weight: 57, idealHeight: 172 },
            { weight: 60, idealHeight: 173 },
            { weight: 63, idealHeight: 174 },
            { weight: 66, idealHeight: 175 },
            { weight: 70, idealHeight: 176 },
            { weight: 75, idealHeight: 178 },
            { weight: 81, idealHeight: 180 },
            { weight: 90, idealHeight: 183 }
        ]
    }
};

function getAgeGroup(birthYear) {
    const age = new Date().getFullYear() - Number(birthYear);
    if (age >= 13 && age <= 14) return '13-14';
    if (age >= 15 && age <= 16) return '15-16';
    if (age >= 17 && age <= 18) return '17-18';
    if (age >= 19) return '19-22';
    return null;
}

function findWeightCategory(gender, ageGroup, weight) {
    if (!BOXING_BENCHMARKS[gender] || !BOXING_BENCHMARKS[gender][ageGroup]) return null;
    
    const categories = BOXING_BENCHMARKS[gender][ageGroup];
    
    for (let cat of categories) {
        if (weight <= cat.weight) {
            return cat;
        }
    }
    
    const lastCat = categories[categories.length - 1];
    return {
        weight: `${lastCat.weight}+`,
        idealHeight: lastCat.idealHeight
    };
}

function calculateBiometricPotential(height, reach, idealHeight) {
    let potential = 100;
    
    const heightDiff = idealHeight - height;
    if (heightDiff > 0) {
        potential -= heightDiff * 5;
    }
    
    const apeIndex = reach - height;
    if (apeIndex < 0) {
        potential -= Math.abs(apeIndex) * 4;
    }
    
    return Math.max(10, Math.round(potential));
}

window.SharedCalculations = {
    BOXING_BENCHMARKS,
    getAgeGroup,
    findWeightCategory,
    calculateBiometricPotential
};
// ✅ Добавьте алиас для совместимости
window.Calculations = window.SharedCalculations;

console.log('📦 calculations.js загружен');
