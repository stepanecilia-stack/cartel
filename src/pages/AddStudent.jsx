import { useNavigate } from 'react-router-dom'
import { BackToHomeBar } from '../components/layout/BackToHomeLink.jsx'
import NewStudentForm from '../components/NewStudentForm'
import { vk } from '../utils/vkUi.js'

function AddStudent() {
  const navigate = useNavigate()

  return (
    <main className={`${vk.pageWithNav} ${vk.pagePad}`}>
      <div className={`${vk.containerNarrow} max-w-2xl`}>
        <BackToHomeBar />
        <div className={vk.cardPadded}>
          <h1 className={vk.h1Lg}>Добавить ученика</h1>
          <p className={`mt-1.5 ${vk.muted}`}>
            После сохранения программа сама посчитает рекомендуемую дистанцию боя по антропометрии, «потолок по телу» и
            стартовые баллы. Возраст — текущий год минус год рождения.
          </p>

          <NewStudentForm onSuccess={() => navigate('/')} onCancel={() => navigate('/')} />
        </div>
      </div>
    </main>
  )
}

export default AddStudent
