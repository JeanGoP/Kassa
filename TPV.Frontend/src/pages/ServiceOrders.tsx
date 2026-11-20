import { useEffect, useMemo, useState } from 'react';
import {
    Car,
    Check,
    CheckCircle2,
    ClipboardList,
    FileText,
    Plus,
    RefreshCw,
    Search,
    Stethoscope,
    Trash2,
    Wrench,
    XCircle
} from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../api/axios';
import VehicleIntake from './VehicleIntake';

type WorkspaceTab = 'intake' | 'diagnosis' | 'works' | 'parts' | 'closure';

interface StatusHistory {
    id: number;
    status: string;
    changedAt: string;
    changedByName?: string;
    notes?: string;
}

interface ServiceOrder {
    id: number;
    branchId?: number;
    orderNumber: string;
    customerName: string;
    plate: string;
    brand: string;
    model: string;
    year: number;
    mileage: number;
    chassisNumber?: string;
    intakeDateTime: string;
    promisedDeliveryDateTime?: string;
    exitDateTime?: string;
    status: string;
    workshopManager?: string;
    receivedByName?: string;
    fuelLevel?: string;
    initialObservations?: string;
    visualCondition?: string;
    visualEvidenceImages?: string[];
    intakeCustomerSignatureDataUrl?: string;
    problemDescription?: string;
    technicalDiagnosis?: string;
    customerApprovedDiagnosis?: boolean | null;
    diagnosisApprovalDate?: string;
    diagnosedAt?: string;
    diagnosedByName?: string;
    technician?: string;
    deliveryNotes?: string;
    statusHistory?: StatusHistory[];
}

interface ServiceOrderWork {
    id: number;
    description: string;
    technician?: string;
    estimatedTimeHours?: number;
    actualTimeHours?: number;
    laborCost: number;
    taxRate: number;
    payer: string;
    addsToCustomerTotal: boolean;
    serviceType: string;
    status: string;
}

interface ServiceOrderPart {
    id: number;
    productId: number;
    productName: string;
    sku: string;
    quantity: number;
    unitCode: string;
    lineType: string;
    payer: string;
    addsToCustomerTotal: boolean;
    unitPrice: number;
    discountAmount: number;
    subTotal: number;
}

interface Invoice {
    saleId: number;
    invoiceNumber: string;
    date: string;
    totalAmount: number;
    paymentMethod: string;
}

interface ServiceOrderWorkspaceData {
    order: ServiceOrder;
    works: ServiceOrderWork[];
    parts: ServiceOrderPart[];
    invoice?: Invoice | null;
    billableLaborTotal: number;
    billableLaborTaxTotal: number;
    billablePartsTotal: number;
    estimatedCustomerTotal: number;
    hasDiagnosis: boolean;
    allWorksCompleted: boolean;
    canEdit: boolean;
    canClose: boolean;
    canInvoice: boolean;
}

interface MotorcycleService {
    id: number;
    name: string;
    description?: string;
    estimatedMinutes?: number;
    price: number;
    taxRate: number;
}

interface ProductSearchResult {
    id: number;
    name: string;
    sku: string;
    price: number;
    stockQuantity: number;
}

interface DraftPart extends ProductSearchResult {
    quantity: number;
    lineType: 'REPUESTO' | 'INSUMO';
    payer: 'CLIENTE' | 'FABRICA' | 'INTERNO';
    addsToCustomerTotal: boolean;
}

const tabs: Array<{ id: WorkspaceTab; label: string; icon: typeof Car }> = [
    { id: 'intake', label: 'Ingreso', icon: Car },
    { id: 'diagnosis', label: 'Diagnóstico', icon: Stethoscope },
    { id: 'works', label: 'Trabajos y repuestos', icon: Wrench },
    { id: 'closure', label: 'Cierre y factura', icon: CheckCircle2 }
];

const money = (value: number) => new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
}).format(value || 0);

const localDateTime = () => {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
};

const errorMessage = (error: unknown, fallback: string) => {
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = (error as { response?: { data?: unknown } }).response;
        const data = response?.data;
        if (typeof data === 'string' && data.trim()) return data;
        if (typeof data === 'object' && data !== null && 'message' in data) {
            const message = (data as { message?: unknown }).message;
            if (typeof message === 'string' && message.trim()) return message;
        }
    }
    return fallback;
};

const ServiceOrders = () => {
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const [search, setSearch] = useState('');
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [workspace, setWorkspace] = useState<ServiceOrderWorkspaceData | null>(null);
    const [loadingWorkspace, setLoadingWorkspace] = useState(false);
    const [creating, setCreating] = useState(false);
    const [activeTab, setActiveTab] = useState<WorkspaceTab>('intake');

    const [problemDescription, setProblemDescription] = useState('');
    const [technicalDiagnosis, setTechnicalDiagnosis] = useState('');
    const [customerApproval, setCustomerApproval] = useState('PENDIENTE');
    const [approvalDate, setApprovalDate] = useState('');
    const [savingDiagnosis, setSavingDiagnosis] = useState(false);

    const [serviceCatalog, setServiceCatalog] = useState<MotorcycleService[]>([]);
    const [serviceSearch, setServiceSearch] = useState('');
    const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
    const [serviceOptionsOpen, setServiceOptionsOpen] = useState(false);
    const [serviceCatalogError, setServiceCatalogError] = useState('');
    const [workEstimatedHours, setWorkEstimatedHours] = useState('');
    const [workReviewMileage, setWorkReviewMileage] = useState('');
    const [workCost, setWorkCost] = useState('');
    const [workTaxRate, setWorkTaxRate] = useState('0');
    const [workPayer, setWorkPayer] = useState('CLIENTE');
    const [workAddsToTotal, setWorkAddsToTotal] = useState(true);
    const [workType, setWorkType] = useState('CORRECTIVO');
    const [savingWork, setSavingWork] = useState(false);

    const [productSearch, setProductSearch] = useState('');
    const [productResults, setProductResults] = useState<ProductSearchResult[]>([]);
    const [draftParts, setDraftParts] = useState<DraftPart[]>([]);
    const [savingParts, setSavingParts] = useState(false);

    const [allServicesCompleted, setAllServicesCompleted] = useState(false);
    const [materialsProcessed, setMaterialsProcessed] = useState(false);
    const [noPendingTechnicalNotes, setNoPendingTechnicalNotes] = useState(false);
    const [deliveryNotes, setDeliveryNotes] = useState('');
    const [exitDateTime, setExitDateTime] = useState(localDateTime);
    const [customerSignatureName, setCustomerSignatureName] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [savingClosure, setSavingClosure] = useState(false);
    const [generatingInvoice, setGeneratingInvoice] = useState(false);

    const loadOrders = async (term = search) => {
        setLoadingOrders(true);
        try {
            const response = await api.get(`/ServiceOrders?search=${encodeURIComponent(term.trim())}`);
            setOrders(response.data || []);
        } catch (error) {
            await Swal.fire('No se pudieron cargar las órdenes', errorMessage(error, 'Intenta nuevamente.'), 'error');
        } finally {
            setLoadingOrders(false);
        }
    };

    const loadWorkspace = async (orderId: number, nextTab?: WorkspaceTab) => {
        setLoadingWorkspace(true);
        setCreating(false);
        try {
            const response = await api.get(`/ServiceOrders/${orderId}/workspace`);
            const data = response.data as ServiceOrderWorkspaceData;
            setWorkspace(data);
            setProblemDescription(data.order.problemDescription || '');
            setTechnicalDiagnosis(data.order.technicalDiagnosis || '');
            setCustomerApproval(data.order.customerApprovedDiagnosis === true
                ? 'APROBADO'
                : data.order.customerApprovedDiagnosis === false ? 'NO_APROBADO' : 'PENDIENTE');
            setApprovalDate(data.order.diagnosisApprovalDate?.slice(0, 10) || '');
            if (nextTab) setActiveTab(nextTab);
        } catch (error) {
            await Swal.fire('No se pudo abrir la orden', errorMessage(error, 'La orden ya no está disponible.'), 'error');
        } finally {
            setLoadingWorkspace(false);
        }
    };

    useEffect(() => {
        api.get('/MotorcycleServices')
            .then(response => {
                setServiceCatalog(response.data || []);
                setServiceCatalogError('');
            })
            .catch(() => {
                setServiceCatalog([]);
                setServiceCatalogError('No se pudo cargar el catálogo de servicios.');
            });
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => loadOrders(search), 250);
        return () => window.clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const clean = productSearch.trim();
        if (clean.length < 2) {
            setProductResults([]);
            return;
        }
        const timer = window.setTimeout(async () => {
            try {
                const response = await api.get(`/sales/products?search=${encodeURIComponent(clean)}`);
                setProductResults(response.data || []);
            } catch {
                setProductResults([]);
            }
        }, 250);
        return () => window.clearTimeout(timer);
    }, [productSearch]);

    const filteredServices = useMemo(() => {
        const term = serviceSearch.trim().toLocaleLowerCase();
        return serviceCatalog
            .filter(service => selectedServiceId !== null || !term || `${service.name} ${service.description || ''}`.toLocaleLowerCase().includes(term))
            .slice(0, 8);
    }, [selectedServiceId, serviceCatalog, serviceSearch]);

    const selectService = (service: MotorcycleService) => {
        setSelectedServiceId(service.id);
        setServiceSearch(service.name);
        setServiceOptionsOpen(false);
        setWorkEstimatedHours(service.estimatedMinutes ? (service.estimatedMinutes / 60).toFixed(2) : '');
        setWorkCost(service.price.toString());
        setWorkTaxRate(service.taxRate.toString());
    };

    const saveDiagnosis = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!workspace) return;
        setSavingDiagnosis(true);
        try {
            await api.put(`/ServiceOrders/${workspace.order.id}/diagnosis`, {
                problemDescription,
                technicalDiagnosis,
                customerApproved: customerApproval === 'PENDIENTE' ? null : customerApproval === 'APROBADO',
                approvalDate: approvalDate ? new Date(`${approvalDate}T12:00:00`).toISOString() : null
            });
            await loadWorkspace(workspace.order.id, 'diagnosis');
            await loadOrders();
            await Swal.fire('Diagnóstico guardado', 'La orden quedó actualizada.', 'success');
        } catch (error) {
            await Swal.fire('No se pudo guardar', errorMessage(error, 'Revisa los datos del diagnóstico.'), 'error');
        } finally {
            setSavingDiagnosis(false);
        }
    };

    const saveWork = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!workspace) return;
        const selectedService = serviceCatalog.find(service => service.id === selectedServiceId);
        if (!selectedService || selectedService.name !== serviceSearch) {
            setServiceOptionsOpen(true);
            await Swal.fire('Selecciona un servicio', 'El trabajo debe corresponder a un servicio activo del catálogo.', 'warning');
            return;
        }
        const assignedTechnician = workspace.order.technician?.trim();
        if (!assignedTechnician) {
            await Swal.fire('Orden sin técnico', 'Esta orden debe tener un técnico asignado desde el ingreso del vehículo.', 'warning');
            return;
        }
        setSavingWork(true);
        try {
            await api.post(`/ServiceOrders/${workspace.order.id}/works`, {
                productId: null,
                description: serviceSearch,
                technician: assignedTechnician,
                estimatedTimeHours: workEstimatedHours ? Number(workEstimatedHours) : null,
                actualTimeHours: null,
                laborCost: workCost ? Number(workCost) : 0,
                taxRate: workTaxRate ? Number(workTaxRate) : 0,
                payer: workPayer,
                addsToCustomerTotal: workAddsToTotal,
                serviceType: workType,
                maintenanceReviewMileage: workType === 'PREVENTIVO' && workReviewMileage ? Number(workReviewMileage) : null,
                status: 'PENDIENTE'
            });
            setSelectedServiceId(null);
            setServiceSearch('');
            setWorkEstimatedHours('');
            setWorkCost('');
            setWorkTaxRate('0');
            setWorkReviewMileage('');
            setWorkPayer('CLIENTE');
            setWorkAddsToTotal(true);
            setWorkType('CORRECTIVO');
            setServiceOptionsOpen(false);
            await loadWorkspace(workspace.order.id, 'works');
        } catch (error) {
            await Swal.fire('No se pudo agregar el trabajo', errorMessage(error, 'Revisa los datos ingresados.'), 'error');
        } finally {
            setSavingWork(false);
        }
    };

    const toggleWork = async (work: ServiceOrderWork) => {
        if (!workspace) return;
        try {
            let actualTimeHours = work.actualTimeHours || null;
            if (work.status !== 'REALIZADO') {
                const result = await Swal.fire({
                    title: 'Finalizar trabajo',
                    input: 'number',
                    inputLabel: 'Tiempo real en horas',
                    inputValue: work.actualTimeHours || work.estimatedTimeHours || '',
                    inputAttributes: { min: '0.01', step: '0.01' },
                    showCancelButton: true,
                    confirmButtonText: 'Marcar realizado',
                    cancelButtonText: 'Cancelar',
                    inputValidator: value => {
                        const hours = Number(value);
                        if (!Number.isFinite(hours) || hours < 0.01) return 'Registra un tiempo de al menos 0,01 horas.';
                        if (Number(hours.toFixed(2)) !== hours) return 'Usa hasta dos decimales para el tiempo real.';
                    }
                });
                if (!result.isConfirmed) return;
                actualTimeHours = Number(result.value);
            }
            await api.put(`/ServiceOrders/${workspace.order.id}/works/${work.id}/status`, {
                status: work.status === 'REALIZADO' ? 'PENDIENTE' : 'REALIZADO',
                actualTimeHours
            });
            await loadWorkspace(workspace.order.id, 'works');
        } catch (error) {
            await Swal.fire('No se pudo actualizar', errorMessage(error, 'Intenta nuevamente.'), 'error');
        }
    };

    const addDraftPart = (product: ProductSearchResult) => {
        if (product.stockQuantity <= 0) {
            Swal.fire('Sin existencia', 'El artículo no tiene disponibilidad en esta sucursal.', 'warning');
            return;
        }
        setDraftParts(previous => {
            const existing = previous.find(item => item.id === product.id);
            if (existing) {
                return previous.map(item => item.id === product.id
                    ? { ...item, quantity: Math.min(item.quantity + 1, item.stockQuantity) }
                    : item);
            }
            return [...previous, {
                ...product,
                quantity: 1,
                lineType: 'REPUESTO',
                payer: 'CLIENTE',
                addsToCustomerTotal: true
            }];
        });
        setProductSearch('');
        setProductResults([]);
    };

    const confirmParts = async () => {
        if (!workspace || draftParts.length === 0) return;
        setSavingParts(true);
        try {
            await api.post(`/ServiceOrders/${workspace.order.id}/parts/confirm`, {
                items: draftParts.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    unitOfMeasureId: null,
                    discountType: 'NONE',
                    discountValue: 0,
                    lineType: item.lineType,
                    payer: item.payer,
                    addsToCustomerTotal: item.addsToCustomerTotal,
                    serviceType: 'CORRECTIVO',
                    maintenanceReviewMileage: null,
                    technician: null,
                    estimatedTimeHours: null,
                    actualTimeHours: null
                }))
            });
            setDraftParts([]);
            await loadWorkspace(workspace.order.id, 'works');
            await Swal.fire('Consumo registrado', 'Los artículos se descontaron del inventario y quedaron ligados a la orden.', 'success');
        } catch (error) {
            await Swal.fire('No se pudo registrar el consumo', errorMessage(error, 'Revisa cantidades y existencias.'), 'error');
        } finally {
            setSavingParts(false);
        }
    };

    const closeOrder = async () => {
        if (!workspace) return;
        setSavingClosure(true);
        try {
            await api.put(`/ServiceOrders/${workspace.order.id}/close`, {
                allServicesCompleted,
                materialsProcessed,
                noPendingTechnicalNotes,
                deliveryNotes,
                exitDateTime: exitDateTime || null,
                closeType: 'NORMAL',
                closeReason: null,
                customerSignatureName,
                specialCloseSupervisorName: null
            });
            await loadWorkspace(workspace.order.id, 'closure');
            await loadOrders();
            await Swal.fire('Orden finalizada', 'Ya está lista para generar la factura.', 'success');
        } catch (error) {
            await Swal.fire('No se pudo finalizar', errorMessage(error, 'Verifica el diagnóstico, los trabajos y el checklist.'), 'error');
        } finally {
            setSavingClosure(false);
        }
    };

    const generateInvoice = async () => {
        if (!workspace) return;
        setGeneratingInvoice(true);
        try {
            const response = await api.post(`/ServiceOrders/${workspace.order.id}/invoice`, {
                laborCost: workspace.billableLaborTotal,
                paymentMethod
            });
            await loadWorkspace(workspace.order.id, 'closure');
            await loadOrders();
            await Swal.fire('Factura generada', `Documento ${response.data.invoiceNumber}`, 'success');
        } catch (error) {
            await Swal.fire('No se pudo facturar', errorMessage(error, 'Revisa el estado de la orden.'), 'error');
        } finally {
            setGeneratingInvoice(false);
        }
    };

    const cancelOrder = async () => {
        if (!workspace) return;
        const result = await Swal.fire({
            title: 'Anular orden',
            input: 'textarea',
            inputLabel: 'Motivo obligatorio',
            showCancelButton: true,
            confirmButtonText: 'Anular orden',
            cancelButtonText: 'Volver',
            confirmButtonColor: '#dc2626',
            inputValidator: value => value?.trim() ? undefined : 'Indica el motivo de anulación.'
        });
        if (!result.isConfirmed) return;
        try {
            await api.put(`/ServiceOrders/${workspace.order.id}/cancel`, { reason: result.value.trim() });
            await loadWorkspace(workspace.order.id, activeTab);
            await loadOrders();
        } catch (error) {
            await Swal.fire('No se pudo anular', errorMessage(error, 'Intenta nuevamente.'), 'error');
        }
    };

    const statusClass = (status: string) => {
        if (status === 'CERRADA') return 'bg-emerald-100 text-emerald-800';
        if (status === 'FINALIZADA') return 'bg-cyan-100 text-cyan-800';
        if (status === 'CANCELADA' || status === 'ANULADA') return 'bg-red-100 text-red-800';
        return 'bg-blue-100 text-blue-800';
    };

    return (
        <div className="space-y-4">
            <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Órdenes de servicio</p>
                    <h1 className="text-2xl font-extrabold text-slate-950">Expediente de taller</h1>
                    <p className="mt-1 text-sm text-slate-600">Ingreso, diagnóstico, ejecución, consumos, cierre y factura en un solo lugar.</p>
                </div>
                <button
                    type="button"
                    onClick={() => { setCreating(true); setWorkspace(null); setActiveTab('intake'); }}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
                >
                    <Plus size={18} /> Nuevo ingreso
                </button>
            </header>

            {creating ? (
                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-4">
                        <div>
                            <h2 className="text-lg font-extrabold text-slate-950">Registrar vehículo</h2>
                            <p className="text-sm text-slate-500">Al guardar, el expediente quedará abierto en esta misma pantalla.</p>
                        </div>
                        <button type="button" onClick={() => setCreating(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancelar</button>
                    </div>
                    <VehicleIntake
                        embedded
                        onOrderCreated={order => {
                            loadOrders('');
                            loadWorkspace(order.id, 'intake');
                        }}
                    />
                </section>
            ) : (
                <div className="grid min-h-[680px] gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
                    <aside className="self-start rounded-lg border border-slate-200 bg-white shadow-sm xl:sticky xl:top-20">
                        <div className="border-b border-slate-200 p-4">
                            <label className="text-xs font-bold uppercase text-slate-500">Buscar orden</label>
                            <div className="mt-2 flex gap-2">
                                <div className="relative min-w-0 flex-1">
                                    <Search size={17} className="absolute left-3 top-3 text-slate-400" />
                                    <input
                                        value={search}
                                        onChange={event => setSearch(event.target.value)}
                                        onKeyDown={event => { if (event.key === 'Enter') loadOrders(); }}
                                        placeholder="Orden, placa o cliente"
                                        className="h-11 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    />
                                </div>
                                <button type="button" onClick={() => loadOrders()} title="Buscar" className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">
                                    {loadingOrders ? <RefreshCw size={17} className="animate-spin" /> : <Search size={17} />}
                                </button>
                            </div>
                        </div>
                        <div className="max-h-[520px] overflow-y-auto p-2 xl:max-h-[calc(100vh-250px)]">
                            {orders.map(order => (
                                <button
                                    key={order.id}
                                    type="button"
                                    onClick={() => loadWorkspace(order.id)}
                                    className={`mb-1 w-full rounded-md border px-3 py-3 text-left transition ${workspace?.order.id === order.id ? 'border-blue-300 bg-blue-50' : 'border-transparent hover:bg-slate-50'}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="text-sm font-extrabold text-slate-900">{order.orderNumber || `OS-${order.id}`}</span>
                                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${statusClass(order.status)}`}>{order.status}</span>
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-slate-700">{order.plate} · {order.customerName}</div>
                                    <div className="mt-1 text-xs text-slate-500">{new Date(order.intakeDateTime).toLocaleString()}</div>
                                </button>
                            ))}
                            {!loadingOrders && orders.length === 0 && <p className="px-3 py-8 text-center text-sm text-slate-500">No hay órdenes para mostrar.</p>}
                        </div>
                    </aside>

                    <main className="min-w-0">
                        {loadingWorkspace ? (
                            <div className="flex min-h-96 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500"><RefreshCw className="mr-2 animate-spin" size={18} /> Cargando expediente...</div>
                        ) : !workspace ? (
                            <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 text-center">
                                <ClipboardList size={42} className="text-slate-300" />
                                <h2 className="mt-4 text-lg font-extrabold text-slate-900">Selecciona una orden</h2>
                                <p className="mt-1 max-w-md text-sm text-slate-500">Abre un expediente existente o registra un nuevo ingreso para continuar todo el proceso de taller.</p>
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                                <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="text-xl font-extrabold text-slate-950">{workspace.order.orderNumber || `OS-${workspace.order.id}`}</h2>
                                                <span className={`rounded-md px-2 py-1 text-xs font-bold ${statusClass(workspace.order.status)}`}>{workspace.order.status}</span>
                                            </div>
                                            <p className="mt-1 text-sm font-semibold text-slate-700">{workspace.order.plate} · {workspace.order.brand} {workspace.order.model} · {workspace.order.customerName}</p>
                                            <p className="mt-1 text-xs text-slate-500">Ingreso {new Date(workspace.order.intakeDateTime).toLocaleString()} · {workspace.order.mileage.toLocaleString()} km</p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 text-right">
                                            <div><div className="text-[10px] font-bold uppercase text-slate-500">Trabajos</div><div className="text-sm font-extrabold text-slate-900">{money(workspace.billableLaborTotal)}</div><div className="text-[10px] font-semibold text-slate-500">IVA {money(workspace.billableLaborTaxTotal)}</div></div>
                                            <div><div className="text-[10px] font-bold uppercase text-slate-500">Repuestos</div><div className="text-sm font-extrabold text-slate-900">{money(workspace.billablePartsTotal)}</div></div>
                                            <div><div className="text-[10px] font-bold uppercase text-slate-500">Estimado</div><div className="text-sm font-extrabold text-blue-700">{money(workspace.estimatedCustomerTotal)}</div></div>
                                        </div>
                                    </div>
                                </div>

                                <nav className="overflow-x-auto border-b border-slate-200 bg-slate-50" aria-label="Etapas de la orden">
                                    <div className="flex min-w-max px-2">
                                        {tabs.map(tab => {
                                            const Icon = tab.icon;
                                            const complete = tab.id === 'intake'
                                                || (tab.id === 'diagnosis' && workspace.hasDiagnosis)
                                                || (tab.id === 'works' && workspace.works.length > 0 && workspace.allWorksCompleted)
                                                || (tab.id === 'parts' && workspace.parts.length > 0)
                                                || (tab.id === 'closure' && workspace.order.status === 'CERRADA');
                                            return (
                                                <button
                                                    key={tab.id}
                                                    type="button"
                                                    onClick={() => setActiveTab(tab.id)}
                                                    className={`relative flex h-14 items-center gap-2 px-4 text-sm font-bold ${activeTab === tab.id ? 'text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
                                                >
                                                    <Icon size={17} /> {tab.label}
                                                    {complete && <Check size={14} className="text-emerald-600" />}
                                                    {activeTab === tab.id && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-blue-600" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </nav>

                                <div className="p-4 sm:p-6">
                                    {activeTab === 'intake' && (
                                        <div className="space-y-6">
                                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                                {[
                                                    ['Fecha y hora de ingreso', new Date(workspace.order.intakeDateTime).toLocaleString()],
                                                    ['Cliente', workspace.order.customerName],
                                                    ['Vehículo', `${workspace.order.brand} ${workspace.order.model} ${workspace.order.year}`],
                                                    ['Chasis / VIN', workspace.order.chassisNumber || 'Sin registrar'],
                                                    ['Técnico asignado', workspace.order.technician || 'Sin asignar'],
                                                    ['Jefe de taller', workspace.order.workshopManager || 'Sin asignar'],
                                                    ['Combustible', workspace.order.fuelLevel || 'Sin registrar'],
                                                    ['Recibido por usuario', workspace.order.receivedByName || 'Sin registrar'],
                                                    ['Entrega prometida', workspace.order.promisedDeliveryDateTime ? new Date(workspace.order.promisedDeliveryDateTime).toLocaleString() : 'Sin definir'],
                                                    ['Firma de ingreso', workspace.order.intakeCustomerSignatureDataUrl ? 'Capturada' : 'No capturada']
                                                ].map(([label, value]) => (
                                                    <div key={label} className="border-b border-slate-200 pb-3">
                                                        <div className="text-xs font-bold uppercase text-slate-500">{label}</div>
                                                        <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="grid gap-5 lg:grid-cols-2">
                                                <div>
                                                    <h3 className="text-sm font-extrabold text-slate-900">Observaciones iniciales</h3>
                                                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{workspace.order.initialObservations || 'Sin observaciones.'}</p>
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-extrabold text-slate-900">Estado visual</h3>
                                                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{workspace.order.visualCondition || 'Sin novedades registradas.'}</p>
                                                </div>
                                            </div>
                                            {(workspace.order.visualEvidenceImages || []).length > 0 && (
                                                <div>
                                                    <h3 className="mb-3 text-sm font-extrabold text-slate-900">Evidencias fotográficas</h3>
                                                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                                                        {(workspace.order.visualEvidenceImages || []).map((image, index) => (
                                                            <a key={index} href={image} target="_blank" rel="noreferrer" className="block aspect-[4/3] overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                                                                <img src={image} alt={`Evidencia ${index + 1}`} className="h-full w-full object-contain" />
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'diagnosis' && (
                                        <form onSubmit={saveDiagnosis} className="space-y-5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div><h3 className="text-lg font-extrabold text-slate-950">Diagnóstico</h3><p className="text-sm text-slate-500">Registra lo informado por el cliente y la conclusión técnica.</p></div>
                                                {workspace.order.diagnosedByName && <span className="text-xs text-slate-500">Último registro: {workspace.order.diagnosedByName}</span>}
                                            </div>
                                            <fieldset disabled={!workspace.canEdit} className="space-y-5 disabled:opacity-70">
                                                <div className="grid gap-4 lg:grid-cols-2">
                                                    <label className="space-y-1"><span className="text-xs font-bold uppercase text-slate-600">Problema reportado</span><textarea required value={problemDescription} onChange={event => setProblemDescription(event.target.value)} className="min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                                                    <label className="space-y-1"><span className="text-xs font-bold uppercase text-slate-600">Diagnóstico técnico</span><textarea required value={technicalDiagnosis} onChange={event => setTechnicalDiagnosis(event.target.value)} className="min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                                                </div>
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <label className="space-y-1"><span className="text-xs font-bold uppercase text-slate-600">Aprobación del cliente</span><select value={customerApproval} onChange={event => setCustomerApproval(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"><option value="PENDIENTE">Pendiente</option><option value="APROBADO">Aprobado</option><option value="NO_APROBADO">No aprobado</option></select></label>
                                                    <label className="space-y-1"><span className="text-xs font-bold uppercase text-slate-600">Fecha de aprobación</span><input type="date" value={approvalDate} onChange={event => setApprovalDate(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>
                                                </div>
                                                <div className="flex justify-end"><button disabled={savingDiagnosis} className="h-11 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{savingDiagnosis ? 'Guardando...' : 'Guardar diagnóstico'}</button></div>
                                            </fieldset>
                                        </form>
                                    )}

                                    {activeTab === 'works' && (
                                        <div className="space-y-6">
                                            <form onSubmit={saveWork} className="space-y-4 border-b border-slate-200 pb-6">
                                                <div><h3 className="text-lg font-extrabold text-slate-950">Trabajos y servicios</h3><p className="text-sm text-slate-500">Selecciona el servicio, asigna técnico, tiempo y valor.</p></div>
                                                <fieldset disabled={!workspace.canEdit} className="grid gap-3 lg:grid-cols-12 disabled:opacity-70">
                                                    <div className="relative space-y-1 lg:col-span-4">
                                                        <label htmlFor="service-order-work-service" className="block text-xs font-bold uppercase text-slate-600">Servicio del catálogo</label>
                                                        <div className="relative">
                                                            <input
                                                                id="service-order-work-service"
                                                                required
                                                                autoComplete="off"
                                                                value={serviceSearch}
                                                                onFocus={() => setServiceOptionsOpen(true)}
                                                                onBlur={() => window.setTimeout(() => setServiceOptionsOpen(false), 150)}
                                                                onChange={event => {
                                                                    setServiceSearch(event.target.value);
                                                                    setSelectedServiceId(null);
                                                                    setServiceOptionsOpen(true);
                                                                }}
                                                                onKeyDown={event => {
                                                                    if (event.key === 'Escape') setServiceOptionsOpen(false);
                                                                    if (event.key === 'Enter' && serviceOptionsOpen && filteredServices.length > 0) {
                                                                        event.preventDefault();
                                                                        selectService(filteredServices[0]);
                                                                    }
                                                                }}
                                                                placeholder="Buscar y seleccionar servicio..."
                                                                className={`h-11 w-full rounded-lg border px-3 pr-10 text-sm outline-none focus:ring-2 ${selectedServiceId ? 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-100' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'}`}
                                                            />
                                                            {selectedServiceId && <Check size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600" />}
                                                        </div>
                                                        {serviceCatalogError && <span className="block text-xs font-semibold text-red-600">{serviceCatalogError}</span>}
                                                        {serviceOptionsOpen && (
                                                            <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-xl">
                                                                {filteredServices.map(service => (
                                                                    <button
                                                                        type="button"
                                                                        key={service.id}
                                                                        onMouseDown={event => event.preventDefault()}
                                                                        onClick={() => selectService(service)}
                                                                        className="flex w-full items-start justify-between gap-3 rounded px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                                                                    >
                                                                        <span className="min-w-0">
                                                                            <span className="block font-semibold text-slate-900">{service.name}</span>
                                                                            {service.description && <span className="mt-0.5 block truncate text-xs text-slate-500">{service.description}</span>}
                                                                        </span>
                                                                        <span className="shrink-0 text-right text-xs font-semibold text-slate-500">
                                                                            {service.estimatedMinutes ? <span className="block">{service.estimatedMinutes} min</span> : null}
                                                                            <span className="block text-blue-700">{money(service.price)} + IVA {service.taxRate}%</span>
                                                                        </span>
                                                                    </button>
                                                                ))}
                                                                {filteredServices.length === 0 && (
                                                                    <div className="px-3 py-4 text-center text-sm text-slate-500">
                                                                        {serviceCatalogError || 'No hay servicios del catálogo que coincidan.'}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <label className="space-y-1 lg:col-span-2"><span className="text-xs font-bold uppercase text-slate-600">Tiempo estimado</span><input type="number" min="0" step="0.01" value={workEstimatedHours} onChange={event => setWorkEstimatedHours(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>
                                                    <label className="space-y-1 lg:col-span-2"><span className="text-xs font-bold uppercase text-slate-600">Precio fijo</span><input type="number" min="0" value={workCost} readOnly className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-semibold" /></label>
                                                    <label className="space-y-1 lg:col-span-1"><span className="text-xs font-bold uppercase text-slate-600">IVA %</span><input type="number" value={workTaxRate} readOnly className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-semibold" /></label>
                                                    <label className="space-y-1 lg:col-span-2"><span className="text-xs font-bold uppercase text-slate-600">Pagador</span><select value={workPayer} onChange={event => setWorkPayer(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"><option>CLIENTE</option><option>FABRICA</option><option>INTERNO</option></select></label>
                                                    <label className="space-y-1 lg:col-span-3"><span className="text-xs font-bold uppercase text-slate-600">Tipo de servicio</span><select value={workType} onChange={event => setWorkType(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"><option>PREVENTIVO</option><option>CORRECTIVO</option><option>GARANTIA</option><option>RETRABAJO</option></select></label>
                                                    {workType === 'PREVENTIVO' && <label className="space-y-1 lg:col-span-2"><span className="text-xs font-bold uppercase text-slate-600">Revisión a los km</span><input required type="number" min="1" value={workReviewMileage} onChange={event => setWorkReviewMileage(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>}
                                                    <label className="flex items-center gap-2 pt-6 text-sm font-semibold text-slate-700 lg:col-span-4"><input type="checkbox" checked={workAddsToTotal} onChange={event => setWorkAddsToTotal(event.target.checked)} /> Suma a la factura del cliente</label>
                                                    <div className="flex items-end justify-end lg:col-span-5"><button disabled={savingWork} className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"><Plus size={17} /> Agregar trabajo</button></div>
                                                </fieldset>
                                            </form>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-sm"><thead className="border-b border-slate-200 text-left text-xs font-bold uppercase text-slate-500"><tr><th className="px-3 py-3">Servicio</th><th className="px-3 py-3">Técnico</th><th className="px-3 py-3">Pagador</th><th className="px-3 py-3 text-right">Precio</th><th className="px-3 py-3 text-right">IVA</th><th className="px-3 py-3 text-right">Total</th><th className="px-3 py-3 text-right">Estado</th></tr></thead><tbody className="divide-y divide-slate-100">{workspace.works.map(work => <tr key={work.id}><td className="px-3 py-3 font-semibold text-slate-900">{work.description}</td><td className="px-3 py-3 text-slate-600">{work.technician || 'Sin asignar'}</td><td className="px-3 py-3 text-slate-600">{work.payer}</td><td className="px-3 py-3 text-right font-semibold">{money(work.laborCost)}</td><td className="px-3 py-3 text-right text-slate-600">{work.taxRate}%</td><td className="px-3 py-3 text-right font-bold">{money(work.laborCost * (1 + work.taxRate / 100))}</td><td className="px-3 py-3 text-right"><button type="button" disabled={!workspace.canEdit} onClick={() => toggleWork(work)} className={`rounded-md px-2.5 py-1 text-xs font-bold ${work.status === 'REALIZADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{work.status}</button></td></tr>)}{workspace.works.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">No hay trabajos registrados.</td></tr>}</tbody></table>
                                            </div>
                                        </div>
                                    )}

                                    {(activeTab === 'works' || activeTab === 'parts') && (
                                        <div className="space-y-6">
                                            <div className="border-b border-slate-200 pb-6">
                                                <h3 className="text-lg font-extrabold text-slate-950">Repuestos e insumos</h3>
                                                <p className="text-sm text-slate-500">El consumo descuenta inventario; la factura se genera únicamente al cierre.</p>
                                                <fieldset disabled={!workspace.canEdit} className="mt-4 disabled:opacity-70">
                                                    <label className="relative block max-w-xl space-y-1"><span className="text-xs font-bold uppercase text-slate-600">Buscar artículo</span><div className="relative"><Search size={17} className="absolute left-3 top-3 text-slate-400" /><input value={productSearch} onChange={event => setProductSearch(event.target.value)} placeholder="Nombre, SKU o código" className="h-11 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm" /></div>{productResults.length > 0 && <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white p-1 shadow-xl">{productResults.map(product => <button type="button" key={product.id} onClick={() => addDraftPart(product)} className="flex w-full items-center justify-between rounded px-3 py-2 text-left hover:bg-blue-50"><span><span className="block text-sm font-semibold text-slate-900">{product.sku} · {product.name}</span><span className="text-xs text-slate-500">Disponible {product.stockQuantity}</span></span><span className="text-sm font-bold text-blue-700">{money(product.price)}</span></button>)}</div>}</label>
                                                    {draftParts.length > 0 && <div className="mt-4 space-y-2">{draftParts.map(item => <div key={item.id} className="grid items-end gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_110px_130px_130px_44px]"><div><div className="text-sm font-bold text-slate-900">{item.sku} · {item.name}</div><div className="text-xs text-slate-500">Disponible {item.stockQuantity}</div></div><label className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-500">Cantidad</span><input type="number" min="1" max={item.stockQuantity} value={item.quantity} onChange={event => setDraftParts(previous => previous.map(row => row.id === item.id ? { ...row, quantity: Number(event.target.value) } : row))} className="h-10 w-full rounded-md border border-slate-300 px-2 text-sm" /></label><label className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-500">Tipo</span><select value={item.lineType} onChange={event => setDraftParts(previous => previous.map(row => row.id === item.id ? { ...row, lineType: event.target.value as DraftPart['lineType'] } : row))} className="h-10 w-full rounded-md border border-slate-300 px-2 text-sm"><option>REPUESTO</option><option>INSUMO</option></select></label><label className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-500">Pagador</span><select value={item.payer} onChange={event => setDraftParts(previous => previous.map(row => row.id === item.id ? { ...row, payer: event.target.value as DraftPart['payer'], addsToCustomerTotal: event.target.value === 'CLIENTE' } : row))} className="h-10 w-full rounded-md border border-slate-300 px-2 text-sm"><option>CLIENTE</option><option>FABRICA</option><option>INTERNO</option></select></label><button type="button" title="Quitar" onClick={() => setDraftParts(previous => previous.filter(row => row.id !== item.id))} className="flex h-10 w-10 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50"><Trash2 size={16} /></button></div>)}<div className="flex justify-end pt-2"><button type="button" onClick={confirmParts} disabled={savingParts} className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"><Check size={17} /> {savingParts ? 'Registrando...' : 'Confirmar consumo'}</button></div></div>}
                                                </fieldset>
                                            </div>
                                            <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="border-b border-slate-200 text-left text-xs font-bold uppercase text-slate-500"><tr><th className="px-3 py-3">Artículo</th><th className="px-3 py-3">Tipo</th><th className="px-3 py-3">Pagador</th><th className="px-3 py-3 text-right">Cantidad</th><th className="px-3 py-3 text-right">Total</th></tr></thead><tbody className="divide-y divide-slate-100">{workspace.parts.map(part => <tr key={part.id}><td className="px-3 py-3"><div className="font-semibold text-slate-900">{part.productName}</div><div className="text-xs text-slate-500">{part.sku}</div></td><td className="px-3 py-3 text-slate-600">{part.lineType}</td><td className="px-3 py-3 text-slate-600">{part.payer}</td><td className="px-3 py-3 text-right">{part.quantity} {part.unitCode}</td><td className="px-3 py-3 text-right font-semibold">{money(part.subTotal)}</td></tr>)}{workspace.parts.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No hay consumos registrados.</td></tr>}</tbody></table></div>
                                        </div>
                                    )}

                                    {activeTab === 'closure' && (
                                        <div className="space-y-6">
                                            <div><h3 className="text-lg font-extrabold text-slate-950">Cierre, entrega y facturación</h3><p className="text-sm text-slate-500">Valida el expediente completo antes de entregar el vehículo.</p></div>
                                            <div className="grid gap-3 sm:grid-cols-3">
                                                <div className={`rounded-md border p-3 ${workspace.hasDiagnosis ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><div className="text-xs font-bold uppercase text-slate-600">Diagnóstico</div><div className="mt-1 text-sm font-bold">{workspace.hasDiagnosis ? 'Completo' : 'Pendiente'}</div></div>
                                                <div className={`rounded-md border p-3 ${workspace.allWorksCompleted ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><div className="text-xs font-bold uppercase text-slate-600">Trabajos</div><div className="mt-1 text-sm font-bold">{workspace.allWorksCompleted ? 'Realizados' : 'Hay pendientes'}</div></div>
                                                <div className="rounded-md border border-blue-200 bg-blue-50 p-3"><div className="text-xs font-bold uppercase text-slate-600">Total estimado</div><div className="mt-1 text-sm font-extrabold text-blue-800">{money(workspace.estimatedCustomerTotal)}</div></div>
                                            </div>

                                            {workspace.order.status !== 'FINALIZADA' && workspace.order.status !== 'CERRADA' && workspace.order.status !== 'CANCELADA' && (
                                                <div className="grid gap-6 lg:grid-cols-2">
                                                    <div className="space-y-3">
                                                        <label className="flex items-center gap-3 rounded-md border border-slate-200 p-3 text-sm font-semibold"><input type="checkbox" checked={allServicesCompleted} onChange={event => setAllServicesCompleted(event.target.checked)} /> Servicios terminados</label>
                                                        <label className="flex items-center gap-3 rounded-md border border-slate-200 p-3 text-sm font-semibold"><input type="checkbox" checked={materialsProcessed} onChange={event => setMaterialsProcessed(event.target.checked)} /> Repuestos e insumos procesados</label>
                                                        <label className="flex items-center gap-3 rounded-md border border-slate-200 p-3 text-sm font-semibold"><input type="checkbox" checked={noPendingTechnicalNotes} onChange={event => setNoPendingTechnicalNotes(event.target.checked)} /> Sin pendientes técnicos</label>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <label className="block space-y-1"><span className="text-xs font-bold uppercase text-slate-600">Fecha y hora de salida</span><input type="datetime-local" value={exitDateTime} onChange={event => setExitDateTime(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>
                                                        <label className="block space-y-1"><span className="text-xs font-bold uppercase text-slate-600">Recibido por usuario</span><input value={customerSignatureName} onChange={event => setCustomerSignatureName(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" placeholder="Nombre del usuario que recibe" /></label>
                                                        <label className="block space-y-1"><span className="text-xs font-bold uppercase text-slate-600">Notas de entrega</span><textarea value={deliveryNotes} onChange={event => setDeliveryNotes(event.target.value)} className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                                                    </div>
                                                    <div className="flex flex-wrap justify-between gap-3 lg:col-span-2"><button type="button" onClick={cancelOrder} className="inline-flex h-11 items-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-bold text-red-700 hover:bg-red-50"><XCircle size={17} /> Anular orden</button><button type="button" onClick={closeOrder} disabled={savingClosure || !workspace.canClose || !allServicesCompleted || !materialsProcessed || !noPendingTechnicalNotes} className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 size={17} /> {savingClosure ? 'Finalizando...' : 'Finalizar orden'}</button></div>
                                                </div>
                                            )}

                                            {workspace.order.status === 'FINALIZADA' && !workspace.invoice && (
                                                <div className="flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-end sm:justify-between"><label className="w-full max-w-xs space-y-1"><span className="text-xs font-bold uppercase text-slate-600">Medio de pago</span><select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"><option value="Cash">Efectivo</option><option value="Card">Tarjeta</option><option value="Transfer">Transferencia</option><option value="Credit">Crédito</option></select></label><button type="button" onClick={generateInvoice} disabled={generatingInvoice} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"><FileText size={17} /> {generatingInvoice ? 'Generando...' : 'Generar factura'}</button></div>
                                            )}

                                            {workspace.invoice && (
                                                <div className="flex flex-col gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-xs font-bold uppercase text-emerald-700">Factura generada</div><div className="mt-1 text-lg font-extrabold text-emerald-950">{workspace.invoice.invoiceNumber}</div><div className="text-sm text-emerald-800">{new Date(workspace.invoice.date).toLocaleString()} · {workspace.invoice.paymentMethod}</div></div><div className="text-2xl font-extrabold text-emerald-900">{money(workspace.invoice.totalAmount)}</div></div>
                                            )}

                                            {(workspace.order.statusHistory || []).length > 0 && <div className="border-t border-slate-200 pt-5"><h4 className="text-sm font-extrabold text-slate-900">Trazabilidad</h4><div className="mt-3 space-y-2">{(workspace.order.statusHistory || []).map(history => <div key={history.id} className="flex flex-col justify-between gap-1 border-l-2 border-slate-200 pl-3 text-sm sm:flex-row"><span><strong>{history.status}</strong>{history.notes ? ` · ${history.notes}` : ''}</span><span className="text-xs text-slate-500">{new Date(history.changedAt).toLocaleString()} {history.changedByName ? `· ${history.changedByName}` : ''}</span></div>)}</div></div>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            )}
        </div>
    );
};

export default ServiceOrders;
