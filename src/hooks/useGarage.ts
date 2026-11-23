import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  CategoryKey,
  GarageState,
  IntervalRule,
  LogEntry,
  OdometerUpdate,
  Profile,
  SetupState,
} from '../types'
import { buildSeedState } from '../data/seed'
import { averageKmPerDay } from '../lib/health'
import { clearGarageState, loadGarageState, saveGarageState } from '../lib/db'
import {
  appendOdometerPoint,
  createDefaultIntervals,
  normalizeGarageState,
} from '../lib/state'
import { nowIso, todayInput } from '../lib/date'
import { uid } from '../lib/format'
import { useToast } from '../components/Toast'

interface SaveLogOptions {
  editing?: boolean
  intervals?: Partial<Record<CategoryKey, { km?: number; enabled?: boolean }>>
  setupPatch?: Partial<Omit<SetupState, 'updatedAt'>>
}

interface QuickOdometerOptions {
  km: number
  date?: string
  photo?: OdometerUpdate['photo']
  provider?: OdometerUpdate['provider']
}

interface GarageActions {
  saveLog: (log: LogEntry, options?: SaveLogOptions) => void
  deleteLog: (id: string) => void
  updateOdometerQuick: (options: QuickOdometerOptions) => boolean
  updateProfile: (patch: Partial<Profile>) => void
  updateSetup: (patch: Partial<Omit<SetupState, 'updatedAt'>>) => void
  updateInterval: (key: CategoryKey, rule: IntervalRule) => void
  resetIntervals: () => void
  updateSettings: (patch: Partial<GarageState['settings']>) => void
  importState: (state: GarageState) => void
  resetAll: () => Promise<void>
}

export interface GarageStore {
  state: GarageState | null
  ready: boolean
  averageKm: number
  actions: GarageActions
}

export function useGarage(): GarageStore {
  const [state, setState] = useState<GarageState | null>(null)
  const [ready, setReady] = useState(false)
  const loadedRef = useRef(false)
  const saveErrorShown = useRef(false)
  const toast = useToast()

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        const stored = await loadGarageState()
        if (cancelled) return
        const normalized = stored ? normalizeGarageState(stored) : null
        const initial = normalized ?? buildSeedState()
        setState(initial)
        setReady(true)
        loadedRef.current = true
        if (!normalized) await saveGarageState(initial)
      } catch (error) {
        if (cancelled) return
        console.error('MotoLog: gagal memuat IndexedDB', error)
        setState(buildSeedState())
        setReady(true)
        loadedRef.current = true
        toast('Penyimpanan lokal tidak tersedia. Data akan bertahan selama tab ini terbuka.', {
          tone: 'error',
          title: 'Mode memori',
        })
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [toast])

  useEffect(() => {
    if (!ready || !state || !loadedRef.current) return
    const timer = window.setTimeout(() => {
      void saveGarageState(state).catch((error: unknown) => {
        console.error('MotoLog: gagal menyimpan state', error)
        if (!saveErrorShown.current) {
          saveErrorShown.current = true
          toast('Data gagal disimpan ke perangkat. Cek ruang penyimpanan browser.', {
            tone: 'error',
            title: 'Penyimpanan bermasalah',
          })
        }
      })
    }, 320)
    return () => window.clearTimeout(timer)
  }, [state, ready, toast])

  const mutate = useCallback((updater: (previous: GarageState) => GarageState) => {
    setState((previous) => (previous ? updater(previous) : previous))
  }, [])

  const saveLog = useCallback(
    (log: LogEntry, options: SaveLogOptions = {}) => {
      const timestamp = nowIso()
      mutate((previous) => {
        const wasEditing = Boolean(options.editing)
        const logs = wasEditing
          ? previous.logs.map((item) => (item.id === log.id ? log : item))
          : [log, ...previous.logs.filter((item) => item.id !== log.id)]

        // Log "servis tanpa KM" hanya perkiraan — jangan sentuh odometer global.
        const estimated = log.odometerSource === 'estimated'
        const advancesOdometer = !estimated && log.odometer > previous.odometer.current
        const touchedToday = !estimated && log.date === todayInput()
        const odometer =
          advancesOdometer || touchedToday
            ? {
                current: Math.max(previous.odometer.current, log.odometer),
                updatedAt: timestamp,
                lastSource: 'service' as const,
              }
            : previous.odometer

        let odometerHistory = previous.odometerHistory
        if (!estimated && (advancesOdometer || (touchedToday && log.odometer >= previous.odometer.current))) {
          odometerHistory = appendOdometerPoint(previous.odometerHistory, {
            date: log.date,
            km: log.odometer,
            source: 'service',
          })
        }

        let intervals = previous.intervals
        if (options.intervals) {
          intervals = { ...previous.intervals }
          for (const [key, patch] of Object.entries(options.intervals) as [
            CategoryKey,
            { km?: number; enabled?: boolean },
          ][]) {
            if (!intervals[key]) continue
            const rule = { ...intervals[key] }
            if (typeof patch.enabled === 'boolean') rule.enabled = patch.enabled
            if (typeof patch.km === 'number' && Number.isFinite(patch.km)) {
              rule.km = Math.max(100, Math.round(patch.km))
            }
            intervals[key] = rule
          }
        }

        const setup = options.setupPatch
          ? { ...previous.setup, ...options.setupPatch, updatedAt: timestamp }
          : previous.setup

        return {
          ...previous,
          logs,
          odometer,
          odometerHistory,
          intervals,
          setup,
        }
      })
    },
    [mutate],
  )

  const deleteLog = useCallback(
    (id: string) => {
      mutate((previous) => ({
        ...previous,
        logs: previous.logs.filter((log) => log.id !== id),
      }))
    },
    [mutate],
  )

  const updateOdometerQuick = useCallback(
    ({ km, date = todayInput(), photo = null, provider = null }: QuickOdometerOptions): boolean => {
      const rounded = Math.round(km)
      if (!Number.isFinite(rounded) || rounded <= 0) return false
      if (!state || rounded < state.odometer.current) return false

      mutate((previous) => {
        const timestamp = nowIso()
        const update: OdometerUpdate = {
          id: uid('km'),
          date,
          km: rounded,
          photo,
          provider,
          createdAt: timestamp,
        }
        return {
          ...previous,
          odometer: {
            current: Math.max(previous.odometer.current, rounded),
            updatedAt: timestamp,
            lastSource: 'quick',
          },
          odometerUpdates: [update, ...previous.odometerUpdates].slice(0, 80),
          odometerHistory: appendOdometerPoint(previous.odometerHistory, {
            date,
            km: rounded,
            source: 'quick',
          }),
        }
      })
      return true
    },
    [mutate, state],
  )

  const updateProfile = useCallback(
    (patch: Partial<Profile>) => {
      mutate((previous) => ({ ...previous, profile: { ...previous.profile, ...patch } }))
    },
    [mutate],
  )

  const updateSetup = useCallback(
    (patch: Partial<Omit<SetupState, 'updatedAt'>>) => {
      mutate((previous) => ({
        ...previous,
        setup: { ...previous.setup, ...patch, updatedAt: nowIso() },
      }))
    },
    [mutate],
  )

  const updateInterval = useCallback(
    (key: CategoryKey, rule: IntervalRule) => {
      mutate((previous) => ({
        ...previous,
        intervals: {
          ...previous.intervals,
          [key]: {
            km: Math.max(100, Math.round(rule.km)),
            days: Math.max(1, Math.round(rule.days)),
            enabled: rule.enabled !== false,
          },
        },
      }))
    },
    [mutate],
  )

  const resetIntervals = useCallback(() => {
    mutate((previous) => ({ ...previous, intervals: createDefaultIntervals() }))
  }, [mutate])

  const updateSettings = useCallback(
    (patch: Partial<GarageState['settings']>) => {
      mutate((previous) => ({
        ...previous,
        settings: { ...previous.settings, ...patch },
      }))
    },
    [mutate],
  )

  const importState = useCallback(
    (next: GarageState) => {
      setState(next)
      void saveGarageState(next)
    },
    [],
  )

  const resetAll = useCallback(async () => {
    await clearGarageState()
    const seed = buildSeedState()
    setState(seed)
    await saveGarageState(seed)
  }, [])

  return {
    state,
    ready,
    averageKm: state ? averageKmPerDay(state) : 38,
    actions: {
      saveLog,
      deleteLog,
      updateOdometerQuick,
      updateProfile,
      updateSetup,
      updateInterval,
      resetIntervals,
      updateSettings,
      importState,
      resetAll,
    },
  }
}
