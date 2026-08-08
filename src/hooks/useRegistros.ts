import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Registro, RecordKind } from '../types/database'

export function useRegistros(kind: RecordKind, mes: string, anio: number, hideSinFolio = false) {
  const [data, setData] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('registros_view')
      .select('*')
      .eq('kind', kind)
      .eq('mes', mes)
      .eq('anio', anio)
    if (hideSinFolio) query = query.not('folio', 'is', null).neq('folio', '0')
    const { data: rows, error: err } = await query.order('created_at', { ascending: false })

    if (err) setError(err.message)
    else {
      setData(rows ?? [])
      setError(null)
    }
    setLoading(false)
  }, [kind, mes, anio, hideSinFolio])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}
