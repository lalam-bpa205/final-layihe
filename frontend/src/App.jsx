import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ModulesPage from './pages/ModulesPage';
import EmployeesPage from './pages/hr/EmployeesPage';
import DepartmentsPage from './pages/hr/DepartmentsPage';
import PositionsPage from './pages/hr/PositionsPage';
import AttendancePage from './pages/hr/AttendancePage';
import LeaveRequestsPage from './pages/hr/LeaveRequestsPage';
import ProductsPage from './pages/inventory/ProductsPage';
import CategoriesPage from './pages/inventory/CategoriesPage';
import WarehousesPage from './pages/inventory/WarehousesPage';
import StockPage from './pages/inventory/StockPage';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        {/* Modul seçim ekranı — sidebar-sız */}
        <Route path="/" element={<ModulesPage />} />

        {/* Modul səhifələri — modul-əsaslı sidebar ilə */}
        <Route element={<Layout />}>
          <Route path="/hr/employees" element={<EmployeesPage />} />
          <Route path="/hr/departments" element={<DepartmentsPage />} />
          <Route path="/hr/positions" element={<PositionsPage />} />
          <Route path="/hr/attendance" element={<AttendancePage />} />
          <Route path="/hr/leave-requests" element={<LeaveRequestsPage />} />
          <Route path="/inventory/products" element={<ProductsPage />} />
          <Route path="/inventory/categories" element={<CategoriesPage />} />
          <Route path="/inventory/warehouses" element={<WarehousesPage />} />
          <Route path="/inventory/stock" element={<StockPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
