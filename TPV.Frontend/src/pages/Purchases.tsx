import { useEffect, useState } from 'react';
import api from '../api/axios';
import { ArrowDownCircle, Plus, Calendar, User, Search, Printer, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Purchase {
    id: number;
    supplierName: string;
    date: string;
    referenceNumber: string;
    totalAmount: number;
    status: string;
}

const Purchases = () => {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchPurchases(searchTerm);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const fetchPurchases = async (search: string = '') => {
        try {
            const response = await api.get(`/purchases?search=${search}`);
            setPurchases(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        const confirmed = window.confirm('¿Está seguro de eliminar esta entrada? Esto ajustará el inventario.');
        if (!confirmed) return;

        try {
            setDeletingId(id);
            await api.delete(`/purchases/${id}`);
        } catch (error: any) {
            console.error(error);
        } finally {
            setDeletingId(null);
            await fetchPurchases(searchTerm);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="font-bold text-2xl flex items-center text-slate-800">
                    <ArrowDownCircle className="mr-2" /> Entradas de Mercancía
                </h2>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por proveedor o referencia..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Link 
                        to="/purchases/create"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-lg shadow-blue-500/30 transition-all whitespace-nowrap"
                    >
                        <Plus size={20} className="mr-1" /> Nueva Entrada
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold tracking-wider">
                            <tr>
                                <th className="p-4 border-b">Fecha</th>
                                <th className="p-4 border-b">Referencia</th>
                                <th className="p-4 border-b">Proveedor</th>
                                <th className="p-4 border-b text-right">Total</th>
                                <th className="p-4 border-b text-center">Estado</th>
                                <th className="p-4 border-b text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 divide-y divide-gray-100">
                            {purchases.map((item: Purchase) => (
                                <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="p-4 text-sm">
                                        <div className="flex items-center">
                                            <Calendar size={14} className="mr-2 text-slate-400" />
                                            {new Date(item.date).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="p-4 font-medium">{item.referenceNumber}</td>
                                    <td className="p-4 text-sm">
                                        <div className="flex items-center">
                                            <User size={14} className="mr-2 text-slate-400" />
                                            {item.supplierName}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right font-bold text-slate-800">
                                        ${item.totalAmount.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Link 
                                                to={`/purchases/print/${item.id}`} 
                                                target="_blank"
                                                className="text-gray-600 hover:text-blue-600 inline-block p-2 rounded-full hover:bg-blue-50 transition-colors"
                                                title="Imprimir entrada"
                                            >
                                                <Printer size={18} />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                disabled={deletingId === item.id}
                                                className="text-red-600 hover:text-red-700 inline-block p-2 rounded-full hover:bg-red-50 transition-colors disabled:opacity-50"
                                                title="Eliminar entrada"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {purchases.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400">
                                        No hay entradas registradas.
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

export default Purchases;
