import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import AddStudent from './pages/AddStudent'
import BulkNormSessionPage from './pages/BulkNormSessionPage'
import GroupTrainingPage from './pages/GroupTrainingPage'
import HomePage from './pages/HomePage'
import LeaderboardPage from './pages/LeaderboardPage'
import MotorQualitiesIndexPage from './pages/MotorQualitiesIndexPage'
import MotorQualityDetailPage from './pages/MotorQualityDetailPage'
import LoginCoach from './pages/LoginCoach'
import RegisterCoach from './pages/RegisterCoach'
import ShareProgressPage from './pages/ShareProgressPage'
import ShareLeaderboardPage from './pages/ShareLeaderboardPage'
import StudentPage from './pages/StudentPage'
import WelcomePage from './pages/WelcomePage'
import {
  getCoachProfile,
  logoutCoach,
  subscribeToAuth,
} from './services/firebaseService'
import { subscribeMotorQualityExercises } from './services/motorQualityExercisesService'
import { vk } from './utils/vkUi.js'
function Navbar({ user, coachProfile }) {
  return (
    <header className={vk.navBar}>
      <div className={vk.navBarInner}>
        <div className="flex min-w-0 shrink-0 items-center gap-3">
          <Link
            to={user ? '/' : '/welcome'}
            className="shrink-0 text-[15px] font-semibold text-[#2c2d2e]"
            aria-label="Cartel — на главную"
          >
            Cartel
          </Link>
          {user ? (
            <>
              <Link to="/qualities" className={`hidden shrink-0 sm:inline ${vk.linkNav}`}>
                Качества
              </Link>
              <Link to="/bulk-norms" className={`hidden shrink-0 md:inline ${vk.linkNav}`}>
                Норматив
              </Link>
              <Link to="/group-training" className={`hidden shrink-0 lg:inline ${vk.linkNav}`}>
                Групповая
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

function AppRoutes({ authUser, selectedStudent, setSelectedStudent, coachProfile }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isShareRoute =
    location.pathname.startsWith('/share/') || location.pathname.startsWith('/leaderboard/share/')

  const openStudentFromQualityPage = (student) => {
    if (!student) return
    setSelectedStudent(student)
    navigate('/')
  }

  const openStudentFromLeaderboard = (student) => {
    if (!student) return
    setSelectedStudent(student)
    navigate('/')
  }

  return (
    <div className="vk-app">
      {!isShareRoute && <Navbar user={authUser} coachProfile={coachProfile} />}
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
          path="/leaderboard"
          element={
            <ProtectedRoute
              user={authUser}
              element={
                <LeaderboardPage
                  scope="coach"
                  coachId={authUser?.uid}
                  onSelectStudent={openStudentFromLeaderboard}
                />
              }
            />
          }
        />
        <Route
          path="/leaderboard/school"
          element={
            <ProtectedRoute
              user={authUser}
              element={<LeaderboardPage scope="school" />}
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
