import SensitivePeriodTimer from './SensitivePeriodTimer'
import { vk } from '../utils/vkUi.js'

/**
 * Сенситивные периоды на публичной карточке — тот же вид, что у тренера на странице ученика.
 * @param {{ birthYear?: number | string | null, birthDate?: string | null }} props
 */
export default function ShareSensitivePeriodsMap({ birthYear, birthDate }) {
  return (
    <section className={`${vk.cardPadded} py-2.5 sm:py-3`}>
      <h2 className={vk.h2}>Сенситивные периоды</h2>
      <SensitivePeriodTimer className="mt-1.5" birthYear={birthYear} birthDate={birthDate} />
    </section>
  )
}
