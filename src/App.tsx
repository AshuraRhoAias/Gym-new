import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PeriodProvider } from './context/PeriodContext'
import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'
import Layout from './components/Layout'
import Login from './pages/Login'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Inscripciones = lazy(() => import('./pages/Inscripciones'))
const Renovaciones = lazy(() => import('./pages/Renovaciones'))
const RegistroVisita = lazy(() => import('./pages/RegistroVisita'))
const CajaVisitas = lazy(() => import('./pages/CajaVisitas'))
const Scanner = lazy(() => import('./pages/Scanner'))
const Reportes = lazy(() => import('./pages/Reportes'))
const PaymentMonitor = lazy(() => import('./pages/PaymentMonitor'))
const Enum = lazy(() => import('./pages/Enum'))
const ReporteDia = lazy(() => import('./pages/ReporteDia'))
const Completos = lazy(() => import('./pages/Completos'))
const Faltan = lazy(() => import('./pages/Faltan'))
const Usuarios = lazy(() => import('./pages/Usuarios'))
const Auditoria = lazy(() => import('./pages/Auditoria'))
const ComingSoon = lazy(() => import('./pages/ComingSoon'))

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24 text-gray-500 text-sm">Cargando…</div>
  )
}

function guarded(element: ReactNode) {
  return (
    <RoleRoute>
      <Suspense fallback={<PageFallback />}>{element}</Suspense>
    </RoleRoute>
  )
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
              <Route
                path="*"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <ComingSoon title="Página no encontrada" />
                  </Suspense>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </PeriodProvider>
    </AuthProvider>
  )
}
