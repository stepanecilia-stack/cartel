import { Link } from 'react-router-dom'

function WelcomePage() {
  return (
    <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-slate-50 px-6 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="w-full max-w-2xl rounded-xl bg-white p-10 text-center shadow-sm dark:bg-slate-900">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Cartel Academy</h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-600 dark:text-slate-400">
          Ведите учеников, вводите тесты и технику, смотрите понятные баллы и подсказки, что развивать в первую очередь.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/login"
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Войти
          </Link>
          <Link
            to="/register"
            className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </main>
  )
}

export default WelcomePage

