import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { MapPin, Plus, Edit, Trash, X, Search } from 'lucide-react';
import { departments, cities } from '../utils/colombiaLocations';

interface Branch {
    id: number;
    name: string;
    address: string;
    phone: string;
    email: string;
    managerName?: string;
    department?: string;
    city?: string;
}

const Branches = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        email: '',
        managerName: '',
        department: '',
        city: ''
    });

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            const response = await api.get('/branches');
            setBranches(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (currentBranch) {
                await api.put(`/branches/${currentBranch.id}`, formData);
            } else {
                await api.post('/branches', formData);
            }
            fetchBranches();
            handleCloseModal();
        } catch (error) {
            console.error(error);
            alert("Error al guardar la sucursal");
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
                managerName: branch.managerName || '',
                department: branch.department || '',
                city: branch.city || ''
            });
        } else {
            setCurrentBranch(null);
            setFormData({ 
                name: '', 
                address: '', 
                phone: '', 
                email: '', 
                managerName: '',
                department: '',
                city: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentBranch(null);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Está seguro de eliminar esta sucursal?')) {
            try {
                await api.delete(`/branches/${id}`);
                fetchBranches();
            } catch (error) {
                console.error(error);
                alert("No se puede eliminar la sucursal porque tiene registros asociados");
            }
        }
    };

    const filteredBranches = branches.filter(branch => 
        branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        branch.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (branch.phone && branch.phone.includes(searchTerm)) ||
        (branch.email && branch.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (branch.managerName && branch.managerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (branch.city && branch.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (branch.department && branch.department.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return <div>Cargando...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="font-bold text-2xl flex items-center text-slate-800">
                    <MapPin className="mr-2" /> Sucursales
                </h2>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-lg shadow-blue-500/30 transition-all"
                >
                    <Plus size={20} className="mr-1" /> Nueva Sucursal
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar sucursal por nombre, dirección, ciudad, encargado..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBranches.map((branch) => (
                    <div key={branch.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">{branch.name}</h3>
                                <div className="text-slate-500 text-sm flex items-start mt-1">
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
                            <div className="flex space-x-2">
                                <button 
                                    onClick={() => handleOpenModal(branch)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <Edit size={18} />
                                </button>
                                <button 
                                    onClick={() => handleDelete(branch.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm text-slate-600">
                            {branch.phone && (
                                <div className="flex items-center">
                                    <span className="font-medium w-20">Teléfono:</span>
                                    <span>{branch.phone}</span>
                                </div>
                            )}
                            {branch.email && (
                                <div className="flex items-center">
                                    <span className="font-medium w-20">Email:</span>
                                    <span>{branch.email}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-2xl">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800">
                                {currentBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Departamento</label>
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
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad</label>
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
                                <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
                                <input
                                    type="text"
                                    className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                                <input
                                    type="text"
                                    className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Jefe de Taller</label>
                                <input
                                    type="text"
                                    className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    value={formData.managerName}
                                    onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                                    placeholder="Nombre del encargado"
                                />
                            </div>
                            <div className="pt-4 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-colors"
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
