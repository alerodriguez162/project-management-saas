import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { fetchHealth, fetchWorkspaces } from '../api'
import type { Notice, Workspace } from '../types'

type MesaContextValue = {
  workspaces: Workspace[]
  setWorkspaces: Dispatch<SetStateAction<Workspace[]>>
  loading: boolean
  apiOnline: boolean | null
  busy: boolean
  setBusy: (value: boolean) => void
  notice: Notice | null
  setNotice: (notice: Notice | null) => void
  reload: () => Promise<void>
}

const MesaContext = createContext<MesaContextValue | null>(null)

export function MesaProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const reload = useCallback(async () => {
    const [health, data] = await Promise.all([fetchHealth(), fetchWorkspaces()])
    setApiOnline(health.status === 'ok')
    setWorkspaces(data)
  }, [])

  useEffect(() => {
    let cancelled = false
    reload()
      .catch((err: Error) => {
        if (!cancelled) {
          setApiOnline(false)
          setNotice({ type: 'error', message: err.message })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reload])

  const value = useMemo(
    () => ({
      workspaces,
      setWorkspaces,
      loading,
      apiOnline,
      busy,
      setBusy,
      notice,
      setNotice,
      reload,
    }),
    [workspaces, loading, apiOnline, busy, notice, reload],
  )

  return <MesaContext.Provider value={value}>{children}</MesaContext.Provider>
}

export function useMesa() {
  const context = useContext(MesaContext)
  if (!context) throw new Error('useMesa must be used within MesaProvider')
  return context
}
