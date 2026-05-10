import { useNavigate } from 'react-router-dom'
import NewStudentForm from '../components/NewStudentForm'

function AddStudent() {
  const navigate = useNavigate()

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-8 shadow-sm dark:bg-slate-900">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Добавить ученика</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          После сохранения программа сама посчитает рекомендуемую дистанцию боя по антропометрии, «потолок по телу» и
          стартовые баллы.
          Возраст берётся как текущий год минус год рождения. Ту же анкету можно открыть с главной кнопкой «Добавить
          ученика».
        </p>

        <NewStudentForm onSuccess={() => navigate('/')} onCancel={() => navigate('/')} />
      </div>
    </main>
  )
}

export default AddStudent
