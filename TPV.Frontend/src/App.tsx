import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Cash from './pages/Cash';
import Reports from './pages/Reports';
import Suppliers from './pages/Suppliers';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Purchases from './pages/Purchases';
import CreatePurchase from './pages/CreatePurchase';
import PurchasePrint from './pages/PurchasePrint';
import Layout from './components/Layout';
import Branches from './pages/Branches';
import ServiceOrders from './pages/ServiceOrders';
import VehicleIntake from './pages/VehicleIntake';
import ServiceOrderDiagnosis from './pages/ServiceOrderDiagnosis';
import ServiceOrderWorks from './pages/ServiceOrderWorks';
import Technicians from './pages/Technicians';
import Roles from './pages/Roles';
import Users from './pages/Users';
import WorkshopDashboard from './pages/WorkshopDashboard';
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
            <Route path="/purchases/print/:id" element={
                <ProtectedRoute>
                    <PurchasePrint />
                </ProtectedRoute>
            } />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="pos" element={<POS />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="products" element={<Products />} />
                <Route path="customers" element={<Customers />} />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="technicians" element={<Technicians />} />
                <Route path="purchases" element={<Purchases />} />
                <Route path="purchases/create" element={<CreatePurchase />} />
                <Route path="service-orders" element={<ServiceOrders />} />
                <Route path="service-orders/dashboard" element={<WorkshopDashboard />} />
                <Route path="service-orders/ingreso-vehiculo" element={<VehicleIntake />} />
                <Route path="service-orders/diagnostico" element={<ServiceOrderDiagnosis />} />
                <Route path="service-orders/trabajos" element={<ServiceOrderWorks />} />
                <Route path="cash" element={<Cash />} />
                <Route path="branches" element={<Branches />} />
                <Route path="users" element={<Users />} />
                <Route path="roles" element={<Roles />} />
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
