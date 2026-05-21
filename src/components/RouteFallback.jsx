import { vk } from '../utils/vkUi.js'

/** Плейсхолдер при lazy-load маршрута. */
export default function RouteFallback({ label = 'Загрузка…' }) {
  return (
    <main className={`${vk.page} ${vk.pagePad}`}>
      <p className={`text-center ${vk.muted}`}>{label}</p>
    </main>
  )
}
