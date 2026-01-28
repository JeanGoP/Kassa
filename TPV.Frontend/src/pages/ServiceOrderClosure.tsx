import { useState, useEffect } from 'react';
import api from '../api/axios';

interface InvoiceItem {
    productName: string;
    quantity: number;
    unitPrice: number;
    subTotal: number;
}

interface InvoiceResult {
    saleId: number;
    invoiceNumber: string;
    date: string;
    totalAmount: number;
    paymentMethod: string;
    customerName?: string;
    items: InvoiceItem[];
}

const ServiceOrderClosure = () => {
    const [orderSearch, setOrderSearch] = useState('');
    const [searchingOrders, setSearchingOrders] = useState(false);
    const [orderResults, setOrderResults] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    
    // Checklist
    const [allServicesCompleted, setAllServicesCompleted] = useState(false);
    const [materialsProcessed, setMaterialsProcessed] = useState(false);
    const [noPendingTechnicalNotes, setNoPendingTechnicalNotes] = useState(false);

    // Form fields
    const [deliveryNotes, setDeliveryNotes] = useState('');
    const [exitDateTime, setExitDateTime] = useState('');
    const [customerSignatureName, setCustomerSignatureName] = useState('');
    const [closeType, setCloseType] = useState('NORMAL');
    const [closeReason, setCloseReason] = useState('');
    const [specialCloseSupervisorName, setSpecialCloseSupervisorName] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [laborCost, setLaborCost] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [invoiceGenerating, setInvoiceGenerating] = useState(false);
    const [lastInvoice, setLastInvoice] = useState<InvoiceResult | null>(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);

    useEffect(() => {
        // Set default exit date to now
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setExitDateTime(now.toISOString().slice(0, 16));
    }, []);

    const handleSearchOrders = async () => {
        if (!orderSearch || orderSearch.trim().length < 2) {
            alert('Ingrese al menos 2 caracteres para buscar.');
            return;
        }

        setSearchingOrders(true);
        try {
            const response = await api.get(`/ServiceOrders?search=${encodeURIComponent(orderSearch.trim())}`);
            setOrderResults(response.data);
        } catch {
            alert('Error al buscar órdenes de servicio.');
        } finally {
            setSearchingOrders(false);
        }
    };

    const handleSelectOrder = async (order: any) => {
        if (order.status === 'CERRADA') {
            alert('Esta orden ya se encuentra cerrada y facturada.');
            return;
        }
        setSelectedOrder(order);
        setAllServicesCompleted(false);
        setMaterialsProcessed(false);
        setNoPendingTechnicalNotes(false);
        setDeliveryNotes('');
        setCustomerSignatureName('');
        setCloseType('NORMAL');
        setCloseReason('');
        setSpecialCloseSupervisorName('');
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setExitDateTime(now.toISOString().slice(0, 16));
        try {
            const worksResponse = await api.get(`/ServiceOrders/${order.id}/works`);
            const works = worksResponse.data || [];
            const totalLabor = works
                .filter((w: any) => w.status === 'REALIZADO')
                .reduce((sum: number, w: any) => sum + (w.laborCost || 0), 0);
            setLaborCost(totalLabor > 0 ? totalLabor.toFixed(2) : '0');
        } catch {
            setLaborCost('0');
        }
    };

    const handlePrintReceipt = (order: any, payload: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charSet="utf-8" />
    <title>Comprobante de cierre de orden de servicio</title>
    <style>
        :root {
            --bg-page: #f3f4f6;
            --bg-card: #ffffff;
            --border-subtle: #e5e7eb;
            --text-main: #111827;
            --text-muted: #6b7280;
            --accent: #111827;
            --badge-finalized-bg: #ecfdf3;
            --badge-finalized-text: #166534;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            padding: 32px 16px;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background-color: var(--bg-page);
            color: var(--text-main);
        }

        .page {
            max-width: 840px;
            margin: 0 auto;
            background-color: var(--bg-card);
            border-radius: 16px;
            box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12);
            padding: 28px 32px 30px;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
        }

        .brand {
            font-size: 14px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--text-muted);
        }

        .title {
            font-size: 22px;
            font-weight: 700;
            margin-top: 4px;
            color: var(--accent);
        }

        .meta {
            text-align: right;
            font-size: 12px;
            color: var(--text-muted);
        }

        .meta-row {
            margin-bottom: 4px;
        }

        .badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }

        .badge-finalized {
            background-color: var(--badge-finalized-bg);
            color: var(--badge-finalized-text);
        }

        .section {
            padding-top: 18px;
            margin-top: 18px;
            border-top: 1px solid var(--border-subtle);
        }

        .section-title {
            font-size: 12px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: var(--text-muted);
            margin-bottom: 10px;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px 24px;
            font-size: 13px;
        }

        .field-label {
            font-size: 11px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--text-muted);
            margin-bottom: 2px;
        }

        .field-value {
            font-size: 13px;
        }

        .field-value-strong {
            font-size: 14px;
            font-weight: 600;
        }

        .text-content {
            margin-top: 4px;
            padding: 10px 12px;
            min-height: 64px;
            border-radius: 10px;
            border: 1px solid var(--border-subtle);
            background-color: #f9fafb;
            white-space: pre-wrap;
            font-size: 13px;
        }

        .footer {
            margin-top: 26px;
            font-size: 11px;
            color: var(--text-muted);
            display: flex;
            justify-content: space-between;
        }

        .footer-divider {
            height: 1px;
            background: linear-gradient(to right, transparent, var(--border-subtle), transparent);
            margin: 22px 0 12px;
        }

        @media print {
            body {
                background-color: #ffffff;
                padding: 0;
            }

            .page {
                box-shadow: none;
                border-radius: 0;
                max-width: 100%;
                padding: 20px 24px;
            }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <div>
                <div class="brand">Cierre de orden de servicio</div>
                <div class="title">Comprobante de entrega</div>
            </div>
            <div class="meta">
                <div class="meta-row">
                    <span class="badge badge-finalized">
                        ${order.status || 'FINALIZADA'}
                    </span>
                </div>
                <div class="meta-row">
                    Salida: ${order.exitDateTime ? new Date(order.exitDateTime).toLocaleString() : ''}
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Datos del cliente y vehículo</div>
            <div class="grid">
                <div>
                    <div class="field-label">Orden</div>
                    <div class="field-value-strong">#${order.id}</div>
                </div>
                <div>
                    <div class="field-label">Cliente</div>
                    <div class="field-value-strong">${order.customerName || ''}</div>
                </div>
                <div>
                    <div class="field-label">Placa</div>
                    <div class="field-value">${order.plate || ''}</div>
                </div>
                <div>
                    <div class="field-label">Técnico</div>
                    <div class="field-value">${order.technician || ''}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Checklist final</div>
            <div class="grid">
                <div>
                    <div class="field-label">Servicios completados</div>
                    <div class="field-value">${payload.allServicesCompleted ? 'Sí' : 'No'}</div>
                </div>
                <div>
                    <div class="field-label">Materiales procesados</div>
                    <div class="field-value">${payload.materialsProcessed ? 'Sí' : 'No'}</div>
                </div>
                <div>
                    <div class="field-label">Sin observaciones pendientes</div>
                    <div class="field-value">${payload.noPendingTechnicalNotes ? 'Sí' : 'No'}</div>
                </div>
                <div>
                    <div class="field-label">Tipo de cierre</div>
                    <div class="field-value">${payload.closeType === 'ESPECIAL' ? 'Especial (con supervisor)' : 'Normal'}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Observaciones de entrega</div>
            <div class="text-content">
                ${payload.deliveryNotes || ''}
            </div>
        </div>

        <div class="section">
            <div class="section-title">Recepción del cliente</div>
            <div class="grid">
                <div>
                    <div class="field-label">Nombre de quien recibe</div>
                    <div class="field-value-strong">${payload.customerSignatureName || ''}</div>
                </div>
                <div>
                    <div class="field-label">Supervisor (cierre especial)</div>
                    <div class="field-value">${payload.specialCloseSupervisorName || '-'}</div>
                </div>
            </div>
        </div>

        <div class="footer-divider"></div>
        <div class="footer">
            <div>Este comprobante acredita la entrega del vehículo/servicio al cliente.</div>
            <div>Generado automáticamente por el sistema de taller</div>
        </div>
    </div>
</body>
</html>`;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrder) {
            alert('Seleccione una orden de servicio.');
            return;
        }

        if (!allServicesCompleted || !materialsProcessed || !noPendingTechnicalNotes) {
            alert('Debe completar todos los items del checklist obligatorio.');
            return;
        }

        if (!deliveryNotes.trim()) {
            alert('Debe ingresar observaciones de entrega.');
            return;
        }

        if (!exitDateTime) {
            alert('Debe ingresar fecha y hora de salida.');
            return;
        }

        if (closeType === 'ESPECIAL') {
            if (!closeReason.trim()) {
                alert('Debe ingresar el motivo para el cierre especial.');
                return;
            }
            if (!specialCloseSupervisorName.trim()) {
                alert('Debe ingresar el nombre del supervisor para el cierre especial.');
                return;
            }
        }

        const payload = {
            allServicesCompleted,
            materialsProcessed,
            noPendingTechnicalNotes,
            deliveryNotes,
            exitDateTime: new Date(exitDateTime).toISOString(),
            customerSignatureName,
            closeType,
            closeReason: closeType === 'ESPECIAL' ? closeReason : null,
            specialCloseSupervisorName: closeType === 'ESPECIAL' ? specialCloseSupervisorName : null
        };

        setSubmitting(true);
        try {
            const response = await api.put(`/ServiceOrders/${selectedOrder.id}/close`, payload);
            const closedOrder = response.data;
            handlePrintReceipt(closedOrder, payload);
            alert('Orden de servicio FINALIZADA correctamente.');
            setSelectedOrder(null);
            setOrderResults([]);
            setOrderSearch('');
        } catch (error: any) {
            console.error(error);
            const backendMessage =
                typeof error.response?.data === 'string'
                    ? error.response.data
                    : error.response?.data?.message || '';
            alert('Error al cerrar la orden. ' + backendMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleGenerateInvoice = async () => {
        if (!selectedOrder) {
            alert('Seleccione una orden de servicio.');
            return;
        }

        const parsedLabor = parseFloat(laborCost || '0');
        if (Number.isNaN(parsedLabor) || parsedLabor < 0) {
            alert('Ingrese un valor válido para la mano de obra.');
            return;
        }

        setInvoiceGenerating(true);
        try {
            const payload = {
                laborCost: parsedLabor,
                paymentMethod
            };
            const response = await api.post(`/ServiceOrders/${selectedOrder.id}/invoice`, payload);
            const invoice: InvoiceResult = response.data;
            setLastInvoice(invoice);
            setShowInvoiceModal(true);
            alert('Factura generada correctamente.');
            setSelectedOrder({ ...selectedOrder, status: 'CERRADA' });
        } catch (error: any) {
            const backendMessage =
                typeof error.response?.data === 'string'
                    ? error.response.data
                    : error.response?.data?.message || '';
            alert('Error al generar la factura. ' + backendMessage);
        } finally {
            setInvoiceGenerating(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Cierre de Orden de Servicio</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Finalización y entrega
                    </p>
                </div>
            </div>

            {/* Search Section */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buscar orden de servicio (cliente, placa o técnico)
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Ej: placa, nombre del cliente o técnico"
                    />
                    <button
                        type="button"
                        onClick={handleSearchOrders}
                        disabled={searchingOrders}
                        className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {searchingOrders ? 'Buscando...' : 'Buscar'}
                    </button>
                </div>
                
                {/* Search Results */}
                {orderResults.length > 0 && !selectedOrder && (
                    <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-700 font-semibold">
                                <tr>
                                    <th className="px-4 py-2">ID</th>
                                    <th className="px-4 py-2">Cliente</th>
                                    <th className="px-4 py-2">Placa</th>
                                    <th className="px-4 py-2">Estado</th>
                                    <th className="px-4 py-2">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orderResults.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 font-medium text-slate-900">#{order.id}</td>
                                        <td className="px-4 py-2 text-slate-600">{order.customerName}</td>
                                        <td className="px-4 py-2">
                                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-medium border border-slate-200">
                                                {order.plate}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                                                order.status === 'FINALIZADA' 
                                                    ? 'bg-green-100 text-green-700 border-green-200'
                                                    : 'bg-blue-100 text-blue-700 border-blue-200'
                                            }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">
                                            <button
                                                onClick={() => handleSelectOrder(order)}
                                                className="text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                Seleccionar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selectedOrder && (
                <form onSubmit={handleSubmit} className="space-y-6 border-t pt-6">
                    
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                        <h3 className="font-semibold text-slate-800 mb-2">Orden #{selectedOrder.id} - {selectedOrder.customerName}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500 block">Placa</span>
                                <span className="font-medium">{selectedOrder.plate}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Estado Actual</span>
                                <span className="font-medium">{selectedOrder.status}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Fecha Ingreso</span>
                                <span className="font-medium">{new Date(selectedOrder.intakeDateTime).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    {selectedOrder.status === 'FINALIZADA' ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg">
                                Esta orden ya está finalizada. Puede generar la factura desde esta pantalla.
                            </div>
                            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                                <h3 className="font-semibold text-gray-800">
                                    Facturación de la Orden
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Mano de obra
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={laborCost || ''}
                                            onChange={(e) => setLaborCost(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Valor sugerido según trabajos realizados. Puede ajustarse manualmente.
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Método de pago
                                        </label>
                                        <select
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="Cash">Efectivo</option>
                                            <option value="Card">Tarjeta</option>
                                            <option value="Transfer">Transferencia</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleGenerateInvoice}
                                        disabled={invoiceGenerating}
                                        className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                                    >
                                        {invoiceGenerating ? 'Generando...' : 'Generar factura de la OS'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                    <span>📋</span> Checklist Obligatorio
                                </h3>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 p-2 hover:bg-white/50 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={allServicesCompleted}
                                            onChange={(e) => setAllServicesCompleted(e.target.checked)}
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-slate-700">Todos los servicios/procedimientos fueron completados</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-2 hover:bg-white/50 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={materialsProcessed}
                                            onChange={(e) => setMaterialsProcessed(e.target.checked)}
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-slate-700">Materiales y equipos devueltos/procesados correctamente</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-2 hover:bg-white/50 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={noPendingTechnicalNotes}
                                            onChange={(e) => setNoPendingTechnicalNotes(e.target.checked)}
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-slate-700">No hay observaciones técnicas pendientes</span>
                                    </label>
                                </div>
                            </div>

                            {/* Delivery Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Observaciones de Entrega
                                </label>
                                <textarea
                                    value={deliveryNotes}
                                    onChange={(e) => setDeliveryNotes(e.target.value)}
                                    rows={4}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Detalles sobre el estado del equipo, incidencias o recomendaciones..."
                                />
                            </div>

                            {/* Exit Date & Type */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fecha y Hora de Salida
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={exitDateTime}
                                        onChange={(e) => setExitDateTime(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tipo de Cierre
                                    </label>
                                    <select
                                        value={closeType}
                                        onChange={(e) => setCloseType(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="NORMAL">Cierre Normal</option>
                                        <option value="ESPECIAL">Cierre Especial (Requiere Supervisor)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Special Close Fields */}
                            {closeType === 'ESPECIAL' && (
                                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <h4 className="font-semibold text-orange-800 mb-2">Detalles Cierre Especial</h4>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Supervisor Responsable
                                        </label>
                                        <input
                                            type="text"
                                            value={specialCloseSupervisorName}
                                            onChange={(e) => setSpecialCloseSupervisorName(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                                            placeholder="Nombre del supervisor"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Motivo / Justificación
                                        </label>
                                        <input
                                            type="text"
                                            value={closeReason}
                                            onChange={(e) => setCloseReason(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                                            placeholder="Razón del cierre especial"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Customer Signature */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="font-semibold text-gray-800 mb-3">Firma y Recepción del Cliente</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nombre de quien recibe (Firma)
                                        </label>
                                        <input
                                            type="text"
                                            value={customerSignatureName}
                                            onChange={(e) => setCustomerSignatureName(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Nombre completo"
                                        />
                                    </div>
                                    <div className="flex items-end pb-1">
                                        <span className="text-sm text-gray-500 italic">
                                            * Opcional: Se puede adjuntar foto del comprobante físico posteriormente.
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setSelectedOrder(null)}
                                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                                >
                                    {submitting ? 'Finalizando...' : 'Finalizar Orden y Generar Comprobante'}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            )}

            {showInvoiceModal && lastInvoice && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Factura generada</h3>
                            <button
                                onClick={() => setShowInvoiceModal(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-6 bg-gray-50 max-h-[70vh] overflow-y-auto">
                            <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg text-sm">
                                <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
                                    <p className="text-gray-500">
                                        {new Date(lastInvoice.date).toLocaleString()}
                                    </p>
                                    <p className="font-bold mt-1">
                                        Factura: {lastInvoice.invoiceNumber}
                                    </p>
                                </div>
                                {lastInvoice.customerName && (
                                    <div className="mb-4 border-b border-dashed border-gray-300 pb-4">
                                        <p className="font-bold">Cliente:</p>
                                        <p>{lastInvoice.customerName}</p>
                                    </div>
                                )}
                                <div className="space-y-2 mb-4">
                                    {lastInvoice.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between">
                                            <span>
                                                {item.quantity} x {item.productName}
                                            </span>
                                            <span>${item.subTotal.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-dashed border-gray-300 pt-4">
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Total</span>
                                        <span>${lastInvoice.totalAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-500 mt-2">
                                        <span>Pago ({lastInvoice.paymentMethod})</span>
                                        <span>${lastInvoice.totalAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-white border-t flex gap-3">
                            <button
                                onClick={() => window.print()}
                                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200"
                            >
                                Imprimir / PDF
                            </button>
                            <button
                                onClick={() => setShowInvoiceModal(false)}
                                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceOrderClosure;
