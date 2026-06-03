import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribeToAuth } from '../services/firebaseService'
import { isStudentPortalFirebaseUser } from '../utils/studentPortalAuth.js'
import { vk } from '../utils/vkUi.js'

function WelcomePage() {
  const [studentAuthActive, setStudentAuthActive] = useState(false)

  useEffect(() => {
    return subscribeToAuth((user) => {
      setStudentAuthActive(isStudentPortalFirebaseUser(user))
    })
  }, [])

  return (
    <main className={`${vk.pageWithNav} flex items-center justify-center px-4 py-6`}>
      <div className={`w-full max-w-2xl ${vk.cardPadded} text-center`}>
        <h1 className="text-[22px] font-semibold leading-6 text-[#2c2d2e]">Cartel Academy</h1>
        <p className={`mx-auto mt-3 max-w-xl ${vk.muted}`}>
          Ведите учеников, вводите тесты и технику, смотрите понятные баллы и подсказки, что развивать в первую
          очередь.
        </p>
        {studentAuthActive ? (
          <p className={`mx-auto mt-3 max-w-md rounded-lg bg-[#fff8e6] px-3 py-2 text-[12px] text-[#2c2d2e]`}>
            На этом устройстве сохранён вход ученика. Чтобы открыть панель тренера, нажмите «Войти (тренер)».
          </p>
        ) : null}
        <div className="mx-auto mt-6 w-full max-w-sm space-y-3">
          <Link to="/student-login" className={vk.btnStudentPortal}>
            Кабинет ученика
          </Link>
          <p className={vk.mutedXs}>Код из карточки и PIN, который выдал тренер</p>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Link to="/login" className={vk.btnPrimary}>
              Войти (тренер)
            </Link>
            <Link to="/register" className={vk.btnGhost}>
              Регистрация тренера
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

export default WelcomePage
