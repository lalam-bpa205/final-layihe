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
import DeliveriesPage from './pages/transport/DeliveriesPage';
import VehiclesPage from './pages/transport/VehiclesPage';
import DriversPage from './pages/transport/DriversPage';
import VehicleLogsPage from './pages/transport/VehicleLogsPage';
import TransactionsPage from './pages/finance/TransactionsPage';
import InvoicesPage from './pages/finance/InvoicesPage';
import BudgetPage from './pages/finance/BudgetPage';
import FinanceCategoriesPage from './pages/finance/FinanceCategoriesPage';
import { CustomersPage, SuppliersPage } from './pages/sales/PartnersPages';
import { SalesOrdersPage, PurchaseOrdersPage } from './pages/sales/OrdersPages';
import ReportsPage from './pages/reports/ReportsPage';
import AiChatPage from './pages/ai/AiChatPage';
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
          <Route path="/transport/deliveries" element={<DeliveriesPage />} />
          <Route path="/transport/vehicles" element={<VehiclesPage />} />
          <Route path="/transport/drivers" element={<DriversPage />} />
          <Route path="/transport/logs" element={<VehicleLogsPage />} />
          <Route path="/finance/transactions" element={<TransactionsPage />} />
          <Route path="/finance/invoices" element={<InvoicesPage />} />
          <Route path="/finance/budgets" element={<BudgetPage />} />
          <Route path="/finance/categories" element={<FinanceCategoriesPage />} />
          <Route path="/sales/sales-orders" element={<SalesOrdersPage />} />
          <Route path="/sales/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="/sales/customers" element={<CustomersPage />} />
          <Route path="/sales/suppliers" element={<SuppliersPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/ai" element={<AiChatPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
