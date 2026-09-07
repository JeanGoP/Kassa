import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
    ShoppingCart,
    Package,
    DollarSign,
    FileBarChart,
    Users,
    CalendarDays,
    Activity,
    ClipboardList,
    FileText,
    ArrowRight,
    TriangleAlert
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
    Cell,
    Legend
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
    'FINALIZADA': '#087f5b',
    'EN PROCESO': '#155eef',
    'PENDIENTE': '#b45309',
    'CANCELADA': '#c81e1e',
    'EN DIAGNOSTICO': '#0f766e',
    'EN ESPERA': '#68778a',
    'DEFAULT': '#8996a6'
};

interface MetricCardProps {
    title: string;
    value: string | number;
    helper: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    tone: 'blue' | 'teal' | 'amber' | 'slate';
}

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

    const todayLabel = new Intl.DateTimeFormat('es-CO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    }).format(new Date());

    const metricTones = {
        blue: 'border-blue-200 bg-blue-50 text-blue-700',
        teal: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        amber: 'border-amber-200 bg-amber-50 text-amber-700',
        slate: 'border-slate-200 bg-slate-100 text-slate-700'
    };

    const MetricCard = ({ title, value, helper, icon: Icon, tone }: MetricCardProps) => (
        <div className="k-card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase text-slate-500">{title}</p>
                    <h3 className="mt-2 text-2xl font-extrabold text-slate-950">{value}</h3>
                    <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p>
                </div>
                <div className={`rounded-md border p-2.5 ${metricTones[tone]}`}>
                    <Icon size={21} />
                </div>
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
                    <p className="mb-1 text-xs font-bold uppercase text-blue-700">Vista general</p>
                    <h1 className="k-page-title">Buenos días, {user?.firstName || 'equipo'}</h1>
                    <p className="k-page-subtitle first-letter:uppercase">{todayLabel}. Este es el estado actual de la operación.</p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Link to="/appointments" className="k-button-secondary w-full px-4 py-2 text-sm sm:w-auto"><CalendarDays size={16} />Agenda</Link>
                    <Link to="/reports" className="k-button-primary w-full px-4 py-2 text-sm sm:w-auto"><FileBarChart size={16} />Ver reportes</Link>
                </div>
            </div>

            {(data?.lowStockCount || 0) > 0 && (
                <Link to="/inventory" className="flex items-center justify-between gap-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 transition hover:border-amber-300">
                    <span className="flex items-center gap-3 text-sm font-semibold"><TriangleAlert size={20} className="shrink-0 text-amber-700" />Hay {data?.lowStockCount} productos con inventario bajo.</span>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-extrabold text-amber-800">Revisar <ArrowRight size={15} /></span>
                </Link>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    title="Ventas"
                    value={`$${(data?.totalRevenue || 0).toLocaleString('es-CO')}`}
                    helper="Ingresos del periodo"
                    icon={DollarSign}
                    tone="blue"
                />
                <MetricCard
                    title="Taller"
                    value={data?.openOrders || 0}
                    helper="Órdenes activas"
                    icon={Activity}
                    tone="teal"
                />
                <MetricCard
                    title="Inventario bajo"
                    value={data?.lowStockCount || 0}
                    helper="Productos por revisar"
                    icon={Package}
                    tone="amber"
                />
                <MetricCard
                    title="Clientes"
                    value={data?.newCustomersCount || 0}
                    helper="Nuevos registros"
                    icon={Users}
                    tone="slate"
                />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="k-card p-5 xl:col-span-2">
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h3 className="k-section-title">Flujo comercial</h3>
                            <p className="mt-1 text-sm text-slate-500">Ingresos y egresos recientes.</p>
                        </div>
                        <span className="rounded-md bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">Últimos 7 días</span>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#155eef" stopOpacity={0.12} />
                                        <stop offset="95%" stopColor="#155eef" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#b45309" stopOpacity={0.08} />
                                        <stop offset="95%" stopColor="#b45309" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e8ef" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#68778a', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#68778a', fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '7px', border: '1px solid #d9e0e8', boxShadow: '0 12px 32px rgb(15 23 42 / 0.12)' }}
                                />
                                <Legend formatter={(value) => value === 'income' ? 'Ingresos' : 'Egresos'} />
                                <Area type="monotone" dataKey="income" stroke="#155eef" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" />
                                <Area type="monotone" dataKey="expense" stroke="#b45309" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="k-card p-5">
                    <h3 className="k-section-title">Estado del taller</h3>
                    <p className="mt-1 text-sm text-slate-500">Órdenes agrupadas por estado.</p>
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

            <section>
                <div className="mb-3 flex items-end justify-between gap-3">
                    <div><h3 className="text-base font-extrabold text-slate-900">Acciones frecuentes</h3><p className="mt-1 text-sm text-slate-500">Empiece una tarea sin recorrer el menú.</p></div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                        { title: 'Nueva venta', helper: 'Facturar productos', icon: ShoppingCart, tone: 'text-blue-700 bg-blue-50', link: '/pos' },
                        { title: 'Nueva cotización', helper: 'Preparar propuesta', icon: FileText, tone: 'text-emerald-700 bg-emerald-50', link: '/quotations' },
                        { title: 'Agenda', helper: 'Revisar disponibilidad', icon: CalendarDays, tone: 'text-violet-700 bg-violet-50', link: '/appointments' },
                        { title: 'Taller', helper: 'Gestionar expedientes', icon: ClipboardList, tone: 'text-amber-700 bg-amber-50', link: '/service-orders' },
                        { title: 'Inventario', helper: 'Consultar existencias', icon: Package, tone: 'text-slate-700 bg-slate-100', link: '/inventory' },
                    ].map((action) => {
                        const Icon = action.icon;
                        return (
                            <Link to={action.link} key={action.link} className="k-card group flex items-center gap-3 p-4 transition hover:border-slate-300 hover:shadow-md">
                                <div className={`${action.tone} rounded-md p-2.5`}>
                                    <Icon size={21} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="truncate text-sm font-extrabold text-slate-800 transition-colors group-hover:text-blue-700">{action.title}</h4>
                                    <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{action.helper}</p>
                                </div>
                                <ArrowRight size={16} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
                            </Link>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};

export default Dashboard;
