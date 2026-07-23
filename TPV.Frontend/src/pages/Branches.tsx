import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Edit, MapPin, Plus, Search, Trash, UserCheck, X } from 'lucide-react';
import { cities, departments } from '../utils/colombiaLocations';

interface Branch {
    id: number;
    name: string;
    address: string;
    phone: string;
    email: string;
    managerName?: string;
    workshopManagerId?: number | null;
    workshopManagerName?: string;
    department?: string;
    city?: string;
}

interface WorkshopManager {
    id: number;
    name: string;
}

const emptyForm = {
    name: '',
    address: '',
    phone: '',
    email: '',
    workshopManagerId: '',
    department: '',
    city: ''
};

const Branches = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [workshopManagers, setWorkshopManagers] = useState<WorkshopManager[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
    const [formData, setFormData] = useState(emptyForm);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [branchesResponse, managersResponse] = await Promise.all([
                api.get('/branches'),
                api.get('/workshopmanagers')
            ]);
            setBranches(branchesResponse.data);
            setWorkshopManagers(managersResponse.data);
        } catch (error) {
            console.error(error);
            alert('Error al cargar sucursales.');
        } finally {
            setLoading(false);
        }
    };

    const fetchBranches = async () => {
        const response = await api.get('/branches');
        setBranches(response.data);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const selectedManager = workshopManagers.find(m => m.id.toString() === formData.workshopManagerId);
        const payload = {
            name: formData.name,
            address: formData.address,
            phone: formData.phone,
            email: formData.email,
            managerName: selectedManager?.name || '',
            workshopManagerId: formData.workshopManagerId ? Number(formData.workshopManagerId) : null,
            department: formData.department,
            city: formData.city
        };

        try {
            if (currentBranch) {
                await api.put(`/branches/${currentBranch.id}`, payload);
            } else {
                await api.post('/branches', payload);
            }
            await fetchBranches();
            handleCloseModal();
        } catch (error) {
            console.error(error);
            alert('Error al guardar la sucursal.');
        }
    };

    const handleOpenModal = (branch?: Branch) => {
        if (branch) {
            setCurrentBranch(branch);
            setFormData({
                name: branch.name,
                address: branch.address || '',
                phone: branch.phone || '',
                email: branch.email || '',
                workshopManagerId: branch.workshopManagerId ? branch.workshopManagerId.toString() : '',
                department: branch.department || '',
                city: branch.city || ''
            });
        } else {
            setCurrentBranch(null);
            setFormData(emptyForm);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentBranch(null);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Esta seguro de eliminar esta sucursal?')) return;

        try {
            await api.delete(`/branches/${id}`);
            await fetchBranches();
        } catch (error) {
            console.error(error);
            alert('No se puede eliminar la sucursal porque tiene registros asociados.');
        }
    };

    const filteredBranches = branches.filter(branch => {
        const search = searchTerm.toLowerCase();
        const managerName = branch.workshopManagerName || branch.managerName || '';

        return branch.name.toLowerCase().includes(search) ||
            (branch.address || '').toLowerCase().includes(search) ||
            (branch.phone || '').includes(searchTerm) ||
            (branch.email || '').toLowerCase().includes(search) ||
            managerName.toLowerCase().includes(search) ||
            (branch.city || '').toLowerCase().includes(search) ||
            (branch.department || '').toLowerCase().includes(search);
    });

    if (loading) return <div>Cargando...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="flex items-center text-2xl font-bold text-slate-800">
                    <MapPin className="mr-2" /> Sucursales
                </h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700"
                >
                    <Plus size={20} className="mr-1" /> Nueva Sucursal
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar sucursal por nombre, direccion, ciudad o jefe..."
                    className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredBranches.map((branch) => {
                    const managerName = branch.workshopManagerName || branch.managerName;

                    return (
                        <div key={branch.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                            <div className="mb-4 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 className="truncate text-lg font-bold text-slate-800">{branch.name}</h3>
                                    <div className="mt-1 flex items-start text-sm text-slate-500">
                                        <MapPin size={14} className="mr-1 mt-0.5 shrink-0" />
                                        <span>
                                            {branch.address}
                                            {branch.city && (
                                                <>
                                                    <br />
                                                    {branch.city}{branch.department ? `, ${branch.department}` : ''}
                                                </>
                                            )}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex shrink-0 space-x-2">
                                    <button
                                        onClick={() => handleOpenModal(branch)}
                                        className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                                        title="Editar"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(branch.id)}
                                        className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                                        title="Eliminar"
                                    >
                                        <Trash size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm text-slate-600">
                                {branch.phone && (
                                    <div className="flex items-center">
                                        <span className="w-24 font-medium">Telefono:</span>
                                        <span className="min-w-0 truncate">{branch.phone}</span>
                                    </div>
                                )}
                                {branch.email && (
                                    <div className="flex items-center">
                                        <span className="w-24 font-medium">Email:</span>
                                        <span className="min-w-0 truncate">{branch.email}</span>
                                    </div>
                                )}
                                <div className="flex items-center">
                                    <UserCheck size={16} className="mr-2 text-slate-400" />
                                    <span className="min-w-0 truncate">{managerName || 'Sin jefe de taller asignado'}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 p-6">
                            <h3 className="text-xl font-bold text-slate-800">
                                {currentBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4 p-6">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Jefe de Taller</label>
                                <select
                                    className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    value={formData.workshopManagerId}
                                    onChange={(e) => setFormData({ ...formData, workshopManagerId: e.target.value })}
                                >
                                    <option value="">Sin asignar</option>
                                    {workshopManagers.map((manager) => (
                                        <option key={manager.id} value={manager.id}>
                                            {manager.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Departamento</label>
                                    <select
                                        className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value, city: '' })}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {departments.map((dept) => (
                                            <option key={dept.id} value={dept.name}>
                                                {dept.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Ciudad</label>
                                    <select
                                        className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        disabled={!formData.department}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {cities
                                            .filter(c => c.departmentId === departments.find(d => d.name === formData.department)?.id)
                                            .map((city) => (
                                                <option key={city.id} value={city.name}>
                                                    {city.name}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Direccion</label>
                                <input
                                    type="text"
                                    className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Telefono</label>
                                <input
                                    type="text"
                                    className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                                <input
                                    type="email"
                                    className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="rounded-lg px-4 py-2 text-slate-700 transition-colors hover:bg-slate-100"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-700"
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

export default Branches;
