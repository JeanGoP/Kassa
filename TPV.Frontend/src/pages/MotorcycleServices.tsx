import React, { useEffect, useState } from 'react';
import { Clock, Edit, ListOrdered, Plus, Search, Trash, Wrench, X } from 'lucide-react';
import api from '../api/axios';

interface MotorcycleService {
    id: number;
    name: string;
    description?: string;
    estimatedMinutes?: number;
    price: number;
    taxRate: number;
    displayOrder: number;
}

const emptyForm = {
    name: '',
    description: '',
    estimatedMinutes: '',
    price: '',
    taxRate: '0',
    displayOrder: '0'
};

const MotorcycleServices = () => {
    const [services, setServices] = useState<MotorcycleService[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentService, setCurrentService] = useState<MotorcycleService | null>(null);
    const [formData, setFormData] = useState(emptyForm);

    const fetchServices = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/motorcycleservices?search=${encodeURIComponent(searchTerm)}`);
            setServices(response.data);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al cargar servicios de moto.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
    }, [searchTerm]);

    const handleOpenModal = (service?: MotorcycleService) => {
        if (service) {
            setCurrentService(service);
            setFormData({
                name: service.name,
                description: service.description || '',
                estimatedMinutes: service.estimatedMinutes?.toString() || '',
                price: service.price.toString(),
                taxRate: service.taxRate.toString(),
                displayOrder: service.displayOrder.toString()
            });
        } else {
            setCurrentService(null);
            setFormData(emptyForm);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentService(null);
        setFormData(emptyForm);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        const payload = {
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            estimatedMinutes: formData.estimatedMinutes ? Number(formData.estimatedMinutes) : null,
            price: formData.price ? Number(formData.price) : 0,
            taxRate: formData.taxRate ? Number(formData.taxRate) : 0,
            displayOrder: Number(formData.displayOrder) || 0
        };

        try {
            if (currentService) {
                await api.put(`/motorcycleservices/${currentService.id}`, payload);
            } else {
                await api.post('/motorcycleservices', payload);
            }

            await fetchServices();
            handleCloseModal();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al guardar servicio de moto.');
        }
    };

    const handleDelete = async (service: MotorcycleService) => {
        if (!window.confirm(`Eliminar el servicio ${service.name}?`)) return;

        try {
            await api.delete(`/motorcycleservices/${service.id}`);
            await fetchServices();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al eliminar servicio de moto.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Catalogos</p>
                    <h2 className="mt-1 flex items-center text-2xl font-extrabold text-slate-900">
                        <Wrench className="mr-2 text-blue-600" /> Servicios de Moto
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">Servicios que se pueden seleccionar al agendar una cita.</p>
                </div>
                <button
                    type="button"
                    onClick={() => handleOpenModal()}
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700"
                >
                    <Plus size={18} className="mr-2" /> Nuevo servicio
                </button>
            </div>

            <section className="k-card overflow-hidden">
                <div className="k-panel-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="font-bold text-slate-900">Catalogo de servicios</h3>
                        <p className="text-sm text-slate-500">{services.length} servicios activos</p>
                    </div>
                    <div className="relative w-full sm:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            className="k-form-control pl-10"
                            placeholder="Buscar servicio..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    </div>
                </div>

                <div className="grid gap-3 p-4 md:hidden">
                    {services.map(service => (
                        <div key={service.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 className="truncate font-bold text-slate-900">{service.name}</h3>
                                    <p className="mt-1 text-sm text-slate-500">{service.description || 'Sin descripcion'}</p>
                                </div>
                                <div className="flex shrink-0 gap-1">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenModal(service)}
                                        className="rounded-full p-2 text-blue-600 transition hover:bg-blue-50"
                                        title="Editar"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(service)}
                                        className="rounded-full p-2 text-red-600 transition hover:bg-red-50"
                                        title="Eliminar"
                                    >
                                        <Trash size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                                    <Clock size={13} /> {service.estimatedMinutes ? `${service.estimatedMinutes} min` : 'Sin tiempo'}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                                    <ListOrdered size={13} /> Orden {service.displayOrder}
                                </span>
                                <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(service.price)} + IVA {service.taxRate}%
                                </span>
                            </div>
                        </div>
                    ))}
                    {!loading && services.length === 0 && (
                        <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-500">
                            No se encontraron servicios.
                        </div>
                    )}
                </div>

                <div className="hidden overflow-x-auto md:block">
                    <table className="w-full border-collapse text-left">
                        <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600">
                            <tr>
                                <th className="border-b p-4">Servicio</th>
                                <th className="border-b p-4">Descripcion</th>
                                <th className="border-b p-4">Tiempo</th>
                                <th className="border-b p-4">Precio fijo</th>
                                <th className="border-b p-4">IVA</th>
                                <th className="border-b p-4">Orden</th>
                                <th className="border-b p-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {services.map(service => (
                                <tr key={service.id} className="transition hover:bg-blue-50/50">
                                    <td className="p-4 font-bold text-slate-900">{service.name}</td>
                                    <td className="max-w-xl p-4 text-sm text-slate-500">{service.description || '-'}</td>
                                    <td className="p-4 text-sm font-semibold">{service.estimatedMinutes ? `${service.estimatedMinutes} min` : '-'}</td>
                                    <td className="p-4 text-sm font-semibold">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(service.price)}</td>
                                    <td className="p-4 text-sm font-semibold">{service.taxRate}%</td>
                                    <td className="p-4 text-sm font-semibold">{service.displayOrder}</td>
                                    <td className="p-4">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenModal(service)}
                                                className="rounded-full p-2 text-blue-600 transition hover:bg-blue-100"
                                                title="Editar"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(service)}
                                                className="rounded-full p-2 text-red-600 transition hover:bg-red-100"
                                                title="Eliminar"
                                            >
                                                <Trash size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && services.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-sm font-semibold text-slate-400">
                                        No se encontraron servicios.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {loading && (
                    <div className="border-t border-slate-100 p-4 text-center text-sm font-semibold text-slate-500">
                        Cargando servicios...
                    </div>
                )}
            </section>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-2xl">
                        <div className="k-panel-header flex items-center justify-between px-6 py-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    {currentService ? 'Editar servicio' : 'Nuevo servicio'}
                                </h3>
                                <p className="text-sm text-slate-500">Disponible para agenda interna y pagina publica.</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X size={22} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4 p-6">
                            <div>
                                <label className="k-form-label">Nombre</label>
                                <input
                                    required
                                    className="k-form-control"
                                    placeholder="Ej. Revision general"
                                    value={formData.name}
                                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                                />
                            </div>
                            <div>
                                <label className="k-form-label">Descripcion</label>
                                <textarea
                                    rows={3}
                                    className="k-form-textarea"
                                    placeholder="Detalle corto del servicio"
                                    value={formData.description}
                                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                                />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="k-form-label">Tiempo estimado</label>
                                    <input
                                        type="number"
                                        min={5}
                                        max={600}
                                        className="k-form-control"
                                        placeholder="60"
                                        value={formData.estimatedMinutes}
                                        onChange={(event) => setFormData({ ...formData, estimatedMinutes: event.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="k-form-label">Precio fijo antes de IVA</label>
                                    <input
                                        required
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        className="k-form-control"
                                        placeholder="0"
                                        value={formData.price}
                                        onChange={(event) => setFormData({ ...formData, price: event.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="k-form-label">IVA %</label>
                                    <input
                                        required
                                        type="number"
                                        min={0}
                                        max={100}
                                        step="0.01"
                                        className="k-form-control"
                                        value={formData.taxRate}
                                        onChange={(event) => setFormData({ ...formData, taxRate: event.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="k-form-label">Orden</label>
                                    <input
                                        type="number"
                                        min={0}
                                        className="k-form-control"
                                        value={formData.displayOrder}
                                        onChange={(event) => setFormData({ ...formData, displayOrder: event.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2 font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MotorcycleServices;
