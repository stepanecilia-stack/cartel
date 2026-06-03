import { vk } from '../utils/vkUi.js'

const PROJECT_ID =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID
    ? String(import.meta.env.VITE_FIREBASE_PROJECT_ID).trim()
    : 'cartel-academy'

/**
 * Чеклист для тренера/админа Firebase, если auth/admin-restricted-operation.
 */
export default function FirebaseAuthSetupHint() {
  return (
    <div className={`${vk.noticeWarn} space-y-2 text-[12px] leading-snug`}>
      <p className="font-semibold text-[#2c2d2e]">Настройка Firebase (проект {PROJECT_ID})</p>
      <ol className="list-decimal space-y-1.5 pl-4">
        <li>
          <a
            href={`https://console.firebase.google.com/project/${PROJECT_ID}/authentication/settings`}
            target="_blank"
            rel="noopener noreferrer"
            className={vk.link}
          >
            Authentication → Settings
          </a>
          {' '}
          → вкладка <strong>User actions</strong> → включить <strong>Enable create (sign-up)</strong> → Save.
        </li>
        <li>
          <a
            href={`https://console.firebase.google.com/project/${PROJECT_ID}/authentication/providers`}
            target="_blank"
            rel="noopener noreferrer"
            className={vk.link}
          >
            Sign-in method
          </a>
          : <strong>Anonymous</strong> — Enable (кабинет ученика).
        </li>
        <li>
          Там же: <strong>Email/Password</strong> — Enable (вход тренера).
        </li>
        <li>
          <a
            href={`https://console.firebase.google.com/project/${PROJECT_ID}/authentication/settings`}
            target="_blank"
            rel="noopener noreferrer"
            className={vk.link}
          >
            Authorized domains
          </a>
          : добавьте <strong>localhost</strong> и домен сайта, если вход не с localhost.
        </li>
      </ol>
      <p className="text-[#818c99]">
        После сохранения подождите ~1 минуту и обновите страницу. Убедитесь, что в .env тот же PROJECT_ID.
      </p>
    </div>
  )
}
