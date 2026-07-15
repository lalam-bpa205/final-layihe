import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ModulesPage from './pages/ModulesPage';
import HrDashboardPage from './pages/hr/HrDashboardPage';
import EmployeesPage from './pages/hr/EmployeesPage';
import EmployeeProfilePage from './pages/hr/EmployeeProfilePage';
import DepartmentsPage from './pages/hr/DepartmentsPage';
import PositionsPage from './pages/hr/PositionsPage';
import AttendancePage from './pages/hr/AttendancePage';
import LeaveRequestsPage from './pages/hr/LeaveRequestsPage';
import WorkSchedulesPage from './pages/hr/WorkSchedulesPage';
import InventoryDashboardPage from './pages/inventory/InventoryDashboardPage';
import ProductsPage from './pages/inventory/ProductsPage';
import ProductDetailPage from './pages/inventory/ProductDetailPage';
import CategoriesPage from './pages/inventory/CategoriesPage';
import WarehousesPage from './pages/inventory/WarehousesPage';
import StockPage from './pages/inventory/StockPage';
import TransportDashboardPage from './pages/transport/TransportDashboardPage';
import DeliveriesPage from './pages/transport/DeliveriesPage';
import DeliveryDetailPage from './pages/transport/DeliveryDetailPage';
import VehiclesPage from './pages/transport/VehiclesPage';
import VehicleDetailPage from './pages/transport/VehicleDetailPage';
import DriversPage from './pages/transport/DriversPage';
import VehicleLogsPage from './pages/transport/VehicleLogsPage';
import FinanceDashboardPage from './pages/finance/FinanceDashboardPage';
import TransactionsPage from './pages/finance/TransactionsPage';
import InvoicesPage from './pages/finance/InvoicesPage';
import InvoiceDetailPage from './pages/finance/InvoiceDetailPage';
import BudgetPage from './pages/finance/BudgetPage';
import FinanceCategoriesPage from './pages/finance/FinanceCategoriesPage';
import SalesDashboardPage from './pages/sales/SalesDashboardPage';
import { CustomersPage, SuppliersPage } from './pages/sales/PartnersPages';
import { SalesOrdersPage, PurchaseOrdersPage } from './pages/sales/OrdersPages';
import PartnerDetailPage from './pages/sales/PartnerDetailPage';
import OrderDetailPage from './pages/sales/OrderDetailPage';
import ReportsPage from './pages/reports/ReportsPage';
import AiChatPage from './pages/ai/AiChatPage';
import ChatPage from './pages/ChatPage';
import StatisticsPage from './pages/management/StatisticsPage';
import AuditLogsPage from './pages/management/AuditLogsPage';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        {/* Modul seçim ekranı — sidebar-sız */}
        <Route path="/" element={<ModulesPage />} />
        <Route path="/chat" element={<ChatPage />} />

        {/* Modul səhifələri — modul-əsaslı sidebar ilə */}
        <Route element={<Layout />}>
          <Route path="/hr" element={<HrDashboardPage />} />
          <Route path="/hr/employees" element={<EmployeesPage />} />
          <Route path="/hr/employees/:id" element={<EmployeeProfilePage />} />
          <Route path="/hr/departments" element={<DepartmentsPage />} />
          <Route path="/hr/positions" element={<PositionsPage />} />
          <Route path="/hr/attendance" element={<AttendancePage />} />
          <Route path="/hr/leave-requests" element={<LeaveRequestsPage />} />
          <Route path="/hr/schedules" element={<WorkSchedulesPage />} />
          <Route path="/inventory" element={<InventoryDashboardPage />} />
          <Route path="/inventory/products" element={<ProductsPage />} />
          <Route path="/inventory/products/:id" element={<ProductDetailPage />} />
          <Route path="/inventory/categories" element={<CategoriesPage />} />
          <Route path="/inventory/warehouses" element={<WarehousesPage />} />
          <Route path="/inventory/stock" element={<StockPage />} />
          <Route path="/transport" element={<TransportDashboardPage />} />
          <Route path="/transport/deliveries" element={<DeliveriesPage />} />
          <Route path="/transport/deliveries/:id" element={<DeliveryDetailPage />} />
          <Route path="/transport/vehicles" element={<VehiclesPage />} />
          <Route path="/transport/vehicles/:id" element={<VehicleDetailPage />} />
          <Route path="/transport/drivers" element={<DriversPage />} />
          <Route path="/transport/logs" element={<VehicleLogsPage />} />
          <Route path="/finance" element={<FinanceDashboardPage />} />
          <Route path="/finance/transactions" element={<TransactionsPage />} />
          <Route path="/finance/invoices" element={<InvoicesPage />} />
          <Route path="/finance/invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="/finance/budgets" element={<BudgetPage />} />
          <Route path="/finance/categories" element={<FinanceCategoriesPage />} />
          <Route path="/sales" element={<SalesDashboardPage />} />
          <Route path="/sales/sales-orders" element={<SalesOrdersPage />} />
          <Route path="/sales/sales-orders/:id" element={<OrderDetailPage kind="sales" />} />
          <Route path="/sales/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="/sales/purchase-orders/:id" element={<OrderDetailPage kind="purchase" />} />
          <Route path="/sales/customers" element={<CustomersPage />} />
          <Route path="/sales/customers/:id" element={<PartnerDetailPage kind="customer" />} />
          <Route path="/sales/suppliers" element={<SuppliersPage />} />
          <Route path="/sales/suppliers/:id" element={<PartnerDetailPage kind="supplier" />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/ai" element={<AiChatPage />} />
          <Route path="/management/statistics" element={<StatisticsPage />} />
          <Route path="/management/logs" element={<AuditLogsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
