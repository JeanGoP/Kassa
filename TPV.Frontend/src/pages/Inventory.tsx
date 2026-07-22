import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Package, AlertTriangle, Edit, Save, X, MapPin, Search } from 'lucide-react';

interface StockItem {
    id: number;
    productId: number;
    productName: string;
    quantity: number;
    minStockLevel: number;
    maxStockLevel: number;
    sku: string;
    branchId: number;
    branchName: string;
    cost: number;
}

interface Branch {
    id: number;
    name: string;
}

const Inventory = () => {
    const [stock, setStock] = useState<StockItem[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<StockItem | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
    const [inventorySearch, setInventorySearch] = useState('');

    useEffect(() => {
        const init = async () => {
            try {
                const res = await api.get('/branches');
                const branchList: Branch[] = res.data;
                setBranches(branchList);
                const initialBranchId = branchList.length > 0 ? branchList[0].id : 1;
                setSelectedBranchId(initialBranchId);
                await fetchData(initialBranchId);
            } catch (error) {
                console.error(error);
                setLoading(false);
            }
        };
        init();
    }, []);

    const fetchData = async (branchId: number) => {
        try {
            const [stockRes, alertsRes] = await Promise.all([
                api.get(`/inventory?branchId=${branchId}`),
                api.get(`/inventory/alerts?branchId=${branchId}`)
            ]);
            setStock(stockRes.data);
            setAlerts(alertsRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (item: StockItem) => {
        setEditingItem({ ...item });
    };

    const handleCancelEdit = () => {
        setEditingItem(null);
    };

    const handleSaveEdit = async () => {
        if (!editingItem || selectedBranchId === null) return;
        try {
            await api.put(`/inventory/${editingItem.productId}`, {
                branchId: selectedBranchId,
                quantity: editingItem.quantity,
                minStockLevel: editingItem.minStockLevel,
                maxStockLevel: editingItem.maxStockLevel
            });
            setEditingItem(null);
            await fetchData(selectedBranchId);
        } catch (error) {
            console.error("Error updating stock", error);
            alert("Error al actualizar el stock");
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingItem) return;
        const { name, value } = e.target;
        setEditingItem({ ...editingItem, [name]: parseInt(value) || 0 });
    };

    const handleBranchChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = parseInt(e.target.value);
        setSelectedBranchId(id);
        await fetchData(id);
    };

    const filteredStock = stock.filter(item => {
        const q = inventorySearch.toLowerCase().trim();
        if (!q) return true;
        const name = (item.productName || '').toLowerCase();
        const sku = (item.sku || '').toLowerCase();
        return name.includes(q) || sku.includes(q);
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Package className="text-slate-700" />
                    <h2 className="font-bold text-xl text-slate-800">Inventario</h2>
                </div>
                {branches.length > 0 && (
                    <div className="flex items-center gap-2">
                        <MapPin size={18} className="text-slate-500" />
                        <select
                            value={selectedBranchId ?? ''}
                            onChange={handleBranchChange}
                            className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Alerts Section */}
            {alerts.length > 0 && (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded shadow-sm">
                    <div className="flex items-center mb-2">
                        <AlertTriangle className="text-orange-500 mr-2" />
                        <h3 className="font-bold text-orange-700">Alertas de Stock Bajo</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {alerts.map((alert: any, idx: number) => (
                            <div key={idx} className="text-sm text-orange-800 bg-white p-2 rounded border border-orange-100">
                                <strong>{alert.productName}</strong>: {alert.currentStock} (Min: {alert.minStockLevel})
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Inventory Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="font-bold text-lg flex items-center">
                        <Package className="mr-2" /> Inventario General
                    </h2>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={inventorySearch}
                            onChange={(e) => setInventorySearch(e.target.value)}
                            placeholder="Buscar por nombre o SKU..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-sm font-semibold">
                            <tr>
                                <th className="p-4 border-b">Producto</th>
                                <th className="p-4 border-b">SKU</th>
                                <th className="p-4 border-b">Sucursal</th>
                                <th className="p-4 border-b text-center">Cantidad</th>
                                <th className="p-4 border-b text-center">Min</th>
                                <th className="p-4 border-b text-center">Max</th>
                                <th className="p-4 border-b text-center">Costo Promedio</th>
                                <th className="p-4 border-b text-center">Estado</th>
                                <th className="p-4 border-b text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700">
                            {filteredStock.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 border-b last:border-0">
                                    <td className="p-4">{item.productName}</td>
                                    <td className="p-4 text-sm text-gray-500">{item.sku}</td>
                                    <td className="p-4 text-sm text-gray-600">{item.branchName}</td>
                                    
                                    {editingItem && editingItem.id === item.id ? (
                                        <>
                                            <td className="p-4 text-center">
                                                <input 
                                                    type="number" 
                                                    name="quantity"
                                                    value={editingItem.quantity || ''} 
                                                    onChange={handleChange}
                                                    className="w-20 p-1 border rounded text-center"
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <input 
                                                    type="number" 
                                                    name="minStockLevel"
                                                    value={editingItem.minStockLevel} 
                                                    onChange={handleChange}
                                                    className="w-20 p-1 border rounded text-center"
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <input 
                                                    type="number" 
                                                    name="maxStockLevel"
                                                    value={editingItem.maxStockLevel} 
                                                    onChange={handleChange}
                                                    className="w-20 p-1 border rounded text-center"
                                                />
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="p-4 text-center font-medium">{item.quantity}</td>
                                            <td className="p-4 text-center text-gray-500">{item.minStockLevel}</td>
                                            <td className="p-4 text-center text-gray-500">{item.maxStockLevel}</td>
                                        </>
                                    )}

                                    <td className="p-4 text-center font-medium text-gray-700">
                                        ${(item.cost || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                                    </td>

                                    <td className="p-4 text-center">
                                        {item.quantity <= item.minStockLevel ? (
                                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold">Bajo Stock</span>
                                        ) : (
                                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">OK</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        {editingItem && editingItem.id === item.id ? (
                                            <div className="flex justify-center space-x-2">
                                                <button onClick={handleSaveEdit} className="text-green-600 hover:text-green-800 p-1">
                                                    <Save size={18} />
                                                </button>
                                                <button onClick={handleCancelEdit} className="text-red-600 hover:text-red-800 p-1">
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button onClick={() => handleEditClick(item)} className="text-blue-600 hover:text-blue-800 p-1">
                                                <Edit size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Inventory;
