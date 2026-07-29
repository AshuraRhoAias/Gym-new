import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PeriodProvider } from './context/PeriodContext'
import ProtectedRoute from './components/ProtectedRoute'
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
import ComingSoon from './pages/ComingSoon'

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
              <Route path="/" element={<Dashboard />} />
              <Route path="/inscripciones" element={<Inscripciones />} />
              <Route path="/renovaciones" element={<Renovaciones />} />
              <Route path="/registros-visitas" element={<RegistroVisita />} />
              <Route path="/caja-visitas" element={<CajaVisitas />} />
              <Route path="/scanner" element={<Scanner />} />
              <Route path="/reportes" element={<Reportes />} />
              <Route path="/payment-monitor" element={<PaymentMonitor />} />
              <Route path="/enum" element={<Enum />} />
              <Route path="/dia" element={<ReporteDia />} />
              <Route path="/completos" element={<Completos />} />
              <Route path="/faltan" element={<Faltan />} />
              <Route path="*" element={<ComingSoon title="Página no encontrada" />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </PeriodProvider>
    </AuthProvider>
  )
}
