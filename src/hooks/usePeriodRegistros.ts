import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Registro } from '../types/database'

/** Trae todos los registros (cualquier kind) de un mes/año dado. */
export function usePeriodRegistros(mes: string, anio: number) {
  const [data, setData] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data: rows, error: err } = await supabase
      .from('registros_view')
      .select('*')
      .eq('mes', mes)
      .eq('anio', anio)
      .order('created_at', { ascending: false })

    if (err) setError(err.message)
    else {
      setData(rows ?? [])
      setError(null)
    }
    setLoading(false)
  }, [mes, anio])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}
