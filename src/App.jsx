import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';

import LoginPage         from './pages/LoginPage';
import SignupPage        from './pages/SignupPage';
import Dashboard         from './pages/Dashboard';
import PatientsPage      from './pages/PatientsPage';
import AddPatientPage    from './pages/AddPatientPage';
import PatientDetailPage from './pages/PatientDetailPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/patients" element={
            <ProtectedRoute><PatientsPage /></ProtectedRoute>
          } />
          <Route path="/patients/add" element={
            <ProtectedRoute><AddPatientPage /></ProtectedRoute>
          } />
          <Route path="/patients/:id" element={
            <ProtectedRoute><PatientDetailPage /></ProtectedRoute>
          } />

          {/* Default */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
