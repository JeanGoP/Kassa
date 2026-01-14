import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const Cash = () => {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState('');

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/cash/status');
            setStatus(res.data);
        } catch (error) {
            setStatus(null);
        } finally {
            setLoading(false);
        }
    };

    const handleOpen = async () => {
        try {
            await api.post('/cash/open', { branchId: 1, initialBalance: parseFloat(amount) });
            fetchStatus();
        } catch (error) {
            alert("Error opening session");
        }
    };

    const handleClose = async () => {
        try {
            await api.post('/cash/close', { finalBalance: parseFloat(amount) });
            fetchStatus();
        } catch (error) {
            alert("Error closing session");
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Gestión de Caja</h2>
            
            {status ? (
                <div className="space-y-6">
                    <div className="bg-green-50 p-4 rounded border border-green-200">
                        <h3 className="font-bold text-green-800 text-lg">Sesión Activa</h3>
                        <p className="mt-2"><strong>Inicio:</strong> {new Date(status.startTime).toLocaleString()}</p>
                        <p><strong>Saldo Inicial:</strong> ${status.initialBalance}</p>
                        <p><strong>Total Ventas:</strong> ${status.totalSales}</p>
                        <p><strong>Saldo Esperado:</strong> ${status.expectedBalance}</p>
                    </div>

                    <div className="border-t pt-4">
                        <label className="block text-gray-700 font-bold mb-2">Saldo de Cierre (Real)</label>
                        <input 
                            type="number" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full p-2 border rounded mb-4"
                            placeholder="0.00"
                        />
                        <button 
                            onClick={handleClose}
                            className="w-full bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700"
                        >
                            Cerrar Caja
                        </button>
                    </div>
                </div>
            ) : (
                <div>
                    <div className="bg-yellow-50 p-4 rounded border border-yellow-200 mb-6">
                        <p className="text-yellow-800">No hay sesión activa. Debe abrir caja para realizar ventas.</p>
                    </div>
                    <label className="block text-gray-700 font-bold mb-2">Saldo Inicial</label>
                    <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full p-2 border rounded mb-4"
                        placeholder="0.00"
                    />
                    <button 
                        onClick={handleOpen}
                        className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700"
                    >
                        Abrir Caja
                    </button>
                </div>
            )}
        </div>
    );
};

export default Cash;