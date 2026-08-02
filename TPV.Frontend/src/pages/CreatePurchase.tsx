import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, MapPin, Plus, ReceiptText, Save, Search, Trash2, Truck } from 'lucide-react';

interface Product {
    id: number;
    name: string;
    sku: string;
    ivaRate: number;
    unitOfMeasure?: string;
}

interface Supplier {
    id: number;
    name: string;
}

interface Branch {
    id: number;
    name: string;
}

interface StockItem {
    productId: number;
    cost: number;
}

interface PurchaseItem {
    productId: number;
    productName: string;
    sku: string;
    quantity: number;
    unitCost: number;
    taxRate: number;
    unitOfMeasure: string;
}

const today = () => new Date().toISOString().split('T')[0];

const money = (value: number) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(Number.isFinite(value) ? value : 0);

const CreatePurchase = () => {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [search, setSearch] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [supplierId, setSupplierId] = useState<number | ''>('');
    const [branchId, setBranchId] = useState<number | ''>('');
    const [date, setDate] = useState(today());
    const [supplierInvoiceDate, setSupplierInvoiceDate] = useState(today());
    const [referenceNumber, setReferenceNumber] = useState('');
    const [freight, setFreight] = useState<number>(0);
    const [freightTaxRate, setFreightTaxRate] = useState<number>(0);
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

                if (branchesRes.data?.length > 0) {
                    setBranchId(branchesRes.data[0].id);
                }
            } catch (error) {
                console.error(error);
            }
        };

        init();
    }, []);

    useEffect(() => {
        const loadStock = async () => {
            if (!branchId) {
                setStockItems([]);
                return;
            }

            try {
                const response = await api.get(`/inventory?branchId=${branchId}`);
                setStockItems(response.data);
            } catch (error) {
                console.error(error);
                setStockItems([]);
            }
        };

        loadStock();
    }, [branchId]);

    useEffect(() => {
        const delay = setTimeout(async () => {
            if (search.trim().length < 2) {
                setProducts([]);
                return;
            }

            try {
                const response = await api.get('/sales/products', {
                    params: {
                        search: search.trim(),
                        branchId: branchId || undefined
                    }
                });
                setProducts(response.data);
            } catch (error) {
                console.error(error);
            }
        }, 300);

        return () => clearTimeout(delay);
    }, [search, branchId]);

    const addProduct = (product: Product) => {
        if (details.some(d => d.productId === product.id)) {
            alert('El articulo ya esta en la entrada.');
            return;
        }

        const stockCost = stockItems.find(item => item.productId === product.id)?.cost ?? 0;
        setDetails(prev => [
            ...prev,
            {
                productId: product.id,
                productName: product.name,
                sku: product.sku,
                quantity: 1,
                unitCost: stockCost,
                taxRate: product.ivaRate || 0,
                unitOfMeasure: product.unitOfMeasure || 'UND'
            }
        ]);
        setSearch('');
        setProducts([]);
    };

    const updateDetail = (index: number, field: 'quantity' | 'unitCost' | 'taxRate', value: number) => {
        setDetails(prev => prev.map((item, itemIndex) =>
            itemIndex === index ? { ...item, [field]: value } : item
        ));
    };

    const removeDetail = (index: number) => {
        setDetails(prev => prev.filter((_, itemIndex) => itemIndex !== index));
    };

    const totals = useMemo(() => {
        const itemsSubTotal = details.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
        const itemsTaxAmount = details.reduce((sum, item) => {
            const subTotal = item.quantity * item.unitCost;
            return sum + subTotal * (item.taxRate / 100);
        }, 0);
        const freightTaxAmount = freight * (freightTaxRate / 100);

        return {
            itemsSubTotal,
            itemsTaxAmount,
            freightTaxAmount,
            total: itemsSubTotal + itemsTaxAmount + freight + freightTaxAmount
        };
    }, [details, freight, freightTaxRate]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!supplierId || !branchId || details.length === 0) {
            alert('Seleccione proveedor, bodega y al menos un articulo.');
            return;
        }

        if (details.some(item => item.quantity <= 0)) {
            alert('Todas las cantidades deben ser mayores a cero.');
            return;
        }

        setIsSaving(true);
        try {
            await api.post('/purchases', {
                supplierId,
                branchId,
                date,
                supplierInvoiceDate,
                referenceNumber,
                freight,
                freightTaxRate,
                details: details.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitCost: item.unitCost,
                    taxRate: item.taxRate
                }))
            });
            navigate('/purchases');
        } catch (error: any) {
            console.error(error);
            const message = error.response?.data?.message || 'Error al guardar la entrada.';
            const detailsMessage = error.response?.data?.details ? `\nDetalles: ${error.response.data.details}` : '';
            alert(`${message}${detailsMessage}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-[1280px] space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/purchases')}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50"
                        aria-label="Volver"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Movimientos</div>
                        <h1 className="text-2xl font-extrabold text-slate-950">Nueva entrada de mercancia</h1>
                    </div>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800">
                    Estado contable: Pendiente ERP
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-5">
                    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="mb-4 flex items-center gap-2">
                            <ReceiptText size={20} className="text-blue-700" />
                            <h2 className="text-base font-extrabold text-slate-900">Datos de la entrada</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <label className="space-y-1.5">
                                <span className="text-sm font-bold text-slate-700">Proveedor</span>
                                <select
                                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    value={supplierId}
                                    onChange={(event) => setSupplierId(Number(event.target.value))}
                                    required
                                >
                                    <option value="">Seleccione proveedor</option>
                                    {suppliers.map(supplier => (
                                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="space-y-1.5">
                                <span className="text-sm font-bold text-slate-700">Fecha de entrada</span>
                                <div className="relative">
                                    <Calendar className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
                                    <input
                                        type="date"
                                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 pl-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        value={date}
                                        onChange={(event) => setDate(event.target.value)}
                                        required
                                    />
                                </div>
                            </label>

                            <label className="space-y-1.5">
                                <span className="text-sm font-bold text-slate-700">Fecha factura proveedor</span>
                                <div className="relative">
                                    <Calendar className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
                                    <input
                                        type="date"
                                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 pl-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        value={supplierInvoiceDate}
                                        onChange={(event) => setSupplierInvoiceDate(event.target.value)}
                                        required
                                    />
                                </div>
                            </label>

                            <label className="space-y-1.5">
                                <span className="text-sm font-bold text-slate-700">Factura / remision</span>
                                <div className="relative">
                                    <FileText className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 pl-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        value={referenceNumber}
                                        onChange={(event) => setReferenceNumber(event.target.value)}
                                        placeholder="Numero del proveedor"
                                    />
                                </div>
                            </label>

                            <label className="space-y-1.5 md:col-span-2 xl:col-span-1">
                                <span className="text-sm font-bold text-slate-700">Bodega de ingreso</span>
                                <div className="relative">
                                    <MapPin className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
                                    <select
                                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 pl-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        value={branchId}
                                        onChange={(event) => {
                                            setBranchId(Number(event.target.value));
                                            setDetails([]);
                                        }}
                                        required
                                    >
                                        {branches.map(branch => (
                                            <option key={branch.id} value={branch.id}>{branch.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </label>
                        </div>
                    </section>

                    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <h2 className="text-base font-extrabold text-slate-900">Articulos comprados</h2>
                                <p className="text-sm text-slate-500">Costo base e IVA por articulo.</p>
                            </div>
                            <div className="relative w-full lg:max-w-md">
                                <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 pl-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    placeholder="Buscar por nombre, SKU o codigo"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    disabled={!branchId}
                                />
                                {products.length > 0 && (
                                    <div className="absolute right-0 z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                                        {products.map(product => (
                                            <button
                                                key={product.id}
                                                type="button"
                                                onClick={() => addProduct(product)}
                                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-blue-50"
                                            >
                                                <span className="min-w-0">
                                                    <span className="block truncate text-sm font-bold text-slate-800">{product.name}</span>
                                                    <span className="block text-xs text-slate-500">{product.sku} - IVA {product.ivaRate || 0}%</span>
                                                </span>
                                                <Plus size={18} className="shrink-0 text-blue-700" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="hidden overflow-x-auto rounded-lg border border-slate-200 lg:block">
                            <table className="w-full min-w-[860px] border-collapse text-left">
                                <thead className="bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="border-b border-slate-200 p-3">Articulo</th>
                                        <th className="w-28 border-b border-slate-200 p-3 text-center">Cantidad</th>
                                        <th className="w-36 border-b border-slate-200 p-3 text-right">Costo</th>
                                        <th className="w-28 border-b border-slate-200 p-3 text-center">IVA %</th>
                                        <th className="w-36 border-b border-slate-200 p-3 text-right">Base</th>
                                        <th className="w-36 border-b border-slate-200 p-3 text-right">Total</th>
                                        <th className="w-16 border-b border-slate-200 p-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {details.map((item, index) => {
                                        const base = item.quantity * item.unitCost;
                                        const tax = base * (item.taxRate / 100);
                                        return (
                                            <tr key={item.productId}>
                                                <td className="p-3">
                                                    <div className="font-bold text-slate-900">{item.productName}</div>
                                                    <div className="text-xs text-slate-500">{item.sku} - {item.unitOfMeasure}</div>
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        className="h-10 w-full rounded-lg border border-slate-300 px-2 text-center text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                        value={item.quantity || ''}
                                                        onChange={(event) => updateDetail(index, 'quantity', Number(event.target.value))}
                                                        required
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="h-10 w-full rounded-lg border border-slate-300 px-2 text-right text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                        value={item.unitCost || ''}
                                                        onChange={(event) => updateDetail(index, 'unitCost', Number(event.target.value))}
                                                        required
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.01"
                                                        className="h-10 w-full rounded-lg border border-slate-300 px-2 text-center text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                        value={item.taxRate}
                                                        onChange={(event) => updateDetail(index, 'taxRate', Number(event.target.value))}
                                                    />
                                                </td>
                                                <td className="p-3 text-right text-sm font-semibold text-slate-700">{money(base)}</td>
                                                <td className="p-3 text-right text-sm font-extrabold text-slate-900">{money(base + tax)}</td>
                                                <td className="p-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeDetail(index)}
                                                        className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                                                        aria-label="Quitar articulo"
                                                    >
                                                        <Trash2 size={17} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {details.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-10 text-center text-sm font-semibold text-slate-400">
                                                Busque y agregue los articulos recibidos del proveedor.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="space-y-3 lg:hidden">
                            {details.map((item, index) => {
                                const base = item.quantity * item.unitCost;
                                const tax = base * (item.taxRate / 100);
                                return (
                                    <div key={item.productId} className="rounded-lg border border-slate-200 p-3">
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate font-extrabold text-slate-900">{item.productName}</div>
                                                <div className="text-xs text-slate-500">{item.sku} - {item.unitOfMeasure}</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeDetail(index)}
                                                className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                                                aria-label="Quitar articulo"
                                            >
                                                <Trash2 size={17} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <label className="space-y-1">
                                                <span className="text-xs font-bold text-slate-500">Cant.</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    className="h-10 w-full rounded-lg border border-slate-300 px-2 text-center text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                    value={item.quantity || ''}
                                                    onChange={(event) => updateDetail(index, 'quantity', Number(event.target.value))}
                                                />
                                            </label>
                                            <label className="space-y-1">
                                                <span className="text-xs font-bold text-slate-500">Costo</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="h-10 w-full rounded-lg border border-slate-300 px-2 text-right text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                    value={item.unitCost || ''}
                                                    onChange={(event) => updateDetail(index, 'unitCost', Number(event.target.value))}
                                                />
                                            </label>
                                            <label className="space-y-1">
                                                <span className="text-xs font-bold text-slate-500">IVA %</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    className="h-10 w-full rounded-lg border border-slate-300 px-2 text-center text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                    value={item.taxRate}
                                                    onChange={(event) => updateDetail(index, 'taxRate', Number(event.target.value))}
                                                />
                                            </label>
                                        </div>
                                        <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-sm">
                                            <span className="font-semibold text-slate-500">Total linea</span>
                                            <span className="font-extrabold text-slate-900">{money(base + tax)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            {details.length === 0 && (
                                <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-400">
                                    Busque y agregue los articulos recibidos del proveedor.
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                <aside className="space-y-5">
                    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="mb-4 flex items-center gap-2">
                            <Truck size={20} className="text-blue-700" />
                            <h2 className="text-base font-extrabold text-slate-900">Flete</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <label className="space-y-1.5">
                                <span className="text-sm font-bold text-slate-700">Valor flete antes de IVA</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="h-11 w-full rounded-lg border border-slate-300 px-3 text-right text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    value={freight || ''}
                                    onChange={(event) => setFreight(Number(event.target.value))}
                                    placeholder="0"
                                />
                            </label>
                            <label className="space-y-1.5">
                                <span className="text-sm font-bold text-slate-700">IVA flete %</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    className="h-11 w-full rounded-lg border border-slate-300 px-3 text-right text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    value={freightTaxRate || ''}
                                    onChange={(event) => setFreightTaxRate(Number(event.target.value))}
                                    placeholder="0"
                                />
                            </label>
                        </div>
                    </section>

                    <section className="sticky top-24 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <h2 className="mb-4 text-base font-extrabold text-slate-900">Resumen</h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-4">
                                <span className="font-semibold text-slate-500">Base articulos</span>
                                <span className="font-bold text-slate-900">{money(totals.itemsSubTotal)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <span className="font-semibold text-slate-500">IVA articulos</span>
                                <span className="font-bold text-slate-900">{money(totals.itemsTaxAmount)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <span className="font-semibold text-slate-500">Flete</span>
                                <span className="font-bold text-slate-900">{money(freight)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <span className="font-semibold text-slate-500">IVA flete</span>
                                <span className="font-bold text-slate-900">{money(totals.freightTaxAmount)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
                                <span className="text-base font-extrabold text-slate-900">Total entrada</span>
                                <span className="text-xl font-extrabold text-blue-700">{money(totals.total)}</span>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isSaving || details.length === 0 || !supplierId || !branchId}
                            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-extrabold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Save size={20} />
                            {isSaving ? 'Guardando...' : 'Guardar entrada'}
                        </button>
                    </section>
                </aside>
            </form>
        </div>
    );
};

export default CreatePurchase;
