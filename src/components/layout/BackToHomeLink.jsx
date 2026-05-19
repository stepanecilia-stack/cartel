import { Link } from 'react-router-dom'
import { vk } from '../../utils/vkUi.js'

export const BACK_TO_HOME_LABEL = 'Вернуться на главную'

/**
 * @param {{
 *   onClick?: () => void,
 *   to?: string,
 *   className?: string,
 *   showArrow?: boolean,
 * }} props
 */
export default function BackToHomeLink({ onClick, to = '/', className = '', showArrow = true }) {
  const classes = [vk.backToHome, className].filter(Boolean).join(' ')
  const content = (
    <>
      {showArrow ? (
        <span aria-hidden className="text-[15px] leading-none">
          ←
        </span>
      ) : null}
      <span>{BACK_TO_HOME_LABEL}</span>
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {content}
      </button>
    )
  }

  return (
    <Link to={to} className={classes}>
      {content}
    </Link>
  )
}

/**
 * @param {{
 *   onClick?: () => void,
 *   className?: string,
 *   children?: React.ReactNode,
 * }} props
 */
export function BackToHomeBar({ onClick, to = '/', className = '', children = null }) {
  return (
    <div className={[vk.backToHomeBar, className].filter(Boolean).join(' ')}>
      <BackToHomeLink onClick={onClick} to={to} />
      {children}
    </div>
  )
}
