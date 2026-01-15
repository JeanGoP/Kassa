import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ShoppingCart, Package, DollarSign, FileBarChart } from 'lucide-react';

const Dashboard = () => {
    const { user } = useAuth();

    const cards = [
        { title: 'Nueva Venta', icon: ShoppingCart, link: '/pos', color: 'bg-blue-500' },
        { title: 'Inventario', icon: Package, link: '/inventory', color: 'bg-green-500' },
        { title: 'Gestión de Caja', icon: DollarSign, link: '/cash', color: 'bg-purple-500' },
        { title: 'Reportes', icon: FileBarChart, link: '/reports', color: 'bg-orange-500' },
    ];

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8 text-slate-800">Bienvenido, {user?.email}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, index) => {
                    const Icon = card.icon;
                    return (
                        <Link 
                            key={index} 
                            to={card.link}
                            className={`${card.color} text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow flex flex-col items-center justify-center h-40`}
                        >
                            <Icon size={48} className="mb-4 opacity-80" />
                            <span className="text-xl font-bold">{card.title}</span>
                        </Link>
                    );
                })}
            </div>
            
            <div className="mt-12 bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4 text-slate-700">Resumen Rápido</h2>
                <p className="text-gray-500">Seleccione una opción del menú para comenzar a operar.</p>
                {/* Add charts or stats here later */}
            </div>
        </div>
    );
};

export default Dashboard;
