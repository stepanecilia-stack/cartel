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
            Достаточно имени и фамилии — антропометрию можно добавить позже в карточке. После сохранения появится
            шестизначный код ученика.
          </p>

          <NewStudentForm onSuccess={() => navigate('/')} onCancel={() => navigate('/')} />
        </div>
      </div>
    </main>
  )
}

export default AddStudent
