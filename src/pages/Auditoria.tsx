import { useEffect, useMemo, useState } from 'react'
import { History, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { AuditLogEntry } from '../types/database'

export default function Auditoria() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [nombres, setNombres] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300)
      if (!active) return
      const rows = data ?? []
      setEntries(rows)

      const ids = Array.from(new Set(rows.map((r) => r.registro_id)))
      if (ids.length > 0) {
        const { data: regs } = await supabase.from('registros_view').select('id, nombre').in('id', ids)
        if (active && regs) {
          setNombres(Object.fromEntries(regs.map((r) => [r.id, r.nombre])))
        }
      }
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return entries
    const q = search.toLowerCase()
    return entries.filter(
      (e) =>
        (e.usuario ?? '').toLowerCase().includes(q) ||
        (nombres[e.registro_id] ?? '').toLowerCase().includes(q) ||
        (e.campo ?? '').toLowerCase().includes(q),
    )
  }, [entries, search, nombres])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <History className="text-accent" size={22} />
        <div>
          <h1 className="text-2xl font-semibold text-white">Auditoría</h1>
          <p className="text-sm text-gray-400">
            Historial de cambios de administradores y editores. Las acciones del superadministrador
            no se registran aquí, por diseño.
          </p>
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por usuario, nombre o campo…"
        className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-accent w-72 max-w-full"
      />

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading && <p className="text-sm text-gray-500 text-center py-8">Cargando…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">Sin cambios registrados.</p>
        )}
        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="text-left text-gray-500 border-b border-border">
                  <th className="px-4 py-2 font-normal">Fecha</th>
                  <th className="px-4 py-2 font-normal">Usuario</th>
                  <th className="px-4 py-2 font-normal">Registro</th>
                  <th className="px-4 py-2 font-normal">Acción</th>
                  <th className="px-4 py-2 font-normal">Campo</th>
                  <th className="px-4 py-2 font-normal">Antes</th>
                  <th className="px-4 py-2 font-normal">Después</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-border/50">
                    <td className="px-4 py-2 text-gray-400 whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-white">{e.usuario ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-300">{nombres[e.registro_id] ?? e.registro_id.slice(0, 8)}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-md w-fit ${
                          e.accion === 'delete' ? 'bg-danger/15 text-red-300' : 'bg-info/15 text-blue-300'
                        }`}
                      >
                        {e.accion === 'delete' ? <Trash2 size={11} /> : <Pencil size={11} />}
                        {e.accion === 'delete' ? 'Eliminado' : 'Editado'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-400">{e.campo ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-400 max-w-[160px] truncate" title={e.valor_anterior ?? ''}>
                      {e.valor_anterior ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-gray-200 max-w-[160px] truncate" title={e.valor_nuevo ?? ''}>
                      {e.valor_nuevo ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
