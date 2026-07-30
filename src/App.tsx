import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PeriodProvider } from './context/PeriodContext'
import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inscripciones from './pages/Inscripciones'
import Renovaciones from './pages/Renovaciones'
import RegistroVisita from './pages/RegistroVisita'
import CajaVisitas from './pages/CajaVisitas'
import Scanner from './pages/Scanner'
import Reportes from './pages/Reportes'
import PaymentMonitor from './pages/PaymentMonitor'
import Enum from './pages/Enum'
import ReporteDia from './pages/ReporteDia'
import Completos from './pages/Completos'
import Faltan from './pages/Faltan'
import Usuarios from './pages/Usuarios'
import Auditoria from './pages/Auditoria'
import ComingSoon from './pages/ComingSoon'

function guarded(element: ReactNode) {
  return <RoleRoute>{element}</RoleRoute>
}

export default function App() {
  return (
    <AuthProvider>
      <PeriodProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={guarded(<Dashboard />)} />
              <Route path="/inscripciones" element={guarded(<Inscripciones />)} />
              <Route path="/renovaciones" element={guarded(<Renovaciones />)} />
              <Route path="/registros-visitas" element={guarded(<RegistroVisita />)} />
              <Route path="/caja-visitas" element={guarded(<CajaVisitas />)} />
              <Route path="/scanner" element={guarded(<Scanner />)} />
              <Route path="/reportes" element={guarded(<Reportes />)} />
              <Route path="/payment-monitor" element={guarded(<PaymentMonitor />)} />
              <Route path="/enum" element={guarded(<Enum />)} />
              <Route path="/dia" element={guarded(<ReporteDia />)} />
              <Route path="/completos" element={guarded(<Completos />)} />
              <Route path="/faltan" element={guarded(<Faltan />)} />
              <Route path="/usuarios" element={guarded(<Usuarios />)} />
              <Route path="/auditoria" element={guarded(<Auditoria />)} />
              <Route path="*" element={<ComingSoon title="Página no encontrada" />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </PeriodProvider>
    </AuthProvider>
  )
}
