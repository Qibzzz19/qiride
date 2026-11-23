import { openDB, type IDBPDatabase } from 'idb'
import type { GarageState } from '../types'

const DB_NAME = 'motolog-ai'
const DB_VERSION = 1
const STORE = 'garage'
const STATE_KEY = 'state'

let databasePromise: Promise<IDBPDatabase> | null = null

function getDatabase(): Promise<IDBPDatabase> {
  if (!databasePromise) {
    databasePromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE)
        }
      },
    })
  }
  return databasePromise
}

export async function loadGarageState(): Promise<unknown | undefined> {
  const db = await getDatabase()
  return db.get(STORE, STATE_KEY)
}

export async function saveGarageState(state: GarageState): Promise<void> {
  const db = await getDatabase()
  await db.put(STORE, state, STATE_KEY)
}

export async function clearGarageState(): Promise<void> {
  const db = await getDatabase()
  await db.delete(STORE, STATE_KEY)
}

export async function estimateDatabaseBytes(): Promise<number> {
  if (!('estimate' in navigator.storage) || !navigator.storage.estimate) return 0
  try {
    const estimate = await navigator.storage.estimate()
    return estimate.usage ?? 0
  } catch {
    return 0
  }
}
