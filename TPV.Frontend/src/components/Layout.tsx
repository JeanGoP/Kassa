import React, { useMemo } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    Activity,
    ArrowDownCircle,
    Boxes,
    Building2,
    CalendarDays,
    Car,
    ChevronDown,
    ChevronRight,
    CirclePlus,
    ClipboardList,
    DollarSign,
    FileBarChart,
    FileText,
    Key,
    LayoutDashboard,
    LogOut,
    MapPin,
    Menu,
    Package,
    PanelLeftClose,
    PanelLeftOpen,
    Search,
    Shield,
    ShoppingCart,
    Sliders,
    Tags,
    Truck,
    UserCheck,
    UserCircle,
    UserCog,
    Users,
    WalletCards,
    Wrench,
    X,
    type LucideIcon
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/Logo.png';
import ChangePasswordModal from './ChangePasswordModal';

interface NavLinkItem {
    path: string;
    label: string;
    icon: LucideIcon;
    permission?: string;
}

interface NavGroupItem {
    label: string;
    icon: LucideIcon;
    submenu: NavLinkItem[];
}

type NavItem = NavLinkItem | NavGroupItem;

const isNavGroup = (item: NavItem): item is NavGroupItem => 'submenu' in item;

const Layout = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(() => {
        if (typeof window === 'undefined') return true;
        if (window.innerWidth < 1024) return false;
        return window.localStorage.getItem('kassa.sidebar') !== 'collapsed';
    });
    const [expandedMenus, setExpandedMenus] = React.useState<string[]>([]);
    const [menuSearch, setMenuSearch] = React.useState('');
    const [isChangePasswordOpen, setIsChangePasswordOpen] = React.useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
    const commitSha = (__APP_COMMIT__ || 'local-dev').trim();
    const shortCommitSha = commitSha.length > 7 ? commitSha.slice(0, 7) : commitSha;

    const navItems = useMemo<NavItem[]>(() => [
        { path: '/', label: 'Resumen', icon: LayoutDashboard, permission: 'Menus.Dashboard.View' },
        {
            label: 'Operaciones',
            icon: ShoppingCart,
            submenu: [
                { path: '/pos', label: 'Punto de venta', icon: ShoppingCart, permission: 'Menus.POS.View' },
                { path: '/appointments', label: 'Agenda de citas', icon: CalendarDays, permission: 'Menus.Appointments.View' },
                { path: '/quotations', label: 'Cotizaciones', icon: FileText, permission: 'Menus.Quotations.View' },
                { path: '/sales-history', label: 'Historial de ventas', icon: ClipboardList, permission: 'Menus.POS.View' },
                { path: '/customer-advances', label: 'Anticipos de clientes', icon: WalletCards, permission: 'Menus.POS.View' },
                { path: '/purchases', label: 'Entradas de mercancía', icon: ArrowDownCircle, permission: 'Menus.Purchases.View' },
            ]
        },
        {
            label: 'Taller',
            icon: Wrench,
            submenu: [
                { path: '/service-orders/dashboard', label: 'Control de taller', icon: Activity, permission: 'Menus.Workshop.View' },
                { path: '/service-orders', label: 'Expedientes', icon: ClipboardList, permission: 'Menus.Workshop.View' },
                { path: '/preparation-orders', label: 'Alistamientos', icon: Car, permission: 'Menus.Workshop.View' },
                { path: '/vehicles', label: 'Vehículos UIO', icon: Car, permission: 'Menus.Workshop.View' },
                { path: '/warranties', label: 'Garantías', icon: Shield, permission: 'Menus.Workshop.View' },
            ]
        },
        {
            label: 'Inventario',
            icon: Package,
            submenu: [
                { path: '/inventory', label: 'Existencias', icon: Package, permission: 'Menus.Inventory.View' },
                { path: '/inventory/adjustments', label: 'Ajustes', icon: Sliders, permission: 'Menus.Inventory.View' },
                { path: '/inventory/transfers', label: 'Traslados', icon: Truck, permission: 'Menus.Inventory.View' },
            ]
        },
        {
            label: 'Catálogos',
            icon: Boxes,
            submenu: [
                { path: '/products', label: 'Productos', icon: Tags, permission: 'Menus.Products.View' },
                { path: '/categories', label: 'Categorías', icon: Boxes, permission: 'Menus.Products.View' },
                { path: '/vehicle-catalogs', label: 'Marcas y modelos', icon: Car, permission: 'Menus.Products.View' },
                { path: '/customers', label: 'Clientes', icon: UserCircle, permission: 'Menus.Customers.View' },
                { path: '/suppliers', label: 'Proveedores', icon: Users, permission: 'Menus.Suppliers.View' },
                { path: '/motorcycle-services', label: 'Servicios de moto', icon: Wrench, permission: 'Menus.MotorcycleServices.View' },
                { path: '/technicians', label: 'Técnicos', icon: UserCog, permission: 'Menus.Technicians.View' },
                { path: '/workshop-managers', label: 'Jefes de taller', icon: UserCheck, permission: 'Menus.WorkshopManagers.View' },
                { path: '/branches', label: 'Sucursales', icon: MapPin, permission: 'Menus.Branches.View' },
            ]
        },
        { path: '/cash', label: 'Caja', icon: DollarSign, permission: 'Menus.Cash.View' },
        { path: '/reports', label: 'Reportes', icon: FileBarChart, permission: 'Menus.Reports.View' },
        {
            label: 'Administración',
            icon: Shield,
            submenu: [
                ...(!user?.tenantId
                    ? [{ path: '/tenants', label: 'Empresas', icon: Building2, permission: 'Host.Tenants.Manage' }]
                    : []),
                { path: '/users', label: 'Usuarios', icon: Users, permission: 'Admin.Users.Manage' },
                { path: '/roles', label: 'Roles y permisos', icon: Shield, permission: 'Admin.Roles.Manage' },
            ]
        },
    ], [user?.tenantId]);

    const hasPermission = (permission?: string) => {
        if (!user?.tenantId || !permission) return true;
        return Boolean(user.permissions?.includes(permission));
    };

    const isRouteActive = (path: string) => {
        if (location.pathname === path) return true;
        const hasExactMenuOption = navItems.some(item => isNavGroup(item)
            ? item.submenu.some(subItem => subItem.path === location.pathname)
            : item.path === location.pathname);
        return !hasExactMenuOption && path !== '/' && location.pathname.startsWith(`${path}/`);
    };

    const visibleNavItems = (() => {
        const query = menuSearch.trim().toLocaleLowerCase('es');
        return navItems.reduce<NavItem[]>((result, item) => {
            if (isNavGroup(item)) {
                const submenu = item.submenu.filter(subItem => (
                    hasPermission(subItem.permission) &&
                    (!query || subItem.label.toLocaleLowerCase('es').includes(query) || item.label.toLocaleLowerCase('es').includes(query))
                ));
                if (submenu.length > 0) result.push({ ...item, submenu });
            } else if (hasPermission(item.permission) && (!query || item.label.toLocaleLowerCase('es').includes(query))) {
                result.push(item);
            }
            return result;
        }, []);
    })();

    const activeRoute = (() => {
        for (const item of navItems) {
            if (isNavGroup(item)) {
                const match = item.submenu.find(subItem => isRouteActive(subItem.path));
                if (match) return { ...match, group: item.label };
            } else if (isRouteActive(item.path)) {
                return { ...item, group: 'Inicio' };
            }
        }
        return null;
    })();

    const CurrentIcon = activeRoute?.icon || LayoutDashboard;
    const currentTitle = activeRoute?.label || 'Resumen';
    const currentGroup = activeRoute?.group || 'Inicio';
    const userEmail = user?.email || 'Usuario';
    const userInitial = userEmail.charAt(0).toUpperCase();

    const handleNavigation = () => {
        setIsUserMenuOpen(false);
        setMenuSearch('');
        if (typeof window !== 'undefined' && window.innerWidth < 768) setIsSidebarOpen(false);
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(previous => {
            const next = !previous;
            if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                window.localStorage.setItem('kassa.sidebar', next ? 'expanded' : 'collapsed');
            }
            return next;
        });
    };

    const toggleMenu = (label: string) => {
        if (!isSidebarOpen) setIsSidebarOpen(true);
        setExpandedMenus(previous => previous.includes(label)
            ? previous.filter(item => item !== label)
            : [...previous, label]);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const openChangePassword = () => {
        setIsUserMenuOpen(false);
        setIsChangePasswordOpen(true);
    };

    const renderUserMenu = (compact = false) => (
        <div className="relative">
            {isUserMenuOpen && (
                <button type="button" aria-label="Cerrar menú de cuenta" className="fixed inset-0 z-30 cursor-default bg-transparent" onClick={() => setIsUserMenuOpen(false)} />
            )}
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isUserMenuOpen}
                onClick={() => setIsUserMenuOpen(previous => !previous)}
                className={clsx('k-user-trigger relative z-40', compact && 'k-user-trigger-compact')}
            >
                <span className="k-user-avatar">{userInitial}</span>
                {!compact && <span className="max-w-[190px] truncate text-sm font-semibold">{userEmail}</span>}
                <ChevronDown size={15} className={clsx('transition-transform', isUserMenuOpen && 'rotate-180')} />
            </button>
            {isUserMenuOpen && (
                <div className="k-account-menu absolute right-0 z-50 mt-2 w-72 max-w-[calc(100vw-1.5rem)]" role="menu">
                    <div className="border-b border-slate-200 px-4 py-3">
                        <div className="text-[11px] font-bold uppercase text-slate-500">Cuenta activa</div>
                        <div className="mt-1 truncate text-sm font-semibold text-slate-900">{userEmail}</div>
                    </div>
                    <div className="p-2">
                        <button type="button" className="k-menu-action" onClick={openChangePassword} role="menuitem"><Key size={18} />Cambiar contraseña</button>
                        <button type="button" className="k-menu-action text-red-600 hover:bg-red-50" onClick={handleLogout} role="menuitem"><LogOut size={18} />Cerrar sesión</button>
                    </div>
                    <div className="border-t border-slate-200 px-4 py-2 text-[11px] text-slate-500" title={`Commit desplegado: ${commitSha}`}>
                        Versión <span className="font-mono text-slate-700">{shortCommitSha}</span>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="k-app-shell flex h-screen min-w-0 overflow-hidden">
            <header className="k-mobile-header fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between px-3 md:hidden">
                <div className="flex min-w-0 items-center gap-3">
                    <button type="button" onClick={() => setIsSidebarOpen(true)} className="k-icon-button" title="Abrir navegación"><Menu size={22} /></button>
                    <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-950">{currentTitle}</div>
                        <div className="truncate text-[11px] font-semibold text-slate-500">{currentGroup}</div>
                    </div>
                </div>
                {renderUserMenu(true)}
            </header>

            {isSidebarOpen && (
                <button type="button" aria-label="Cerrar navegación" className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-[2px] md:hidden" onClick={() => setIsSidebarOpen(false)} />
            )}

            <aside className={clsx(
                'k-sidebar fixed inset-y-0 left-0 z-40 flex h-full max-w-[88vw] flex-col transition-[width,transform] duration-200 md:relative md:max-w-none',
                isSidebarOpen ? 'w-[280px] translate-x-0' : '-translate-x-full md:w-[76px] md:translate-x-0'
            )}>
                <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-3">
                    <Link to="/" onClick={handleNavigation} className={clsx('flex min-w-0 items-center', isSidebarOpen ? 'gap-3' : 'justify-center')} title="Ir al resumen">
                        <span className="k-logo-mark"><img src={logo} alt="" /></span>
                        {isSidebarOpen && <span className="min-w-0"><span className="block text-lg font-extrabold leading-none text-slate-950">Kassa</span><span className="mt-1 block text-[11px] font-semibold text-slate-500">Gestión posventa</span></span>}
                    </Link>
                    {isSidebarOpen && <button type="button" onClick={toggleSidebar} className="k-icon-button hidden md:inline-flex" title="Contraer navegación"><PanelLeftClose size={19} /></button>}
                    <button type="button" onClick={() => setIsSidebarOpen(false)} className="k-icon-button md:hidden" title="Cerrar navegación"><X size={20} /></button>
                </div>

                {isSidebarOpen ? (
                    <div className="px-3 pb-2 pt-3">
                        <label className="relative block">
                            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                            <input type="search" value={menuSearch} onChange={event => setMenuSearch(event.target.value)} placeholder="Buscar en el menú" className="k-nav-search" aria-label="Buscar en el menú" />
                            {menuSearch && <button type="button" onClick={() => setMenuSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-200" title="Limpiar búsqueda"><X size={14} /></button>}
                        </label>
                    </div>
                ) : (
                    <button type="button" onClick={toggleSidebar} className="k-sidebar-expand mx-auto mt-3 hidden md:inline-flex" title="Expandir navegación"><PanelLeftOpen size={19} /></button>
                )}

                <nav className="k-sidebar-nav flex-1 overflow-y-auto px-2 pb-4 pt-2" aria-label="Navegación principal">
                    {isSidebarOpen && <div className="k-nav-caption">Navegación</div>}
                    {visibleNavItems.map(item => {
                        const Icon = item.icon;
                        if (isNavGroup(item)) {
                            const hasActiveChild = item.submenu.some(subItem => isRouteActive(subItem.path));
                            const isExpanded = expandedMenus.includes(item.label) || hasActiveChild || Boolean(menuSearch);
                            return (
                                <div key={item.label} className="mb-1">
                                    <button type="button" onClick={() => toggleMenu(item.label)} className={clsx('k-nav-item group w-full', hasActiveChild && 'k-nav-parent-active')} title={!isSidebarOpen ? item.label : undefined}>
                                        <Icon size={19} className="shrink-0" />
                                        {isSidebarOpen && <span className="flex-1 truncate text-left">{item.label}</span>}
                                        {isSidebarOpen && (isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />)}
                                        {!isSidebarOpen && <span className="k-nav-tooltip">{item.label}</span>}
                                    </button>
                                    {isSidebarOpen && isExpanded && (
                                        <div className="k-subnav">
                                            {item.submenu.map(subItem => {
                                                const SubIcon = subItem.icon;
                                                return <Link key={subItem.path} to={subItem.path} onClick={handleNavigation} className={clsx('k-subnav-item', isRouteActive(subItem.path) && 'k-subnav-item-active')}><SubIcon size={16} className="shrink-0" /><span className="truncate">{subItem.label}</span></Link>;
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        return (
                            <Link key={item.path} to={item.path} onClick={handleNavigation} className={clsx('k-nav-item group mb-1', isRouteActive(item.path) && 'k-nav-item-active')} title={!isSidebarOpen ? item.label : undefined}>
                                <Icon size={19} className="shrink-0" />
                                {isSidebarOpen && <span className="truncate">{item.label}</span>}
                                {!isSidebarOpen && <span className="k-nav-tooltip">{item.label}</span>}
                            </Link>
                        );
                    })}
                    {visibleNavItems.length === 0 && isSidebarOpen && <div className="px-3 py-8 text-center text-sm text-slate-500">No encontramos opciones.</div>}
                </nav>

                <div className={clsx('shrink-0 border-t border-slate-200 p-3', !isSidebarOpen && 'text-center')}>
                    {isSidebarOpen ? (
                        <div className="flex items-center justify-between gap-3 rounded-md bg-slate-100 px-3 py-2">
                            <span className="flex items-center gap-2 text-xs font-semibold text-slate-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Sistema operativo</span>
                            <span className="font-mono text-[10px] text-slate-500">{shortCommitSha}</span>
                        </div>
                    ) : <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" title="Sistema operativo" />}
                </div>
            </aside>

            <main className="k-workspace relative min-w-0 flex-1 overflow-auto pt-16 md:pt-0">
                <header className="k-desktop-header sticky top-0 z-20 hidden h-16 items-center px-5 md:flex lg:px-7">
                    <div className="mx-auto flex w-full max-w-[1540px] items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="k-context-icon"><CurrentIcon size={19} /></div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"><span>Kassa</span><ChevronRight size={12} /><span>{currentGroup}</span></div>
                                <div className="truncate text-base font-extrabold leading-tight text-slate-950">{currentTitle}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {hasPermission('Menus.POS.View') && <Link to="/pos" className="k-button-primary hidden px-3 py-2 text-sm lg:inline-flex"><CirclePlus size={17} />Nueva venta</Link>}
                            {renderUserMenu(false)}
                        </div>
                    </div>
                </header>
                <div className="k-content-container mx-auto w-full max-w-[1540px] p-3 sm:p-5 lg:p-7"><Outlet /></div>
            </main>

            <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
        </div>
    );
};

export default Layout;
