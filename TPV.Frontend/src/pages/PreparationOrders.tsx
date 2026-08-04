import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, ClipboardList, Plus, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../api/axios';

interface Branch {
    id: number;
    name: string;
}

interface Customer {
    id: number;
    firstName?: string;
    lastName?: string;
    taxId?: string;
}

interface Product {
    id: number;
    sku?: string;
    name: string;
    unitOfMeasure?: string;
    price?: number;
}

interface PreparationOrderItem {
    id: number;
    productId?: number;
    reference: string;
    description: string;
    quantity: number;
    unit: string;
    unitValue: number;
    totalValue: number;
    notes?: string;
}

interface PreparationOrder {
    id: number;
    orderNumber: string;
    commercialDocumentReference?: string;
    branchId: number;
    branchName?: string;
    customerId?: number;
    customerName?: string;
    requestedAt: string;
    completedAt?: string;
    status: string;
    chassisNumber: string;
    engineNumber?: string;
    plate?: string;
    brand: string;
    model: string;
    year?: number;
    mileage?: number;
    executedBy?: string;
    findings?: string;
    warrantyOpened: boolean;
    notes?: string;
    items: PreparationOrderItem[];
}

interface ItemForm {
    productId: string;
    reference: string;
    description: string;
    quantity: string;
    unit: string;
    unitValue: string;
    notes: string;
}

const emptyItem = (): ItemForm => ({
    productId: '',
    reference: '',
    description: '',
    quantity: '1',
    unit: 'UND',
    unitValue: '0',
    notes: ''
});

const PreparationOrders = () => {
    const [orders, setOrders] = useState<PreparationOrder[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({
        commercialDocumentReference: '',
        branchId: '',
        customerId: '',
        chassisNumber: '',
        engineNumber: '',
        plate: '',
        brand: 'Honda',
        model: '',
        year: '',
        mileage: '',
        executedBy: '',
        findings: '',
        warrantyOpened: false,
        notes: ''
    });
    const [items, setItems] = useState<ItemForm[]>([emptyItem()]);

    const pendingOrders = useMemo(() => orders.filter(order => order.status !== 'Completada' && order.status !== 'Anulada').length, [orders]);
    const completedOrders = useMemo(() => orders.filter(order => order.status === 'Completada').length, [orders]);

    useEffect(() => {
        loadInitialData();
    }, []);

    const getErrorMessage = (error: unknown, fallback: string) => {
        if (typeof error === 'object' && error !== null && 'response' in error) {
            const response = (error as { response?: { data?: { message?: string } | string } }).response;
            if (typeof response?.data === 'string') return response.data;
            if (response?.data?.message) return response.data.message;
        }
        return fallback;
    };

    const loadInitialData = async () => {
        await Promise.all([fetchOrders(), fetchBranches(), fetchCustomers(), fetchProducts()]);
    };

    const fetchOrders = async () => {
        const response = await api.get<PreparationOrder[]>('/preparationorders', { params: { search } });
        setOrders(response.data);
    };

    const fetchBranches = async () => {
        const response = await api.get<Branch[]>('/branches');
        setBranches(response.data);
    };

    const fetchCustomers = async () => {
        const response = await api.get<Customer[]>('/customers');
        setCustomers(response.data);
    };

    const fetchProducts = async () => {
        const response = await api.get<Product[]>('/products');
        setProducts(response.data);
    };

    const updateForm = (field: keyof typeof form, value: string | boolean) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const updateItem = (index: number, field: keyof ItemForm, value: string) => {
        setItems(prev => prev.map((item, itemIndex) => {
            if (itemIndex !== index) return item;

            if (field === 'productId') {
                const product = products.find(p => p.id === Number(value));
                return {
                    ...item,
                    productId: value,
                    reference: product?.sku ?? item.reference,
                    description: product?.name ?? item.description,
                    unit: product?.unitOfMeasure ?? item.unit,
                    unitValue: product?.price?.toString() ?? item.unitValue
                };
            }

            return { ...item, [field]: value };
        }));
    };

    const addItem = () => setItems(prev => [...prev, emptyItem()]);
    const removeItem = (index: number) => setItems(prev => prev.filter((_, itemIndex) => itemIndex !== index));

    const resetForm = () => {
        setForm({
            commercialDocumentReference: '',
            branchId: '',
            customerId: '',
            chassisNumber: '',
            engineNumber: '',
            plate: '',
            brand: 'Honda',
            model: '',
            year: '',
            mileage: '',
            executedBy: '',
            findings: '',
            warrantyOpened: false,
            notes: ''
        });
        setItems([emptyItem()]);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsSaving(true);

        try {
            const payload = {
                commercialDocumentReference: form.commercialDocumentReference || null,
                branchId: form.branchId ? Number(form.branchId) : null,
                customerId: form.customerId ? Number(form.customerId) : null,
                chassisNumber: form.chassisNumber,
                engineNumber: form.engineNumber || null,
                plate: form.plate || null,
                brand: form.brand,
                model: form.model,
                year: form.year ? Number(form.year) : null,
                mileage: form.mileage ? Number(form.mileage) : null,
                executedBy: form.executedBy || null,
                findings: form.findings || null,
                warrantyOpened: form.warrantyOpened,
                notes: form.notes || null,
                items: items
                    .filter(item => item.productId || item.reference || item.description)
                    .map(item => ({
                        productId: item.productId ? Number(item.productId) : null,
                        reference: item.reference || null,
                        description: item.description || null,
                        quantity: Number(item.quantity || '0'),
                        unit: item.unit || 'UND',
                        unitValue: Number(item.unitValue || '0'),
                        notes: item.notes || null
                    }))
            };

            await api.post('/preparationorders', payload);
            await Swal.fire('Alistamiento creado', 'La solicitud quedo registrada.', 'success');
            resetForm();
            await fetchOrders();
        } catch (error) {
            await Swal.fire('No se pudo guardar', getErrorMessage(error, 'Revisa los datos del alistamiento.'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const completeOrder = async (order: PreparationOrder) => {
        const result = await Swal.fire({
            title: 'Cerrar alistamiento',
            input: 'textarea',
            inputLabel: 'Hallazgos o notas de entrega',
            inputValue: order.findings ?? '',
            showCancelButton: true,
            confirmButtonText: 'Cerrar',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        try {
            await api.patch(`/preparationorders/${order.id}/complete`, {
                findings: result.value,
                executedBy: order.executedBy,
                warrantyOpened: order.warrantyOpened,
                notes: order.notes
            });
            await fetchOrders();
        } catch (error) {
            await Swal.fire('No se pudo cerrar', getErrorMessage(error, 'Intenta nuevamente.'), 'error');
        }
    };

    return (
        <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Solicitudes abiertas</div>
                    <div className="mt-2 text-3xl font-extrabold text-slate-900">{pendingOrders}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Completadas</div>
                    <div className="mt-2 text-3xl font-extrabold text-emerald-700">{completedOrders}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Trazabilidad MCH</div>
                    <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <ClipboardList size={18} className="text-blue-600" />
                        Solicitud, vehiculo, consumos y hallazgos
                    </div>
                </div>
            </section>

            <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-extrabold text-slate-900">Nueva orden de alistamiento</h2>
                        <p className="text-sm text-slate-500">Registra la solicitud comercial y la preparacion previa a entrega.</p>
                    </div>
                    <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60">
                        <Plus size={18} />
                        Guardar
                    </button>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                    <label className="space-y-1">
                        <span className="text-xs font-bold uppercase text-slate-500">Referencia comercial</span>
                        <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.commercialDocumentReference} onChange={e => updateForm('commercialDocumentReference', e.target.value)} />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-bold uppercase text-slate-500">Sucursal</span>
                        <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.branchId} onChange={e => updateForm('branchId', e.target.value)}>
                            <option value="">Sucursal del usuario</option>
                            {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                        </select>
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-bold uppercase text-slate-500">Cliente</span>
                        <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.customerId} onChange={e => updateForm('customerId', e.target.value)}>
                            <option value="">Sin cliente</option>
                            {customers.map(customer => (
                                <option key={customer.id} value={customer.id}>
                                    {[customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.taxId || `Cliente ${customer.id}`}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-bold uppercase text-slate-500">Ejecutante</span>
                        <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.executedBy} onChange={e => updateForm('executedBy', e.target.value)} />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-bold uppercase text-slate-500">Chasis / VIN</span>
                        <input required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.chassisNumber} onChange={e => updateForm('chassisNumber', e.target.value)} />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-bold uppercase text-slate-500">Motor</span>
                        <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.engineNumber} onChange={e => updateForm('engineNumber', e.target.value)} />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-bold uppercase text-slate-500">Placa</span>
                        <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.plate} onChange={e => updateForm('plate', e.target.value)} />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-bold uppercase text-slate-500">Marca</span>
                        <input required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.brand} onChange={e => updateForm('brand', e.target.value)} />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-bold uppercase text-slate-500">Modelo</span>
                        <input required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.model} onChange={e => updateForm('model', e.target.value)} />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-bold uppercase text-slate-500">Ano modelo</span>
                        <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.year} onChange={e => updateForm('year', e.target.value)} />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-bold uppercase text-slate-500">Kilometraje</span>
                        <input type="number" step="0.01" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.mileage} onChange={e => updateForm('mileage', e.target.value)} />
                    </label>
                    <label className="flex items-center gap-2 pt-6 text-sm font-semibold text-slate-700">
                        <input type="checkbox" checked={form.warrantyOpened} onChange={e => updateForm('warrantyOpened', e.target.checked)} />
                        Abre garantia
                    </label>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-1">
                        <span className="text-xs font-bold uppercase text-slate-500">Hallazgos</span>
                        <textarea className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.findings} onChange={e => updateForm('findings', e.target.value)} />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-bold uppercase text-slate-500">Notas</span>
                        <textarea className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.notes} onChange={e => updateForm('notes', e.target.value)} />
                    </label>
                </div>

                <div className="mt-6">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-600">Consumos</h3>
                        <button type="button" onClick={addItem} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                            <Plus size={16} />
                            Agregar consumo
                        </button>
                    </div>
                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={index} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-12">
                                <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-3" value={item.productId} onChange={e => updateItem(index, 'productId', e.target.value)}>
                                    <option value="">Producto opcional</option>
                                    {products.map(product => <option key={product.id} value={product.id}>{product.sku} - {product.name}</option>)}
                                </select>
                                <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" placeholder="Referencia" value={item.reference} onChange={e => updateItem(index, 'reference', e.target.value)} />
                                <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-3" placeholder="Descripcion" value={item.description} onChange={e => updateItem(index, 'description', e.target.value)} />
                                <input type="number" step="0.001" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-1" placeholder="Cant." value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} />
                                <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-1" placeholder="Unidad" value={item.unit} onChange={e => updateItem(index, 'unit', e.target.value)} />
                                <input type="number" step="0.01" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-1" placeholder="Valor" value={item.unitValue} onChange={e => updateItem(index, 'unitValue', e.target.value)} />
                                <button type="button" onClick={() => removeItem(index)} className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-red-600 hover:bg-red-50 md:col-span-1">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </form>

            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-lg font-extrabold text-slate-900">Ordenes de alistamiento</h2>
                    <div className="flex gap-2">
                        <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
                        <button type="button" onClick={fetchOrders} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Buscar</button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Numero</th>
                                <th className="px-4 py-3">Vehiculo</th>
                                <th className="px-4 py-3">Sucursal</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3">Solicitud</th>
                                <th className="px-4 py-3">Consumos</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {orders.map(order => (
                                <tr key={order.id} className="align-top">
                                    <td className="px-4 py-3 font-semibold text-slate-900">{order.orderNumber}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-semibold text-slate-800">{order.brand} {order.model}</div>
                                        <div className="text-xs text-slate-500">VIN {order.chassisNumber}</div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{order.branchName ?? order.branchId}</td>
                                    <td className="px-4 py-3">
                                        <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{order.status}</span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{new Date(order.requestedAt).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-slate-600">{order.items.length}</td>
                                    <td className="px-4 py-3 text-right">
                                        {order.status !== 'Completada' && order.status !== 'Anulada' && (
                                            <button type="button" onClick={() => completeOrder(order)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">
                                                <CheckCircle size={15} />
                                                Cerrar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No hay alistamientos registrados.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default PreparationOrders;
