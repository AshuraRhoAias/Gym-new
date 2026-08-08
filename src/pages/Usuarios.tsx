import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, UserPlus, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CREATABLE_ROLES, ROLE_LABEL, type Role } from '../lib/permissions'
import Modal from '../components/Modal'
import type { Profile } from '../types/database'

export default function Usuarios() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('editor')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [editing, setEditing] = useState<Profile | null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('role')
    setProfiles(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setCreating(true)
    const { data, error: err } = await supabase.functions.invoke('admin-create-user', {
      body: { username, password, role },
    })
    setCreating(false)
    if (err || data?.error) {
      setError(data?.error ?? err?.message ?? 'No se pudo crear la cuenta')
      return
    }
    setSuccess(`Cuenta "${username}" creada como ${ROLE_LABEL[role]}.`)
    setUsername('')
    setPassword('')
    setRole('editor')
    load()
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Users className="text-accent" size={22} />
        <div>
          <h1 className="text-2xl font-semibold text-white">Usuarios</h1>
          <p className="text-sm text-gray-400">Crea y administra las cuentas del sistema (solo superadministrador).</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
          <UserPlus size={15} /> Nueva cuenta
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Usuario</label>
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ej. recepcion"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Contraseña</label>
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            >
              {CREATABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">{error}</p>
        )}
        {success && (
          <p className="text-sm text-accent bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">{success}</p>
        )}

        <button
          type="submit"
          disabled={creating}
          className="self-start px-4 py-2 text-sm rounded-lg bg-accent hover:bg-accent-dark disabled:opacity-60 text-black font-medium"
        >
          {creating ? 'Creando…' : 'Crear cuenta'}
        </button>
      </form>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold text-white">Cuentas existentes</div>
        {loading ? (
          <p className="text-sm text-gray-500 text-center py-6">Cargando…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-border">
                <th className="px-4 py-2 font-normal">Usuario</th>
                <th className="px-4 py-2 font-normal">Rol</th>
                <th className="px-4 py-2 font-normal">Creado</th>
                <th className="px-4 py-2 font-normal" />
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="px-4 py-2 text-white">{p.username}</td>
                  <td className="px-4 py-2 text-gray-300">{ROLE_LABEL[p.role]}</td>
                  <td className="px-4 py-2 text-gray-400">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-right">
                    {p.role !== 'superadmin' && (
                      <button
                        type="button"
                        onClick={() => setEditing(p)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-accent ml-auto"
                      >
                        <Pencil size={12} /> Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <EditUserModal
          profile={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function EditUserModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: Profile
  onClose: () => void
  onSaved: () => void
}) {
  const [username, setUsername] = useState(profile.username)
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>(profile.role)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const { data, error: err } = await supabase.functions.invoke('admin-update-user', {
      body: { id: profile.id, username, password: password || undefined, role },
    })
    setSaving(false)
    if (err || data?.error) {
      setError(data?.error ?? err?.message ?? 'No se pudo actualizar la cuenta')
      return
    }
    onSaved()
  }

  return (
    <Modal title={`Editar cuenta: ${profile.username}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Usuario</label>
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Nueva contraseña</label>
          <input
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Dejar vacío para no cambiarla"
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Rol</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          >
            {CREATABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-surface-2 border border-border text-gray-300 hover:border-accent/50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-accent hover:bg-accent-dark disabled:opacity-60 text-black font-medium"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
