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
    'FINALIZADA': '#10b981', // emerald-500
    'EN PROCESO': '#3b82f6',  // blue-500
    'PENDIENTE': '#f59e0b',   // amber-500
    'CANCELADA': '#ef4444',   // red-500
    'EN DIAGNOSTICO': '#8b5cf6', // violet-500
    'EN ESPERA': '#64748b',   // slate-500
    'DEFAULT': '#94a3b8'      // slate-400
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

    // Transform data for charts
    const revenueData = data?.revenueExpenseStats?.map(stat => ({
        name: new Date(stat.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
        income: stat.income,
        expense: stat.expense
    })) || [];

    const serviceStatusData = data?.orderStatusStats?.map(stat => ({
        name: stat.status,
        value: stat.count,
        color: STATUS_COLORS[stat.status] || STATUS_COLORS['DEFAULT']
    })) || [];

    const totalOrders = serviceStatusData.reduce((acc, curr) => acc + curr.value, 0);

    // Metric Card Component
    const MetricCard = ({ title, value, change, icon: Icon, trend }: any) => (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
                </div>
                <div className={`p-2 rounded-lg ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <Icon size={20} />
                </div>
            </div>
            <div className="flex items-center text-sm">
                {change && (
                    <span className={`flex items-center font-medium ${trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {trend === 'up' ? <ArrowUpRight size={16} className="mr-1" /> : <ArrowDownRight size={16} className="mr-1" />}
                        {change}
                    </span>
                )}
                <span className="text-slate-400 ml-2">vs mes anterior</span>
            </div>
        </div>
    );

    if (loading) {
        return <div className="p-6 flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
    }

    if (error) {
        return (
            <div className="p-6 flex flex-col justify-center items-center h-full text-center">
                <div className="text-red-500 mb-2">
                    <Activity size={48} className="mx-auto mb-2" />
                    <h3 className="text-lg font-bold">Error de conexión</h3>
                </div>
                <p className="text-slate-500">{error}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Panel de Control</h1>
                    <p className="text-slate-500 mt-1">Bienvenido de nuevo, {user?.firstName || user?.email}</p>
                </div>
                <div className="flex items-center space-x-3 mt-4 md:mt-0">
                    <button className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium text-sm transition-colors">
                        <Calendar size={16} className="mr-2" />
                        Últimos 30 días
                    </button>
                    <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors shadow-sm shadow-blue-200">
                        <TrendingUp size={16} className="mr-2" />
                        Ver Reportes
                    </button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800">Tendencia de Ingresos</h3>
                        <select className="bg-slate-50 border border-slate-200 rounded-lg text-sm p-2 outline-none focus:ring-2 focus:ring-blue-100">
                            <option>Últimos 7 días</option>
                        </select>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `$${value}`} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any) => [`$${value}`, 'Ingresos']}
                                />
                                <Area type="monotone" dataKey="income" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Service Status Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Estado de Servicios</h3>
                    <div className="h-64 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={serviceStatusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {serviceStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <span className="block text-2xl font-bold text-slate-800">{totalOrders}</span>
                                <span className="text-xs text-slate-500 uppercase tracking-wider">Total</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 space-y-3">
                        {serviceStatusData.map((item, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                                <div className="flex items-center">
                                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                                    <span className="text-slate-600">{item.name}</span>
                                </div>
                                <span className="font-medium text-slate-800">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <h3 className="text-lg font-bold text-slate-800 mt-8 mb-4">Accesos Rápidos</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { title: 'Nueva Venta', icon: ShoppingCart, color: 'bg-blue-500', link: '/pos' },
                    { title: 'Inventario', icon: Package, color: 'bg-emerald-500', link: '/inventory' },
                    { title: 'Caja', icon: DollarSign, color: 'bg-violet-500', link: '/cash' },
                    { title: 'Reportes', icon: FileBarChart, color: 'bg-amber-500', link: '/reports' },
                ].map((action, idx) => {
                    const Icon = action.icon;
                    return (
                        <a href={action.link} key={idx} className="group bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all flex items-center space-x-4">
                            <div className={`${action.color} p-3 rounded-lg text-white shadow-sm group-hover:scale-110 transition-transform`}>
                                <Icon size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{action.title}</h4>
                                <p className="text-xs text-slate-400">Ir a módulo</p>
                            </div>
                        </a>
                    );
                })}
            </div>
        </div>
    );
};

export default Dashboard;
