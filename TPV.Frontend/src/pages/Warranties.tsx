import { useEffect, useMemo, useState } from 'react';
import { Edit, Loader, Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import api from '../api/axios';

interface VehicleOption {
    id: number;
    chassisNumber: string;
    plate?: string;
    brand: string;
    model: string;
    lastKnownMileage?: number;
}

interface SourceOrder {
    id: number;
    orderNumber?: string;
    status: string;
}

interface ProductOption {
    id: number;
    sku: string;
    name: string;
    price: number;
}

interface ReplacementPart {
    productId: number | null;
    reference: string;
    description: string;
    quantity: string;
    unit: string;
    unitValue: string;
}

interface StatusHistory {
    id: number;
    manufacturerStatus: string;
    changedAt: string;
    changedByName?: string;
    notes?: string;
}

interface Warranty {
    id: number;
    warrantyNumber: string;
    companyName: string;
    branchName?: string;
    brandName?: string;
    vehicleId?: number;
    chassisNumber: string;
    plate: string;
    customerName: string;
    serviceOrderId?: number;
    serviceOrderNumber?: string;
    preparationOrderId?: number;
    preparationOrderNumber?: string;
    claimType: string;
    detectionMoment: string;
    attributedCause?: string;
    failureDate: string;
    failureMileage: number;
    failureDescription: string;
    failureMode?: string;
    causingPartProductId?: number;
    causingPartReference: string;
    causingPartDescription: string;
    recognizedLaborHours: number;
    recognizedLaborValue: number;
    customerEquivalentValue: number;
    manufacturerStatus: string;
    authorizationNumber?: string;
    authorizationDate?: string;
    filedAt?: string;
    approvedValue: number;
    rejectedValue: number;
    rejectionReason?: string;
    recognizedValue: number;
    vehicleOrPartLot?: string;
    manufacturingDate?: string;
    manufacturerInvoiceNumber?: string;
    manufacturerInvoiceDate?: string;
    manufacturerInvoiceTotal?: number;
    manufacturerPaidAt?: string;
    manufacturerPaymentReference?: string;
    coveredWarrantyIds: number[];
    replacementParts: Array<ReplacementPart & { id: number; totalValue: number }>;
    statusHistory: StatusHistory[];
    isLegacyRecord: boolean;
    isActive: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
    vehicleId: '',
    serviceOrderId: '',
    preparationOrderId: '',
    claimType: 'CORRECTIVA',
    detectionMoment: 'RECIBO',
    attributedCause: '',
    failureDate: today(),
    failureMileage: '',
    failureDescription: '',
    failureMode: '',
    causingPartProductId: '',
    causingPartReference: '',
    causingPartDescription: '',
    recognizedLaborHours: '',
    recognizedLaborValue: '',
    customerEquivalentValue: '',
    manufacturerStatus: 'DETECTADA',
    statusNotes: '',
    authorizationNumber: '',
    authorizationDate: '',
    filedAt: '',
    approvedValue: '',
    rejectedValue: '',
    rejectionReason: '',
    recognizedValue: '',
    vehicleOrPartLot: '',
    manufacturingDate: '',
    manufacturerInvoiceNumber: '',
    manufacturerInvoiceDate: '',
    manufacturerInvoiceTotal: '',
    manufacturerPaidAt: '',
    manufacturerPaymentReference: ''
});

const fieldClass = 'mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';
const labelClass = 'block text-xs font-semibold text-slate-600';

const Warranties = () => {
    const [warranties, setWarranties] = useState<Warranty[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentWarranty, setCurrentWarranty] = useState<Warranty | null>(null);
    const [form, setForm] = useState(emptyForm());
    const [replacementParts, setReplacementParts] = useState<ReplacementPart[]>([]);

    const [vehicleSearch, setVehicleSearch] = useState('');
    const [vehicleResults, setVehicleResults] = useState<VehicleOption[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleOption | null>(null);
    const [serviceOrders, setServiceOrders] = useState<SourceOrder[]>([]);
    const [preparationOrders, setPreparationOrders] = useState<SourceOrder[]>([]);

    const [productSearch, setProductSearch] = useState('');
    const [productResults, setProductResults] = useState<ProductOption[]>([]);

    useEffect(() => {
        const timer = setTimeout(fetchWarranties, 250);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        if (vehicleSearch.trim().length < 2) {
            setVehicleResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const response = await api.get(`/Vehicles?search=${encodeURIComponent(vehicleSearch.trim())}`);
                setVehicleResults(response.data);
            } catch { setVehicleResults([]); }
        }, 250);
        return () => clearTimeout(timer);
    }, [vehicleSearch]);

    useEffect(() => {
        if (productSearch.trim().length < 2) {
            setProductResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const response = await api.get(`/sales/products?search=${encodeURIComponent(productSearch.trim())}`);
                setProductResults(response.data);
            } catch { setProductResults([]); }
        }, 250);
        return () => clearTimeout(timer);
    }, [productSearch]);

    const fetchWarranties = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/warranties?plate=${encodeURIComponent(searchTerm.trim())}`);
            setWarranties(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadSourceOrders = async (vehicle: VehicleOption) => {
        try {
            const [workshopResponse, preparationResponse] = await Promise.all([
                api.get(`/ServiceOrders?search=${encodeURIComponent(vehicle.chassisNumber)}`),
                api.get(`/PreparationOrders?search=${encodeURIComponent(vehicle.chassisNumber)}`)
            ]);
            setServiceOrders(workshopResponse.data);
            setPreparationOrders(preparationResponse.data);
        } catch {
            setServiceOrders([]);
            setPreparationOrders([]);
        }
    };

    const selectVehicle = async (vehicle: VehicleOption) => {
        setSelectedVehicle(vehicle);
        setVehicleSearch(`${vehicle.chassisNumber} | ${vehicle.plate || 'SIN PLACA'} | ${vehicle.brand} ${vehicle.model}`);
        setVehicleResults([]);
        setForm(previous => ({
            ...previous,
            vehicleId: String(vehicle.id),
            failureMileage: previous.failureMileage || String(vehicle.lastKnownMileage || '')
        }));
        await loadSourceOrders(vehicle);
    };

    const openNew = () => {
        setCurrentWarranty(null);
        setForm(emptyForm());
        setReplacementParts([]);
        setSelectedVehicle(null);
        setVehicleSearch('');
        setVehicleResults([]);
        setServiceOrders([]);
        setPreparationOrders([]);
        setProductSearch('');
        setProductResults([]);
        setIsModalOpen(true);
    };

    const openEdit = async (summary: Warranty) => {
        try {
            const response = await api.get(`/warranties/${summary.id}`);
            const warranty: Warranty = response.data;
            setCurrentWarranty(warranty);
            setForm({
                vehicleId: String(warranty.vehicleId || ''),
                serviceOrderId: String(warranty.serviceOrderId || ''),
                preparationOrderId: String(warranty.preparationOrderId || ''),
                claimType: warranty.claimType || 'CORRECTIVA',
                detectionMoment: warranty.detectionMoment || 'RECIBO',
                attributedCause: warranty.attributedCause || '',
                failureDate: warranty.failureDate?.slice(0, 10) || today(),
                failureMileage: String(warranty.failureMileage ?? ''),
                failureDescription: warranty.failureDescription || '',
                failureMode: warranty.failureMode || '',
                causingPartProductId: String(warranty.causingPartProductId || ''),
                causingPartReference: warranty.causingPartReference || '',
                causingPartDescription: warranty.causingPartDescription || '',
                recognizedLaborHours: String(warranty.recognizedLaborHours ?? ''),
                recognizedLaborValue: String(warranty.recognizedLaborValue ?? ''),
                customerEquivalentValue: String(warranty.customerEquivalentValue ?? ''),
                manufacturerStatus: warranty.manufacturerStatus || 'DETECTADA',
                statusNotes: '',
                authorizationNumber: warranty.authorizationNumber || '',
                authorizationDate: warranty.authorizationDate?.slice(0, 10) || '',
                filedAt: warranty.filedAt?.slice(0, 10) || '',
                approvedValue: String(warranty.approvedValue ?? ''),
                rejectedValue: String(warranty.rejectedValue ?? ''),
                rejectionReason: warranty.rejectionReason || '',
                recognizedValue: String(warranty.recognizedValue ?? ''),
                vehicleOrPartLot: warranty.vehicleOrPartLot || '',
                manufacturingDate: warranty.manufacturingDate?.slice(0, 10) || '',
                manufacturerInvoiceNumber: warranty.manufacturerInvoiceNumber || '',
                manufacturerInvoiceDate: warranty.manufacturerInvoiceDate?.slice(0, 10) || '',
                manufacturerInvoiceTotal: String(warranty.manufacturerInvoiceTotal ?? ''),
                manufacturerPaidAt: warranty.manufacturerPaidAt?.slice(0, 10) || '',
                manufacturerPaymentReference: warranty.manufacturerPaymentReference || ''
            });
            const vehicle: VehicleOption = {
                id: warranty.vehicleId || 0,
                chassisNumber: warranty.chassisNumber,
                plate: warranty.plate,
                brand: warranty.brandName || '',
                model: ''
            };
            setSelectedVehicle(vehicle);
            setVehicleSearch(`${warranty.chassisNumber} | ${warranty.plate || 'SIN PLACA'} | ${warranty.brandName || ''}`);
            setReplacementParts(warranty.replacementParts.map(part => ({
                productId: part.productId,
                reference: part.reference,
                description: part.description,
                quantity: String(part.quantity),
                unit: part.unit,
                unitValue: String(part.unitValue)
            })));
            await loadSourceOrders(vehicle);
            setIsModalOpen(true);
        } catch {
            alert('NO SE PUDO CARGAR LA GARANTIA.');
        }
    };

    const closeModal = () => {
        if (saving) return;
        setIsModalOpen(false);
        setCurrentWarranty(null);
    };

    const addReplacement = (product?: ProductOption) => {
        setReplacementParts(previous => [...previous, {
            productId: product?.id || null,
            reference: product?.sku || '',
            description: product?.name || '',
            quantity: '1',
            unit: 'UND',
            unitValue: String(product?.price || '')
        }]);
    };

    const updateReplacement = (index: number, changes: Partial<ReplacementPart>) => {
        setReplacementParts(previous => previous.map((part, partIndex) => partIndex === index ? { ...part, ...changes } : part));
    };

    const replacementTotal = useMemo(() => replacementParts.reduce(
        (sum, part) => sum + Number(part.quantity || 0) * Number(part.unitValue || 0), 0), [replacementParts]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        try {
            const payload = {
                vehicleId: Number(form.vehicleId),
                serviceOrderId: form.serviceOrderId ? Number(form.serviceOrderId) : null,
                preparationOrderId: form.preparationOrderId ? Number(form.preparationOrderId) : null,
                claimType: form.claimType,
                detectionMoment: form.detectionMoment,
                attributedCause: form.attributedCause || null,
                failureDate: form.failureDate,
                failureMileage: Number(form.failureMileage || 0),
                failureDescription: form.failureDescription,
                failureMode: form.failureMode || null,
                causingPartProductId: form.causingPartProductId ? Number(form.causingPartProductId) : null,
                causingPartReference: form.causingPartReference,
                causingPartDescription: form.causingPartDescription,
                recognizedLaborHours: Number(form.recognizedLaborHours || 0),
                recognizedLaborValue: Number(form.recognizedLaborValue || 0),
                customerEquivalentValue: Number(form.customerEquivalentValue || 0),
                manufacturerStatus: form.manufacturerStatus,
                statusNotes: form.statusNotes || null,
                authorizationNumber: form.authorizationNumber || null,
                authorizationDate: form.authorizationDate || null,
                filedAt: form.filedAt || null,
                approvedValue: Number(form.approvedValue || 0),
                rejectedValue: Number(form.rejectedValue || 0),
                rejectionReason: form.rejectionReason || null,
                recognizedValue: Number(form.recognizedValue || 0),
                vehicleOrPartLot: form.vehicleOrPartLot || null,
                manufacturingDate: form.manufacturingDate || null,
                manufacturerInvoiceNumber: form.manufacturerInvoiceNumber || null,
                manufacturerInvoiceDate: form.manufacturerInvoiceDate || null,
                manufacturerInvoiceTotal: form.manufacturerInvoiceTotal ? Number(form.manufacturerInvoiceTotal) : null,
                manufacturerPaidAt: form.manufacturerPaidAt || null,
                manufacturerPaymentReference: form.manufacturerPaymentReference || null,
                replacementParts: replacementParts.map(part => ({
                    productId: part.productId,
                    reference: part.reference,
                    description: part.description,
                    quantity: Number(part.quantity),
                    unit: part.unit,
                    unitValue: Number(part.unitValue || 0)
                }))
            };

            if (currentWarranty) await api.put(`/warranties/${currentWarranty.id}`, payload);
            else await api.post('/warranties', payload);
            await fetchWarranties();
            closeModal();
        } catch (error: any) {
            const backendMessage = typeof error.response?.data === 'string'
                ? error.response.data
                : error.response?.data?.message;
            alert(backendMessage || 'NO SE PUDO GUARDAR LA GARANTIA.');
        } finally {
            setSaving(false);
        }
    };

    const deactivate = async (warranty: Warranty) => {
        if (!window.confirm(`¿DESACTIVAR ${warranty.warrantyNumber}?`)) return;
        await api.delete(`/warranties/${warranty.id}`);
        await fetchWarranties();
    };

    return (
        <div className="space-y-5 p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">GARANTIAS DEL FABRICANTE</h1>
                    <p className="mt-1 text-sm text-slate-500">RECLAMACIONES, RESPUESTA, FACTURACION Y PAGO</p>
                </div>
                <button onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
                    <Plus size={18} /> NUEVA GARANTIA
                </button>
            </div>

            <div className="border-y border-slate-200 bg-white py-4">
                <div className="relative max-w-xl">
                    {loading ? <Loader className="absolute left-3 top-2.5 animate-spin text-blue-600" size={19} /> : <Search className="absolute left-3 top-2.5 text-slate-400" size={19} />}
                    <input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="BUSCAR POR NUMERO, VIN O PLACA" className={`${fieldClass} mt-0 pl-10`} />
                </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 bg-white">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-100 text-xs text-slate-600">
                        <tr>
                            <th className="px-4 py-3 text-left">GARANTIA</th>
                            <th className="px-4 py-3 text-left">VEHICULO</th>
                            <th className="px-4 py-3 text-left">TIPO / DETECCION</th>
                            <th className="px-4 py-3 text-left">ESTADO FABRICANTE</th>
                            <th className="px-4 py-3 text-right">APROBADO</th>
                            <th className="px-4 py-3 text-left">FACTURA / PAGO</th>
                            <th className="px-4 py-3 text-right">ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {warranties.map(warranty => (
                            <tr key={warranty.id} className={!warranty.isActive ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50'}>
                                <td className="px-4 py-3"><div className="font-semibold text-slate-900">{warranty.warrantyNumber || `LEGACY-${warranty.id}`}</div><div className="text-xs text-slate-500">{warranty.failureDate ? new Date(warranty.failureDate).toLocaleDateString() : '-'}</div></td>
                                <td className="px-4 py-3"><div>{warranty.plate || 'SIN PLACA'} | {warranty.brandName}</div><div className="font-mono text-xs text-slate-500">{warranty.chassisNumber || '-'}</div></td>
                                <td className="px-4 py-3"><div>{warranty.claimType}</div><div className="text-xs text-slate-500">{warranty.detectionMoment}</div></td>
                                <td className="px-4 py-3"><span className="inline-flex rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">{warranty.manufacturerStatus || 'SIN ESTADO'}</span>{warranty.isLegacyRecord && <div className="mt-1 text-xs text-amber-700">REGISTRO HISTORICO</div>}</td>
                                <td className="px-4 py-3 text-right font-semibold">${Number(warranty.approvedValue || 0).toLocaleString()}</td>
                                <td className="px-4 py-3"><div>{warranty.manufacturerInvoiceNumber || 'PENDIENTE'}</div><div className={`text-xs ${warranty.manufacturerPaidAt ? 'text-green-700' : 'text-amber-700'}`}>{warranty.manufacturerPaidAt ? `PAGADA ${new Date(warranty.manufacturerPaidAt).toLocaleDateString()}` : 'PAGO PENDIENTE'}</div></td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => openEdit(warranty)} disabled={warranty.isLegacyRecord} title={warranty.isLegacyRecord ? 'Registro historico sin datos de reclamacion' : 'Editar garantia'} className="p-2 text-blue-700 disabled:text-slate-300"><Edit size={17} /></button>
                                    <button onClick={() => deactivate(warranty)} title="Desactivar garantia" className="p-2 text-red-700"><Trash2 size={17} /></button>
                                </td>
                            </tr>
                        ))}
                        {!loading && warranties.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">NO HAY GARANTIAS REGISTRADAS</td></tr>}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3">
                    <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-6xl overflow-y-auto bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                            <div className="flex items-center gap-3"><ShieldCheck className="text-blue-700" /><div><h2 className="font-bold text-slate-900">{currentWarranty ? currentWarranty.warrantyNumber : 'NUEVA GARANTIA'}</h2><p className="text-xs text-slate-500">CICLO DE RECLAMACION AL FABRICANTE</p></div></div>
                            <button type="button" onClick={closeModal} className="p-2 text-slate-500 hover:text-slate-900"><X /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="divide-y divide-slate-200">
                            <section className="space-y-4 p-5">
                                <h3 className="text-sm font-bold text-slate-800">ORIGEN Y VEHICULO</h3>
                                <div className="relative">
                                    <label className={labelClass}>BUSCAR VEHICULO POR VIN, PLACA, MARCA O MODELO</label>
                                    <input value={vehicleSearch} onChange={event => { setVehicleSearch(event.target.value); setSelectedVehicle(null); setForm(previous => ({ ...previous, vehicleId: '' })); }} className={fieldClass} required />
                                    {vehicleResults.length > 0 && <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto border border-slate-300 bg-white shadow-lg">{vehicleResults.map(vehicle => <button type="button" key={vehicle.id} onClick={() => selectVehicle(vehicle)} className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-blue-50"><span className="font-mono">{vehicle.chassisNumber}</span> | {vehicle.plate || 'SIN PLACA'} | {vehicle.brand} {vehicle.model}</button>)}</div>}
                                </div>
                                {selectedVehicle && <div className="grid gap-3 bg-slate-50 p-3 text-sm sm:grid-cols-3"><div><span className="text-xs text-slate-500">VIN</span><div className="font-mono font-semibold">{selectedVehicle.chassisNumber}</div></div><div><span className="text-xs text-slate-500">PLACA</span><div>{selectedVehicle.plate || 'SIN PLACA'}</div></div><div><span className="text-xs text-slate-500">VEHICULO</span><div>{selectedVehicle.brand} {selectedVehicle.model}</div></div></div>}
                                <div className="grid gap-4 md:grid-cols-4">
                                    <label className={labelClass}>TIPO DE GARANTIA<select value={form.claimType} onChange={event => setForm({ ...form, claimType: event.target.value })} className={fieldClass}><option value="CORRECTIVA">CORRECTIVA</option><option value="CERO_KILOMETROS">CERO KILOMETROS</option></select></label>
                                    <label className={labelClass}>MOMENTO DE DETECCION<select value={form.detectionMoment} onChange={event => setForm({ ...form, detectionMoment: event.target.value, serviceOrderId: event.target.value === 'RECIBO' ? form.serviceOrderId : '', preparationOrderId: event.target.value === 'ALISTAMIENTO' ? form.preparationOrderId : '' })} className={fieldClass}><option value="RECIBO">RECIBO</option><option value="ALISTAMIENTO">ALISTAMIENTO</option></select></label>
                                    {form.detectionMoment === 'RECIBO' ? <label className={`${labelClass} md:col-span-2`}>ORDEN DE TALLER<select required value={form.serviceOrderId} onChange={event => setForm({ ...form, serviceOrderId: event.target.value })} className={fieldClass}><option value="">SELECCIONE</option>{serviceOrders.map(order => <option key={order.id} value={order.id}>{order.orderNumber || `#${order.id}`} | {order.status}</option>)}</select></label> : <label className={`${labelClass} md:col-span-2`}>ORDEN DE ALISTAMIENTO<select required value={form.preparationOrderId} onChange={event => setForm({ ...form, preparationOrderId: event.target.value })} className={fieldClass}><option value="">SELECCIONE</option>{preparationOrders.map(order => <option key={order.id} value={order.id}>{order.orderNumber || `#${order.id}`} | {order.status}</option>)}</select></label>}
                                </div>
                            </section>

                            <section className="space-y-4 p-5">
                                <h3 className="text-sm font-bold text-slate-800">FALLA Y PIEZA CAUSANTE</h3>
                                <div className="grid gap-4 md:grid-cols-4">
                                    <label className={labelClass}>FECHA DE LA FALLA<input type="date" required value={form.failureDate} onChange={event => setForm({ ...form, failureDate: event.target.value })} className={fieldClass} /></label>
                                    <label className={labelClass}>KILOMETRAJE<input type="number" min="0" step="0.01" required value={form.failureMileage} onChange={event => setForm({ ...form, failureMileage: event.target.value })} className={fieldClass} /></label>
                                    <label className={labelClass}>CAUSA ATRIBUIDA<input value={form.attributedCause} onChange={event => setForm({ ...form, attributedCause: event.target.value })} placeholder="OPCIONAL, NO SUPONER" className={fieldClass} /></label>
                                    <label className={labelClass}>MODO DE FALLA<input value={form.failureMode} onChange={event => setForm({ ...form, failureMode: event.target.value })} className={fieldClass} /></label>
                                </div>
                                <label className={labelClass}>DESCRIPCION DE LA FALLA<textarea required rows={3} value={form.failureDescription} onChange={event => setForm({ ...form, failureDescription: event.target.value })} className={fieldClass} /></label>
                                <div className="relative">
                                    <label className={labelClass}>BUSCAR PIEZA EN EL CATALOGO</label>
                                    <input value={productSearch} onChange={event => setProductSearch(event.target.value)} className={fieldClass} placeholder="REFERENCIA O DESCRIPCION" />
                                    {productResults.length > 0 && <div className="mt-2 border border-slate-200 bg-white">{productResults.map(product => <div key={product.id} className="flex flex-col gap-2 border-b border-slate-100 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"><span>{product.sku} | {product.name}</span><div className="flex gap-2"><button type="button" onClick={() => { setForm({ ...form, causingPartProductId: String(product.id), causingPartReference: product.sku, causingPartDescription: product.name }); setProductResults([]); }} className="rounded border border-blue-600 px-2 py-1 text-xs font-semibold text-blue-700">PIEZA CAUSANTE</button><button type="button" onClick={() => { addReplacement(product); setProductResults([]); }} className="rounded border border-slate-500 px-2 py-1 text-xs font-semibold text-slate-700">PIEZA REEMPLAZADA</button></div></div>)}</div>}
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <label className={labelClass}>REFERENCIA CAUSANTE<input required value={form.causingPartReference} onChange={event => setForm({ ...form, causingPartReference: event.target.value })} className={fieldClass} /></label>
                                    <label className={labelClass}>DESCRIPCION CAUSANTE<input required value={form.causingPartDescription} onChange={event => setForm({ ...form, causingPartDescription: event.target.value })} className={fieldClass} /></label>
                                </div>
                            </section>

                            <section className="space-y-4 p-5">
                                <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-800">PIEZAS REEMPLAZADAS</h3><button type="button" onClick={() => addReplacement()} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700"><Plus size={15} /> AGREGAR MANUAL</button></div>
                                <div className="space-y-3">{replacementParts.map((part, index) => <div key={index} className="grid gap-3 border-b border-slate-200 pb-3 md:grid-cols-12"><label className={`${labelClass} md:col-span-2`}>REFERENCIA<input required value={part.reference} onChange={event => updateReplacement(index, { reference: event.target.value })} className={fieldClass} /></label><label className={`${labelClass} md:col-span-3`}>DESCRIPCION<input required value={part.description} onChange={event => updateReplacement(index, { description: event.target.value })} className={fieldClass} /></label><label className={`${labelClass} md:col-span-2`}>CANTIDAD<input type="number" min="0.0001" step="0.0001" required value={part.quantity} onChange={event => updateReplacement(index, { quantity: event.target.value })} className={fieldClass} /></label><label className={`${labelClass} md:col-span-1`}>UNIDAD<input required value={part.unit} onChange={event => updateReplacement(index, { unit: event.target.value.toUpperCase() })} className={fieldClass} /></label><label className={`${labelClass} md:col-span-2`}>VALOR UNITARIO<input type="number" min="0" step="0.01" required value={part.unitValue} onChange={event => updateReplacement(index, { unitValue: event.target.value })} className={fieldClass} /></label><div className="flex items-end justify-between md:col-span-2"><span className="pb-2 text-sm font-semibold">${(Number(part.quantity || 0) * Number(part.unitValue || 0)).toLocaleString()}</span><button type="button" onClick={() => setReplacementParts(previous => previous.filter((_, itemIndex) => itemIndex !== index))} className="mb-1 p-2 text-red-700"><Trash2 size={17} /></button></div></div>)}</div>
                                <div className="text-right text-sm font-bold text-slate-900">TOTAL PIEZAS: ${replacementTotal.toLocaleString()}</div>
                            </section>

                            <section className="space-y-4 p-5">
                                <h3 className="text-sm font-bold text-slate-800">ESTADO, AUTORIZACION Y RESULTADO</h3>
                                <div className="grid gap-4 md:grid-cols-4">
                                    <label className={`${labelClass} md:col-span-2`}>ESTADO SEGUN EL FABRICANTE<input required value={form.manufacturerStatus} onChange={event => setForm({ ...form, manufacturerStatus: event.target.value })} className={fieldClass} /></label>
                                    <label className={`${labelClass} md:col-span-2`}>NOTA DEL CAMBIO DE ESTADO<input value={form.statusNotes} onChange={event => setForm({ ...form, statusNotes: event.target.value })} className={fieldClass} /></label>
                                    <label className={labelClass}>NUMERO DE AUTORIZACION<input value={form.authorizationNumber} onChange={event => setForm({ ...form, authorizationNumber: event.target.value })} className={fieldClass} /></label>
                                    <label className={labelClass}>FECHA DE AUTORIZACION<input type="date" value={form.authorizationDate} onChange={event => setForm({ ...form, authorizationDate: event.target.value })} className={fieldClass} /></label>
                                    <label className={labelClass}>FECHA DE RADICACION<input type="date" value={form.filedAt} onChange={event => setForm({ ...form, filedAt: event.target.value })} className={fieldClass} /></label>
                                    <label className={labelClass}>VALOR RECONOCIDO<input type="number" min="0" step="0.01" value={form.recognizedValue} onChange={event => setForm({ ...form, recognizedValue: event.target.value })} className={fieldClass} /></label>
                                    <label className={labelClass}>HORAS RECONOCIDAS<input type="number" min="0" step="0.01" value={form.recognizedLaborHours} onChange={event => setForm({ ...form, recognizedLaborHours: event.target.value })} className={fieldClass} /></label>
                                    <label className={labelClass}>MANO DE OBRA GARANTIA<input type="number" min="0" step="0.01" value={form.recognizedLaborValue} onChange={event => setForm({ ...form, recognizedLaborValue: event.target.value })} className={fieldClass} /></label>
                                    <label className={labelClass}>EQUIVALENTE AL CLIENTE<input type="number" min="0" step="0.01" value={form.customerEquivalentValue} onChange={event => setForm({ ...form, customerEquivalentValue: event.target.value })} className={fieldClass} /></label>
                                    <label className={labelClass}>VALOR APROBADO<input type="number" min="0" step="0.01" value={form.approvedValue} onChange={event => setForm({ ...form, approvedValue: event.target.value })} className={fieldClass} /></label>
                                    <label className={labelClass}>VALOR RECHAZADO<input type="number" min="0" step="0.01" value={form.rejectedValue} onChange={event => setForm({ ...form, rejectedValue: event.target.value })} className={fieldClass} /></label>
                                    <label className={`${labelClass} md:col-span-2`}>MOTIVO DEL RECHAZO<input required={Number(form.rejectedValue || 0) > 0} value={form.rejectionReason} onChange={event => setForm({ ...form, rejectionReason: event.target.value })} className={fieldClass} /></label>
                                    <label className={labelClass}>LOTE DEL VEHICULO O PIEZA<input value={form.vehicleOrPartLot} onChange={event => setForm({ ...form, vehicleOrPartLot: event.target.value })} className={fieldClass} /></label>
                                    <label className={labelClass}>FECHA DE FABRICACION<input type="date" value={form.manufacturingDate} onChange={event => setForm({ ...form, manufacturingDate: event.target.value })} className={fieldClass} /></label>
                                </div>
                            </section>

                            <section className="space-y-4 p-5">
                                <h3 className="text-sm font-bold text-slate-800">FACTURA Y PAGO DEL FABRICANTE</h3>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <label className={labelClass}>NUMERO DE FACTURA<input value={form.manufacturerInvoiceNumber} onChange={event => setForm({ ...form, manufacturerInvoiceNumber: event.target.value })} className={fieldClass} /></label>
                                    <label className={labelClass}>FECHA DE FACTURA<input type="date" value={form.manufacturerInvoiceDate} onChange={event => setForm({ ...form, manufacturerInvoiceDate: event.target.value })} className={fieldClass} /></label>
                                    <label className={labelClass}>TOTAL DE LA FACTURA<input type="number" min="0" step="0.01" value={form.manufacturerInvoiceTotal} onChange={event => setForm({ ...form, manufacturerInvoiceTotal: event.target.value })} className={fieldClass} /></label>
                                    <label className={labelClass}>FECHA DE PAGO<input type="date" value={form.manufacturerPaidAt} onChange={event => setForm({ ...form, manufacturerPaidAt: event.target.value })} className={fieldClass} /></label>
                                    <label className={`${labelClass} md:col-span-2`}>REFERENCIA DEL PAGO<input value={form.manufacturerPaymentReference} onChange={event => setForm({ ...form, manufacturerPaymentReference: event.target.value })} className={fieldClass} /></label>
                                </div>
                                {currentWarranty?.coveredWarrantyIds?.length ? <p className="text-xs text-slate-600">GARANTIAS CUBIERTAS POR ESTA FACTURA: {currentWarranty.coveredWarrantyIds.map(id => `#${id}`).join(', ')}</p> : null}
                            </section>

                            {currentWarranty && <section className="space-y-3 p-5"><h3 className="text-sm font-bold text-slate-800">HISTORIAL DE ESTADOS DEL FABRICANTE</h3><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-100 text-xs text-slate-600"><tr><th className="px-3 py-2 text-left">ESTADO</th><th className="px-3 py-2 text-left">FECHA</th><th className="px-3 py-2 text-left">RESPONSABLE</th><th className="px-3 py-2 text-left">NOTA</th></tr></thead><tbody className="divide-y divide-slate-200">{currentWarranty.statusHistory.map(history => <tr key={history.id}><td className="px-3 py-2 font-semibold">{history.manufacturerStatus}</td><td className="px-3 py-2">{new Date(history.changedAt).toLocaleString()}</td><td className="px-3 py-2">{history.changedByName || 'SISTEMA'}</td><td className="px-3 py-2">{history.notes || '-'}</td></tr>)}</tbody></table></div></section>}

                            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4">
                                <button type="button" onClick={closeModal} className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">CANCELAR</button>
                                <button type="submit" disabled={saving} className="rounded bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{saving ? 'GUARDANDO...' : 'GUARDAR GARANTIA'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Warranties;
