import { memo } from 'react'
import VirtualList from '../VirtualList.jsx'
import TechnicalAtomRow from '../TechnicalAtomRow.jsx'
import { getAtomReinforcementTotal } from '../../utils/atomReinforcement.js'
import { normalizeTechnicalDominanceKey } from '../../utils/ksrUtils.js'

const ROW_HEIGHT = 80
const VIRTUALIZE_MIN = 24

/**
 * @param {{
 *   atoms: object[],
 *   technicalData: Record<string, { level?: string }>,
 *   technicalLocksById: Record<string, boolean>,
 *   technicalSavingKey: string | null,
 *   canSave: boolean,
 *   showMethodDetails?: boolean,
 *   onLevelChange: (atomId: string, level: string) => void,
 *   onSaveAtom: (atom: object) => void,
 *   portalOnlyKnowledgeAtomIds?: Set<string>,
 *   atomReinforcement?: Record<string, { total?: number }>,
 * }} props
 */
function StudentTechnicalAtomsList({
  atoms,
  technicalData,
  portalOnlyKnowledgeAtomIds,
  atomReinforcement = {},
  technicalLocksById,
  technicalSavingKey,
  canSave,
  showMethodDetails = false,
  onLevelChange,
  onSaveAtom,
}) {
  if (atoms.length === 0) return null

  const renderRow = (atom) => {
    const atomLevelKey = normalizeTechnicalDominanceKey(technicalData[atom.id]?.level)
    const isLockedBySequence = Boolean(technicalLocksById[atom.id])
    const fromPortal = portalOnlyKnowledgeAtomIds?.has(atom.id) ?? false
    return (
      <TechnicalAtomRow
        atom={atom}
        levelKey={atomLevelKey}
        locked={isLockedBySequence}
        fromPortalKnowledge={fromPortal}
        saving={technicalSavingKey === `technical:${atom.id}`}
        canSave={canSave}
        onLevelChange={(level) => onLevelChange(atom.id, level)}
        onSave={() => onSaveAtom(atom)}
        showMethodDetails={showMethodDetails}
        reinforcementTotal={getAtomReinforcementTotal(atomReinforcement, atom.id)}
      />
    )
  }

  if (atoms.length < VIRTUALIZE_MIN) {
    return (
      <ul className="overflow-hidden rounded-[10px] border border-[#e7e8ec] bg-white">
        {atoms.map((atom) => (
          <TechnicalAtomRow
            key={atom.id}
            atom={atom}
            levelKey={normalizeTechnicalDominanceKey(technicalData[atom.id]?.level)}
            locked={Boolean(technicalLocksById[atom.id])}
            fromPortalKnowledge={portalOnlyKnowledgeAtomIds?.has(atom.id) ?? false}
            saving={technicalSavingKey === `technical:${atom.id}`}
            canSave={canSave}
            onLevelChange={(level) => onLevelChange(atom.id, level)}
            onSave={() => onSaveAtom(atom)}
            showMethodDetails={showMethodDetails}
            reinforcementTotal={getAtomReinforcementTotal(atomReinforcement, atom.id)}
          />
        ))}
      </ul>
    )
  }

  return (
    <VirtualList
      items={atoms}
      rowHeight={ROW_HEIGHT}
      getKey={(atom) => atom.id}
      renderRow={(atom) => renderRow(atom)}
    />
  )
}

export default memo(StudentTechnicalAtomsList)
