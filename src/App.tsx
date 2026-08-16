import { lazy, Suspense, type ReactNode } from 'react'
import { Router, Switch, Route } from 'wouter'
import { AuthProvider } from './context/AuthContext'
import { PeriodProvider } from './context/PeriodContext'
import { PrivacyProvider } from './context/PrivacyContext'
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
const Nomina = lazy(() => import('./pages/Nomina'))
const Finanzas = lazy(() => import('./pages/Finanzas'))
const Whats = lazy(() => import('./pages/Whats'))
const Comprobantes = lazy(() => import('./pages/Comprobantes'))
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
        <PrivacyProvider>
          <Router>
            <Switch>
              <Route path="/login">
                <Login />
              </Route>
              <Route>
                <ProtectedRoute>
                  <Layout>
                    <Switch>
                      <Route path="/">{guarded(<Dashboard />)}</Route>
                      <Route path="/inscripciones">{guarded(<Inscripciones />)}</Route>
                      <Route path="/renovaciones">{guarded(<Renovaciones />)}</Route>
                      <Route path="/registros-visitas">{guarded(<RegistroVisita />)}</Route>
                      <Route path="/caja-visitas">{guarded(<CajaVisitas />)}</Route>
                      <Route path="/scanner">{guarded(<Scanner />)}</Route>
                      <Route path="/reportes">{guarded(<Reportes />)}</Route>
                      <Route path="/payment-monitor">{guarded(<PaymentMonitor />)}</Route>
                      <Route path="/enum">{guarded(<Enum />)}</Route>
                      <Route path="/dia">{guarded(<ReporteDia />)}</Route>
                      <Route path="/completos">{guarded(<Completos />)}</Route>
                      <Route path="/faltan">{guarded(<Faltan />)}</Route>
                      <Route path="/usuarios">{guarded(<Usuarios />)}</Route>
                      <Route path="/auditoria">{guarded(<Auditoria />)}</Route>
                      <Route path="/nomina">{guarded(<Nomina />)}</Route>
                      <Route path="/finanzas">{guarded(<Finanzas />)}</Route>
                      <Route path="/whats">{guarded(<Whats />)}</Route>
                      <Route path="/comprobantes">{guarded(<Comprobantes />)}</Route>
                      <Route>
                        <Suspense fallback={<PageFallback />}>
                          <ComingSoon title="Página no encontrada" />
                        </Suspense>
                      </Route>
                    </Switch>
                  </Layout>
                </ProtectedRoute>
              </Route>
            </Switch>
          </Router>
        </PrivacyProvider>
      </PeriodProvider>
    </AuthProvider>
  )
}
