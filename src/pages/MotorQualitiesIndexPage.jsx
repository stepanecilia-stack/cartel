import { Link } from 'react-router-dom'
import { BackToHomeBar } from '../components/layout/BackToHomeLink.jsx'
import SensitiveAgeScale from '../components/SensitiveAgeScale'
import { getMotorQualitiesCatalog } from '../data/motorQualitiesCatalog'
import { vk } from '../utils/vkUi.js'

function MotorQualitiesIndexPage() {
  const items = getMotorQualitiesCatalog()

  return (
    <main className={`${vk.pageWithNav} ${vk.pagePad}`}>
      <div className={`${vk.containerMid} max-w-4xl`}>
        <BackToHomeBar />
        <header>
          <h1 className={vk.h1Lg}>База упражнений</h1>
          <p className={`mt-1 ${vk.muted}`}>Двигательные качества — банк упражнений и объёмов.</p>
        </header>

        <ul className={vk.list}>
          {items.map(({ title, slug, sensitiveAgeSet }) => (
            <li key={slug} className="border-t border-[#e7e8ec] first:border-t-0">
              <Link
                to={`/qualities/${slug}`}
                className="block touch-manipulation px-3 py-2.5 active:bg-[#f5f6f8]"
              >
                <span className={vk.listItemTitle}>{title}</span>
                {sensitiveAgeSet?.size > 0 ? (
                  <SensitiveAgeScale
                    sensitiveAges={sensitiveAgeSet}
                    compact
                    showCaption={false}
                    className="mt-1.5"
                  />
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}

export default MotorQualitiesIndexPage
