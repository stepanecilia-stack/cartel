import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   children: React.ReactNode,
 *   centered?: boolean,
 *   narrow?: boolean,
 *   mid?: boolean,
 *   withNav?: boolean,
 *   className?: string,
 * }} props
 */
export default function VkPage({
  children,
  centered = false,
  narrow = false,
  mid = false,
  withNav = true,
  className = '',
}) {
  const mainClass = [
    withNav ? vk.pageWithNav : vk.page,
    centered ? vk.pageCenter : vk.pagePad,
    centered ? '' : narrow ? '' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const containerClass = mid ? vk.containerMid : narrow ? vk.containerNarrow : vk.container

  if (centered) {
    return <main className={mainClass}>{children}</main>
  }

  return (
    <main className={mainClass}>
      <div className={containerClass}>{children}</div>
    </main>
  )
}
