import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Trash2, Save, ArrowLeft, Calendar, FileText, MapPin } from 'lucide-react';

interface Product {
    id: number;
    name: string;
    sku: string;
    cost: number;
    ivaRate: number;
}

interface Supplier {
    id: number;
    name: string;
}

interface Branch {
    id: number;
    name: string;
}

interface PurchaseItem {
    productId: number;
    productName: string;
    quantity: number;
    unitCost: number;
    taxRate: number;
}

const CreatePurchase = () => {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState('');
    const [branches, setBranches] = useState<Branch[]>([]);
    
    // Form State
    const [supplierId, setSupplierId] = useState<number | ''>('');
    const [branchId, setBranchId] = useState<number | ''>('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [referenceNumber, setReferenceNumber] = useState('');
    const [freight, setFreight] = useState<number>(0);
    const [details, setDetails] = useState<PurchaseItem[]>([]);

    useEffect(() => {
        const init = async () => {
            try {
                const [suppliersRes, branchesRes] = await Promise.all([
                    api.get('/suppliers'),
                    api.get('/branches')
                ]);
                setSuppliers(suppliersRes.data);
                setBranches(branchesRes.data);
                if (branchesRes.data && branchesRes.data.length > 0) {
                    setBranchId(branchesRes.data[0].id);
                }
            } catch (error) {
                console.error(error);
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (search.length > 1) {
            fetchProducts();
        } else {
            setProducts([]);
        }
    }, [search]);

    const fetchProducts = async () => {
        try {
            const response = await api.get(`/sales/products?search=${search}`);
            setProducts(response.data);
        } catch (error) {
            console.error(error);
        }
    };

    const addProduct = (product: Product) => {
        const existing = details.find(d => d.productId === product.id);
        if (existing) {
            alert('El producto ya está en la lista');
            return;
        }
        setDetails([...details, {
            productId: product.id,
            productName: product.name,
            quantity: 1,
            unitCost: product.cost || 0,
            taxRate: product.ivaRate || 0
        }]);
        setSearch('');
        setProducts([]);
    };

    const updateDetail = (index: number, field: 'quantity' | 'unitCost' | 'taxRate', value: number) => {
        const newDetails = [...details];
        newDetails[index] = { ...newDetails[index], [field]: value };
        setDetails(newDetails);
    };

    const removeDetail = (index: number) => {
        setDetails(details.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierId || !branchId || details.length === 0) {
            alert('Seleccione un proveedor, una sucursal y agregue productos');
            return;
        }

        try {
            const payload = {
                supplierId,
                branchId,
                date,
                referenceNumber,
                freight,
                details: details.map(d => ({
                    productId: d.productId,
                    quantity: d.quantity,
                    unitCost: d.unitCost,
                    taxRate: d.taxRate
                }))
            };
            await api.post('/purchases', payload);
            navigate('/purchases');
        } catch (error: any) {
            console.error(error);
            const message = error.response?.data?.message || 'Error al guardar la entrada';
            const details = error.response?.data?.details ? `\nDetalles: ${error.response.data.details}` : '';
            alert(`${message}${details}`);
        }
    };

    const totalAmount = details.reduce((sum, item) => {
        const subTotal = item.quantity * item.unitCost;
        const tax = subTotal * (item.taxRate / 100);
        return sum + subTotal + tax;
    }, 0) + (freight || 0);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center space-x-4 mb-6">
                <button 
                    onClick={() => navigate('/purchases')}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <h2 className="text-2xl font-bold text-slate-800">Nueva Entrada de Mercancía</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header Info */}
                <div className="bg-white p-6 rounded-xl shadow-md grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                        <select 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={supplierId}
                            onChange={(e) => setSupplierId(Number(e.target.value))}
                            required
                        >
                            <option value="">Seleccione un proveedor</option>
                            {suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            <input 
                                type="date" 
                                className="w-full pl-10 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Referencia / Factura</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 pl-10 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={referenceNumber}
                                onChange={(e) => setReferenceNumber(e.target.value)}
                                placeholder="# Factura / Remisión"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Flete (Valor Global)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                            <input 
                                type="number" 
                                min="0"
                                step="0.01"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 pl-8 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={freight || ''}
                                onChange={(e) => setFreight(Number(e.target.value))}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal / Bodega</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            <select
                                className="w-full pl-10 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={branchId}
                                onChange={(e) => setBranchId(Number(e.target.value))}
                                required
                            >
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Product Search */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Buscar productos para agregar..." 
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {products.length > 0 && (
                            <div className="absolute w-full bg-white border border-gray-200 rounded-b-lg shadow-lg mt-1 z-10 max-h-60 overflow-y-auto">
                                {products.map(p => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => addProduct(p)}
                                        className="w-full text-left px-4 py-2 hover:bg-blue-50 flex justify-between items-center"
                                    >
                                        <span>{p.name} <span className="text-gray-400 text-sm">({p.sku})</span></span>
                                        <Plus size={16} className="text-blue-600" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Items Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-3 border-b">Producto</th>
                                    <th className="p-3 border-b w-32">Cantidad</th>
                                    <th className="p-3 border-b w-32">Costo Unit.</th>
                                    <th className="p-3 border-b w-24">IVA %</th>
                                    <th className="p-3 border-b w-32 text-right">Subtotal</th>
                                    <th className="p-3 border-b w-32 text-right">Total</th>
                                    <th className="p-3 border-b w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {details.map((item, index) => {
                                    const subTotal = item.quantity * item.unitCost;
                                    const taxAmount = subTotal * (item.taxRate / 100);
                                    const total = subTotal + taxAmount;
                                    
                                    return (
                                    <tr key={item.productId} className="hover:bg-gray-50">
                                        <td className="p-3 font-medium">{item.productName}</td>
                                        <td className="p-3">
                                            <input 
                                                type="number" 
                                                min="1"
                                                className="w-full border border-gray-300 rounded px-2 py-1 text-center"
                                                value={item.quantity || ''}
                                                onChange={(e) => updateDetail(index, 'quantity', Number(e.target.value))}
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input 
                                                type="number" 
                                                min="0"
                                                step="0.01"
                                                className="w-full border border-gray-300 rounded px-2 py-1 text-center"
                                                value={item.unitCost || ''}
                                                onChange={(e) => updateDetail(index, 'unitCost', Number(e.target.value))}
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input 
                                                type="number" 
                                                min="0"
                                                max="100"
                                                step="1"
                                                className="w-full border border-gray-300 rounded px-2 py-1 text-center"
                                                value={item.taxRate}
                                                onChange={(e) => updateDetail(index, 'taxRate', Number(e.target.value))}
                                            />
                                        </td>
                                        <td className="p-3 text-right text-gray-600">
                                            ${subTotal.toFixed(2)}
                                        </td>
                                        <td className="p-3 text-right font-bold text-gray-700">
                                            ${total.toFixed(2)}
                                        </td>
                                        <td className="p-3 text-center">
                                            <button 
                                                type="button"
                                                onClick={() => removeDetail(index)}
                                                className="text-red-500 hover:bg-red-100 p-1.5 rounded transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                    );
                                })}
                                {details.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-gray-400">
                                            Agregue productos a la entrada.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot className="bg-gray-50 font-bold text-gray-800">
                                <tr>
                                    <td colSpan={5} className="p-4 text-right">Total:</td>
                                    <td className="p-4 text-right text-lg">${totalAmount.toFixed(2)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button 
                        type="submit" 
                        disabled={details.length === 0 || !supplierId || !branchId}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex items-center font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <Save size={24} className="mr-2" />
                        Guardar Entrada
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreatePurchase;
