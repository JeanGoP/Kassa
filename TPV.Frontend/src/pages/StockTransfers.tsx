import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { ArrowRightLeft, Search, Save, MapPin, ArrowRight } from 'lucide-react';

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

const StockTransfers = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [sourceBranchId, setSourceBranchId] = useState<number | null>(null);
    const [targetBranchId, setTargetBranchId] = useState<number | null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    
    const [sourceStock, setSourceStock] = useState<StockInfo | null>(null);
    
    const [transferQuantity, setTransferQuantity] = useState<number>(0);
    const [notes, setNotes] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await api.get('/branches');
                setBranches(res.data);
                if (res.data.length > 1) {
                    setSourceBranchId(res.data[0].id);
                    setTargetBranchId(res.data[1].id);
                }
            } catch (error) {
                console.error("Error fetching branches", error);
            }
        };
        fetchBranches();
    }, []);

    useEffect(() => {
        if (searchTerm.length > 2 && sourceBranchId) {
            const delaySearch = setTimeout(async () => {
                try {
                    const res = await api.get(`/sales/products?search=${searchTerm}&branchId=${sourceBranchId}`);
                    setProducts(res.data);
                } catch (error) {
                    console.error("Error searching products", error);
                }
            }, 500);
            return () => clearTimeout(delaySearch);
        } else {
            setProducts([]);
        }
    }, [searchTerm, sourceBranchId]);

    const handleProductSelect = async (product: Product) => {
        setSelectedProduct(product);
        setSearchTerm('');
        setProducts([]);
        
        try {
            const res = await api.get(`/inventory?branchId=${sourceBranchId}`);
            const stockItem = res.data.find((s: any) => s.productId === product.id);
            
            if (stockItem) {
                setSourceStock({ quantity: stockItem.quantity, cost: stockItem.cost });
                setTransferQuantity(1);
            } else {
                setSourceStock({ quantity: 0, cost: 0 });
                setTransferQuantity(0);
            }
        } catch (error) {
            console.error("Error fetching stock details", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct || !sourceBranchId || !targetBranchId) return;
        
        if (sourceBranchId === targetBranchId) {
            setError('La sucursal de origen y destino no pueden ser la misma');
            return;
        }

        if (transferQuantity > (sourceStock?.quantity || 0)) {
            setError('La cantidad a transferir supera el stock disponible');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await api.post('/inventory/transfer', {
                productId: selectedProduct.id,
                sourceBranchId,
                targetBranchId,
                quantity: transferQuantity,
                notes
            });
            setSuccess('Traslado realizado correctamente');
            
            // Refresh source stock
            const newQty = (sourceStock?.quantity || 0) - transferQuantity;
            setSourceStock(prev => prev ? { ...prev, quantity: newQty } : null);
            
            setNotes('');
            setTransferQuantity(0);
            setTimeout(() => setSuccess(''), 3000);
        } catch (error: any) {
            console.error("Error transferring stock", error);
            setError(error.response?.data || "Error al realizar el traslado");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <ArrowRightLeft className="text-blue-600" /> Traslados entre Sucursales
            </h1>

            <div className="bg-white p-6 rounded-xl shadow-md space-y-8">
                {/* Branch Selection */}
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Origen</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                            <select
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={sourceBranchId ?? ''}
                                onChange={(e) => {
                                    setSourceBranchId(Number(e.target.value));
                                    setSelectedProduct(null);
                                    setSourceStock(null);
                                }}
                            >
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-6">
                        <ArrowRight className="text-gray-400 hidden md:block" />
                    </div>

                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Destino</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                            <select
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={targetBranchId ?? ''}
                                onChange={(e) => setTargetBranchId(Number(e.target.value))}
                            >
                                {branches.map(b => (
                                    <option key={b.id} value={b.id} disabled={b.id === sourceBranchId}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Product Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Buscar Producto en Origen</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input
                            type="text"
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Nombre o SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={!sourceBranchId}
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

                {/* Transfer Details */}
                {selectedProduct && (
                    <form onSubmit={handleSubmit} className="space-y-6 border-t pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800">{selectedProduct.name}</h3>
                                <p className="text-sm text-gray-500">SKU: {selectedProduct.sku}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-500">Disponible en Origen</div>
                                <div className="text-xl font-bold text-slate-700">{sourceStock?.quantity ?? 0} unid.</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad a Trasladar</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={transferQuantity || ''}
                                    onChange={(e) => setTransferQuantity(Number(e.target.value))}
                                    min="1"
                                    max={sourceStock?.quantity ?? 0}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Notas / Observaciones</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Opcional..."
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="bg-green-100 text-green-700 p-3 rounded-lg flex items-center gap-2">
                                <ArrowRightLeft size={18} /> {success}
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={loading || (sourceStock?.quantity || 0) <= 0}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading ? 'Procesando...' : <><Save size={18} /> Confirmar Traslado</>}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default StockTransfers;