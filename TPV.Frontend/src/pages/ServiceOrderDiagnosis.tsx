import { useState } from 'react';
import api from '../api/axios';

const ServiceOrderDiagnosis = () => {
    const [orderSearch, setOrderSearch] = useState('');
    const [searchingOrders, setSearchingOrders] = useState(false);
    const [orderResults, setOrderResults] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [problemDescription, setProblemDescription] = useState('');
    const [technicalDiagnosis, setTechnicalDiagnosis] = useState('');
    const [customerApproval, setCustomerApproval] = useState('');
    const [approvalDate, setApprovalDate] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [orderSummary, setOrderSummary] = useState<any | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrder) {
            alert('Seleccione una orden de servicio para registrar el diagnóstico.');
            return;
        }

        const payload = {
            problemDescription,
            technicalDiagnosis,
            customerApproved: customerApproval === '' ? null : customerApproval === 'SI',
            approvalDate: approvalDate ? new Date(approvalDate).toISOString() : null
        };

        setSubmitting(true);
        try {
            const response = await api.put(`/ServiceOrders/${selectedOrder.id}/diagnosis`, payload);
            setOrderSummary(response.data);
            alert('Diagnóstico registrado y orden actualizada a EN DIAGNOSTICO.');
        } catch {
            alert('Error al registrar el diagnóstico. Verifique el número de orden.');
        } finally {
            setSubmitting(false);
        }
    };

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

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Diagnóstico de Orden de Servicio</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Estado OS: <span className="font-semibold text-blue-600">EN DIAGNÓSTICO</span>
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-3">
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
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Aprobación del cliente
                        </label>
                        <select
                            value={customerApproval}
                            onChange={(e) => setCustomerApproval(e.target.value)}
                            disabled={selectedOrder?.status === 'FINALIZADA'}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                        >
                            <option value="">Seleccione...</option>
                            <option value="SI">Sí</option>
                            <option value="NO">No</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de aprobación
                        </label>
                        <input
                            type="date"
                            value={approvalDate}
                            onChange={(e) => setApprovalDate(e.target.value)}
                            disabled={selectedOrder?.status === 'FINALIZADA'}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                        />
                    </div>
                </div>

                {orderResults.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-2 border-b border-slate-200 text-sm font-semibold text-slate-700">
                            Resultados de búsqueda
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orden</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha ingreso</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placa</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Técnico</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-4 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {orderResults.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                                                #{order.id}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                                                {new Date(order.intakeDateTime).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                                                {order.plate}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                                                {order.customerName}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                                                {order.technician}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                                                {order.status}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedOrder(order);
                                                        setOrderSummary(order);
                                                    }}
                                                    className="px-3 py-1 rounded-lg border border-blue-600 text-blue-600 text-xs font-semibold hover:bg-blue-50"
                                                >
                                                    Seleccionar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {selectedOrder && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900 mb-6">
                        <div className="font-semibold mb-1">Orden seleccionada</div>
                        <div>
                            #{selectedOrder.id} • {selectedOrder.customerName} • Placa {selectedOrder.plate}
                        </div>
                        <div className="text-xs text-blue-800 mt-1">
                            Estado actual: {selectedOrder.status}
                        </div>
                        {selectedOrder.status === 'FINALIZADA' && (
                            <div className="mt-2 pt-2 border-t border-blue-200 font-semibold text-red-600">
                                ⚠ Esta orden está finalizada y no puede ser modificada.
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Descripción del problema
                        </label>
                        <textarea
                            value={problemDescription}
                            onChange={(e) => setProblemDescription(e.target.value)}
                            disabled={selectedOrder?.status === 'FINALIZADA'}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32 resize-none focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                            placeholder="Descripción aportada por el cliente, síntomas, ruidos, etc."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Diagnóstico técnico
                        </label>
                        <textarea
                            value={technicalDiagnosis}
                            onChange={(e) => setTechnicalDiagnosis(e.target.value)}
                            disabled={selectedOrder?.status === 'FINALIZADA'}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32 resize-none focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                            placeholder="Conclusiones del técnico, posibles causas y trabajos sugeridos."
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={submitting || selectedOrder?.status === 'FINALIZADA'}
                        className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Guardando...' : 'Guardar diagnóstico'}
                    </button>
                </div>
            </form>

            {orderSummary && (
                <div className="mt-8 border-t pt-4">
                    <h2 className="text-lg font-semibold text-slate-800 mb-2">Resumen de la orden</h2>
                    <p className="text-sm text-gray-600">
                        Orden #{orderSummary.id} • {orderSummary.customerName} • Placa {orderSummary.plate}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                        Estado actual: <span className="font-semibold text-blue-600">{orderSummary.status}</span>
                    </p>
                </div>
            )}
        </div>
    );
};

export default ServiceOrderDiagnosis;
