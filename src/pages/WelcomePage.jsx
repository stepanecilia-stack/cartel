import { Link } from 'react-router-dom'
import { vk } from '../utils/vkUi.js'

function WelcomePage() {
  return (
    <main className={`${vk.pageWithNav} flex items-center justify-center px-4 py-6`}>
      <div className={`w-full max-w-2xl ${vk.cardPadded} text-center`}>
        <h1 className="text-[22px] font-semibold leading-6 text-[#2c2d2e]">Cartel Academy</h1>
        <p className={`mx-auto mt-3 max-w-xl ${vk.muted}`}>
          Ведите учеников, вводите тесты и технику, смотрите понятные баллы и подсказки, что развивать в первую
          очередь.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/login" className={vk.btnPrimary}>
            Войти
          </Link>
          <Link to="/register" className={vk.btnSecondary}>
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </main>
  )
}

export default WelcomePage
