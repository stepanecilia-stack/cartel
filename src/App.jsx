import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import AddStudent from './pages/AddStudent'
import BulkNormSessionPage from './pages/BulkNormSessionPage'
import GroupTrainingPage from './pages/GroupTrainingPage'
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
import { subscribeMotorQualityExercises } from './services/motorQualityExercisesService'
function Navbar({ user, coachProfile }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mx-auto flex h-14 max-w-6xl flex-nowrap items-center justify-between gap-1.5 px-2 sm:h-[72px] sm:gap-3 sm:px-6">
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-4">
          <Link
            to={user ? '/' : '/welcome'}
            className="shrink-0 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-lg"
            aria-label="Cartel — на главную"
          >
            Cartel
          </Link>
          {user ? (
            <>
              <Link
                to="/qualities"
                className="shrink-0 text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 sm:text-sm"
              >
                <span className="sm:hidden">Качества</span>
                <span className="hidden sm:inline">База качеств</span>
              </Link>
              <Link
                to="/bulk-norms"
                className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/50 sm:px-2.5 sm:py-1.5 sm:text-xs"
              >
                <span className="sm:hidden">Норматив</span>
                <span className="hidden sm:inline">Сдать норматив</span>
              </Link>
              <Link
                to="/group-training"
                className="hidden shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 dark:border-blue-800/60 dark:bg-blue-950/50 dark:text-blue-200 dark:hover:bg-blue-900/50 md:inline-block"
              >
                Групповая
              </Link>
            </>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-1.5 sm:gap-3">
          {user ? (
            <>
              <span className="min-w-0 max-w-[40vw] truncate text-right text-[11px] text-slate-600 dark:text-slate-400 sm:max-w-none sm:text-sm">
                {coachProfile?.firstName ? `${coachProfile.firstName} ${coachProfile.lastName}` : user.email}
              </span>
              <button
                type="button"
                onClick={() => logoutCoach()}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:px-3 sm:py-2 sm:text-sm"
              >
                Выйти
              </button>
            </>
          ) : (
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Link
                to="/login"
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:px-3 sm:py-2 sm:text-sm"
              >
                Вход
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-blue-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 sm:px-3 sm:py-2 sm:text-sm"
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
  const navigate = useNavigate()
  const isShareRoute = location.pathname.startsWith('/share/')

  const openStudentFromQualityPage = (student) => {
    if (!student) return
    setSelectedStudent(student)
    navigate('/')
  }

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
          path="/group-training"
          element={
            <ProtectedRoute
              user={authUser}
              element={<GroupTrainingPage coachId={authUser?.uid} />}
            />
          }
        />
        <Route
          path="/bulk-norms"
          element={
            <ProtectedRoute
              user={authUser}
              element={<BulkNormSessionPage coachId={authUser?.uid} />}
            />
          }
        />
        <Route
          path="/qualities"
          element={<ProtectedRoute user={authUser} element={<MotorQualitiesIndexPage />} />}
        />
        <Route
          path="/qualities/:slug"
          element={
            <ProtectedRoute
              user={authUser}
              element={
                <MotorQualityDetailPage
                  coachId={authUser?.uid}
                  onOpenStudent={openStudentFromQualityPage}
                />
              }
            />
          }
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

  useEffect(() => {
    if (!authUser) return undefined
    return subscribeMotorQualityExercises()
  }, [authUser])

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
