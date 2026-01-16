import { useState, useEffect } from 'react';
import api from '../api/axios';

interface Technician {
    id: number;
    name: string;
    specialty?: string;
}

const ServiceOrderWorks = () => {
    const [orderSearch, setOrderSearch] = useState('');
    const [searchingOrders, setSearchingOrders] = useState(false);
    const [orderResults, setOrderResults] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

    const [description, setDescription] = useState('');
    const [technician, setTechnician] = useState('');
    const [estimatedTime, setEstimatedTime] = useState('');
    const [laborCost, setLaborCost] = useState('');
    const [status, setStatus] = useState<'PENDIENTE' | 'REALIZADO'>('PENDIENTE');
    const [submitting, setSubmitting] = useState(false);
    const [works, setWorks] = useState<any[]>([]);

    const [selectedWork, setSelectedWork] = useState<any | null>(null);

    // Technicians State
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [showTechnicianSearch, setShowTechnicianSearch] = useState(false);

    useEffect(() => {
        if (selectedWork) {
            setDescription(selectedWork.description);
            setTechnician(selectedWork.technician);
            setEstimatedTime(selectedWork.estimatedTimeHours ? selectedWork.estimatedTimeHours.toString() : '');
            setLaborCost(selectedWork.laborCost ? selectedWork.laborCost.toString() : '');
            setStatus(selectedWork.status);
        } else {
            setDescription('');
            setTechnician('');
            setEstimatedTime('');
            setLaborCost('');
            setStatus('PENDIENTE');
        }
    }, [selectedWork]);

    useEffect(() => {
        if (technician.length > 1) {
            const timer = setTimeout(() => {
                fetchTechnicians();
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setTechnicians([]);
        }
    }, [technician]);

    const fetchTechnicians = async () => {
        try {
            const response = await api.get(`/technicians?search=${technician}`);
            setTechnicians(response.data);
        } catch (error) {
            console.error("Error fetching technicians", error);
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

    const loadWorks = async (orderId: number) => {
        try {
            const response = await api.get(`/ServiceOrders/${orderId}/works`);
            setWorks(response.data);
        } catch {
            setWorks([]);
        }
    };

    const handleSelectOrder = (order: any) => {
        setSelectedOrder(order);
        loadWorks(order.id);
    };

    const handleAddWork = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrder) {
            alert('Seleccione una orden de servicio primero.');
            return;
        }
        if (!description.trim()) {
            alert('La descripción del trabajo es obligatoria.');
            return;
        }

        const payload = {
            description,
            technician,
            estimatedTimeHours: estimatedTime ? parseFloat(estimatedTime) : null,
            laborCost: laborCost ? parseFloat(laborCost) : 0,
            status
        };

        setSubmitting(true);
        try {
            if (selectedWork) {
                await api.put(`/ServiceOrders/${selectedOrder.id}/works/${selectedWork.id}`, payload);
            } else {
                await api.post(`/ServiceOrders/${selectedOrder.id}/works`, payload);
            }
            setSelectedWork(null);
            await loadWorks(selectedOrder.id);
        } catch (error) {
            console.error("Error saving work:", error);
            alert('Error al guardar el trabajo/servicio.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditWork = (work: any) => {
        if (work.status === 'PENDIENTE') {
            setSelectedWork(work);
        } else {
            alert('Solo se pueden modificar trabajos en estado PENDIENTE.');
        }
    };

    const toggleWorkStatus = async (work: any) => {
        if (!selectedOrder) return;
        const newStatus = work.status === 'REALIZADO' ? 'PENDIENTE' : 'REALIZADO';
        try {
            await api.put(`/ServiceOrders/${selectedOrder.id}/works/${work.id}/status`, {
                status: newStatus
            });
            await loadWorks(selectedOrder.id);
        } catch {
            alert('Error al actualizar el estado del trabajo.');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Trabajos / Servicios</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Administre los trabajos asociados a cada orden de servicio.
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                <div>
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
                                            <td className="px-4 py-2 whitespace-nowrap text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSelectOrder(order)}
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
                    <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                            <div className="font-semibold mb-1">Orden seleccionada</div>
                            <div>
                                #{selectedOrder.id} • {selectedOrder.customerName} • Placa {selectedOrder.plate}
                            </div>
                            {selectedOrder.status === 'FINALIZADA' && (
                                <div className="mt-2 pt-2 border-t border-blue-200 font-semibold text-red-600">
                                    ⚠ Esta orden está finalizada y no puede ser modificada.
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleAddWork} className="space-y-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
                            <fieldset disabled={selectedOrder.status === 'FINALIZADA'} className="contents">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-sm font-semibold text-slate-800">
                                    {selectedWork ? 'Editar trabajo / servicio' : 'Nuevo trabajo / servicio'}
                                </h2>
                                {selectedWork && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedWork(null)}
                                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                                    >
                                        Cancelar edición
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Descripción
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                        placeholder="Ej: Cambio de aceite, alineación, reparación frenos..."
                                    />
                                </div>
                                <div className="space-y-3">
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Técnico
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={technician}
                                                onChange={(e) => {
                                                    setTechnician(e.target.value);
                                                    setShowTechnicianSearch(true);
                                                }}
                                                onFocus={() => setShowTechnicianSearch(true)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                                placeholder="Nombre del técnico"
                                            />
                                            {showTechnicianSearch && technicians.length > 0 && selectedOrder.status !== 'FINALIZADA' && (
                                                <div className="absolute top-full left-0 right-0 bg-white shadow-xl rounded-lg mt-1 border border-gray-100 z-50 max-h-60 overflow-y-auto">
                                                    {technicians.map(t => (
                                                        <div
                                                            key={t.id}
                                                            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                            onClick={() => {
                                                                setTechnician(t.name);
                                                                setShowTechnicianSearch(false);
                                                                setTechnicians([]);
                                                            }}
                                                        >
                                                            <div className="font-bold text-sm text-gray-800">{t.name}</div>
                                                            {t.specialty && <div className="text-xs text-gray-500">{t.specialty}</div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Tiempo estimado (horas)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={estimatedTime}
                                                onChange={(e) => setEstimatedTime(e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Costo mano de obra
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={laborCost}
                                                onChange={(e) => setLaborCost(e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Estado
                                        </label>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value as 'PENDIENTE' | 'REALIZADO')}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                        >
                                            <option value="PENDIENTE">Pendiente</option>
                                            <option value="REALIZADO">Realizado</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={submitting || selectedOrder.status === 'FINALIZADA'}
                                    className="px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Guardando...' : (selectedWork ? 'Actualizar trabajo' : 'Agregar trabajo')}
                                </button>
                            </div>
                            </fieldset>
                        </form>

                        <div className="bg-white border border-slate-200 rounded-lg mt-4">
                            <div className="px-4 py-2 border-b border-slate-200 text-sm font-semibold text-slate-800">
                                Trabajos de la orden
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Técnico</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tiempo (h)</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
                                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                            <th className="px-4 py-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {works.map((work) => (
                                            <tr key={work.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 text-gray-700">
                                                    {work.description}
                                                </td>
                                                <td className="px-4 py-2 text-gray-700">
                                                    {work.technician}
                                                </td>
                                                <td className="px-4 py-2 text-right text-gray-700">
                                                    {work.estimatedTimeHours ?? '-'}
                                                </td>
                                                <td className="px-4 py-2 text-right text-gray-700">
                                                {work.laborCost?.toFixed ? work.laborCost.toFixed(2) : work.laborCost}
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <button
                                                    onClick={() => toggleWorkStatus(work)}
                                                    disabled={selectedOrder.status === 'FINALIZADA'}
                                                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                        work.status === 'REALIZADO'
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                    } ${selectedOrder.status === 'FINALIZADA' ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                >
                                                    {work.status}
                                                </button>
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                {work.status === 'PENDIENTE' && selectedOrder.status !== 'FINALIZADA' && (
                                                    <button
                                                        onClick={() => handleEditWork(work)}
                                                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                                    >
                                                        Editar
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {works.length === 0 && (
                                <div className="px-4 py-6 text-center text-gray-400 text-sm">
                                    No hay trabajos registrados para esta orden.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                )}
            </div>
        </div>
    );
};

export default ServiceOrderWorks;

