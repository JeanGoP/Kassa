import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { UserCog, Plus, Edit, Trash, X, Search } from 'lucide-react';

interface Technician {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    specialty?: string;
    branchId?: number | null;
    branchName?: string;
}

interface Branch {
    id: number;
    name: string;
}

const Technicians = () => {
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTechnician, setCurrentTechnician] = useState<Technician | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [branches, setBranches] = useState<Branch[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        specialty: '',
        branchId: ''
    });

    const fetchTechnicians = async () => {
        try {
            const response = await api.get(`/technicians?search=${encodeURIComponent(searchTerm)}`);
            setTechnicians(response.data);
        } catch {
            alert('Error al cargar técnicos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTechnicians();
    }, [searchTerm]);

    useEffect(() => {
        api.get('/branches').then(response => setBranches(response.data));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (currentTechnician) {
                await api.put(`/technicians/${currentTechnician.id}`, {
                    ...formData,
                    branchId: formData.branchId ? Number(formData.branchId) : null
                });
            } else {
                await api.post('/technicians', {
                    ...formData,
                    branchId: formData.branchId ? Number(formData.branchId) : null
                });
            }
            await fetchTechnicians();
            handleCloseModal();
        } catch {
            alert('Error al guardar técnico.');
        }
    };

    const handleOpenModal = (technician?: Technician) => {
        if (technician) {
            setCurrentTechnician(technician);
            setFormData({
                name: technician.name,
                phone: technician.phone || '',
                email: technician.email || '',
                specialty: technician.specialty || '',
                branchId: technician.branchId?.toString() || ''
            });
        } else {
            setCurrentTechnician(null);
            setFormData({
                name: '',
                phone: '',
                email: '',
                specialty: '',
                branchId: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentTechnician(null);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Está seguro de eliminar este técnico?')) {
            try {
                await api.delete(`/technicians/${id}`);
                await fetchTechnicians();
            } catch {
                alert('Error al eliminar técnico.');
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="font-bold text-2xl flex items-center text-slate-800">
                    <UserCog className="mr-2" /> Técnicos
                </h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-lg shadow-blue-500/30 transition-all"
                >
                    <Plus size={20} className="mr-1" /> Nuevo Técnico
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 p-4">
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o especialidad..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold tracking-wider">
                            <tr>
                                <th className="p-4 border-b">Nombre</th>
                                <th className="p-4 border-b">Contacto</th>
                                <th className="p-4 border-b">Especialidad</th>
                                <th className="p-4 border-b">Sucursal</th>
                                <th className="p-4 border-b text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 divide-y divide-gray-100">
                            {technicians.map((t) => (
                                <tr key={t.id} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="p-4 font-medium">
                                        {t.name}
                                    </td>
                                    <td className="p-4 text-sm">
                                        <div>{t.phone || '-'}</div>
                                        <div className="text-xs text-blue-500">{t.email}</div>
                                    </td>
                                    <td className="p-4 text-sm">
                                        {t.specialty || '-'}
                                    </td>
                                    <td className="p-4 text-sm">{t.branchName || 'SIN ASIGNAR'}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center space-x-2">
                                            <button
                                                onClick={() => handleOpenModal(t)}
                                                className="text-blue-600 hover:bg-blue-100 p-2 rounded-full transition-colors"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(t.id)}
                                                className="text-red-600 hover:bg-red-100 p-2 rounded-full transition-colors"
                                            >
                                                <Trash size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {technicians.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400">
                                        No se encontraron técnicos.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl">
                        <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">
                                {currentTechnician ? 'Editar Técnico' : 'Nuevo Técnico'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">NOMBRE</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">TELÉFONO</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">EMAIL</label>
                                    <input
                                        type="email"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ESPECIALIDAD</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.specialty}
                                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">SUCURSAL</label>
                                <select
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.branchId}
                                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                                >
                                    <option value="">SIN ASIGNAR</option>
                                    {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg mr-2 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md transition-all"
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

export default Technicians;

