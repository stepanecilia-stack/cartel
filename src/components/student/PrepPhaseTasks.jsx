import { memo } from 'react'

/**
 * @param {{ tasks: Array<{ task: string, via: string }>, compact?: boolean }} props
 */
function PrepPhaseTasks({ tasks, compact = false }) {
  if (!tasks?.length) return null

  return (
    <dl className={compact ? 'space-y-1' : 'mt-2 space-y-1.5'}>
      {tasks.map(({ task, via }) => (
        <div
          key={task}
          className={`grid gap-x-2 ${compact ? 'grid-cols-[1fr_auto] text-[11px]' : 'grid-cols-[minmax(0,1fr)_auto] text-[12px]'}`}
        >
          <dt className="font-medium text-[#2c2d2e]">{task}</dt>
          <dd className="text-right font-medium text-[#818c99] tabular-nums">{via}</dd>
        </div>
      ))}
    </dl>
  )
}

export default memo(PrepPhaseTasks)
