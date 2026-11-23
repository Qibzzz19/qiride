import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { WifiOff } from 'lucide-react'
import type { AddSheetRequest, AppTab, CategoryKey, LogEntry, PresetId, Profile, SetupState } from './types'
import { useGarage } from './hooks/useGarage'
import { useOnlineStatus } from './hooks/usePwa'
import { getAllHealth, getDashboardHealth, getPriority } from './lib/health'
import { useToast } from './components/Toast'
import { AppBackground } from './components/AppBackground'
import { LogoLockup } from './components/Logo'
import { BottomNav } from './components/BottomNav'
import { AddLogSheet } from './components/AddLogSheet'
import { LogDetailSheet } from './components/LogDetailSheet'
import { ProfileSheet } from './components/ProfileSheet'
import { SetupSheet } from './components/SetupSheet'
import { Dashboard } from './screens/Dashboard'
import { HistoryScreen } from './screens/History'
import { GarageScreen } from './screens/Garage'
import { SettingsScreen } from './screens/Settings'

const TABS: AppTab[] = ['home', 'history', 'garage', 'settings']

interface HashRoute {
  tab: AppTab
  quickKm: boolean
}

function readHash(): HashRoute {
  if (typeof window === 'undefined') return { tab: 'home', quickKm: false }
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [path = '', query = ''] = raw.split('?')
  const clean = path.replace(/\/+$/, '').toLowerCase()
  const tab = (TABS as string[]).includes(clean) ? (clean as AppTab) : 'home'
  const params = new URLSearchParams(query)
  return { tab, quickKm: params.get('quick') === 'km' }
}

function LoadingScreen() {
  return (
    <>
      <AppBackground />
      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-5 px-6">
        <div className="relative">
          <div className="absolute inset-0 rounded-[26px] bg-blue-500/30 blur-2xl" />
          <div className="relative animate-pulse-soft">
            <LogoLockup />
          </div>
        </div>
        <div className="h-[3px] w-32 overflow-hidden rounded-full bg-white/[0.08]">
          <motion.div
            className="h-full w-1/2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
            animate={{ x: ['-110%', '230%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-600">
          Menyiapkan garasi lokal
        </p>
      </div>
    </>
  )
}

export default function App() {
  const toast = useToast()
  const online = useOnlineStatus()
  const { state, ready, averageKm, actions } = useGarage()

  const initialRoute = useRef<HashRoute>(readHash())
  const [tab, setTab] = useState<AppTab>(initialRoute.current.tab)
  const [addOpen, setAddOpen] = useState(false)
  const [addRequest, setAddRequest] = useState<AddSheetRequest | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLog, setDetailLog] = useState<LogEntry | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const requestSequence = useRef(0)
  const initialQuickHandled = useRef(false)

  const dashboardHealths = useMemo(
    () => (state ? getDashboardHealth(state) : []),
    [state],
  )
  const allHealths = useMemo(() => (state ? getAllHealth(state) : []), [state])
  const priority = useMemo(() => getPriority(dashboardHealths), [dashboardHealths])

  const openAdd = useCallback((options: Omit<AddSheetRequest, 'session'> = {}) => {
    requestSequence.current += 1
    setAddRequest({ session: requestSequence.current, ...options })
    setAddOpen(true)
  }, [])

  const navigate = useCallback((next: AppTab) => {
    setTab(next)
    const hash = `#${next}`
    if (window.location.hash !== hash) {
      // pushState (bukan replaceState) supaya tombol back HP kembali ke tab
      // sebelumnya, bukan langsung menutup aplikasi.
      window.history.pushState(null, '', hash)
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  useEffect(() => {
    function handleHashChange() {
      const route = readHash()
      setTab(route.tab)
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      if (route.quickKm) {
        openAdd({ preset: 'kmOnly' })
        window.history.replaceState(null, '', `#${route.tab}`)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [openAdd])

  useEffect(() => {
    if (!ready || initialQuickHandled.current) return
    initialQuickHandled.current = true
    const route = readHash()
    if (!route.quickKm) return
    openAdd({ preset: 'kmOnly' })
    window.history.replaceState(null, '', `#${route.tab}`)
  }, [ready, openAdd])

  useEffect(() => {
    const handleOfflineReady = () => {
      toast('MotoLog AI siap dipakai tanpa koneksi. Logbook tetap bisa dibuka.', {
        tone: 'success',
        title: 'Offline ready',
      })
    }
    window.addEventListener('motolog:offline-ready', handleOfflineReady)
    return () => window.removeEventListener('motolog:offline-ready', handleOfflineReady)
  }, [toast])

  const handleAdd = useCallback(
    (options: { preset?: PresetId; category?: CategoryKey; voice?: boolean }) => {
      openAdd(options)
    },
    [openAdd],
  )

  const handleOpenLog = useCallback((log: LogEntry) => {
    setDetailLog(log)
    setDetailOpen(true)
  }, [])

  const handleEditLog = useCallback(
    (log: LogEntry) => {
      setDetailOpen(false)
      openAdd({ editLog: log })
    },
    [openAdd],
  )

  const handleDeleteLog = useCallback(
    (log: LogEntry) => {
      actions.deleteLog(log.id)
      toast('Log dihapus. Kesehatan komponen sudah dihitung ulang.', {
        tone: 'info',
        title: 'Log terhapus',
      })
    },
    [actions, toast],
  )

  const handleSaveProfile = useCallback(
    (profile: Profile) => {
      actions.updateProfile(profile)
      toast(`Profil ${profile.nickname || profile.model} diperbarui.`, {
        tone: 'success',
        title: 'Identitas tersimpan',
      })
    },
    [actions, toast],
  )

  const handleSaveSetup = useCallback(
    (patch: Partial<Omit<SetupState, 'updatedAt'>>) => {
      actions.updateSetup(patch)
      toast('Kartu setup aktif diperbarui. Log berikutnya memakai spesifikasi ini.', {
        tone: 'success',
        title: 'Setup tersimpan',
      })
    },
    [actions, toast],
  )

  if (!ready || !state) return <LoadingScreen />

  return (
    <>
      <AppBackground />
      <div className="relative z-10 mx-auto w-full max-w-[560px] px-4 pb-[calc(env(safe-area-inset-bottom)+112px)] pt-[calc(env(safe-area-inset-top)+16px)]">
        {!online && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-400/15 bg-amber-500/[0.06] px-3 py-2">
            <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <p className="text-[9px] leading-relaxed text-amber-200/80">
              Mode offline. Data tetap tersimpan lokal; OCR AI aktif lagi setelah terhubung.
            </p>
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {tab === 'home' && (
              <Dashboard
                state={state}
                healths={dashboardHealths}
                priority={priority}
                averageKm={averageKm}
                onAdd={handleAdd}
                onNavigate={navigate}
              />
            )}
            {tab === 'history' && (
              <HistoryScreen
                state={state}
                onAdd={() => openAdd({})}
                onOpenLog={handleOpenLog}
              />
            )}
            {tab === 'garage' && (
              <GarageScreen
                state={state}
                healths={allHealths}
                averageKm={averageKm}
                onEditProfile={() => setProfileOpen(true)}
                onEditSetup={() => setSetupOpen(true)}
                onUpdateKm={() => openAdd({ preset: 'kmOnly' })}
                onAddForCategory={(category) => openAdd({ category })}
                onOpenSettings={() => navigate('settings')}
              />
            )}
            {tab === 'settings' && <SettingsScreen state={state} actions={actions} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomNav
        active={tab}
        onChange={navigate}
        onAdd={() => openAdd({})}
      />

      <AddLogSheet
        open={addOpen}
        request={addRequest}
        state={state}
        onClose={() => setAddOpen(false)}
        actions={actions}
      />

      <LogDetailSheet
        open={detailOpen}
        log={detailLog}
        state={state}
        onClose={() => setDetailOpen(false)}
        onEdit={handleEditLog}
        onDelete={handleDeleteLog}
      />

      <ProfileSheet
        open={profileOpen}
        profile={state.profile}
        onClose={() => setProfileOpen(false)}
        onSave={handleSaveProfile}
      />

      <SetupSheet
        open={setupOpen}
        setup={state.setup}
        onClose={() => setSetupOpen(false)}
        onSave={handleSaveSetup}
      />
    </>
  )
}
