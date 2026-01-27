import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Trash2, AlertTriangle } from 'lucide-react';

interface User {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    isActive: boolean;
    roles: string[];
    tenantId?: number | null;
}

interface Role {
    id: string;
    name: string;
}

interface Tenant {
    id: number;
    name: string;
}

const Users = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [selectedUserRoles, setSelectedUserRoles] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [savingRoles, setSavingRoles] = useState(false);
    const [creating, setCreating] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [newEmail, setNewEmail] = useState('');
    const [newFirstName, setNewFirstName] = useState('');
    const [newLastName, setNewLastName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRoles, setNewRoles] = useState<string[]>([]);
    const [newTenantId, setNewTenantId] = useState<string>('');
    const [createError, setCreateError] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const promises = [
                api.get('/users'),
                api.get('/roles')
            ];

            // Only fetch tenants if user is superadmin (no tenantId)
            if (!currentUser?.tenantId) {
                promises.push(api.get('/tenants'));
            }

            const results = await Promise.all(promises);
            setUsers(results[0].data);
            setRoles(results[1].data);
            
            if (!currentUser?.tenantId && results[2]) {
                setTenants(results[2].data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadUserRoles = (user: User) => {
        setSelectedUserId(user.id);
        setSelectedUserRoles(user.roles || []);
    };

    useEffect(() => {
        loadData();
    }, []);

    const toggleUserRole = (roleName: string) => {
        if (!selectedUserId) return;
        if (selectedUserRoles.includes(roleName)) {
            setSelectedUserRoles(selectedUserRoles.filter(r => r !== roleName));
        } else {
            setSelectedUserRoles([...selectedUserRoles, roleName]);
        }
    };

    const handleSaveUserRoles = async () => {
        if (!selectedUserId) return;
        setSavingRoles(true);
        try {
            await api.put(`/users/${selectedUserId}/roles`, selectedUserRoles);
            await loadData();
        } catch (error) {
            console.error(error);
        } finally {
            setSavingRoles(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUserId) return;
        if (!window.confirm("¿Está seguro de que desea eliminar este usuario permanentemente? Esta acción no se puede deshacer.")) return;
        
        setDeleteLoading(true);
        try {
            await api.delete(`/users/${selectedUserId}`);
            setSelectedUserId(null);
            setSelectedUserRoles([]);
            await loadData();
            alert("Usuario eliminado correctamente.");
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.message || (typeof error.response?.data === 'string' ? error.response.data : "Error al eliminar usuario.");
            alert("Error: " + msg);
        } finally {
            setDeleteLoading(false);
        }
    };

    const toggleNewUserRole = (roleName: string) => {
        if (newRoles.includes(roleName)) {
            setNewRoles(newRoles.filter(r => r !== roleName));
        } else {
            setNewRoles([...newRoles, roleName]);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail.trim() || !newPassword.trim()) return;
        setCreateError(null);
        setCreating(true);
        try {
            await api.post('/users', {
                email: newEmail.trim(),
                password: newPassword.trim(),
                firstName: newFirstName.trim() || null,
                lastName: newLastName.trim() || null,
                roles: newRoles,
                tenantId: newTenantId ? parseInt(newTenantId) : null
            });

            setNewEmail('');
            setNewFirstName('');
            setNewLastName('');
            setNewPassword('');
            setNewRoles([]);
            setNewTenantId('');

            await loadData();
        } catch (error: unknown) {
            let message = 'No se pudo crear el usuario.';
            if (error && typeof error === 'object' && 'response' in error) {
                const response = (error as any).response;
                if (response?.status === 409) {
                    message = 'Ya existe un usuario con ese correo.';
                } else if (response?.status === 400 && response.data) {
                    const data = response.data;
                    if (Array.isArray(data)) {
                        const descriptions = data
                            .map((e: any) => e?.description || e?.Description)
                            .filter((x: any) => typeof x === 'string' && x.length > 0)
                            .join(' ');
                        if (descriptions) {
                            message = descriptions;
                        }
                    } else if (typeof data === 'string') {
                        message = data;
                    }
                }
            }
            setCreateError(message);
            console.error(error);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Usuarios</h1>
                    <p className="text-sm text-slate-500">
                        Administre usuarios del sistema y sus roles.
                    </p>
                </div>
            </div>

            {loading && (
                <div className="bg-white p-4 rounded-xl shadow text-sm text-slate-500">
                    Cargando usuarios...
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    <form onSubmit={handleCreateUser} className="bg-white p-4 rounded-xl shadow-md space-y-3">
                        <h2 className="text-lg font-semibold text-slate-800">Nuevo usuario</h2>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Correo electrónico
                            </label>
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="usuario@empresa.com"
                            />
                        </div>

                        {!currentUser?.tenantId && (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Empresa (Tenant)
                                </label>
                                <select
                                    value={newTenantId}
                                    onChange={(e) => setNewTenantId(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                >
                                    <option value="">-- Sin empresa (Host User) --</option>
                                    {tenants.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Nombre
                                </label>
                                <input
                                    type="text"
                                    value={newFirstName}
                                    onChange={(e) => setNewFirstName(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Apellidos
                                </label>
                                <input
                                    type="text"
                                    value={newLastName}
                                    onChange={(e) => setNewLastName(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="Contraseña inicial"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Roles del nuevo usuario
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {roles.map(role => (
                                    <button
                                        key={role.id}
                                        type="button"
                                        onClick={() => toggleNewUserRole(role.name)}
                                        className={`px-3 py-1 rounded-full text-xs border ${
                                            newRoles.includes(role.name)
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-gray-50 text-gray-700 border-gray-300'
                                        }`}
                                    >
                                        {role.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={creating}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
                        >
                            {creating ? 'Creando...' : 'Crear usuario'}
                        </button>
                        {createError && (
                            <div className="mt-2 text-xs text-red-600">
                                {createError}
                            </div>
                        )}
                    </form>

                    <div className="bg-white p-4 rounded-xl shadow-md">
                        <h2 className="text-lg font-semibold text-slate-800 mb-3">Usuarios existentes</h2>
                        <div className="space-y-1 max-h-80 overflow-y-auto">
                            {users.map(user => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => loadUserRoles(user)}
                                    className={`w-full flex flex-col items-start px-3 py-2 rounded-lg text-left text-sm mb-1 ${
                                        selectedUserId === user.id
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'hover:bg-gray-50 text-slate-700'
                                    }`}
                                >
                                    <span className="font-medium">{user.email}</span>
                                    <span className="text-xs text-slate-500">
                                        {user.firstName || ''} {user.lastName || ''}
                                    </span>
                                    {!currentUser?.tenantId && (
                                        <span className="text-xs text-purple-600 font-medium">
                                            {user.tenantId ? (tenants.find(t => t.id === user.tenantId)?.name || `Tenant ${user.tenantId}`) : 'Host User'}
                                        </span>
                                    )}
                                    <span className="mt-1 flex flex-wrap gap-1">
                                        {user.roles.map(role => (
                                            <span
                                                key={role}
                                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-700"
                                            >
                                                {role}
                                            </span>
                                        ))}
                                    </span>
                                </button>
                            ))}
                            {users.length === 0 && (
                                <div className="text-xs text-slate-400">
                                    No hay usuarios registrados aparte del administrador inicial.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-bold text-slate-800">Roles por usuario</h2>

                    {!selectedUserId && (
                        <div className="bg-white p-6 rounded-xl shadow-md text-gray-500 text-sm">
                            Seleccione un usuario para gestionar sus roles.
                        </div>
                    )}

                    {selectedUserId && (
                        <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-600">
                                    Marque los roles que desea asignar al usuario seleccionado.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleSaveUserRoles}
                                    disabled={savingRoles}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
                                >
                                    {savingRoles ? 'Guardando...' : 'Guardar roles'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                                {roles.map(role => (
                                    <label
                                        key={role.id}
                                        className="flex items-center gap-2 text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50"
                                    >
                                        <input
                                            type="checkbox"
                                            className="rounded"
                                            checked={selectedUserRoles.includes(role.name)}
                                            onChange={() => toggleUserRole(role.name)}
                                        />
                                        <span>{role.name}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="mt-6 pt-6 border-t border-red-100">
                                <h3 className="text-sm font-semibold text-red-800 mb-2 flex items-center">
                                    <AlertTriangle size={16} className="mr-2" />
                                    Zona de Peligro
                                </h3>
                                <p className="text-xs text-red-600 mb-3">
                                    Eliminar un usuario es una acción irreversible. Asegúrese de que el usuario no tenga actividad reciente.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleDeleteUser}
                                    disabled={deleteLoading}
                                    className="flex items-center bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 text-sm disabled:opacity-50 transition-colors w-full justify-center sm:w-auto"
                                >
                                    <Trash2 size={16} className="mr-2" />
                                    {deleteLoading ? 'Eliminando...' : 'Eliminar Usuario permanentemente'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Users;
