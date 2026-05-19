/** Общие классы интерфейса в стиле ВКонтакте (светлая тема). */

export const vkFont =
  "font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,Helvetica,Arial,sans-serif]"

export const vk = {
  page: `min-h-screen bg-[#edeef0] text-[#2c2d2e] ${vkFont}`,
  pageWithNav: `min-h-[calc(100vh-48px)] bg-[#edeef0] text-[#2c2d2e] ${vkFont}`,
  pagePad: 'px-2 py-2 sm:px-4 sm:py-3',
  pagePadAuth: 'px-4 py-6',
  pageCenter: 'flex min-h-[calc(100vh-48px)] items-center justify-center',
  container: 'mx-auto max-w-6xl space-y-2',
  containerNarrow: 'mx-auto max-w-4xl space-y-2',
  containerMid: 'mx-auto max-w-3xl space-y-2 sm:space-y-3',

  h1: 'px-0.5 text-[17px] font-semibold leading-5 text-[#2c2d2e]',
  h1Lg: 'text-[17px] font-semibold leading-5 text-[#2c2d2e] sm:text-xl',
  h2: 'text-[15px] font-semibold leading-5 text-[#2c2d2e]',
  muted: 'text-[13px] leading-[18px] text-[#818c99]',
  mutedXs: 'text-[12px] leading-4 text-[#818c99]',

  card: 'rounded-[10px] bg-white p-2.5 sm:p-3',
  cardFlat: 'rounded-[10px] bg-white',
  cardPadded: 'rounded-[10px] bg-white p-3 sm:p-4',

  input:
    'h-9 w-full rounded-lg bg-[#f0f2f5] px-3 text-[15px] leading-5 text-[#2c2d2e] placeholder:text-[#818c99] outline-none focus:bg-[#ebedf0]',
  select:
    'h-9 w-full rounded-lg bg-[#f0f2f5] px-3 text-[15px] leading-5 text-[#2c2d2e] outline-none focus:bg-[#ebedf0]',
  label: 'mb-1 block text-[13px] font-normal text-[#818c99]',

  link: 'text-[13px] font-medium text-[#2d81e0] active:opacity-80',
  linkNav: 'text-[13px] font-medium text-[#2d81e0] hover:opacity-90',

  btnPrimary:
    'inline-flex h-9 touch-manipulation items-center justify-center rounded-lg bg-[#2d81e0] px-4 text-[14px] font-medium text-white active:bg-[#2875cc] disabled:opacity-50',
  btnSecondary:
    'inline-flex h-9 touch-manipulation items-center justify-center rounded-lg bg-[#f0f2f5] px-4 text-[14px] font-medium text-[#2d81e0] active:bg-[#ebedf0]',
  btnGhost:
    'inline-flex h-9 touch-manipulation items-center justify-center rounded-lg px-3 text-[14px] font-medium text-[#2d81e0] active:bg-[#f0f2f5]',

  navBar:
    'sticky top-0 z-40 border-b border-[#e7e8ec] bg-white/96 backdrop-blur supports-[backdrop-filter]:bg-white/90',
  navBarInner: 'mx-auto flex h-12 max-w-6xl items-center justify-between gap-2 px-2 sm:px-4',
  navSubBar:
    'sticky top-12 z-30 -mx-2 flex items-center gap-2 border-b border-[#e7e8ec] bg-white/95 px-2 py-1.5 backdrop-blur sm:-mx-4 sm:px-4',

  list: 'overflow-hidden rounded-[10px] bg-white',
  listItem:
    'flex w-full touch-manipulation border-t border-[#e7e8ec] bg-white px-3 py-2.5 text-left first:border-t-0 active:bg-[#f5f6f8]',
  listItemTitle: 'text-[15px] font-medium leading-5 text-[#2c2d2e]',

  error: 'rounded-[10px] bg-white px-3 py-2.5 text-[13px] text-[#e64646]',
  success: 'rounded-[10px] bg-white px-3 py-2.5 text-[13px] text-[#4bb34b]',

  servicesGrid: 'grid grid-cols-4 gap-0 rounded-[10px] bg-white px-0.5 py-1',
  serviceTile:
    'flex min-h-[4.25rem] w-full touch-manipulation flex-col items-center justify-start gap-1 rounded-md px-0.5 py-1.5 text-center active:bg-[#f5f6f8] sm:min-h-[4.5rem]',
  serviceIcon: 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg leading-none',
  serviceLabel: 'line-clamp-2 text-[11px] font-medium leading-[13px] text-[#2c2d2e]',
}

/** Маркер: внутри не менять вёрстку дуэли эталона (человечки). */
export const ETALON_MODEL_PANEL_CLASS = 'etalon-model-panel'
