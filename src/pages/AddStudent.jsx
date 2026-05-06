import { useNavigate } from 'react-router-dom'
import NewStudentForm from '../components/NewStudentForm'

function AddStudent() {
  const navigate = useNavigate()

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Добавить ученика</h1>
        <p className="mt-2 text-sm text-slate-600">
          После сохранения программа сама посчитает стиль боя по рукам и росту, «потолок по телу» и стартовые баллы.
          Возраст берётся как текущий год минус год рождения. Ту же анкету можно открыть с главной кнопкой «Добавить
          ученика».
        </p>

        <NewStudentForm onSuccess={() => navigate('/')} onCancel={() => navigate('/')} />
      </div>
    </main>
  )
}

export default AddStudent
