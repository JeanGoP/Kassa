import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Package, Search, Save, MapPin } from 'lucide-react';

interface Branch {
    id: number;
    name: string;
}

interface Product {
    id: number;
    name: string;
    sku: string;
}

interface StockInfo {
    quantity: number;
    cost: number;
}

const StockAdjustments = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    
    const [currentStock, setCurrentStock] = useState<StockInfo | null>(null);
    
    const [newQuantity, setNewQuantity] = useState<number>(0);
    const [newCost, setNewCost] = useState<number>(0);
    const [reason, setReason] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await api.get('/branches');
                setBranches(res.data);
                if (res.data.length > 0) setSelectedBranchId(res.data[0].id);
            } catch (error) {
                console.error("Error fetching branches", error);
            }
        };
        fetchBranches();
    }, []);

    useEffect(() => {
        if (searchTerm.length > 2 && selectedBranchId) {
            const delaySearch = setTimeout(async () => {
                try {
                    const res = await api.get(`/sales/products?search=${searchTerm}&branchId=${selectedBranchId}`);
                    setProducts(res.data);
                } catch (error) {
                    console.error("Error searching products", error);
                }
            }, 500);
            return () => clearTimeout(delaySearch);
        } else {
            setProducts([]);
        }
    }, [searchTerm, selectedBranchId]);

    const handleProductSelect = async (product: Product) => {
        setSelectedProduct(product);
        setSearchTerm('');
        setProducts([]);
        
        // Fetch current stock
        try {
            // We reuse inventory endpoint but filter by product in client or request specific endpoint if available.
            // Since we don't have getStockByProduct endpoint, we'll assume 0 if not found in a quick check,
            // OR better, we call inventory?branchId=X and find the item.
            // Actually, the sales/products endpoint usually returns current stock in the DTO.
            // Let's check ProductDto from SalesController response.
            // It has StockQuantity (aggregate or specific? SalesController:40 uses GetAllProductsAsync(branchId))
            // ProductService:43 returns StockQuantity specific to branch if branchId is provided.
            // But it doesn't return Cost (security/business logic).
            // So we need to fetch specific stock info including cost.
            
            const res = await api.get(`/inventory?branchId=${selectedBranchId}`);
            const stockItem = res.data.find((s: any) => s.productId === product.id);
            
            if (stockItem) {
                setCurrentStock({ quantity: stockItem.quantity, cost: stockItem.cost });
                setNewQuantity(stockItem.quantity);
                setNewCost(stockItem.cost);
            } else {
                setCurrentStock({ quantity: 0, cost: 0 });
                setNewQuantity(0);
                setNewCost(0);
            }
        } catch (error) {
            console.error("Error fetching stock details", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct || !selectedBranchId) return;

        setLoading(true);
        try {
            await api.post('/inventory/adjust', {
                productId: selectedProduct.id,
                branchId: selectedBranchId,
                quantity: newQuantity,
                cost: newCost,
                reason
            });
            setSuccess('Ajuste realizado correctamente');
            setCurrentStock({ quantity: newQuantity, cost: newCost });
            setReason('');
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            console.error("Error adjusting stock", error);
            alert("Error al realizar el ajuste");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Package className="text-blue-600" /> Ajustes de Inventario
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Panel: Selection */}
                <div className="bg-white p-6 rounded-xl shadow-md space-y-6 md:col-span-1">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sucursal</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                            <select
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={selectedBranchId ?? ''}
                                onChange={(e) => {
                                    setSelectedBranchId(Number(e.target.value));
                                    setSelectedProduct(null);
                                    setCurrentStock(null);
                                }}
                            >
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Buscar Producto</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Nombre o SKU..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {products.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {products.map(p => (
                                        <button
                                            key={p.id}
                                            className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm"
                                            onClick={() => handleProductSelect(p)}
                                        >
                                            <div className="font-medium">{p.name}</div>
                                            <div className="text-xs text-gray-500">{p.sku}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Adjustment Form */}
                <div className="bg-white p-6 rounded-xl shadow-md md:col-span-2">
                    {selectedProduct ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="border-b pb-4">
                                <h3 className="text-lg font-semibold text-slate-800">{selectedProduct.name}</h3>
                                <p className="text-sm text-gray-500">SKU: {selectedProduct.sku}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="text-sm text-gray-500 mb-1">Stock Actual</div>
                                    <div className="text-2xl font-bold text-slate-700">{currentStock?.quantity ?? 0}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="text-sm text-gray-500 mb-1">Costo Actual</div>
                                    <div className="text-2xl font-bold text-slate-700">
                                        ${(currentStock?.cost ?? 0).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nueva Cantidad</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newQuantity || ''}
                                        onChange={(e) => setNewQuantity(Number(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nuevo Costo</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newCost || ''}
                                        onChange={(e) => setNewCost(Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Motivo del ajuste</label>
                                <textarea
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                                    placeholder="Explique la razón del cambio..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    required
                                />
                            </div>

                            {success && (
                                <div className="bg-green-100 text-green-700 p-3 rounded-lg flex items-center gap-2">
                                    <Package size={18} /> {success}
                                </div>
                            )}

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? 'Guardando...' : <><Save size={18} /> Guardar Ajuste</>}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 p-12">
                            <Package size={48} className="mb-4 opacity-20" />
                            <p>Seleccione un producto para realizar el ajuste</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StockAdjustments;