import { Link } from 'react-router-dom'

function WelcomePage() {
  return (
    <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-slate-50 px-6 py-10 text-slate-900">
      <div className="w-full max-w-2xl rounded-xl bg-white p-10 text-center shadow-sm">
        <h1 className="text-4xl font-bold tracking-tight">Cartel Academy</h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-600">
          Ведите учеников, вводите тесты и технику, смотрите понятные баллы и подсказки, что развивать в первую очередь.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/login"
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
          >
            Войти
          </Link>
          <Link
            to="/register"
            className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-100"
          >
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </main>
  )
}

export default WelcomePage

