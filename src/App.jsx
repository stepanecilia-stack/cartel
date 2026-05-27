import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import RouteFallback from './components/RouteFallback.jsx'
import AddStudent from './pages/AddStudent'
import HomePage from './pages/HomePage'
import LoginCoach from './pages/LoginCoach'
import RegisterCoach from './pages/RegisterCoach'
import ShareProgressPage from './pages/ShareProgressPage'
import ShareLeaderboardPage from './pages/ShareLeaderboardPage'
import WelcomePage from './pages/WelcomePage'

const StudentPage = lazy(() => import('./pages/StudentPage'))
const BulkNormSessionPage = lazy(() => import('./pages/BulkNormSessionPage'))
const GroupTrainingPage = lazy(() => import('./pages/GroupTrainingPage'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'))
const MotorQualitiesIndexPage = lazy(() => import('./pages/MotorQualitiesIndexPage'))
const MotorQualityDetailPage = lazy(() => import('./pages/MotorQualityDetailPage'))
const TechnicalElementsPage = lazy(() => import('./pages/TechnicalElementsPage'))
const CoachCalendarPage = lazy(() => import('./pages/CoachCalendarPage.jsx'))
import AdminToolsPage from './pages/AdminToolsPage.jsx'
import {
  clearCoachProfileCache,
  setCoachProfileCache,
} from './data/coachProfileCache.js'
import {
  startCoachStudentsSync,
  stopCoachStudentsSync,
} from './data/coachStudentsCache.js'
import { loadNormsOnce } from './data/normsCache.js'
import { subscribeLegacyNorms } from './services/legacyNormsService.js'
import {
  logoutCoach,
  subscribeCoachProfile,
  subscribeToAuth,
} from './services/firebaseService'
import { subscribeMotorQualityExercises } from './services/motorQualityExercisesService'
import { subscribeTechnicalProgramAtoms } from './services/technicalProgramAtomsService.js'
import { useGroupTrainingSession } from './hooks/useGroupTrainingSession.js'
import { isProgramAdmin } from './utils/coachRoles.js'
import { clearGroupTrainingSession } from './utils/groupTrainingSession.js'
import { vk } from './utils/vkUi.js'

function LeaderboardNavIcon({ className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M8 21h8" />
      <path d="M12 17V7" />
      <path d="M7 7h10l-1-4H8L7 7z" />
    </svg>
  )
}

function Navbar({ user, coachProfile, programAdmin }) {
  const location = useLocation()
  const trainingSession = useGroupTrainingSession(user?.uid)
  const isLeaderboard =
    location.pathname === '/leaderboard' || location.pathname === '/leaderboard/school'
  const isGroupTraining = location.pathname === '/group-training'
  const trainingCount = trainingSession?.selectedIds.length ?? 0
  const trainingActive = trainingCount > 0

  const trainingNavClass = (compact) => {
    const active = isGroupTraining
    if (compact) {
      return `inline-flex h-8 shrink-0 touch-manipulation items-center gap-1 rounded-lg px-2 text-[13px] font-medium ${
        active || trainingActive
          ? 'bg-[#ecf3fc] text-[#2d81e0]'
          : 'text-[#818c99] active:bg-[#f0f2f5]'
      }`
    }
    return `hidden shrink-0 sm:inline ${vk.linkNav} ${
      trainingActive ? '!font-semibold !text-[#2d81e0]' : ''
    }`
  }

  return (
    <header className={vk.navBar}>
      <div className={vk.navBarInner}>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
          <Link
            to={user ? '/' : '/welcome'}
            className="shrink-0 text-[15px] font-semibold text-[#2c2d2e]"
            aria-label="Cartel — на главную"
          >
            Cartel
          </Link>
          {user ? (
            <>
              {trainingActive ? (
                <Link
                  to="/group-training"
                  className={`${trainingNavClass(true)} md:hidden`}
                  aria-current={isGroupTraining ? 'page' : undefined}
                >
                  <span>Тренировка</span>
                  <span className="rounded-full bg-[#2d81e0] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                    {trainingCount}
                  </span>
                </Link>
              ) : null}
              <Link
                to="/leaderboard"
                className={`inline-flex h-8 shrink-0 touch-manipulation items-center gap-1 rounded-lg px-2 text-[13px] font-medium md:hidden ${
                  isLeaderboard
                    ? 'bg-[#ecf3fc] text-[#2d81e0]'
                    : 'text-[#818c99] active:bg-[#f0f2f5]'
                }`}
                aria-current={isLeaderboard ? 'page' : undefined}
              >
                <LeaderboardNavIcon />
                <span>Рейтинг</span>
              </Link>
            </>
          ) : null}
          {user ? (
            <>
              <Link to="/qualities" className={`hidden shrink-0 sm:inline ${vk.linkNav}`}>
                Качества
              </Link>
              {programAdmin ? (
                <>
                  <Link to="/admin" className={`hidden shrink-0 lg:inline ${vk.linkNav}`}>
                    Админ
                  </Link>
                  <Link to="/technical-elements" className={`hidden shrink-0 lg:inline ${vk.linkNav}`}>
                    Элементы
                  </Link>
                </>
              ) : null}
              <Link to="/bulk-norms" className={`hidden shrink-0 md:inline ${vk.linkNav}`}>
                Норматив
              </Link>
              <Link to="/calendar" className={`hidden shrink-0 md:inline ${vk.linkNav}`}>
                Календарь
              </Link>
              <Link
                to="/group-training"
                className={trainingNavClass(false)}
                aria-current={isGroupTraining ? 'page' : undefined}
              >
                {trainingActive ? (
                  <>
                    Тренировка
                    <span className="ml-1 rounded-full bg-[#2d81e0] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                      {trainingCount}
                    </span>
                  </>
                ) : (
                  'Тренировка'
                )}
              </Link>
              <Link to="/leaderboard" className={`hidden shrink-0 md:inline ${vk.linkNav}`}>
                Рейтинг
              </Link>
            </>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {user ? (
            <>
              <span className="min-w-0 max-w-[42vw] truncate text-right text-[13px] text-[#818c99] sm:max-w-none">
                {coachProfile?.firstName ? `${coachProfile.firstName} ${coachProfile.lastName}` : user.email}
                {programAdmin ? (
                  <span className="ml-1 rounded bg-[#fff8e6] px-1 py-0.5 text-[10px] font-semibold text-[#e6a817]">
                    админ
                  </span>
                ) : null}
              </span>
              <button type="button" onClick={() => logoutCoach()} className={vk.btnGhost}>
                Выйти
              </button>
            </>
          ) : (
            <div className="flex shrink-0 items-center gap-1">
              <Link to="/login" className={vk.btnGhost}>
                Вход
              </Link>
              <Link to="/register" className={vk.btnPrimary}>
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

function AdminRoute({ user, coachProfile, element }) {
  if (!user) return <Navigate to="/login" replace />
  if (!isProgramAdmin(coachProfile)) return <Navigate to="/" replace />
  return element
}

function LazyRoute({ label, children }) {
  return <Suspense fallback={<RouteFallback label={label} />}>{children}</Suspense>
}

function AppRoutes({ authUser, selectedStudent, setSelectedStudent, coachProfile }) {
  const programAdmin = isProgramAdmin(coachProfile)
  const location = useLocation()
  const navigate = useNavigate()
  const isShareRoute =
    location.pathname.startsWith('/share/') || location.pathname.startsWith('/leaderboard/share/')

  const openStudentFromQualityPage = (student) => {
    if (!student) return
    setSelectedStudent(student)
    navigate('/')
  }

  const openStudentFromAdmin = (student) => {
    if (student) setSelectedStudent(student)
    navigate('/')
  }

  const openStudentFromLeaderboard = (student) => {
    if (!student) return
    setSelectedStudent(student)
    navigate('/')
  }

  return (
    <div className="vk-app">
      {!isShareRoute && (
        <Navbar user={authUser} coachProfile={coachProfile} programAdmin={programAdmin} />
      )}
      <Routes>
        <Route path="/share/:student_hash" element={<ShareProgressPage />} />
        <Route path="/leaderboard/share/:token" element={<ShareLeaderboardPage />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute
              user={authUser}
              element={
                selectedStudent ? (
                  <LazyRoute label="Карточка ученика…">
                    <StudentPage
                      student={selectedStudent}
                      onBack={() => setSelectedStudent(null)}
                      onStudentUpdated={(patch) =>
                        setSelectedStudent((prev) => (prev ? { ...prev, ...patch } : null))
                      }
                    />
                  </LazyRoute>
                ) : (
                  <HomePage
                    onSelectStudent={setSelectedStudent}
                    coachId={authUser?.uid}
                    isProgramAdmin={programAdmin}
                  />
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
              element={
                <LazyRoute label="Групповая тренировка…">
                  <GroupTrainingPage coachId={authUser?.uid} />
                </LazyRoute>
              }
            />
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute
              user={authUser}
              element={
                <LazyRoute label="Календарь…">
                  <CoachCalendarPage coachId={authUser?.uid} />
                </LazyRoute>
              }
            />
          }
        />
        <Route
          path="/bulk-norms"
          element={
            <ProtectedRoute
              user={authUser}
              element={
                <LazyRoute label="Нормативы…">
                  <BulkNormSessionPage coachId={authUser?.uid} />
                </LazyRoute>
              }
            />
          }
        />
        <Route
          path="/qualities"
          element={
            <ProtectedRoute
              user={authUser}
              element={
                <LazyRoute label="Качества…">
                  <MotorQualitiesIndexPage />
                </LazyRoute>
              }
            />
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute
              user={authUser}
              coachProfile={coachProfile}
              element={
                <AdminToolsPage coachId={authUser?.uid} onOpenStudent={openStudentFromAdmin} />
              }
            />
          }
        />
        <Route
          path="/technical-elements"
          element={
            <AdminRoute
              user={authUser}
              coachProfile={coachProfile}
              element={
                <LazyRoute label="Элементы…">
                  <TechnicalElementsPage />
                </LazyRoute>
              }
            />
          }
        />
        <Route
          path="/qualities/:slug"
          element={
            <ProtectedRoute
              user={authUser}
              element={
                <LazyRoute label="Качество…">
                  <MotorQualityDetailPage
                    coachId={authUser?.uid}
                    onOpenStudent={openStudentFromQualityPage}
                  />
                </LazyRoute>
              }
            />
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute
              user={authUser}
              element={
                <LazyRoute label="Рейтинг…">
                  <LeaderboardPage
                    scope="coach"
                    coachId={authUser?.uid}
                    onSelectStudent={openStudentFromLeaderboard}
                  />
                </LazyRoute>
              }
            />
          }
        />
        <Route
          path="/leaderboard/school"
          element={
            <ProtectedRoute
              user={authUser}
              element={
                <LazyRoute label="Рейтинг школы…">
                  <LeaderboardPage scope="school" />
                </LazyRoute>
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
    </div>
  )
}

function App() {
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [authUser, setAuthUser] = useState(undefined)
  const [coachProfile, setCoachProfile] = useState(null)

  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setAuthUser(user ?? null)
      if (!user) {
        setCoachProfile(null)
        setSelectedStudent(null)
        clearCoachProfileCache()
        stopCoachStudentsSync()
        clearGroupTrainingSession()
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!authUser?.uid) return undefined
    return subscribeCoachProfile(
      authUser.uid,
      (profile) => {
        setCoachProfile(profile)
        setCoachProfileCache(authUser.uid, profile)
      },
      (err) => {
        console.error('Не удалось загрузить профиль тренера:', err)
        setCoachProfile(null)
        clearCoachProfileCache()
      },
    )
  }, [authUser?.uid])

  useEffect(() => {
    if (!authUser?.uid) return undefined
    startCoachStudentsSync(authUser.uid, {
      viewAllStudents: isProgramAdmin(coachProfile),
    })
    return () => stopCoachStudentsSync()
  }, [authUser?.uid, coachProfile])

  useEffect(() => {
    if (!authUser) return undefined
    const unsubNorms = subscribeLegacyNorms()
    loadNormsOnce().catch(() => {})
    const unsubExercises = subscribeMotorQualityExercises()
    const unsubAtoms = subscribeTechnicalProgramAtoms()
    return () => {
      unsubNorms()
      unsubExercises()
      unsubAtoms()
    }
  }, [authUser])

  if (authUser === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#edeef0] text-[#2c2d2e]">
        <p className="rounded-[10px] bg-white px-4 py-3 text-[13px] text-[#818c99]">
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
