import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { isFirebaseConfigured } from './services/firebaseService'

function FirebaseNotConfigured() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-12 text-slate-900">
      <div className="max-w-lg rounded-xl border border-amber-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Firebase не подключён</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          В этой сборке нет переменных окружения <code className="rounded bg-slate-100 px-1">VITE_FIREBASE_*</code> —
          поэтому вход и база недоступны.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">
          <li>
            <strong>Vercel:</strong> Project → Settings → Environment Variables — добавьте все ключи из{' '}
            <code className="rounded bg-slate-100 px-1">.env.example</code>, затем Deployments → … → Redeploy (переменные
            подставляются при <code className="rounded bg-slate-100 px-1">npm run build</code>).
          </li>
          <li>
            <strong>Локально:</strong> скопируйте <code className="rounded bg-slate-100 px-1">.env.example</code> в{' '}
            <code className="rounded bg-slate-100 px-1">.env.local</code> и заполните значениями из Firebase Console.
          </li>
        </ul>
      </div>
    </main>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>{isFirebaseConfigured ? <App /> : <FirebaseNotConfigured />}</BrowserRouter>
  </StrictMode>,
)
