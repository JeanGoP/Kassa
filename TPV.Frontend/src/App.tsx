import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const POS = lazy(() => import('./pages/POS'));
const Inventory = lazy(() => import('./pages/Inventory'));
const StockAdjustments = lazy(() => import('./pages/StockAdjustments'));
const StockTransfers = lazy(() => import('./pages/StockTransfers'));
const Cash = lazy(() => import('./pages/Cash'));
const Reports = lazy(() => import('./pages/Reports'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const Products = lazy(() => import('./pages/Products'));
const Customers = lazy(() => import('./pages/Customers'));
const Categories = lazy(() => import('./pages/Categories'));
const Purchases = lazy(() => import('./pages/Purchases'));
const CreatePurchase = lazy(() => import('./pages/CreatePurchase'));
const PurchasePrint = lazy(() => import('./pages/PurchasePrint'));
const SalesHistory = lazy(() => import('./pages/SalesHistory'));
const Quotations = lazy(() => import('./pages/Quotations'));
const QuotationPrint = lazy(() => import('./pages/QuotationPrint'));
const Appointments = lazy(() => import('./pages/Appointments'));
const PublicBooking = lazy(() => import('./pages/PublicBooking'));
const MotorcycleServices = lazy(() => import('./pages/MotorcycleServices'));
const Layout = lazy(() => import('./components/Layout'));
const Branches = lazy(() => import('./pages/Branches'));
const ServiceOrders = lazy(() => import('./pages/ServiceOrders'));
const PreparationOrders = lazy(() => import('./pages/PreparationOrders'));
const Vehicles = lazy(() => import('./pages/Vehicles'));
const Technicians = lazy(() => import('./pages/Technicians'));
const WorkshopManagers = lazy(() => import('./pages/WorkshopManagers'));
const Roles = lazy(() => import('./pages/Roles'));
const Users = lazy(() => import('./pages/Users'));
const Tenants = lazy(() => import('./pages/Tenants'));
const WorkshopDashboard = lazy(() => import('./pages/WorkshopDashboard'));
const Warranties = lazy(() => import('./pages/Warranties'));
const VehicleCatalogs = lazy(() => import('./pages/VehicleCatalogs'));
const CustomerAdvances = lazy(() => import('./pages/CustomerAdvances'));

const LoadingScreen = () => (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-600" role="status">
        Cargando...
    </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
    const { user, isLoading } = useAuth();
    if (isLoading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" />;
    return children;
};

const AppRoutes = () => {
    return (
        <Suspense fallback={<LoadingScreen />}>
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
                <Route path="motorcycle-services" element={<MotorcycleServices />} />
                <Route path="sales-history" element={<SalesHistory />} />
                <Route path="customer-advances" element={<CustomerAdvances />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="inventory/adjustments" element={<StockAdjustments />} />
                <Route path="inventory/transfers" element={<StockTransfers />} />
                <Route path="products" element={<Products />} />
                <Route path="categories" element={<Categories />} />
                <Route path="vehicle-catalogs" element={<VehicleCatalogs />} />
                <Route path="customers" element={<Customers />} />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="technicians" element={<Technicians />} />
                <Route path="workshop-managers" element={<WorkshopManagers />} />
                <Route path="purchases" element={<Purchases />} />
                <Route path="purchases/create" element={<CreatePurchase />} />
                <Route path="service-orders" element={<ServiceOrders />} />
                <Route path="preparation-orders" element={<PreparationOrders />} />
                <Route path="vehicles" element={<Vehicles />} />
                <Route path="service-orders/dashboard" element={<WorkshopDashboard />} />
                <Route path="service-orders/ingreso-vehiculo" element={<Navigate to="/service-orders" replace />} />
                <Route path="service-orders/diagnostico" element={<Navigate to="/service-orders" replace />} />
                <Route path="service-orders/trabajos" element={<Navigate to="/service-orders" replace />} />
                <Route path="service-orders/repuestos" element={<Navigate to="/service-orders" replace />} />
                <Route path="service-orders/cierre" element={<Navigate to="/service-orders" replace />} />
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
        </Suspense>
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
