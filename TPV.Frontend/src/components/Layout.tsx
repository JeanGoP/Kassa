import React, { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, ShoppingCart, Package, DollarSign, FileBarChart, LogOut, Menu, Users, ArrowDownCircle, Tags, UserCircle, MapPin, ChevronDown, ChevronRight, Car, Wrench, Boxes, ClipboardList, Stethoscope, UserCog, Activity, Shield, CheckCircle, Building2, Key, ArrowLeftRight, Sliders, Truck, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import logo from '../assets/Logo.png';
import ChangePasswordModal from './ChangePasswordModal';

const Layout = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
    const [expandedMenus, setExpandedMenus] = React.useState<string[]>([]);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = React.useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'Menus.Dashboard.View' },
        { 
            label: 'Operaciones',
            icon: ShoppingCart,
            submenu: [
                { path: '/pos', label: 'Punto de Venta', icon: ShoppingCart, permission: 'Menus.POS.View' },
                { path: '/sales-history', label: 'Historial de Ventas', icon: FileText, permission: 'Menus.POS.View' },
                { path: '/purchases', label: 'Entradas Stock', icon: ArrowDownCircle, permission: 'Menus.Purchases.View' },
            ]
        },
        { 
            label: 'Ordenes de Servicio',
            icon: Wrench,
            submenu: [
                { path: '/service-orders/dashboard', label: 'Dashboard Taller', icon: Activity, permission: 'Menus.Workshop.View' },
                { path: '/service-orders/ingreso-vehiculo', label: 'Ingreso de Vehículos', icon: Car, permission: 'Menus.Workshop.View' },
                { path: '/service-orders/diagnostico', label: 'Diagnóstico', icon: Stethoscope, permission: 'Menus.Workshop.View' },
                { path: '/service-orders/trabajos', label: 'Trabajos / Servicios', icon: ClipboardList, permission: 'Menus.Workshop.View' },
                { path: '/service-orders/repuestos', label: 'Repuestos e Insumos', icon: Boxes, permission: 'Menus.Workshop.View' },
                { path: '/service-orders/cierre', label: 'Cierre, Entrega y Facturación', icon: CheckCircle, permission: 'Menus.Workshop.View' },
                { path: '/warranties', label: 'Garantías', icon: Shield, permission: 'Menus.Workshop.View' },
            ]
        },
        { 
            label: 'Catalogos', 
            icon: Boxes,
            submenu: [
                { path: '/products', label: 'Productos', icon: Tags, permission: 'Menus.Products.View' },
                { path: '/categories', label: 'Categorías', icon: Tags, permission: 'Menus.Products.View' },
                { path: '/customers', label: 'Clientes', icon: UserCircle, permission: 'Menus.Customers.View' },
                { path: '/suppliers', label: 'Proveedores', icon: Users, permission: 'Menus.Suppliers.View' },
                { path: '/technicians', label: 'Técnicos', icon: UserCog, permission: 'Menus.Technicians.View' },
                { path: '/branches', label: 'Sucursales', icon: MapPin, permission: 'Menus.Branches.View' },
            ]
        },
        { 
            label: 'Movimientos', 
            icon: ArrowLeftRight,
            submenu: [
                { path: '/inventory', label: 'Inventario', icon: Package, permission: 'Menus.Inventory.View' },
                { path: '/inventory/adjustments', label: 'Ajustes', icon: Sliders, permission: 'Menus.Inventory.View' },
                { path: '/inventory/transfers', label: 'Traslados', icon: Truck, permission: 'Menus.Inventory.View' },
            ]
        },
        { path: '/cash', label: 'Caja', icon: DollarSign, permission: 'Menus.Cash.View' },
        {
            label: 'Seguridad',
            icon: Shield,
            submenu: [
                ...(!user?.tenantId ? [{ path: '/tenants', label: 'Empresas', icon: Building2, permission: 'Host.Tenants.Manage' }] : []),
                { path: '/users', label: 'Usuarios', icon: Users, permission: 'Admin.Users.Manage' },
                { path: '/roles', label: 'Roles y permisos', icon: Shield, permission: 'Admin.Roles.Manage' },
            ]
        },
        { path: '/reports', label: 'Reportes', icon: FileBarChart, permission: 'Menus.Reports.View' },
    ];

    const hasPermission = (permission?: string) => {
        if (!user?.tenantId) return true; // SuperAdmin has access to everything
        if (!permission) return true;
        return user?.permissions?.includes(permission);
    };

    useEffect(() => {
        // Auto-expand menu if active item is inside
        navItems.forEach(item => {
            if (item.submenu) {
                const visibleSubItems = item.submenu.filter(sub => hasPermission(sub.permission));
                const hasActiveChild = visibleSubItems.some(sub => sub.path === location.pathname);
                if (hasActiveChild && !expandedMenus.includes(item.label)) {
                    setExpandedMenus(prev => [...prev, item.label]);
                }
            }
        });
    }, [location.pathname, user]); // Added user dependency

    const toggleMenu = (label: string) => {
        if (!isSidebarOpen) setIsSidebarOpen(true);
        setExpandedMenus(prev => 
            prev.includes(label) 
                ? prev.filter(item => item !== label)
                : [...prev, label]
        );
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Sidebar */}
            <aside className={clsx("bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 shadow-xl z-20 flex flex-col", isSidebarOpen ? "w-64" : "w-20")}>
                <div className="p-4 flex items-center justify-between border-b border-slate-700/50 h-16">
                    {isSidebarOpen && (
                        <div className="flex items-center space-x-2">
                             <img src={logo} alt="Kassa" className="w-8 h-8 bg-white p-1 rounded-lg object-contain shadow-lg shadow-blue-500/30" />
                             <h1 className="text-xl font-bold tracking-tight">Kassa</h1>
                        </div>
                    )}
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white">
                        <Menu size={20} />
                    </button>
                </div>
                
                <nav className="mt-6 flex-1 px-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        
                        if (item.submenu) {
                            // Filter submenu items based on permissions
                            const visibleSubItems = item.submenu.filter(sub => hasPermission(sub.permission));
                            
                            // If no subitems are visible, don't render the group
                            if (visibleSubItems.length === 0) return null;

                            const isExpanded = expandedMenus.includes(item.label);
                            const hasActiveChild = visibleSubItems.some(sub => sub.path === location.pathname);
                            const isActive = hasActiveChild; 

                            return (
                                <div key={item.label} className="mb-1">
                                    <button
                                        onClick={() => toggleMenu(item.label)}
                                        className={clsx(
                                            "w-full flex items-center justify-between px-3 py-3 rounded-lg transition-all duration-200 group relative",
                                            isActive && !isExpanded
                                                ? "bg-blue-600/20 text-blue-300" 
                                                : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                        )}
                                    >
                                        <div className="flex items-center">
                                            <Icon size={22} className={clsx("flex-shrink-0 transition-transform duration-300", isActive ? "text-blue-400" : "")} />
                                            {isSidebarOpen && <span className="ml-3 font-medium text-sm">{item.label}</span>}
                                        </div>
                                        {isSidebarOpen && (
                                            isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                                        )}
                                    </button>
                                    
                                    {/* Submenu */}
                                    <div className={clsx("overflow-hidden transition-all duration-300 ease-in-out", isExpanded && isSidebarOpen ? "max-h-96 opacity-100 mt-1" : "max-h-0 opacity-0")}>
                                        <div className="bg-slate-900/30 rounded-lg py-1 ml-3 border-l border-slate-700">
                                            {visibleSubItems.map((subItem) => {
                                                const SubIcon = subItem.icon;
                                                const isSubActive = location.pathname === subItem.path;
                                                return (
                                                    <Link 
                                                        key={subItem.path} 
                                                        to={subItem.path}
                                                        className={clsx(
                                                            "flex items-center px-3 py-2 ml-2 rounded-lg transition-all duration-200 group relative text-sm",
                                                            isSubActive 
                                                                ? "text-blue-400 font-medium bg-blue-600/10" 
                                                                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                                                        )}
                                                    >
                                                        <SubIcon size={18} className="mr-3" />
                                                        <span>{subItem.label}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        // Check permission for single items
                        if (!hasPermission(item.permission)) return null;

                        const isActive = location.pathname === item.path;
                        return (
                            <Link 
                                key={item.path} 
                                to={item.path!} 
                                className={clsx(
                                    "flex items-center px-3 py-3 rounded-lg transition-all duration-200 group relative mb-1",
                                    isActive 
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" 
                                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                )}
                            >
                                <Icon size={22} className={clsx("flex-shrink-0 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
                                {isSidebarOpen && <span className="ml-3 font-medium text-sm">{item.label}</span>}
                                {!isSidebarOpen && (
                                    <div className="absolute left-14 bg-slate-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-slate-700">
                                        {item.label}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-700/50 bg-slate-900/50 space-y-2">
                     <button onClick={() => setIsChangePasswordOpen(true)} className="flex items-center px-3 py-2 text-slate-400 hover:bg-slate-700/50 hover:text-white rounded-lg w-full transition-colors group">
                        <Key size={22} className="group-hover:text-blue-400 transition-colors" />
                        {isSidebarOpen && <span className="ml-3 font-medium text-sm">Cambiar Contraseña</span>}
                    </button>
                     <button onClick={handleLogout} className="flex items-center px-3 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg w-full transition-colors group">
                        <LogOut size={22} className="group-hover:translate-x-1 transition-transform" />
                        {isSidebarOpen && <span className="ml-3 font-medium text-sm">Cerrar Sesión</span>}
                    </button>
                    {isSidebarOpen && (
                        <div className="mt-4 flex items-center px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                                {user?.email?.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-3 overflow-hidden">
                                <div className="text-xs font-medium text-white truncate">Usuario</div>
                                <div className="text-xs text-slate-400 truncate w-32">{user?.email}</div>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-gray-50 relative">
                 {/* Top header could go here if needed */}
                <div className="p-6 md:p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
            
            <ChangePasswordModal 
                isOpen={isChangePasswordOpen} 
                onClose={() => setIsChangePasswordOpen(false)} 
            />
        </div>
    );
};

export default Layout;
