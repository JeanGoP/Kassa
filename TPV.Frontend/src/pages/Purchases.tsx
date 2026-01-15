import { useEffect, useState } from 'react';
import api from '../api/axios';
import { ArrowDownCircle, Plus, Calendar, User } from 'lucide-react';
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

    useEffect(() => {
        fetchPurchases();
    }, []);

    const fetchPurchases = async () => {
        try {
            const response = await api.get('/purchases');
            setPurchases(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="font-bold text-2xl flex items-center text-slate-800">
                    <ArrowDownCircle className="mr-2" /> Entradas de Mercancía
                </h2>
                <Link 
                    to="/purchases/create"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-lg shadow-blue-500/30 transition-all"
                >
                    <Plus size={20} className="mr-1" /> Nueva Entrada
                </Link>
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
                                {/* <th className="p-4 border-b text-center">Acciones</th> */}
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
                                    {/* <td className="p-4 text-center">
                                        <button className="text-blue-600 hover:bg-blue-100 p-2 rounded-full transition-colors">
                                            <Eye size={18} />
                                        </button>
                                    </td> */}
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
