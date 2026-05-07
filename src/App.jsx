import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AddStudent from './pages/AddStudent'
import HomePage from './pages/HomePage'
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

function Navbar({ user, coachProfile }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[72px] max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:h-[72px] sm:flex-nowrap sm:gap-3 sm:px-6 sm:py-0">
        <Link to={user ? '/' : '/welcome'} className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">
          Cartel Boxing
        </Link>
        {user ? (
          <div className="flex min-w-0 max-w-full flex-1 items-center justify-end gap-2 sm:max-w-none sm:flex-none sm:gap-3">
            <span className="min-w-0 truncate text-right text-xs text-slate-600 sm:text-sm">
              {coachProfile?.firstName ? `${coachProfile.firstName} ${coachProfile.lastName}` : user.email}
            </span>
            <button
              type="button"
              onClick={() => logoutCoach()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Выйти
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Вход
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Регистрация
            </Link>
          </div>
        )}
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
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900">
        <p className="rounded-xl bg-white px-5 py-3 shadow-sm">Проверка авторизации...</p>
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
