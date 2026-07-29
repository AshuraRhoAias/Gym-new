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
              <Route path="/scanner" element={<ComingSoon title="Scanner QR" />} />
              <Route path="/reportes" element={<ComingSoon title="Reportes del Sistema" />} />
              <Route path="/payment-monitor" element={<ComingSoon title="Monitor de Pagos" />} />
              <Route path="/enum" element={<ComingSoon title="Reportes con Enumeración" />} />
              <Route path="/dia" element={<ComingSoon title="Reporte de Ingresos por Día" />} />
              <Route path="/completos" element={<ComingSoon title="Registros Completados" />} />
              <Route path="/faltan" element={<ComingSoon title="Gestión de Documentos Faltantes" />} />
              <Route path="*" element={<ComingSoon title="Página no encontrada" />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </PeriodProvider>
    </AuthProvider>
  )
}
