import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { 
  Car, 
  ClipboardList, 
  CheckCircle, 
  DollarSign, 
  TrendingUp, 
  Activity 
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

interface OrderStatusStat {
  status: string;
  count: number;
  [key: string]: string | number;
}

interface RevenueExpenseStat {
  date: string;
  income: number;
  expense: number;
}

interface RecentOrder {
  id: number;
  customerName: string;
  vehicleInfo: string;
  status: string;
  total: number;
}

interface DashboardData {
  vehiclesInWorkshop: number;
  openOrders: number;
  completedOrdersToday: number;
  monthlyRevenue: number;
  orderStatusStats: OrderStatusStat[];
  revenueExpenseStats: RevenueExpenseStat[];
  recentOrders: RecentOrder[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const WorkshopDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const response = await api.get('/workshop-dashboard');
        if (isMounted) {
          setData(response.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <div className="p-6">Cargando dashboard...</div>;
  }

  if (!data) {
    return <div className="p-6">No se pudieron cargar los datos.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Activity className="h-6 w-6" />
          Dashboard de Taller
        </h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">Vehículos en Taller</p>
            <p className="text-2xl font-bold text-gray-800">{data.vehiclesInWorkshop}</p>
          </div>
          <Car className="h-8 w-8 text-blue-500 opacity-50" />
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">Órdenes Abiertas</p>
            <p className="text-2xl font-bold text-gray-800">{data.openOrders}</p>
          </div>
          <ClipboardList className="h-8 w-8 text-yellow-500 opacity-50" />
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">Finalizadas Hoy</p>
            <p className="text-2xl font-bold text-gray-800">{data.completedOrdersToday}</p>
          </div>
          <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">Ingresos del Mes</p>
            <p className="text-2xl font-bold text-gray-800">${data.monthlyRevenue.toFixed(2)}</p>
          </div>
          <DollarSign className="h-8 w-8 text-purple-500 opacity-50" />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Estado de Órdenes</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.orderStatusStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name?: string | number; percent?: number }) =>
                    `${name ?? ''} ${(((percent ?? 0) * 100).toFixed(0))}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="status"
                >
                  {data.orderStatusStats.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue vs Expenses Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Ingresos vs Gastos (Últimos 7 días)</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={data.revenueExpenseStats}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="income" name="Ingresos" fill="#82ca9d" />
                <Bar dataKey="expense" name="Gastos" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity List */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Actividad Reciente
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-3 font-medium text-gray-600">Folio</th>
                <th className="p-3 font-medium text-gray-600">Cliente</th>
                <th className="p-3 font-medium text-gray-600">Vehículo</th>
                <th className="p-3 font-medium text-gray-600">Estado</th>
                <th className="p-3 font-medium text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.length > 0 ? (
                data.recentOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">#{order.id}</td>
                    <td className="p-3">{order.customerName}</td>
                    <td className="p-3">{order.vehicleInfo}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium 
                        ${order.status === 'FINALIZADA' ? 'bg-green-100 text-green-800' : 
                          order.status === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' : 
                          order.status === 'CANCELADA' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-3 font-medium">${order.total.toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    No hay órdenes recientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WorkshopDashboard;
