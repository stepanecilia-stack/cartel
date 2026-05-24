import { memo } from 'react'
import TechniqueProgressSliders from '../technique/TechniqueProgressSliders.jsx'
import StudentTechnicalAtomsList from './StudentTechnicalAtomsList.jsx'
import StudentTechnicalCombosSection from './StudentTechnicalCombosSection.jsx'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   loadingNorms: boolean,
 *   technicalAtomsCount: number,
 *   technicalTierTab: 'level1' | 'level2' | 'combos',
 *   onTierTabChange: (tab: 'level1' | 'level2' | 'combos') => void,
 *   combinationsCount: number,
 *   level1Atoms: object[],
 *   level2Atoms: object[],
 *   technicalData: Record<string, { level?: string }>,
 *   technicalLocksById: Record<string, boolean>,
 *   technicalSavingKey: string | null,
 *   canSave: boolean,
 *   onLevelChange: (atomId: string, level: string) => void,
 *   onSaveAtom: (atom: object) => void,
 *   combinations?: unknown,
 *   sliderSaveStatus?: 'idle' | 'saving' | 'saved' | 'error',
 *   onProgressSliderChange?: (tiers: { l1: number, l2: number, l3: number }) => void,
 *   combosProps: Record<string, unknown>,
 * }} props
 */
function StudentTechnicalTab({
  loadingNorms,
  technicalAtomsCount,
  technicalTierTab,
  onTierTabChange,
  combinationsCount,
  level1Atoms,
  level2Atoms,
  technicalData,
  technicalLocksById,
  technicalSavingKey,
  canSave,
  onLevelChange,
  onSaveAtom,
  combinations = [],
  sliderSaveStatus = 'idle',
  onProgressSliderChange,
  combosProps,
}) {
  if (technicalAtomsCount === 0 && !loadingNorms) {
    return (
      <p className={vk.mutedXs}>Список не загрузился — проверьте интернет и обновите страницу.</p>
    )
  }

  return (
    <div className="space-y-2">
      {onProgressSliderChange ? (
        <TechniqueProgressSliders
          level1Atoms={level1Atoms}
          level2Atoms={level2Atoms}
          combinations={combinations}
          technicalData={technicalData}
          canSave={canSave}
          saveStatus={sliderSaveStatus}
          onSliderChange={onProgressSliderChange}
        />
      ) : null}

      <nav className={vk.segmentBar} aria-label="Разделы техники">
        <button
          type="button"
          onClick={() => onTierTabChange('level1')}
          aria-current={technicalTierTab === 'level1' ? 'page' : undefined}
          className={`${vk.segmentBtn} flex-1 ${
            technicalTierTab === 'level1' ? vk.segmentBtnActive : vk.segmentBtnInactive
          }`}
        >
          Ур.1
        </button>
        <button
          type="button"
          onClick={() => onTierTabChange('level2')}
          aria-current={technicalTierTab === 'level2' ? 'page' : undefined}
          className={`${vk.segmentBtn} flex-1 ${
            technicalTierTab === 'level2' ? vk.segmentBtnActive : vk.segmentBtnInactive
          }`}
        >
          Ур.2
        </button>
        <button
          type="button"
          onClick={() => onTierTabChange('combos')}
          aria-current={technicalTierTab === 'combos' ? 'page' : undefined}
          className={`${vk.segmentBtn} flex-1 ${
            technicalTierTab === 'combos' ? vk.segmentBtnActive : vk.segmentBtnInactive
          }`}
        >
          Комб.
          {combinationsCount > 0 ? (
            <span className="ml-0.5 tabular-nums">{combinationsCount}</span>
          ) : null}
        </button>
      </nav>

      {technicalTierTab === 'level1' ? (
        <StudentTechnicalAtomsList
          atoms={level1Atoms}
          technicalData={technicalData}
          technicalLocksById={technicalLocksById}
          technicalSavingKey={technicalSavingKey}
          canSave={canSave}
          showMethodDetails
          onLevelChange={onLevelChange}
          onSaveAtom={onSaveAtom}
        />
      ) : null}

      {technicalTierTab === 'level2' ? (
        <StudentTechnicalAtomsList
          atoms={level2Atoms}
          technicalData={technicalData}
          technicalLocksById={technicalLocksById}
          technicalSavingKey={technicalSavingKey}
          canSave={canSave}
          onLevelChange={onLevelChange}
          onSaveAtom={onSaveAtom}
        />
      ) : null}

      {technicalTierTab === 'combos' ? <StudentTechnicalCombosSection {...combosProps} /> : null}
    </div>
  )
}

export default memo(StudentTechnicalTab)
