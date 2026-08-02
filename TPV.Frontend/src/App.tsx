import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import StockAdjustments from './pages/StockAdjustments';
import StockTransfers from './pages/StockTransfers';
import Cash from './pages/Cash';
import Reports from './pages/Reports';
import Suppliers from './pages/Suppliers';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Categories from './pages/Categories';
import Purchases from './pages/Purchases';
import CreatePurchase from './pages/CreatePurchase';
import PurchasePrint from './pages/PurchasePrint';
import SalesHistory from './pages/SalesHistory';
import Quotations from './pages/Quotations';
import QuotationPrint from './pages/QuotationPrint';
import Appointments from './pages/Appointments';
import PublicBooking from './pages/PublicBooking';
import Layout from './components/Layout';
import Branches from './pages/Branches';
import ServiceOrders from './pages/ServiceOrders';
import VehicleIntake from './pages/VehicleIntake';
import ServiceOrderDiagnosis from './pages/ServiceOrderDiagnosis';
import ServiceOrderWorks from './pages/ServiceOrderWorks';
import ServiceOrderParts from './pages/ServiceOrderParts';
import ServiceOrderClosure from './pages/ServiceOrderClosure';
import Technicians from './pages/Technicians';
import WorkshopManagers from './pages/WorkshopManagers';
import Roles from './pages/Roles';
import Users from './pages/Users';
import Tenants from './pages/Tenants';
import WorkshopDashboard from './pages/WorkshopDashboard';
import Warranties from './pages/Warranties';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
    const { user, isLoading } = useAuth();
    if (isLoading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" />;
    return children;
};

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reservar/:slug" element={<PublicBooking />} />
            <Route path="/purchases/print/:id" element={
                <ProtectedRoute>
                    <PurchasePrint />
                </ProtectedRoute>
            } />
            <Route path="/quotations/print/:id" element={
                <ProtectedRoute>
                    <QuotationPrint />
                </ProtectedRoute>
            } />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="pos" element={<POS />} />
                <Route path="quotations" element={<Quotations />} />
                <Route path="appointments" element={<Appointments />} />
                <Route path="sales-history" element={<SalesHistory />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="inventory/adjustments" element={<StockAdjustments />} />
                <Route path="inventory/transfers" element={<StockTransfers />} />
                <Route path="products" element={<Products />} />
                <Route path="categories" element={<Categories />} />
                <Route path="customers" element={<Customers />} />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="technicians" element={<Technicians />} />
                <Route path="workshop-managers" element={<WorkshopManagers />} />
                <Route path="purchases" element={<Purchases />} />
                <Route path="purchases/create" element={<CreatePurchase />} />
                <Route path="service-orders" element={<ServiceOrders />} />
                <Route path="service-orders/dashboard" element={<WorkshopDashboard />} />
                <Route path="service-orders/ingreso-vehiculo" element={<VehicleIntake />} />
                <Route path="service-orders/diagnostico" element={<ServiceOrderDiagnosis />} />
                <Route path="service-orders/trabajos" element={<ServiceOrderWorks />} />
                <Route path="service-orders/repuestos" element={<ServiceOrderParts />} />
                <Route path="service-orders/cierre" element={<ServiceOrderClosure />} />
                <Route path="warranties" element={<Warranties />} />
                <Route path="cash" element={<Cash />} />
                <Route path="branches" element={<Branches />} />
                <Route path="users" element={<Users />} />
                <Route path="roles" element={<Roles />} />
                <Route path="tenants" element={<Tenants />} />
                <Route path="reports" element={<Reports />} />
                <Route path="*" element={<Navigate to="/" />} />
            </Route>
        </Routes>
    );
};

function App() {
  return (
    <AuthProvider>
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
