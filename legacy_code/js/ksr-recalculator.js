// js/ksr-recalculator.js
async function recalculateKSR(athleteId) {
    console.log('🔄 Пересчет КСР после сдачи теста...');
    
    try {
        const doc = await db.collection('students').doc(athleteId).get();
        if (!doc.exists) return;
        
        const athlete = { id: doc.id, ...doc.data() };
        const potential = calculatePotentialLocally(athlete);
        
        if (potential === 0) {
            await db.collection('students').doc(athleteId).update({
                'metrics.realization': "Нет данных",
                'metrics.gap': "Нет данных"
            });
            return;
        }
        
        const allNorms = await loadNorms();
        const physicalNorms = getAthletNorms(allNorms, athlete, 'physical');
        const functionalNorms = getAthletNorms(allNorms, athlete, 'functional');
        
        let physicsRealization = 0;
        if (physicalNorms.length > 0) {
            let sumPhysics = 0;
            physicalNorms.forEach(norm => {
                const testResult = athlete.tests?.physical?.[norm.testId];
                sumPhysics += testResult ? (testResult.normalizedScore || 0) : 0;
            });
            physicsRealization = (sumPhysics / physicalNorms.length) / 100;
        }
        
        let functionalRealization = 0;
        if (functionalNorms.length > 0) {
            let sumFunctional = 0;
            functionalNorms.forEach(norm => {
                const testResult = athlete.tests?.functional?.[norm.testId];
                sumFunctional += testResult ? (testResult.normalizedScore || 0) : 0;
            });
            functionalRealization = (sumFunctional / functionalNorms.length) / 100;
        }
        
        const technicalRealization = athlete.technicalScore || 0;
        
        const physicsContribution = potential * 0.333 * physicsRealization;
        const functionalContribution = potential * 0.333 * functionalRealization;
        const technicalContribution = potential * 0.333 * technicalRealization;
        
        const ksr = physicsContribution + functionalContribution + technicalContribution;
        const finalKSR = Math.min(Math.round(ksr), potential);
        
        const realization = finalKSR === 0 ? "Нет данных" : finalKSR;
        const gap = realization === "Нет данных" ? "Нет данных" : potential - realization;
        
        await db.collection('students').doc(athleteId).update({
            'metrics.realization': realization,
            'metrics.gap': gap
        });
        
        console.log('✅ КСР обновлён');
        
    } catch (error) {
        console.error('❌ Ошибка пересчета КСР:', error);
    }
}

function calculatePotentialLocally(athlete) {
    if (!athlete.anthropometry || athlete.anthropometry.length === 0) return 0;
    
    const latest = athlete.anthropometry[athlete.anthropometry.length - 1];
    const { height, weight, reach } = latest;
    
    const ageGroup = SharedCalculations.getAgeGroup(athlete.birthYear);
    if (!ageGroup) return 0;
    
    const category = SharedCalculations.findWeightCategory(athlete.gender, ageGroup, weight);
    if (!category) return 0;
    
    return SharedCalculations.calculateBiometricPotential(height, reach, category.idealHeight);
}
