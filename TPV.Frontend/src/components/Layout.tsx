import React, { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, ShoppingCart, Package, DollarSign, FileBarChart, LogOut, Menu, Users, ArrowDownCircle, Tags, UserCircle, MapPin, ChevronDown, ChevronRight, Car, Wrench, Boxes, ClipboardList, Stethoscope, UserCog, UserCheck, Activity, Shield, CheckCircle, Building2, Key, ArrowLeftRight, Sliders, Truck, FileText, CalendarDays } from 'lucide-react';
import { clsx } from 'clsx';
import logo from '../assets/Logo.png';
import ChangePasswordModal from './ChangePasswordModal';

const Layout = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isDesktopViewport = () => typeof window === 'undefined' || window.innerWidth >= 768;
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(isDesktopViewport);
    const [expandedMenus, setExpandedMenus] = React.useState<string[]>([]);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = React.useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
    const commitSha = (__APP_COMMIT__ || 'local-dev').trim();
    const shortCommitSha = commitSha.length > 7 ? commitSha.slice(0, 7) : commitSha;

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
                { path: '/appointments', label: 'Agenda de Citas', icon: CalendarDays, permission: 'Menus.Appointments.View' },
                { path: '/quotations', label: 'Cotización', icon: FileText, permission: 'Menus.Quotations.View' },
                { path: '/sales-history', label: 'Historial de Ventas', icon: FileText, permission: 'Menus.POS.View' },
                { path: '/purchases', label: 'Entradas de Mercancia', icon: ArrowDownCircle, permission: 'Menus.Purchases.View' },
            ]
        },
        {
            label: 'Órdenes de Servicio',
            icon: Wrench,
            submenu: [
                { path: '/service-orders/dashboard', label: 'Dashboard Taller', icon: Activity, permission: 'Menus.Workshop.View' },
                { path: '/preparation-orders', label: 'Alistamientos', icon: ClipboardList, permission: 'Menus.Workshop.View' },
                { path: '/vehicles', label: 'Vehículos UIO', icon: Car, permission: 'Menus.Workshop.View' },
                { path: '/service-orders/ingreso-vehiculo', label: 'Ingreso de Vehículos', icon: Car, permission: 'Menus.Workshop.View' },
                { path: '/service-orders/diagnostico', label: 'Diagnóstico', icon: Stethoscope, permission: 'Menus.Workshop.View' },
                { path: '/service-orders/trabajos', label: 'Trabajos / Servicios', icon: ClipboardList, permission: 'Menus.Workshop.View' },
                { path: '/service-orders/repuestos', label: 'Repuestos e Insumos', icon: Boxes, permission: 'Menus.Workshop.View' },
                { path: '/service-orders/cierre', label: 'Cierre, Entrega y Facturación', icon: CheckCircle, permission: 'Menus.Workshop.View' },
                { path: '/warranties', label: 'Garantías', icon: Shield, permission: 'Menus.Workshop.View' },
            ]
        },
        {
            label: 'Catálogos',
            icon: Boxes,
            submenu: [
                { path: '/products', label: 'Productos', icon: Tags, permission: 'Menus.Products.View' },
                { path: '/categories', label: 'Categorías', icon: Tags, permission: 'Menus.Products.View' },
                { path: '/customers', label: 'Clientes', icon: UserCircle, permission: 'Menus.Customers.View' },
                { path: '/suppliers', label: 'Proveedores', icon: Users, permission: 'Menus.Suppliers.View' },
                { path: '/motorcycle-services', label: 'Servicios de Moto', icon: Wrench, permission: 'Menus.MotorcycleServices.View' },
                { path: '/technicians', label: 'Técnicos', icon: UserCog, permission: 'Menus.Technicians.View' },
                { path: '/workshop-managers', label: 'Jefes de Taller', icon: UserCheck, permission: 'Menus.WorkshopManagers.View' },
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
        if (!user?.tenantId) return true;
        if (!permission) return true;
        return user?.permissions?.includes(permission);
    };

    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
        setIsUserMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        navItems.forEach(item => {
            if (item.submenu) {
                const visibleSubItems = item.submenu.filter(sub => hasPermission(sub.permission));
                const hasActiveChild = visibleSubItems.some(sub => sub.path === location.pathname);
                if (hasActiveChild && !expandedMenus.includes(item.label)) {
                    setExpandedMenus(prev => [...prev, item.label]);
                }
            }
        });
    }, [location.pathname, user]);

    const toggleMenu = (label: string) => {
        if (!isSidebarOpen) setIsSidebarOpen(true);
        setExpandedMenus(prev =>
            prev.includes(label)
                ? prev.filter(item => item !== label)
                : [...prev, label]
        );
    };

    const activeRoute = navItems.reduce<any>((found, item: any) => {
        if (found) return found;
        if (item.submenu) {
            const match = item.submenu.find((subItem: any) => subItem.path === location.pathname);
            return match ? { ...match, group: item.label } : null;
        }
        return item.path === location.pathname ? { ...item, group: 'Inicio' } : null;
    }, null);
    const CurrentIcon = activeRoute?.icon || LayoutDashboard;
    const currentTitle = activeRoute?.label || 'Dashboard';
    const currentGroup = activeRoute?.group || 'Inicio';
    const userEmail = user?.email || 'Usuario';
    const userInitial = userEmail.charAt(0).toUpperCase();

    const openChangePassword = () => {
        setIsUserMenuOpen(false);
        setIsChangePasswordOpen(true);
    };

    const handleMenuLogout = async () => {
        setIsUserMenuOpen(false);
        await handleLogout();
    };

    const renderUserMenu = (compact = false) => (
        <div className="relative">
            {isUserMenuOpen && (
                <button
                    type="button"
                    aria-label="Cerrar menú de cuenta"
                    className="fixed inset-0 z-20 cursor-default bg-transparent"
                    onClick={() => setIsUserMenuOpen(false)}
                />
            )}
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isUserMenuOpen}
                onClick={() => setIsUserMenuOpen(prev => !prev)}
                className={clsx(
                    "relative z-30 flex items-center gap-2 rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40",
                    compact ? "h-10 px-2" : "px-3 py-2"
                )}
            >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-teal-50 text-xs font-extrabold text-teal-700">
                    {userInitial}
                </span>
                {!compact && <span className="max-w-[190px] truncate text-sm font-semibold text-slate-700">{userEmail}</span>}
                <ChevronDown size={16} className={clsx("text-slate-500 transition-transform", isUserMenuOpen && "rotate-180")} />
            </button>
            {isUserMenuOpen && (
                <div className="absolute right-0 z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl" role="menu">
                    <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                        <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Cuenta</div>
                        <div className="mt-1 truncate text-sm font-semibold text-slate-800">{userEmail}</div>
                    </div>
                    <div className="p-2">
                        <button
                            type="button"
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                            onClick={openChangePassword}
                            role="menuitem"
                        >
                            <Key size={18} />
                            Cambiar contraseña
                        </button>
                        <button
                            type="button"
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700"
                            onClick={handleMenuLogout}
                            role="menuitem"
                        >
                            <LogOut size={18} />
                            Cerrar sesión
                        </button>
                    </div>
                    <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500" title={`Commit desplegado: ${commitSha}`}>
                        Versión <span className="font-mono text-slate-600">{shortCommitSha}</span>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="k-app-shell flex h-screen min-w-0 overflow-hidden">
            <div className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:hidden">
                <div className="flex items-center space-x-2">
                    <img src={logo} alt="Kassa" className="h-8 w-8 rounded-md bg-white object-contain shadow-sm" />
                    <h1 className="text-lg font-extrabold tracking-tight text-slate-900">Kassa</h1>
                </div>
                <div className="flex items-center gap-2">
                    {renderUserMenu(true)}
                    <button onClick={() => setIsSidebarOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
                        <Menu size={24} />
                    </button>
                </div>
            </div>

            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-sm md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <aside
                className={clsx(
                    "z-40 flex h-full max-w-[85vw] flex-col text-white shadow-xl transition-all duration-300",
                    "fixed inset-y-0 left-0 md:relative md:max-w-none",
                    isSidebarOpen ? "w-64 translate-x-0" : "-translate-x-full md:w-20 md:translate-x-0"
                )}
                style={{ background: 'linear-gradient(180deg, var(--k-sidebar), var(--k-sidebar-2))' }}
            >
                <div className="flex h-16 items-center justify-between border-b border-white/10 p-4">
                    {isSidebarOpen && (
                        <div className="flex items-center space-x-2">
                            <img src={logo} alt="Kassa" className="h-9 w-9 rounded-lg bg-white p-1 object-contain shadow-sm" />
                            <div>
                                <h1 className="text-xl font-extrabold leading-none tracking-tight">Kassa</h1>
                                <p className="mt-1 text-[11px] font-medium text-slate-400">Gestión comercial</p>
                            </div>
                        </div>
                    )}
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
                        <Menu size={20} />
                    </button>
                </div>

                {isSidebarOpen && (
                    <div className="mx-3 mt-3 rounded-lg border border-white/10 bg-white/[0.06] p-3">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Estado del sistema</div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                Operativo
                            </span>
                            <span className="rounded-md bg-teal-400/10 px-2 py-1 text-[11px] font-bold text-teal-200">Kassa</span>
                        </div>
                    </div>
                )}

                <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3">
                    {navItems.map((item) => {
                        const Icon = item.icon;

                        if (item.submenu) {
                            const visibleSubItems = item.submenu.filter(sub => hasPermission(sub.permission));
                            if (visibleSubItems.length === 0) return null;

                            const isExpanded = expandedMenus.includes(item.label);
                            const hasActiveChild = visibleSubItems.some(sub => sub.path === location.pathname);

                            return (
                                <div key={item.label} className="mb-1">
                                    <button
                                        onClick={() => toggleMenu(item.label)}
                                        className={clsx(
                                            "group relative flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition-all duration-200",
                                            hasActiveChild
                                                ? "bg-white/14 text-white ring-1 ring-white/10"
                                                : "text-slate-300 hover:bg-white/10 hover:text-white"
                                        )}
                                    >
                                        <div className="flex items-center">
                                            <Icon size={21} className={clsx("shrink-0 transition-transform duration-300", hasActiveChild ? "text-blue-300" : "")} />
                                            {isSidebarOpen && <span className="ml-3 text-sm font-medium">{item.label}</span>}
                                        </div>
                                        {isSidebarOpen && (
                                            isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                                        )}
                                    </button>

                                    <div className={clsx("overflow-hidden transition-all duration-300 ease-in-out", isExpanded && isSidebarOpen ? "mt-1 max-h-96 opacity-100" : "max-h-0 opacity-0")}>
                                        <div className="ml-3 rounded-lg border-l border-white/10 bg-black/15 py-1">
                                            {visibleSubItems.map((subItem) => {
                                                const SubIcon = subItem.icon;
                                                const isSubActive = location.pathname === subItem.path;
                                                return (
                                                    <Link
                                                        key={subItem.path}
                                                        to={subItem.path}
                                                        className={clsx(
                                                            "group relative ml-2 flex items-center rounded-lg px-3 py-2 text-sm transition-all duration-200",
                                                            isSubActive
                                                                ? "bg-blue-500/20 font-semibold text-white"
                                                                : "text-slate-400 hover:bg-white/10 hover:text-white"
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

                        if (!hasPermission(item.permission)) return null;

                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path!}
                                className={clsx(
                                    "group relative mb-1 flex items-center rounded-lg px-3 py-2.5 transition-all duration-200",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-300/30"
                                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                <Icon size={21} className={clsx("shrink-0 transition-transform duration-300", isActive ? "scale-105" : "group-hover:scale-105")} />
                                {isSidebarOpen && <span className="ml-3 text-sm font-medium">{item.label}</span>}
                                {!isSidebarOpen && (
                                    <div className="pointer-events-none absolute left-14 z-50 whitespace-nowrap rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                                        {item.label}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

            </aside>

            <main className="k-workspace relative flex-1 min-w-0 overflow-auto pt-16 md:pt-0">
                <div className="sticky top-0 z-20 hidden border-b border-slate-200/80 bg-white/88 px-6 py-3 backdrop-blur md:block">
                    <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-50 p-2 text-blue-700 ring-1 ring-blue-100">
                                <CurrentIcon size={21} />
                            </div>
                            <div>
                                <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">{currentGroup}</div>
                                <div className="text-lg font-extrabold leading-tight text-slate-950">{currentTitle}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 lg:block">
                                Ambiente operativo
                            </div>
                            {renderUserMenu(false)}
                        </div>
                    </div>
                </div>
                <div className="k-content-container mx-auto w-full max-w-[1500px] p-4 sm:p-6 md:p-8">
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
