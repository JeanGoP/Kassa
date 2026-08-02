import { useAuth } from '../context/AuthContext';
import {
    ShoppingCart,
    Package,
    DollarSign,
    FileBarChart,
    TrendingUp,
    Users,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Activity
} from 'lucide-react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { useEffect, useState } from 'react';
import api from '../api/axios';

interface DashboardData {
    totalRevenue: number;
    openOrders: number;
    lowStockCount: number;
    newCustomersCount: number;
    revenueExpenseStats: { date: string; income: number; expense: number }[];
    orderStatusStats: { status: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
    'FINALIZADA': '#059669',
    'EN PROCESO': '#2563eb',
    'PENDIENTE': '#d97706',
    'CANCELADA': '#dc2626',
    'EN DIAGNOSTICO': '#0f766e',
    'EN ESPERA': '#64748b',
    'DEFAULT': '#94a3b8'
};

const Dashboard = () => {
    const { user } = useAuth();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get('/workshop-dashboard');
                setData(response.data);
                setError(null);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
                setError('No se pudieron cargar los datos del panel. Por favor, intente nuevamente más tarde.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const revenueData = data?.revenueExpenseStats?.map(stat => ({
        name: new Date(stat.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
        income: stat.income,
        expense: stat.expense
    })) || [];

    const serviceStatusData = data?.orderStatusStats?.map(stat => ({
        name: stat.status,
        value: stat.count,
        color: STATUS_COLORS[stat.status] || STATUS_COLORS.DEFAULT
    })) || [];

    const totalOrders = serviceStatusData.reduce((acc, curr) => acc + curr.value, 0);

    const MetricCard = ({ title, value, change, icon: Icon, trend }: any) => (
        <div className="k-card p-5 transition-transform hover:-translate-y-0.5">
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</p>
                    <h3 className="mt-2 text-2xl font-extrabold text-slate-900">{value}</h3>
                </div>
                <div className={`rounded-lg p-2.5 ${trend === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    <Icon size={21} />
                </div>
            </div>
            <div className="flex items-center text-sm">
                {change && (
                    <span className={`flex items-center font-bold ${trend === 'up' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {trend === 'up' ? <ArrowUpRight size={16} className="mr-1" /> : <ArrowDownRight size={16} className="mr-1" />}
                        {change}
                    </span>
                )}
                <span className="ml-2 text-slate-500">vs mes anterior</span>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex min-h-[360px] items-center justify-center">
                <div className="k-card flex items-center gap-3 px-5 py-4 text-sm font-semibold text-slate-600">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-b-blue-600" />
                    Cargando panel de control
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-[360px] items-center justify-center p-4">
                <div className="k-card max-w-md p-6 text-center">
                    <Activity size={44} className="mx-auto mb-3 text-red-600" />
                    <h3 className="text-lg font-extrabold text-slate-900">Error de conexión</h3>
                    <p className="mt-2 text-sm text-slate-500">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="k-button-primary mt-5 px-4 py-2 text-sm"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="k-page">
            <div className="k-page-header flex-col lg:flex-row lg:items-center">
                <div>
                    <h1 className="k-page-title">Panel de Control</h1>
                    <p className="k-page-subtitle">Bienvenido de nuevo, {user?.firstName || user?.email}. Resumen operativo de ventas, taller e inventario.</p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <button className="k-button-secondary w-full px-4 py-2 text-sm sm:w-auto">
                        <Calendar size={16} />
                        Últimos 30 días
                    </button>
                    <button className="k-button-primary w-full px-4 py-2 text-sm sm:w-auto">
                        <TrendingUp size={16} />
                        Ver Reportes
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    title="Ventas Totales"
                    value={`$${(data?.totalRevenue || 0).toLocaleString('es-CO')}`}
                    change="--%"
                    icon={DollarSign}
                    trend="up"
                />
                <MetricCard
                    title="Órdenes Activas"
                    value={data?.openOrders || 0}
                    change="--%"
                    icon={Activity}
                    trend="up"
                />
                <MetricCard
                    title="Inventario Bajo"
                    value={`${data?.lowStockCount || 0} Productos`}
                    change="--%"
                    icon={Package}
                    trend="down"
                />
                <MetricCard
                    title="Nuevos Clientes"
                    value={data?.newCustomersCount || 0}
                    change="--%"
                    icon={Users}
                    trend="up"
                />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="k-card p-5 xl:col-span-2">
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h3 className="k-section-title">Tendencia de Ingresos</h3>
                            <p className="mt-1 text-sm text-slate-500">Comportamiento reciente de ingresos del negocio.</p>
                        </div>
                        <select className="text-sm">
                            <option>Últimos 7 días</option>
                        </select>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.14} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #dbe3ef', boxShadow: '0 12px 32px rgb(15 23 42 / 0.14)' }}
                                    formatter={(value: any) => [`$${value}`, 'Ingresos']}
                                />
                                <Area type="monotone" dataKey="income" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="k-card p-5">
                    <h3 className="k-section-title">Estado de Servicios</h3>
                    <p className="mt-1 text-sm text-slate-500">Distribución de órdenes por estado.</p>
                    <div className="relative mt-4 h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={serviceStatusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={62}
                                    outerRadius={82}
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {serviceStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <span className="block text-2xl font-extrabold text-slate-900">{totalOrders}</span>
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Total</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 space-y-3">
                        {serviceStatusData.map((item, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                                <div className="flex items-center">
                                    <div className="mr-2 h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-slate-600">{item.name}</span>
                                </div>
                                <span className="font-bold text-slate-900">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div>
                <h3 className="mb-3 text-lg font-extrabold text-slate-900">Accesos Rápidos</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        { title: 'Nueva Venta', icon: ShoppingCart, color: 'bg-blue-600', link: '/pos' },
                        { title: 'Inventario', icon: Package, color: 'bg-emerald-600', link: '/inventory' },
                        { title: 'Caja', icon: DollarSign, color: 'bg-slate-700', link: '/cash' },
                        { title: 'Reportes', icon: FileBarChart, color: 'bg-amber-600', link: '/reports' },
                    ].map((action, idx) => {
                        const Icon = action.icon;
                        return (
                            <a href={action.link} key={idx} className="k-card group flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5">
                                <div className={`${action.color} rounded-lg p-3 text-white shadow-sm transition-transform group-hover:scale-105`}>
                                    <Icon size={23} />
                                </div>
                                <div>
                                    <h4 className="font-extrabold text-slate-800 transition-colors group-hover:text-blue-700">{action.title}</h4>
                                    <p className="text-xs font-medium text-slate-500">Ir a módulo</p>
                                </div>
                            </a>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
