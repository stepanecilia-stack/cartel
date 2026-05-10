import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AddStudent from './pages/AddStudent'
import HomePage from './pages/HomePage'
import MotorQualitiesIndexPage from './pages/MotorQualitiesIndexPage'
import MotorQualityDetailPage from './pages/MotorQualityDetailPage'
import LoginCoach from './pages/LoginCoach'
import RegisterCoach from './pages/RegisterCoach'
import ShareProgressPage from './pages/ShareProgressPage'
import StudentPage from './pages/StudentPage'
import WelcomePage from './pages/WelcomePage'
import {
  getCoachProfile,
  logoutCoach,
  subscribeToAuth,
} from './services/firebaseService'
import ThemeToggleButton from './components/ThemeToggleButton'

function Navbar({ user, coachProfile }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mx-auto flex min-h-[72px] max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:h-[72px] sm:flex-nowrap sm:gap-3 sm:px-6 sm:py-0">
        <div className="flex min-w-0 shrink-0 items-center gap-3 sm:gap-4">
          <Link
            to={user ? '/' : '/welcome'}
            className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-lg"
            aria-label="Cartel Academy — на главную"
          >
            Cartel Academy
          </Link>
          {user ? (
            <Link
              to="/qualities"
              className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 sm:text-sm"
            >
              <span className="sm:hidden">Качества</span>
              <span className="hidden sm:inline">База качеств</span>
            </Link>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-nowrap sm:gap-3">
          <ThemeToggleButton />
          {user ? (
            <>
              <span className="min-w-0 truncate text-right text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                {coachProfile?.firstName ? `${coachProfile.firstName} ${coachProfile.lastName}` : user.email}
              </span>
              <button
                type="button"
                onClick={() => logoutCoach()}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Выйти
              </button>
            </>
          ) : (
            <div className="flex shrink-0 items-center gap-2">
              <Link
                to="/login"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Вход
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Регистрация
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function ProtectedRoute({ user, element }) {
  if (!user) return <Navigate to="/login" replace />
  return element
}

function AppRoutes({ authUser, selectedStudent, setSelectedStudent, coachProfile }) {
  const location = useLocation()
  const isShareRoute = location.pathname.startsWith('/share/')

  return (
    <>
      {!isShareRoute && <Navbar user={authUser} coachProfile={coachProfile} />}
      <Routes>
        <Route path="/share/:student_hash" element={<ShareProgressPage />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute
              user={authUser}
              element={
                selectedStudent ? (
                  <StudentPage
                    student={selectedStudent}
                    onBack={() => setSelectedStudent(null)}
                    onStudentUpdated={(patch) =>
                      setSelectedStudent((prev) => (prev ? { ...prev, ...patch } : null))
                    }
                  />
                ) : (
                  <HomePage onSelectStudent={setSelectedStudent} coachId={authUser?.uid} />
                )
              }
            />
          }
        />
        <Route
          path="/students/new"
          element={<ProtectedRoute user={authUser} element={<AddStudent />} />}
        />
        <Route
          path="/qualities"
          element={<ProtectedRoute user={authUser} element={<MotorQualitiesIndexPage />} />}
        />
        <Route
          path="/qualities/:slug"
          element={<ProtectedRoute user={authUser} element={<MotorQualityDetailPage />} />}
        />
        <Route
          path="/login"
          element={authUser ? <Navigate to="/" replace /> : <LoginCoach />}
        />
        <Route
          path="/register"
          element={authUser ? <Navigate to="/" replace /> : <RegisterCoach />}
        />
        <Route
          path="*"
          element={<Navigate to={authUser ? '/' : '/welcome'} replace />}
        />
      </Routes>
    </>
  )
}

function App() {
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [authUser, setAuthUser] = useState(undefined)
  const [coachProfile, setCoachProfile] = useState(null)

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (user) => {
      setAuthUser(user ?? null)
      if (user) {
        try {
          const profile = await getCoachProfile(user.uid)
          setCoachProfile(profile)
        } catch (error) {
          console.error('Не удалось загрузить профиль тренера:', error)
          setCoachProfile(null)
        }
      } else {
        setCoachProfile(null)
        setSelectedStudent(null)
      }
    })
    return () => unsubscribe()
  }, [])

  if (authUser === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <p className="rounded-xl bg-white px-5 py-3 shadow-sm dark:bg-slate-900 dark:text-slate-200">
          Проверка авторизации...
        </p>
      </main>
    )
  }

  return (
    <AppRoutes
      authUser={authUser}
      selectedStudent={selectedStudent}
      setSelectedStudent={setSelectedStudent}
      coachProfile={coachProfile}
    />
  )
}

export default App
