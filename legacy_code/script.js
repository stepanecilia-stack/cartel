'use strict';


// ============================================
// GOOGLE SHEETS URL (Лист "Нормативы")
// ============================================

// ============================================
// NORMS MODULE (использует loadNorms из norms-sheet.js)
// ============================================
const NormsLoader = {
    cache: null,
    
    async loadNorms() {
        if (this.cache) {
            console.log('✅ Нормативы загружены из кэша');
            return this.cache;
        }
        
        // ✅ Вызываем функцию из norms-sheet.js
        this.cache = await loadNorms();
        return this.cache;
    },
    
    async getNormsForAthlete(athlete, category) {
        const allNorms = await this.loadNorms();
        // ✅ Вызываем функцию из norms-sheet.js
        return getAthletNorms(allNorms, athlete, category);
    }
};

// ============================================
// TEST EVALUATION MODULE
// ============================================
const TestEvaluator = {
    evaluateTest(result, norm) {
        const { gold, silver, bronze, measureType } = norm;
        
        console.log(`🧮 Оценка теста: результат=${result}, золото=${gold}, тип=${measureType}`);
        
        let status, normalizedScore;
        
        if (measureType === 'MAX') {
            if (result >= gold) {
                status = 'gold';
                normalizedScore = 100 + ((result - gold) / gold) * 20;
            } else if (result >= silver) {
                status = 'silver';
                normalizedScore = 80 + ((result - silver) / (gold - silver)) * 20;
            } else if (result >= bronze) {
                status = 'bronze';
                normalizedScore = 60 + ((result - bronze) / (silver - bronze)) * 20;
            } else {
                status = 'red';
                normalizedScore = (result / bronze) * 60;
            }
        } else {
            if (result <= gold) {
                status = 'gold';
                normalizedScore = 100 + ((gold - result) / gold) * 20;
            } else if (result <= silver) {
                status = 'silver';
                normalizedScore = 80 + ((silver - result) / (silver - gold)) * 20;
            } else if (result <= bronze) {
                status = 'bronze';
                normalizedScore = 60 + ((bronze - result) / (bronze - silver)) * 20;
            } else {
                status = 'red';
                normalizedScore = (bronze / result) * 60;
            }
        }
        
        normalizedScore = Math.max(0, Math.min(120, normalizedScore));
        normalizedScore = Math.round(normalizedScore);
        
        console.log(`✅ Результат оценки: статус=${status}, балл=${normalizedScore}`);
        
        return {
            status,
            normalizedScore,
            color: this.getStatusColor(status)
        };
    },
    
    getStatusColor(status) {
        const colors = {
            gold: '#4caf50',
            silver: '#ffeb3b',
            bronze: '#ff9800',
            red: '#f44336'
        };
        return colors[status] || '#999';
    },
    
    getStatusText(status) {
        const texts = {
            gold: '🥇 Золото (Элита)',
            silver: '🥈 Серебро (Норма)',
            bronze: '🥉 Бронза (Ниже нормы)',
            red: '🔴 Критическое отставание'
        };
        return texts[status] || 'Не оценено';
    }
};

// ============================================
// STORAGE MODULE
// ============================================
const Storage = {
    currentUser: null,

    async getCurrentUser() {
        if (!auth.currentUser) return null;
        if (this.currentUser) return this.currentUser;
        
        const uid = auth.currentUser.uid;
        const doc = await db.collection('coaches').doc(uid).get();
        if (!doc.exists) return null;
        
        this.currentUser = { id: uid, ...doc.data() };
        return this.currentUser;
    },

    async setCurrentUserProfile(data) {
        if (!auth.currentUser) return false;
        const uid = auth.currentUser.uid;
        await db.collection('coaches').doc(uid).set(data);
        this.currentUser = { id: uid, ...data };
        return true;
    },

    logout() {
        this.currentUser = null;
        return auth.signOut();
    },

    async getCoachAthletes() {
        if (!auth.currentUser) return [];

        console.log('🔍 Загрузка спортсменов из коллекции students...');

        const snapshot = await db.collection('students')
            .where('coachIds', 'array-contains', auth.currentUser.uid)
            .get();

        console.log(`✅ Найдено спортсменов: ${snapshot.docs.length}`);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    },

    async getAthleteById(id) {
        console.log(`🔍 Поиск спортсмена в коллекции 'students' с ID: ${id}`);
        
        const doc = await db.collection('students').doc(id).get();
        
        if (!doc.exists) {
            console.error(`❌ Student ID [${id}] not found in 'students' collection`);
            return null;
        }
        
        console.log(`✅ Спортсмен найден: ${doc.data().firstName} ${doc.data().lastName}`);
        
        return { id: doc.id, ...doc.data() };
    },

    async getAthleteByToken(token) {
        console.log(`🔍 Поиск спортсмена по shareToken в коллекции 'students'`);

        const snapshot = await db.collection('students')
            .where('shareToken', '==', token.trim())
            .limit(1)
            .get();

        if (snapshot.empty) {
            console.error(`❌ Student with token not found in 'students' collection`);
            return null;
        }

        const doc = snapshot.docs[0];

        console.log(`✅ Спортсмен найден по токену: ${doc.data().firstName}`);

        return {
            id: doc.id,
            ...doc.data()
        };
    },

    async updateAthlete(id, updates) {
        console.log(`🔄 Обновление спортсмена ${id} в коллекции students`);
        
        await db.collection('students').doc(id).update(updates);
        
        console.log('✅ Данные обновлены');
        
        return true;
    },

    async deleteAthlete(id) {
        console.log(`🗑️ Удаление спортсмена ${id} из коллекции students`);
        
        await db.collection('students').doc(id).delete();
        
        console.log('✅ Спортсмен удален');
        
        return true;
    }
};


// ============================================
// UTILITIES MODULE
// ============================================
const Utils = {
    generateId() {
        return db.collection('_').doc().id;
    },

    generateToken(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
},  // ✅ ЗАПЯТАЯ ОБЯЗАТЕЛЬНА

    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
        return date.toLocaleDateString('ru-RU', options);
    },

    getCurrentDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    getHashParams() {
        const hash = window.location.hash.substring(1);
        const parts = hash.split('?');
        const page = parts[0] || '';
        const params = {};
        
        if (parts[1]) {
            parts[1].split('&').forEach(param => {
                const [key, value] = param.split('=');
                params[key] = decodeURIComponent(value);
            });
        }
        
        return { page, params };
    },

    calculateAge(birthYear) {
        return new Date().getFullYear() - Number(birthYear);
    },

    showLoader() {
        document.body.style.cursor = 'wait';
    },

    hideLoader() {
        document.body.style.cursor = 'default';
    }
};

// ============================================
// BOXING BENCHMARKS DATABASE
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

// ============================================
// CALCULATIONS MODULE
// ============================================
const Calculations = {
    calculatePotential(athlete) {
        if (!athlete.anthropometry || athlete.anthropometry.length === 0) return 0;
        
        const latest = athlete.anthropometry[athlete.anthropometry.length - 1];
        const { height, weight, reach } = latest;
        
        const ageGroup = getAgeGroup(athlete.birthYear);
        if (!ageGroup) return 0;
        
        const category = findWeightCategory(athlete.gender, ageGroup, weight);
        if (!category) return 0;
        
        const idealHeight = category.idealHeight;
        
        let potential = 100;
        
        const heightDiff = idealHeight - height;
        if (heightDiff > 0) {
            potential -= heightDiff * 5;
        }
        
        const apeIndex = reach - height;
        if (apeIndex < 0) {
            potential -= Math.abs(apeIndex) * 4;
        }
        
        potential = Math.max(10, potential);
        
        return Math.round(potential);
    },

    async calculateRealization(athlete) {
    console.log('🧮 Расчет КСР для спортсмена:', athlete.firstName);
    
    // ✅ НОВОЕ: Получаем потенциал
    const potential = this.calculatePotential(athlete);
    if (potential === 0) {
        console.log('⚠️ Потенциал = 0, КСР невозможно рассчитать');
        return "Нет данных";
    }
    
    let physicsRealization = 0;
    let functionalRealization = 0;
    let technicalRealization = 0;
    
    // Физика
    const physicalNorms = await NormsLoader.getNormsForAthlete(athlete, 'physical');
    if (physicalNorms.length > 0) {
        let sumPhysics = 0;
        physicalNorms.forEach(norm => {
            const testResult = athlete.tests?.physical?.[norm.testId];
            sumPhysics += testResult ? (testResult.normalizedScore || 0) : 0;
        });
        
        // ✅ ИСПРАВЛЕНО: делим на общее количество тестов (штраф за несданные)
        const avgPhysics = sumPhysics / physicalNorms.length;
        physicsRealization = avgPhysics / 100; // Нормализуем 0..1.2
        
        console.log(`  Физика: средний балл=${avgPhysics.toFixed(1)}, реализация=${physicsRealization.toFixed(3)}`);
    }
    
    // Функционал
    const functionalNorms = await NormsLoader.getNormsForAthlete(athlete, 'functional');
    if (functionalNorms.length > 0) {
        let sumFunctional = 0;
        functionalNorms.forEach(norm => {
            const testResult = athlete.tests?.functional?.[norm.testId];
            sumFunctional += testResult ? (testResult.normalizedScore || 0) : 0;
        });
        
        const avgFunctional = sumFunctional / functionalNorms.length;
        functionalRealization = avgFunctional / 100;
        
        console.log(`  Функционал: средний балл=${avgFunctional.toFixed(1)}, реализация=${functionalRealization.toFixed(3)}`);
    }
    
    // Техника
    if (athlete.technicalScore !== null && athlete.technicalScore !== undefined) {
        technicalRealization = athlete.technicalScore; // уже 0..1
        console.log(`  Техника: реализация=${technicalRealization.toFixed(3)}`);
    }
    
// ✅ ПРАВИЛЬНО: каждая категория вносит долю от потенциала
const physicsContribution = potential * 0.333 * physicsRealization;
const functionalContribution = potential * 0.333 * functionalRealization;
const technicalContribution = potential * 0.333 * technicalRealization;

const ksr = physicsContribution + functionalContribution + technicalContribution;

// ✅ ЗАЩИТА: КСР не может превышать потенциал
const finalKSR = Math.min(Math.round(ksr), potential);

console.log(`  📊 Потенциал: ${potential}%`);
console.log(`  📊 Вклады: физика=${physicsContribution.toFixed(1)}, функционал=${functionalContribution.toFixed(1)}, техника=${technicalContribution.toFixed(1)}`);
console.log(`  📊 КСР: ${finalKSR}% (сумма вкладов: ${ksr.toFixed(1)})`);

if (finalKSR === 0) {
    return "Нет данных";
}

return finalKSR;
},  // ✅ ВОТ ЭТА СТРОКА БЫЛА ПРОПУЩЕНА!

calculateGap(potential, realization) {
    if (realization === "Нет данных") {
        return "Нет данных";
    }
    return potential - realization;
},


    async updateAthleteMetrics(athleteId) {
        console.log(`🔄 Обновление метрик для спортсмена ${athleteId}`);
        
        const athlete = await Storage.getAthleteById(athleteId);
        if (!athlete) {
            console.error(`❌ Не удалось загрузить спортсмена для обновления метрик`);
            return null;
        }
        
        const potential = this.calculatePotential(athlete);
        const realization = await this.calculateRealization(athlete);
        const gap = this.calculateGap(potential, realization);
        
        const metrics = { potential, realization, gap };
        
        console.log('📊 Новые метрики:', metrics);
        
        await Storage.updateAthlete(athleteId, { metrics });
        
        console.log('✅ Метрики обновлены в Firebase');
        
        return metrics;
    },

    getWeightCategory(athlete) {
        if (!athlete.anthropometry || athlete.anthropometry.length === 0) return null;
        
        const latest = athlete.anthropometry[athlete.anthropometry.length - 1];
        const ageGroup = getAgeGroup(athlete.birthYear);
        if (!ageGroup) return null;
        
        const category = findWeightCategory(athlete.gender, ageGroup, latest.weight);
        return category ? `${category.weight} кг` : null;
    }
};

// ============================================
// RECOMMENDATIONS MODULE
// ============================================
const Recommendations = {
    generate(athlete) {
        const recommendations = [];
        const metrics = athlete.metrics || {};
        const gap = metrics.gap;

        if (gap === "Нет данных" || gap === undefined || typeof gap !== 'number') {
            return recommendations;
        }

        if (gap > 20) {
            recommendations.push({
                type: 'critical',
                title: 'Большой разрыв между потенциалом и реализацией',
                text: `Разрыв составляет ${gap} баллов. Необходимо усилить практическую работу.`
            });
        } else if (gap > 10) {
            recommendations.push({
                type: 'warning',
                title: 'Есть резервы для роста',
                text: `Разрыв ${gap} баллов указывает на нереализованный потенциал.`
            });
        } else if (gap >= 0 && gap <= 5) {
            recommendations.push({
                type: 'success',
                title: 'Отличная реализация потенциала',
                text: 'Спортсмен работает на пределе возможностей.'
            });
        }

        return recommendations;
    }
};

// ============================================
// AUTH MODULE
// ============================================
const AuthModule = {
    async register(email, password, firstName, lastName, city) {
        if (!Utils.validateEmail(email)) {
            return { success: false, error: 'Некорректный email' };
        }
        if (password.length < 6) {
            return { success: false, error: 'Пароль должен быть не менее 6 символов' };
        }
        if (!firstName || firstName.trim().length === 0) {
            return { success: false, error: 'Укажите имя' };
        }
        if (!lastName || lastName.trim().length === 0) {
            return { success: false, error: 'Укажите фамилию' };
        }
        if (!city || city.trim().length === 0) {
            return { success: false, error: 'Укажите город' };
        }

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const uid = userCredential.user.uid;
            
            const coachData = {
                email: email,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                city: city.trim(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('coaches').doc(uid).set(coachData);
            
            return { success: true, user: { id: uid, ...coachData } };
        } catch (error) {
            console.error('Firebase register error:', error);
            let errorMsg = 'Ошибка регистрации';
            if (error.code === 'auth/email-already-in-use') {
                errorMsg = 'Пользователь с таким email уже существует';
            } else if (error.code === 'auth/weak-password') {
                errorMsg = 'Слишком простой пароль';
            }
            return { success: false, error: errorMsg };
        }
    },

    async login(email, password) {
        if (!Utils.validateEmail(email)) {
            return { success: false, error: 'Некорректный email' };
        }

        try {
            await auth.signInWithEmailAndPassword(email, password);
            return { success: true };
        } catch (error) {
            console.error('Firebase login error:', error);
            let errorMsg = 'Ошибка входа';
            if (error.code === 'auth/user-not-found') {
                errorMsg = 'Пользователь не найден';
            } else if (error.code === 'auth/wrong-password') {
                errorMsg = 'Неверный пароль';
            } else if (error.code === 'auth/invalid-email') {
                errorMsg = 'Некорректный email';
            } else if (error.code === 'auth/invalid-credential') {
                errorMsg = 'Неверный email или пароль';
            }
            return { success: false, error: errorMsg };
        }
    },

    async logout() {
        await Storage.logout();
    }
};

// ============================================
// ATHLETES MODULE
// ============================================
const Athletes = {
    async create(data) {
        if (!auth.currentUser) {
            console.error('❌ Невозможно создать ученика: пользователь не авторизован');
            return null;
        }

        try {
            const studentRef = db.collection('students').doc();
            const accessCode = Utils.generateToken(8);

            console.log('📝 Создание ученика:', {
                studentId: studentRef.id,
                accessCode: accessCode,
                name: `${data.firstName} ${data.lastName}`
            });

            const athlete = {
                coachIds: [auth.currentUser.uid],
                firstName: data.firstName.trim(),
                lastName: data.lastName.trim(),
                birthYear: parseInt(data.birthYear),
                gender: data.gender,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                anthropometry: [],
                tests: {
                    physical: {},
                    functional: {}
                },
                technicalScore: null,
                psychologicalProfile: null,
                metrics: {
                    potential: 0,
                    realization: "Нет данных",
                    gap: "Нет данных"
                },
                shareToken: null,
                accessCode: accessCode
            };

            const batch = db.batch();

            batch.set(studentRef, athlete);
            console.log(`📄 Добавлен в batch: students/${studentRef.id}`);

            const accessCodeRef = db.collection('accessCodes').doc(accessCode);
            batch.set(accessCodeRef, {
                studentId: studentRef.id,
                createdBy: auth.currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log(`🔑 Добавлен в batch: accessCodes/${accessCode}`);

            console.log('💾 Выполнение batch.commit()...');
            await batch.commit();

            console.log('✅ Batch успешно выполнен');
            console.log(`✅ Спортсмен создан с ID: ${studentRef.id}`);
            console.log(`🔑 Код доступа создан: ${accessCode}`);

            return {
                id: studentRef.id,
                ...athlete
            };

        } catch (error) {
            console.error('❌ Ошибка создания ученика:', error);
            console.error('Детали:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
            return null;
        }
    },

    async addExistingAthlete(accessCode) {
        if (!auth.currentUser) {
            return {
                success: false,
                error: 'Не авторизован'
            };
        }

        const code = accessCode.trim().toUpperCase();

        console.log('═══════════════════════════════════════');
        console.log('🔍 ПОИСК УЧЕНИКА ПО КОДУ ДОСТУПА');
        console.log('═══════════════════════════════════════');
        console.log('Введённый код:', code);
        console.log('Длина кода:', code.length);
        console.log('Символы:', code.split('').join(' '));

        try {
            console.log('📡 Запрос к коллекции accessCodes...');
            const codeDoc = await db.collection('accessCodes').doc(code).get();

            console.log('Результат запроса:', {
                exists: codeDoc.exists,
                id: codeDoc.id,
                data: codeDoc.exists ? codeDoc.data() : null
            });

            if (!codeDoc.exists) {
                console.error(`❌ Код ${code} не найден в коллекции accessCodes`);
                
                const allCodes = await db.collection('accessCodes').limit(10).get();
                console.log(`📋 Существующие коды (первые 10):`, 
                    allCodes.docs.map(doc => ({ id: doc.id, data: doc.data() }))
                );
                
                return {
                    success: false,
                    error: 'Неверный код доступа. Проверьте правильность ввода.'
                };
            }

            const { studentId, createdBy } = codeDoc.data();

            if (!studentId) {
                console.error('❌ В документе accessCode отсутствует studentId');
                return {
                    success: false,
                    error: 'Код доступа поврежден'
                };
            }

            console.log(`✅ Код найден, studentId: ${studentId}`);

            console.log(`📡 Запрос к коллекции students/${studentId}...`);
            const studentDoc = await db.collection('students').doc(studentId).get();

            if (!studentDoc.exists) {
                console.error(`❌ Ученик ${studentId} не существует`);
                return {
                    success: false,
                    error: 'Ученик не найден в базе данных'
                };
            }

            const studentData = studentDoc.data();
            console.log('Данные ученика:', {
                id: studentId,
                name: `${studentData.firstName} ${studentData.lastName}`,
                currentCoaches: studentData.coachIds
            });

            if (studentData.coachIds && studentData.coachIds.includes(auth.currentUser.uid)) {
                console.warn('⚠️ Тренер уже добавлен к этому ученику');
                return {
                    success: false,
                    error: 'Вы уже имеете доступ к этому ученику'
                };
            }

            console.log(`📝 Добавляем тренера ${auth.currentUser.uid} к ученику ${studentId}`);
            
            await db.collection('students').doc(studentId).update({
                coachIds: firebase.firestore.FieldValue.arrayUnion(auth.currentUser.uid),
                lastJoinAccessCode: code,
                lastJoinedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log(`✅ Тренер успешно добавлен`);

            const updatedDoc = await db.collection('students').doc(studentId).get();

            console.log('═══════════════════════════════════════');
            console.log('✅ УЧЕНИК УСПЕШНО ДОБАВЛЕН');
            console.log('═══════════════════════════════════════');

            return {
                success: true,
                athlete: {
                    id: updatedDoc.id,
                    ...updatedDoc.data()
                }
            };

        } catch (error) {
            console.error('═══════════════════════════════════════');
            console.error('❌ КРИТИЧЕСКАЯ ОШИБКА');
            console.error('═══════════════════════════════════════');
            console.error('Тип ошибки:', error.constructor.name);
            console.error('Код ошибки:', error.code);
            console.error('Сообщение:', error.message);
            console.error('Stack trace:', error.stack);

            if (error.code === 'permission-denied') {
                return {
                    success: false,
                    error: 'Недостаточно прав. Проверьте правила безопасности Firestore.'
                };
            }

            return {
                success: false,
                error: `Ошибка: ${error.message}`
            };
        }
    },

    async addAnthropometry(athleteId, data) {
        const athlete = await Storage.getAthleteById(athleteId);
        if (!athlete) return false;
        
        const anthropometry = {
            date: data.date,
            height: parseFloat(data.height),
            weight: parseFloat(data.weight),
            reach: parseFloat(data.reach)
        };
        
        const updatedAnthro = [...(athlete.anthropometry || []), anthropometry];
        await Storage.updateAthlete(athleteId, { anthropometry: updatedAnthro });
        await Calculations.updateAthleteMetrics(athleteId);
        return true;
    },

    async submitTest(athleteId, category, testId, result, norm) {
        const athlete = await Storage.getAthleteById(athleteId);
        if (!athlete) return false;
        
        const evaluation = TestEvaluator.evaluateTest(result, norm);
        
        const testData = {
            result: result,
            date: Utils.getCurrentDate(),
            status: evaluation.status,
            normalizedScore: evaluation.normalizedScore,
            color: evaluation.color
        };
        
        const tests = athlete.tests || { physical: {}, functional: {} };
        if (!tests[category]) tests[category] = {};
        tests[category][testId] = testData;
        
        await Storage.updateAthlete(athleteId, { tests });
        await Calculations.updateAthleteMetrics(athleteId);
        
        return true;
    },

    async setTechnicalScore(athleteId, score) {
        await Storage.updateAthlete(athleteId, { technicalScore: score });
        await Calculations.updateAthleteMetrics(athleteId);
        return true;
    },

    async getCoachAthletes() {
        return await Storage.getCoachAthletes();
    }
};


// ============================================
// SHARE MODULE
// ============================================
const Share = {
    async generateShareToken(athleteId) {
        const token = Utils.generateToken(32);
        await Storage.updateAthlete(athleteId, { shareToken: token });
        return token;
    },

    async getShareUrl(athleteId) {
        let athlete = await Storage.getAthleteById(athleteId);
        if (!athlete) return null;
        if (!athlete.shareToken) {
            await this.generateShareToken(athleteId);
            athlete = await Storage.getAthleteById(athleteId);
        }
        return `${window.location.origin}${window.location.pathname}#student?token=${athlete.shareToken}`;
    },

    async getAthleteByToken(token) {
    console.log(`🔍 Поиск спортсмена по shareToken в коллекции 'students'`);

    const snapshot = await db.collection('students')
        .where('shareToken', '==', token.trim())
        .limit(1)
        .get();

    if (snapshot.empty) {
        console.error(`❌ Student with token not found in 'students' collection`);
        return null;
    }

    const doc = snapshot.docs[0];
    const athlete = {
        id: doc.id,
        ...doc.data()
    };

    console.log(`✅ Спортсмен найден по токену: ${athlete.firstName}`);

    const potential = Calculations.calculatePotential(athlete);
    const realization = await Calculations.calculateRealization(athlete);
    const gap = Calculations.calculateGap(potential, realization);

    return {
        id: athlete.id,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        birthYear: athlete.birthYear,
        gender: athlete.gender,
        metrics: {
            potential,
            realization,
            gap
        },
        anthropometry: athlete.anthropometry,
        tests: athlete.tests,
        technicalScore: athlete.technicalScore,
        psychologicalProfile: athlete.psychologicalProfile
    };
}

};

// ============================================
// SILHOUETTE RENDERER MODULE
// ============================================
const SilhouetteRenderer = {
    render(height, reach, gender) {
        const minHeight = 150;
        const maxHeight = 350;
        const minRealHeight = 140;
        const maxRealHeight = 210;
        const scaledHeight = minHeight + ((height - minRealHeight) / (maxRealHeight - minRealHeight)) * (maxHeight - minHeight);
        const finalHeight = Math.max(minHeight, Math.min(maxHeight, scaledHeight));

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "100");
        svg.setAttribute("height", finalHeight);
        svg.setAttribute("viewBox", `0 0 100 ${finalHeight}`);
        svg.style.display = "block";

        const bodyPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const headRadius = 12;
        const headY = headRadius + 5;
        const neckY = headY + headRadius + 3;
        const shoulderY = neckY + 5;
        const waistY = finalHeight * 0.5;
        const hipY = finalHeight * 0.6;
        const footY = finalHeight - 2;

        const pathData = `
            M 50 ${headY}
            m -${headRadius} 0
            a ${headRadius} ${headRadius} 0 1 0 ${headRadius * 2} 0
            a ${headRadius} ${headRadius} 0 1 0 -${headRadius * 2} 0
            M 50 ${neckY}
            L 50 ${waistY}
            M 30 ${shoulderY}
            L 50 ${shoulderY}
            L 70 ${shoulderY}
            M 50 ${waistY}
            L 35 ${hipY}
            L 30 ${footY}
            M 50 ${waistY}
            L 65 ${hipY}
            L 70 ${footY}
        `;

        bodyPath.setAttribute("d", pathData);
        bodyPath.setAttribute("stroke", "#00aaff");
        bodyPath.setAttribute("stroke-width", "3");
        bodyPath.setAttribute("fill", "none");
        bodyPath.setAttribute("stroke-linecap", "round");
        bodyPath.setAttribute("stroke-linejoin", "round");

        svg.appendChild(bodyPath);
        return { svg, height: finalHeight };
    },

    renderRuler(height) {
        const ruler = document.getElementById('height-ruler');
        if (!ruler) return;
        ruler.innerHTML = '';
        ruler.style.height = `${height}px`;
        for (let cm = 210; cm >= 140; cm -= 10) {
            const mark = document.createElement('div');
            mark.className = cm % 20 === 0 ? 'ruler-mark major' : 'ruler-mark';
            mark.textContent = `${cm}`;
            ruler.appendChild(mark);
        }
    },

    renderReachLine(reach) {
        const reachLine = document.getElementById('reach-line');
        if (!reachLine) return;
        const minWidth = 150;
        const maxWidth = 400;
        const minReach = 140;
        const maxReach = 220;
        const scaledWidth = minWidth + ((reach - minReach) / (maxReach - minReach)) * (maxWidth - minWidth);
        const finalWidth = Math.max(minWidth, Math.min(maxWidth, scaledWidth));
        reachLine.style.width = `${finalWidth}px`;
    },

    calculateApeIndex(height, reach) {
        const ratio = reach / height;
        let description = '';
        if (ratio < 0.98) description = 'Короткие руки';
        else if (ratio >= 0.98 && ratio < 1.0) description = 'Немного короткие руки';
        else if (ratio >= 1.0 && ratio < 1.03) description = 'Пропорциональные руки';
        else if (ratio >= 1.03 && ratio < 1.06) description = 'Хорошо для бокса';
        else description = 'Длинные руки — отличное преимущество!';
        return { ratio: ratio.toFixed(2), description };
    }
};

// ============================================
// COMBAT READINESS (КБГ) MODULE
// ============================================
const CombatReadiness = {
    states: [
        {
            id: 'reactive',
            emoji: '🌑',
            name: 'Реактивный',
            coefficient: 0.25,
            description: 'Воля к победе ситуативна и зависит от внешних условий. Если боксёр чувствует превосходство над соперником — действует уверенно и агрессивно. Как только возникает угроза или давление, мотивация рассыпается: включается избегание, пассивность, деморализация. Психологи называют это внешним локусом контроля — боец управляется средой, а не собой.'
        },
        {
            id: 'active',
            emoji: '🌓',
            name: 'Активный',
            coefficient: 0.50,
            description: 'Боксёр осознаёт сложность боя, но способен усилием воли запустить мобилизацию и действовать по плану. Это волевая саморегуляция — сознательное подавление тревоги и удержание тактической установки. Ресурс есть, но он расходуется: чем длиннее и тяжелее бой, тем выше риск срыва в реактивный режим.'
        },
        {
            id: 'dominant',
            emoji: '🌕',
            name: 'Доминантный',
            coefficient: 1.00,
            description: 'Состояние полной психической концентрации, при котором внешние раздражители — давление соперника, усталость, шум зала — не разрушают установку. В нейрофизиологии это описывается как устойчивая доминанта по Ухтомскому: один очаг возбуждения подавляет все конкурирующие. Боксёр дерётся не вопреки обстоятельствам — он их не замечает.'
        }
    ],

    async getState(athleteId) {
        try {
            const athlete = await Storage.getAthleteById(athleteId);
            
            if (athlete && athlete.combatReadinessState) {
                const state = this.states.find(s => s.id === athlete.combatReadinessState);
                if (state) {
                    console.log(`✅ КБГ загружен из Firebase: ${state.name} для ${athleteId}`);
                    return state;
                }
            }
            
            // По умолчанию - первое состояние (Реактивный)
            console.log(`ℹ️ КБГ не найден, используется по умолчанию: ${this.states[0].name}`);
            return this.states[0];
        } catch (error) {
            console.error('❌ Ошибка загрузки КБГ:', error);
            return this.states[0];
        }
    },

    async setState(athleteId, stateId) {
        try {
            await Storage.updateAthlete(athleteId, { 
                combatReadinessState: stateId,
                combatReadinessUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log(`💾 КБГ сохранён в Firebase: ${stateId} для спортсмена ${athleteId}`);
            return true;
        } catch (error) {
            console.error('❌ Ошибка сохранения КБГ:', error);
            return false;
        }
    },

    applyToRealization(realization, currentState) {
        if (realization === "Нет данных") return "Нет данных";
        
        const adjusted = Math.round(realization * currentState.coefficient);
        
        console.log(`⚔️ КБГ применён: ${realization} × ${currentState.coefficient} = ${adjusted}`);
        
        return adjusted;
    },

    async renderSelector(athleteId, onChangeCallback) {
        const container = document.getElementById('combat-readiness-selector');
        if (!container) {
            console.warn('⚠️ Контейнер #combat-readiness-selector не найден');
            return;
        }

        const currentState = await this.getState(athleteId);
        container.innerHTML = '';

        this.states.forEach(state => {
            const option = document.createElement('div');
            option.className = `cr-option ${state.id === currentState.id ? 'active' : ''}`;
            option.dataset.stateId = state.id;

            option.innerHTML = `
                <div class="cr-info-icon" data-state-id="${state.id}">ℹ️</div>
                <div class="cr-emoji">${state.emoji}</div>
                <div class="cr-name">${state.name}</div>
                <div class="cr-coefficient">КБГ × ${state.coefficient}</div>
            `;

            option.onclick = async (e) => {
                if (e.target.classList.contains('cr-info-icon')) {
                    this.showTooltip(state, e.target);
                    return;
                }

                container.querySelectorAll('.cr-option').forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                
                const success = await this.setState(athleteId, state.id);
                
                if (success && onChangeCallback) {
                    onChangeCallback(state);
                }
            };

            container.appendChild(option);
        });

        container.querySelectorAll('.cr-info-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const stateId = icon.dataset.stateId;
                const state = this.states.find(s => s.id === stateId);
                this.showTooltip(state, icon);
            });
        });
    },

    showTooltip(state, iconElement) {
        const existing = document.querySelector('.cr-tooltip');
        if (existing) existing.remove();

        const tooltip = document.createElement('div');
        tooltip.className = 'cr-tooltip show';
        tooltip.innerHTML = `
            <button class="cr-tooltip-close">×</button>
            <div class="cr-tooltip-title">${state.emoji} ${state.name}</div>
            <div>${state.description}</div>
        `;

        document.body.appendChild(tooltip);

        const rect = iconElement.getBoundingClientRect();
        tooltip.style.top = `${rect.bottom + 10}px`;
        tooltip.style.left = `${Math.max(10, rect.left - 150)}px`;

        tooltip.querySelector('.cr-tooltip-close').onclick = () => {
            tooltip.remove();
        };

        setTimeout(() => {
            document.addEventListener('click', function closeTooltip(e) {
                if (!tooltip.contains(e.target) && !iconElement.contains(e.target)) {
                    tooltip.remove();
                    document.removeEventListener('click', closeTooltip);
                }
            });
        }, 100);
    }
};


// ============================================
// ROUTER MODULE
// ============================================
const Router = {
    currentPage: null,
    currentAthleteId: null,
    authInitialized: false,

    init() {
        auth.onAuthStateChanged(user => {
            console.log('Auth state changed:', user ? user.email : 'No user');
            
            if (!this.authInitialized) {
                this.authInitialized = true;
                this.setupAuthHandlers();
                window.addEventListener('hashchange', () => this.route());
            }
            
            const { page } = Utils.getHashParams();
            
            if (user) {
                if (!page || page === 'auth') {
                    this.navigate('dashboard');
                } else {
                    this.route();
                }
            } else {
                if (page === 'student') {
                    this.route();
                } else {
                    this.showAuthPage();
                }
            }
        });
    },

    showAuthPage() {
        document.querySelectorAll('[id^="page-"]').forEach(p => p.classList.add('hidden'));
        document.getElementById('page-auth').classList.remove('hidden');
        this.currentPage = 'auth';
    },

    async route() {
        const { page, params } = Utils.getHashParams();
        document.querySelectorAll('[id^="page-"]').forEach(p => p.classList.add('hidden'));

        let targetPage = page || '';

        if (targetPage === 'student') {
            await this.showStudentView(params.token);
            return;
        }

        if (!auth.currentUser) {
            this.showAuthPage();
            return;
        }

        if (targetPage === '' || targetPage === 'auth') {
            targetPage = 'dashboard';
        }

        await this.showPage(targetPage, params);
        this.currentPage = targetPage;
    },

    async showPage(page, params = {}) {
        const pageElement = document.getElementById(`page-${page}`);
        if (!pageElement) return;
        pageElement.classList.remove('hidden');

        if (page === 'dashboard') await this.initDashboardPage();
        if (page === 'athlete-add') this.initAddAthletePage();
        if (page === 'anthropometry') await this.initAnthropometryPage(params.id);
        if (page === 'profile') await this.initProfilePage(params.id);
    },

    async showStudentView(token) {
        console.log('═══════════════════════════════════════');
        console.log('🎯 ЗАГРУЗКА СТРАНИЦЫ УЧЕНИКА');
        console.log('═══════════════════════════════════════');
        console.log('📌 Токен:', token?.substring(0, 10) + '...');
        
        const pageElement = document.getElementById('page-student-view');
        const errorElement = document.getElementById('student-error');
        
        pageElement.classList.remove('hidden');
        errorElement.classList.add('hidden');

        if (!token) {
            console.error('❌ Токен не указан в URL');
            errorElement.classList.remove('hidden');
            errorElement.textContent = '❌ Ссылка недействительна: токен отсутствует';
            return;
        }

        try {
            console.log('🔍 Поиск спортсмена по токену...');
            
            const athleteData = await Share.getAthleteByToken(token);
            
            if (!athleteData) {
                console.error('❌ Спортсмен не найден по токену');
                errorElement.classList.remove('hidden');
                errorElement.textContent = '❌ Ссылка недействительна или срок действия истёк';
                return;
            }

            console.log('✅ Спортсмен загружен:', athleteData.firstName, athleteData.lastName);
            console.log('📊 Данные anthropometry:', athleteData.anthropometry);

            const genderText = athleteData.gender === 'M' ? 'М' : 'Ж';
            document.getElementById('student-athlete-name').textContent = 
                `${athleteData.firstName} ${athleteData.lastName}`;
            document.getElementById('student-athlete-meta').textContent = 
                `${athleteData.birthYear} г.р., ${genderText}`;

            // ✅ РЕНДЕР СИЛУЭТА
            if (athleteData.anthropometry && athleteData.anthropometry.length > 0) {
                console.log('📏 РЕНДЕРИНГ СИЛУЭТА...');
                const latest = athleteData.anthropometry[athleteData.anthropometry.length - 1];
                
                console.log('  Последние данные:', {
                    height: latest.height,
                    reach: latest.reach,
                    weight: latest.weight,
                    date: latest.date
                });
                
                try {
                    const { svg, height: svgHeight } = SilhouetteRenderer.render(
                        latest.height, 
                        latest.reach, 
                        athleteData.gender
                    );
                    
                    const silhouetteFigure = document.getElementById('silhouette-figure');
                    if (silhouetteFigure) {
                        silhouetteFigure.innerHTML = '';
                        silhouetteFigure.appendChild(svg);
                        console.log('  ✅ Силуэт добавлен в DOM');
                    } else {
                        console.error('  ❌ Элемент #silhouette-figure не найден!');
                    }
                    
                    SilhouetteRenderer.renderRuler(svgHeight);
                    SilhouetteRenderer.renderReachLine(latest.reach);
                    
                    const heightValue = document.getElementById('height-value');
                    const reachValue = document.getElementById('reach-value');
                    if (heightValue) heightValue.textContent = `${latest.height} см`;
                    if (reachValue) reachValue.textContent = `${latest.reach} см`;
                    
                    const apeIndex = SilhouetteRenderer.calculateApeIndex(latest.height, latest.reach);
                    const apeIndexValue = document.getElementById('ape-index-value');
                    const apeIndexDesc = document.getElementById('ape-index-desc');
                    if (apeIndexValue) apeIndexValue.textContent = apeIndex.ratio;
                    if (apeIndexDesc) apeIndexDesc.textContent = apeIndex.description;
                    
                    console.log('✅ СИЛУЭТ ПОЛНОСТЬЮ ОТРЕНДЕРЕН');
                } catch (error) {
                    console.error('❌ Ошибка рендеринга силуэта:', error);
                }
            } else {
                console.warn('⚠️ Нет данных антропометрии!');
            }


            console.log('═══════════════════════════════════════');
            console.log('✅ СТРАНИЦА УЧЕНИКА ЗАГРУЖЕНА УСПЕШНО');
            console.log('═══════════════════════════════════════');

        } catch (error) {
            console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
            errorElement.classList.remove('hidden');
            errorElement.innerHTML = `
                <strong>Ошибка загрузки данных</strong><br><br>
                <small>${error.message}</small><br><br>
                <small style="color: #999;">
                    Откройте консоль (F12 → Console) для деталей
                </small>
            `;
        }
    },

    navigate(page, params = {}) {
        let hash = `#${page}`;
        if (Object.keys(params).length > 0) {
            const queryString = Object.entries(params).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
            hash += `?${queryString}`;
        }
        window.location.hash = hash;
    },

    setupAuthHandlers() {
        const tabs = document.querySelectorAll('.auth-tabs .tab');
        const coachFieldsGroup = document.getElementById('coach-fields-group');
        const submitBtn = document.getElementById('auth-submit-btn');
        const authForm = document.getElementById('auth-form');
        const errorMessage = document.getElementById('auth-error');
        
        let currentMode = 'login';
        
        tabs.forEach(tab => {
            tab.onclick = () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentMode = tab.dataset.tab;
                
                if (currentMode === 'register') {
                    coachFieldsGroup.classList.remove('hidden');
                    submitBtn.textContent = 'Зарегистрироваться';
                    document.getElementById('first-name-coach').required = true;
                    document.getElementById('last-name-coach').required = true;
                    document.getElementById('city-coach').required = true;
                } else {
                    coachFieldsGroup.classList.add('hidden');
                    submitBtn.textContent = 'Войти';
                    document.getElementById('first-name-coach').required = false;
                    document.getElementById('last-name-coach').required = false;
                    document.getElementById('city-coach').required = false;
                }
                
                errorMessage.classList.add('hidden');
                authForm.reset();
            };
        });
        
        authForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            errorMessage.classList.add('hidden');
            Utils.showLoader();
            
            let result;
            if (currentMode === 'register') {
                const firstName = document.getElementById('first-name-coach').value;
                const lastName = document.getElementById('last-name-coach').value;
                const city = document.getElementById('city-coach').value;
                result = await AuthModule.register(email, password, firstName, lastName, city);
            } else {
                result = await AuthModule.login(email, password);
            }
            
            Utils.hideLoader();
            
            if (result.success) {
                Router.navigate('dashboard');
            } else {
                errorMessage.textContent = result.error;
                errorMessage.classList.remove('hidden');
            }
        };
    },

    async initDashboardPage() {
    Utils.showLoader();
    
    const currentUser = await Storage.getCurrentUser();
    const displayName = currentUser.firstName && currentUser.lastName 
        ? `${currentUser.firstName} ${currentUser.lastName}` 
        : currentUser.email;
    
    document.getElementById('coach-name').textContent = `Тренер: ${displayName}`;
    
    const athletesList = document.getElementById('athletes-list');
    const emptyState = document.getElementById('empty-state');
    const athletes = await Athletes.getCoachAthletes();

    if (athletes.length === 0) {
        emptyState.classList.remove('hidden');
        athletesList.innerHTML = '';
    } else {
        emptyState.classList.add('hidden');
        athletesList.innerHTML = '';
        
        // ✅ ЦИКЛ БЕЗ ДУБЛИРОВАНИЯ
        for (const athlete of athletes) {
            try {
                const potential = Calculations.calculatePotential(athlete);
                const realization = await Calculations.calculateRealization(athlete);
                
                const crState = await CombatReadiness.getState(athlete.id);
                const realizationWithKBG = CombatReadiness.applyToRealization(realization, crState);
                
                const gap = Calculations.calculateGap(potential, realization);
                const weightCategory = Calculations.getWeightCategory(athlete);
                
                const card = document.createElement('div');
                card.className = 'athlete-card';
                const genderText = athlete.gender === 'M' ? 'М' : 'Ж';
                
                const realizationDisplay = realizationWithKBG === "Нет данных" ? "Нет данных" : `${realizationWithKBG}%`;
                const gapWithKBG = realizationWithKBG === "Нет данных" ? "Нет данных" : (potential - realizationWithKBG);
                const gapDisplay = gapWithKBG === "Нет данных" ? "Нет данных" : gapWithKBG;
                const weightCategoryDisplay = weightCategory || 'Нет данных';
                const crBadge = `<span class="cr-badge" title="${crState.name} (×${crState.coefficient})">${crState.emoji}</span>`;
                
                card.innerHTML = `
                    <div class="athlete-info">
                        <h3>${athlete.firstName} ${athlete.lastName} ${crBadge}</h3>
                        <p class="athlete-meta">${athlete.birthYear} г.р., ${genderText} | Категория: ${weightCategoryDisplay}</p>
                    </div>
                    <div class="athlete-metrics">
                        <div class="metric"><span class="metric-label">Потенциал</span><span class="metric-value">${potential}%</span></div>
                        <div class="metric"><span class="metric-label">Реализация</span><span class="metric-value">${realizationDisplay}</span></div>
                        <div class="metric"><span class="metric-label">Разрыв</span><span class="metric-value">${gapDisplay}</span></div>
                    </div>
                `;
                card.onclick = () => this.navigate('profile', { id: athlete.id });
                athletesList.appendChild(card);
                
            } catch (error) {
                console.error(`❌ Ошибка обработки спортсмена ${athlete.id}:`, error);
                continue;
            }
        }
    }

    // ✅ ОБРАБОТЧИКИ ЗА ПРЕДЕЛАМИ ЦИКЛА
    document.getElementById('btn-add-existing-athlete').onclick = () => {
        document.getElementById('add-existing-modal').classList.remove('hidden');
        document.getElementById('access-code-input').value = '';
        document.getElementById('add-existing-error').classList.add('hidden');
    };

    document.getElementById('btn-close-add-existing').onclick = () => {
        document.getElementById('add-existing-modal').classList.add('hidden');
    };

    document.getElementById('btn-submit-add-existing').onclick = async () => {
        const accessCode = document.getElementById('access-code-input').value.trim();
        
        if (!accessCode) {
            alert('Введите код доступа');
            return;
        }
        
        Utils.showLoader();
        const result = await Athletes.addExistingAthlete(accessCode);
        Utils.hideLoader();
        
        if (result.success) {
            document.getElementById('add-existing-modal').classList.add('hidden');
            alert(`✅ Ученик "${result.athlete.firstName} ${result.athlete.lastName}" успешно добавлен!`);
            Router.route();
        } else {
            const errorDiv = document.getElementById('add-existing-error');
            errorDiv.textContent = result.error;
            errorDiv.classList.remove('hidden');
        }
    };

    document.getElementById('btn-add-athlete').onclick = () => this.navigate('athlete-add');
    document.getElementById('btn-add-first').onclick = () => this.navigate('athlete-add');
    document.getElementById('btn-logout').onclick = async () => {
        if (confirm('Вы уверены, что хотите выйти?')) {
            await AuthModule.logout();
        }
    };
    
    Utils.hideLoader();
},


    initAddAthletePage() {
        const form = document.getElementById('form-add-athlete');
        
        form.onsubmit = async (e) => {
            e.preventDefault();
            
            const birthYear = parseInt(document.getElementById('birth-year').value);
            const currentYear = new Date().getFullYear();
            
            if (birthYear < 1950 || birthYear > currentYear) {
                alert(`Укажите корректный год рождения (1950-${currentYear})`);
                return;
            }
            
            if (birthYear > currentYear - 5) {
                if (!confirm('Спортсмену меньше 5 лет. Продолжить?')) {
                    return;
                }
            }
            
            Utils.showLoader();
            
            const formData = {
                firstName: document.getElementById('first-name').value,
                lastName: document.getElementById('last-name').value,
                birthYear: birthYear,
                gender: document.querySelector('input[name="gender"]:checked').value
            };
            
            const athlete = await Athletes.create(formData);
            
            Utils.hideLoader();
            
            if (athlete) {
                localStorage.setItem('currentAthleteId', athlete.id);
                this.navigate('anthropometry', { id: athlete.id });
            } else {
                alert('Ошибка создания спортсмена');
            }
        };
        
        document.getElementById('btn-back-add').onclick = () => this.navigate('dashboard');
        document.getElementById('btn-cancel-add').onclick = () => {
            if (confirm('Отменить?')) this.navigate('dashboard');
        };
    },

    async initAnthropometryPage(athleteId) {
        if (!athleteId) {
            alert('Спортсмен не найден');
            this.navigate('dashboard');
            return;
        }
        
        Utils.showLoader();
        const athlete = await Storage.getAthleteById(athleteId);
        Utils.hideLoader();
        
        if (!athlete) {
            alert('Спортсмен не найден');
            this.navigate('dashboard');
            return;
        }
        
        document.getElementById('anthro-athlete-name').textContent = `${athlete.firstName} ${athlete.lastName}`;
        document.getElementById('measurement-date').value = Utils.getCurrentDate();

        const form = document.getElementById('form-anthropometry');
        form.onsubmit = async (e) => {
            e.preventDefault();
            Utils.showLoader();
            
            const formData = {
                height: document.getElementById('height').value,
                weight: document.getElementById('weight').value,
                reach: document.getElementById('reach').value,
                date: document.getElementById('measurement-date').value
            };
            
            const success = await Athletes.addAnthropometry(athleteId, formData);
            Utils.hideLoader();
            
            if (success) {
                this.navigate('profile', { id: athleteId });
            } else {
                alert('Ошибка сохранения');
            }
        };
        
        document.getElementById('btn-back-anthro').onclick = () => this.navigate('dashboard');
        document.getElementById('btn-cancel-anthro').onclick = async () => {
            if (confirm('Отменить?')) {
                Utils.showLoader();
                await Storage.deleteAthlete(athleteId);
                Utils.hideLoader();
                this.navigate('dashboard');
            }
        };
    },

    async initProfilePage(athleteId) {
        if (!athleteId) {
            alert('Спортсмен не найден');
            this.navigate('dashboard');
            return;
        }

        this.currentAthleteId = athleteId;
        localStorage.setItem('currentAthleteId', athleteId);
        
        Utils.showLoader();
        const athlete = await Storage.getAthleteById(athleteId);
        Utils.hideLoader();

        if (!athlete) {
            alert('Спортсмен не найден');
            this.navigate('dashboard');
            return;
        }

        const genderText = athlete.gender === 'M' ? 'М' : 'Ж';
        document.getElementById('profile-athlete-name').textContent = `${athlete.firstName} ${athlete.lastName}`;
        document.getElementById('profile-athlete-meta').textContent = `${athlete.birthYear} г.р., ${genderText}`;

        const potential = Calculations.calculatePotential(athlete);
        const realization = await Calculations.calculateRealization(athlete);
        const gap = Calculations.calculateGap(potential, realization);

        const realizationDisplay = realization === "Нет данных" ? "Нет данных" : `${realization}%`;
        const gapDisplay = gap === "Нет данных" ? "Нет данных" : gap;

        document.getElementById('profile-potential').textContent = `${potential}%`;
        document.getElementById('profile-realization').textContent = realizationDisplay;
        document.getElementById('profile-gap').textContent = gapDisplay;

        const sectionsGrid = document.getElementById('profile-sections-grid');
        if (sectionsGrid) {
            sectionsGrid.innerHTML = `
                <a href="anthropometry.html?id=${athleteId}" class="section-button">
                    <div class="section-button-icon">📏</div>
                    <div class="section-button-title">Антропометрия</div>
                    <div class="section-button-subtitle">Параметры и история</div>
                </a>
                <a href="physical.html?id=${athleteId}" class="section-button">
                    <div class="section-button-icon">💪</div>
                    <div class="section-button-title">Физическое развитие</div>
                    <div class="section-button-subtitle">Сила и выносливость</div>
                </a>
                <a href="functional.html?id=${athleteId}" class="section-button">
                    <div class="section-button-icon">⚡</div>
                    <div class="section-button-title">Функциональная готовность</div>
                    <div class="section-button-subtitle">Скорость и реакция</div>
                </a>
                <a href="technical.html?id=${athleteId}" class="section-button">
                    <div class="section-button-icon">🥊</div>
                    <div class="section-button-title">Техническая подготовленность</div>
                    <div class="section-button-subtitle">Навыки и тактика</div>
                </a>
            `;
        }

        const recommendationsDiv = document.getElementById('profile-recommendations');
        recommendationsDiv.innerHTML = '';
        
        if (realization !== "Нет данных") {
            const recommendations = Recommendations.generate({
                ...athlete,
                metrics: { potential, realization, gap }
            });
            
            if (recommendations.length > 0) {
                recommendations.forEach(rec => {
                    const recDiv = document.createElement('div');
                    recDiv.className = `recommendation ${rec.type}`;
                    recDiv.innerHTML = `<h4>${rec.title}</h4><p>${rec.text}</p>`;
                    recommendationsDiv.appendChild(recDiv);
                });
            } else {
                recommendationsDiv.innerHTML = '<p>Рекомендаций пока нет</p>';
            }
        } else {
            recommendationsDiv.innerHTML = '<p>Для формирования рекомендаций необходимо внести данные по тестам</p>';
        }

        document.getElementById('btn-back-profile').onclick = () => this.navigate('dashboard');
        
        document.getElementById('btn-share').onclick = async () => {
            const url = await Share.getShareUrl(athleteId);
            if (url) {
                document.getElementById('share-link').value = url;
                document.getElementById('share-modal').classList.remove('hidden');
            }
        };

        document.getElementById('btn-copy-link').onclick = () => {
            const linkInput = document.getElementById('share-link');
            linkInput.select();
            document.execCommand('copy');
            alert('Ссылка скопирована!');
        };
        // ✅ ВСТАВЬТЕ НОВЫЙ КОД:
        document.getElementById('btn-access-code').onclick = () => {
    const code = athlete.accessCode || 'НЕ СОЗДАН';
    document.getElementById('access-code-display').value = code;
    document.getElementById('access-code-modal').classList.remove('hidden');
};


        document.getElementById('btn-close-modal').onclick = () => {
            document.getElementById('share-modal').classList.add('hidden');
        };
         // ✅ ДОБАВЬТЕ СЮДА:
    document.getElementById('btn-copy-access-code').onclick = () => {
        const input = document.getElementById('access-code-display');
        input.select();
        document.execCommand('copy');
        
        const btn = document.getElementById('btn-copy-access-code');
        const oldText = btn.textContent;
        btn.textContent = '✅ Скопировано!';
        setTimeout(() => {
            btn.textContent = oldText;
        }, 2000);
    };

    document.getElementById('btn-close-access-code').onclick = () => {
        document.getElementById('access-code-modal').classList.add('hidden');
    };

        // ✅ РЕНДЕР СЕЛЕКТОРА КБГ (ДЛЯ ТРЕНЕРА)
setTimeout(async () => {
    const container = document.getElementById('combat-readiness-selector');
    console.log('⚔️ Рендеринг КБГ для тренера, контейнер:', !!container);
    
    if (container) {
        await CombatReadiness.renderSelector(athleteId, async (newState) => {
            console.log(`⚔️ КБГ изменён: ${newState.name} (×${newState.coefficient})`);
            
            // Пересчитываем метрики с новым КБГ
            const updatedAthlete = await Storage.getAthleteById(athleteId);
            const currentRealization = await Calculations.calculateRealization(updatedAthlete);
            
            if (currentRealization !== "Нет данных") {
                const adjusted = CombatReadiness.applyToRealization(currentRealization, newState);
                document.getElementById('profile-realization').textContent = 
                    adjusted === "Нет данных" ? "Нет данных" : `${adjusted}%`;
                
                const currentPotential = Calculations.calculatePotential(updatedAthlete);
                const newGap = adjusted === "Нет данных" ? "Нет данных" : (currentPotential - adjusted);
                document.getElementById('profile-gap').textContent = newGap;
            }
        });
        console.log('✅ КБГ отрендерен на странице профиля');
    } else {
        console.warn('⚠️ Контейнер КБГ не найден');
    }
}, 200);

    }
};

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    Router.init();
});

