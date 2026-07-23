import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Edit, Plus, Search, Trash, UserCheck, X } from 'lucide-react';

interface WorkshopManager {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    notes?: string;
}

const emptyForm = {
    name: '',
    phone: '',
    email: '',
    notes: ''
};

const WorkshopManagers = () => {
    const [managers, setManagers] = useState<WorkshopManager[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentManager, setCurrentManager] = useState<WorkshopManager | null>(null);
    const [formData, setFormData] = useState(emptyForm);

    const fetchManagers = async () => {
        try {
            const response = await api.get(`/workshopmanagers?search=${encodeURIComponent(searchTerm)}`);
            setManagers(response.data);
        } catch {
            alert('Error al cargar jefes de taller.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchManagers();
    }, [searchTerm]);

    const handleOpenModal = (manager?: WorkshopManager) => {
        if (manager) {
            setCurrentManager(manager);
            setFormData({
                name: manager.name,
                phone: manager.phone || '',
                email: manager.email || '',
                notes: manager.notes || ''
            });
        } else {
            setCurrentManager(null);
            setFormData(emptyForm);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentManager(null);
        setFormData(emptyForm);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (currentManager) {
                await api.put(`/workshopmanagers/${currentManager.id}`, formData);
            } else {
                await api.post('/workshopmanagers', formData);
            }

            await fetchManagers();
            handleCloseModal();
        } catch (error: any) {
            const message = error.response?.data?.message || 'Error al guardar jefe de taller.';
            alert(message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Esta seguro de eliminar este jefe de taller?')) return;

        try {
            await api.delete(`/workshopmanagers/${id}`);
            await fetchManagers();
        } catch (error: any) {
            const message = error.response?.data?.message || 'Error al eliminar jefe de taller.';
            alert(message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="flex items-center text-2xl font-bold text-slate-800">
                    <UserCheck className="mr-2" /> Jefes de Taller
                </h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700"
                >
                    <Plus size={20} className="mr-1" /> Nuevo Jefe
                </button>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-md">
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, telefono o email..."
                        className="w-full rounded-lg border py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="grid gap-3 md:hidden">
                    {managers.map((manager) => (
                        <div key={manager.id} className="rounded-lg border border-slate-200 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 className="truncate font-bold text-slate-800">{manager.name}</h3>
                                    <p className="text-sm text-slate-500">{manager.phone || 'Sin telefono'}</p>
                                    {manager.email && <p className="break-all text-sm text-blue-600">{manager.email}</p>}
                                </div>
                                <div className="flex shrink-0 gap-2">
                                    <button
                                        onClick={() => handleOpenModal(manager)}
                                        className="rounded-full p-2 text-blue-600 transition-colors hover:bg-blue-100"
                                        title="Editar"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(manager.id)}
                                        className="rounded-full p-2 text-red-600 transition-colors hover:bg-red-100"
                                        title="Eliminar"
                                    >
                                        <Trash size={18} />
                                    </button>
                                </div>
                            </div>
                            {manager.notes && <p className="mt-3 text-sm text-slate-600">{manager.notes}</p>}
                        </div>
                    ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                    <table className="w-full border-collapse text-left">
                        <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600">
                            <tr>
                                <th className="border-b p-4">Nombre</th>
                                <th className="border-b p-4">Contacto</th>
                                <th className="border-b p-4">Notas</th>
                                <th className="border-b p-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                            {managers.map((manager) => (
                                <tr key={manager.id} className="transition-colors hover:bg-blue-50/50">
                                    <td className="p-4 font-medium">{manager.name}</td>
                                    <td className="p-4 text-sm">
                                        <div>{manager.phone || '-'}</div>
                                        <div className="text-xs text-blue-500">{manager.email}</div>
                                    </td>
                                    <td className="max-w-md p-4 text-sm">{manager.notes || '-'}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center space-x-2">
                                            <button
                                                onClick={() => handleOpenModal(manager)}
                                                className="rounded-full p-2 text-blue-600 transition-colors hover:bg-blue-100"
                                                title="Editar"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(manager.id)}
                                                className="rounded-full p-2 text-red-600 transition-colors hover:bg-red-100"
                                                title="Eliminar"
                                            >
                                                <Trash size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {managers.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-400">
                                        No se encontraron jefes de taller.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-100 bg-slate-50 px-6 py-4">
                            <h3 className="text-lg font-bold text-slate-800">
                                {currentManager ? 'Editar Jefe de Taller' : 'Nuevo Jefe de Taller'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4 p-6">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
                                <input
                                    type="text"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Telefono</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Notas</label>
                                <textarea
                                    className="h-24 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="rounded-lg px-4 py-2 text-gray-600 transition-colors hover:bg-gray-100"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-blue-600 px-6 py-2 text-white shadow-md transition-all hover:bg-blue-700"
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

export default WorkshopManagers;
