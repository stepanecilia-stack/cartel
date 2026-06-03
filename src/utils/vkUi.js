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
  btnStudentPortal:
    'inline-flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#4bb34b] px-5 text-[16px] font-semibold leading-5 text-white shadow-[0_4px_14px_rgba(75,179,75,0.45)] ring-2 ring-[#4bb34b]/30 active:bg-[#43a043] sm:min-h-[3.25rem] sm:text-[17px]',
  btnSecondary:
    'inline-flex h-9 touch-manipulation items-center justify-center rounded-lg bg-[#f0f2f5] px-4 text-[14px] font-medium text-[#2d81e0] active:bg-[#ebedf0]',
  btnGhost:
    'inline-flex h-9 touch-manipulation items-center justify-center rounded-lg px-3 text-[14px] font-medium text-[#2d81e0] active:bg-[#f0f2f5]',
  btnCompact:
    'inline-flex h-8 shrink-0 touch-manipulation items-center justify-center rounded-lg bg-[#2d81e0] px-2.5 text-[13px] font-medium text-white active:bg-[#2875cc] disabled:opacity-50',
  btnCompactSecondary:
    'inline-flex h-8 shrink-0 touch-manipulation items-center justify-center rounded-lg bg-[#f0f2f5] px-2 text-[12px] font-medium text-[#2d81e0] active:bg-[#ebedf0] disabled:opacity-50',

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

  backToHome:
    'inline-flex touch-manipulation items-center gap-1.5 rounded-lg bg-[#f0f2f5] px-3 py-2 text-[13px] font-medium leading-5 text-[#2d81e0] active:bg-[#ebedf0]',
  backToHomeBar: 'mb-2 sm:mb-2.5',

  modalOverlay:
    'fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-2 sm:items-center sm:p-4',
  modalPanel: 'max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[10px] bg-white p-3 shadow-lg sm:p-4',
  segmentBar: 'flex rounded-lg bg-[#f0f2f5] p-0.5',
  segmentBtn:
    'flex-1 touch-manipulation rounded-md px-2 py-2 text-[13px] font-medium leading-4 transition-colors sm:px-3',
  segmentBtnActive: 'bg-white text-[#2c2d2e] shadow-sm',
  segmentBtnInactive: 'text-[#818c99] active:bg-[#ebedf0]',
  previewCard: 'rounded-[10px] bg-[#f0f2f5] p-3',

  studentTabBar: 'mt-2 flex rounded-lg bg-[#f0f2f5] p-0.5',
  studentTabBtn:
    'flex min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0 rounded-md px-1 py-1.5 text-center',
  studentTabBtnActive: 'bg-white text-[#2c2d2e] shadow-sm',
  studentTabBtnIdle: 'text-[#818c99] active:bg-[#ebedf0]',
  studentTabGrid: 'mt-2 grid grid-cols-2 gap-1 sm:grid-cols-4 sm:gap-1.5',
  studentTab:
    'flex min-h-[3.25rem] touch-manipulation flex-col items-center justify-center gap-0.5 rounded-[10px] border px-1 py-1.5 text-center sm:min-h-[4.5rem] sm:gap-1 sm:px-2 sm:py-2',
  studentTabActive: 'border-[#2d81e0] bg-[#ecf3fc] text-[#2c2d2e]',
  studentTabIdle: 'border-[#e7e8ec] bg-white text-[#2c2d2e] active:bg-[#f5f6f8]',
  studentTabIcon:
    'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full sm:h-7 sm:w-7',
  studentTabIconActive: 'bg-white text-[#2d81e0] ring-1 ring-[#aec8e8]',
  studentTabIconIdle: 'bg-[#f0f2f5] text-[#818c99]',
  studentTabLabel: 'line-clamp-2 text-[11px] font-medium leading-[13px] text-[#2c2d2e] sm:text-[12px] sm:leading-4',
  studentTabProgress: 'text-[10px] font-medium tabular-nums leading-none text-[#818c99] sm:text-[11px]',
  progressTrack: 'mt-0.5 hidden h-1 w-full max-w-[5.5rem] overflow-hidden rounded-full bg-[#e7e8ec] sm:block',
  chipBar: 'flex w-full flex-wrap items-center gap-1.5 rounded-[10px] bg-[#f0f2f5] px-2 py-1.5 text-[13px] text-[#2c2d2e] sm:ml-auto sm:w-auto sm:px-3 sm:py-2',
  iconBtn:
    'inline-flex h-8 w-8 touch-manipulation items-center justify-center rounded-lg bg-white text-[#818c99] active:bg-[#ebedf0] disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:w-9',
  notice: 'rounded-[10px] bg-[#f0f2f5] px-3 py-2.5 text-[13px] leading-[18px] text-[#2c2d2e]',
  noticeInfo: 'rounded-[10px] bg-[#ecf3fc] px-3 py-2.5 text-[13px] leading-[18px] text-[#2c2d2e]',
  noticeWarn: 'rounded-[10px] bg-[#fff8e6] px-3 py-2.5 text-[13px] leading-[18px] text-[#2c2d2e]',
  article: 'scroll-mt-40 rounded-[10px] border border-[#e7e8ec] bg-white p-3',
  articleLocked: 'scroll-mt-40 rounded-[10px] border border-[#f4e4a6] bg-[#fffbeb] p-3',

  categoryTabGrid: 'grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-5 sm:gap-1',
  categoryTabBtn:
    'min-h-[2.5rem] touch-manipulation rounded-lg px-2 py-1.5 text-center text-[12px] font-medium leading-[14px] sm:min-h-[2.25rem] sm:px-2.5 sm:text-[13px]',
  categoryTabActive: 'bg-[#2d81e0] text-white',
  categoryTabIdle: 'bg-white text-[#2c2d2e] active:bg-[#f5f6f8]',
  listRow: 'flex w-full touch-manipulation rounded-[10px] border border-[#e7e8ec] bg-white p-3 text-left active:bg-[#f5f6f8] sm:p-3.5',
  emptyState:
    'rounded-[10px] border border-dashed border-[#e7e8ec] bg-white px-4 py-8 text-center text-[13px] text-[#818c99]',
  accent: 'font-bold tabular-nums text-[#2d81e0]',
  formGrid2: 'grid grid-cols-2 gap-x-2 gap-y-2 sm:gap-3',
}

/** Маркер: внутри не менять вёрстку дуэли эталона (человечки). */
export const ETALON_MODEL_PANEL_CLASS = 'etalon-model-panel'
