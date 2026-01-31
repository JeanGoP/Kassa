import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Trash2, AlertTriangle, Search } from 'lucide-react';

interface User {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    isActive: boolean;
    roles: string[];
    tenantId?: number | null;
    currentBranchId?: number | null;
}

interface Role {
    id: string;
    name: string;
}

interface Tenant {
    id: number;
    name: string;
}

interface Branch {
    id: number;
    name: string;
}

const roleTranslations: { [key: string]: string } = {
    'Admin': 'Administrador',
    'Vendedor': 'Vendedor',
    'Supervisor': 'Supervisor',
    'Technician': 'Técnico',
    'WorkshopManager': 'Jefe de Taller',
    'User': 'Usuario'
};

const getRoleDisplayName = (roleName: string) => {
    return roleTranslations[roleName] || roleName;
};

const Users = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [selectedUserRole, setSelectedUserRole] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [savingRoles, setSavingRoles] = useState(false);
    const [creating, setCreating] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [userSearch, setUserSearch] = useState('');

    // Create User State
    const [newEmail, setNewEmail] = useState('');
    const [newFirstName, setNewFirstName] = useState('');
    const [newLastName, setNewLastName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<string>('');
    const [newTenantId, setNewTenantId] = useState<string>('');
    const [newBranchId, setNewBranchId] = useState<string>('');
    const [createError, setCreateError] = useState<string | null>(null);

    // Edit User State
    const [editEmail, setEditEmail] = useState('');
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editPassword, setEditPassword] = useState(''); // Only if changing
    const [editTenantId, setEditTenantId] = useState<string>('');
    const [editBranchId, setEditBranchId] = useState<string>('');
    const [editIsActive, setEditIsActive] = useState(true);
    const [editError, setEditError] = useState<string | null>(null);
    const [editSuccess, setEditSuccess] = useState<string | null>(null);
    const [savingUser, setSavingUser] = useState(false);

    const isAdmin = currentUser?.email === 'admin@tpv.com';

    const loadData = async () => {
        setLoading(true);
        try {
            const promises = [
                api.get('/users'),
                api.get('/roles'),
                api.get('/branches')
            ];

            // Only fetch tenants if user is superadmin (no tenantId)
            if (!currentUser?.tenantId) {
                promises.push(api.get('/tenants'));
            }

            const results = await Promise.all(promises);
            setUsers(results[0].data);
            setRoles(results[1].data);
            setBranches(results[2].data);
            
            if (!currentUser?.tenantId && results[3]) {
                setTenants(results[3].data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadUserRoles = (user: User) => {
        setSelectedUserId(user.id);
        // Take the first role or empty
        const primaryRole = user.roles && user.roles.length > 0 ? user.roles[0] : '';
        setSelectedUserRole(primaryRole);
        
        // Populate edit fields
        setEditEmail(user.email || '');
        setEditFirstName(user.firstName || '');
        setEditLastName(user.lastName || '');
        setEditTenantId(user.tenantId ? user.tenantId.toString() : '');
        setEditBranchId(user.currentBranchId ? user.currentBranchId.toString() : '');
        setEditIsActive(user.isActive);
        setEditPassword(''); // Reset password field
        setEditError(null);
        setEditSuccess(null);
    };

    useEffect(() => {
        loadData();
    }, []);

    // No longer toggling, just setting
    // const toggleUserRole... removed

    const handleSaveUserRoles = async () => {
        if (!selectedUserId) return;
        setSavingRoles(true);
        try {
            // Send as array of 1
            await api.put(`/users/${selectedUserId}/roles`, selectedUserRole ? [selectedUserRole] : []);
            await loadData();
            alert("Roles actualizados correctamente.");
        } catch (error) {
            console.error(error);
            alert("Error al actualizar roles.");
        } finally {
            setSavingRoles(false);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId) return;
        
        setSavingUser(true);
        setEditError(null);
        setEditSuccess(null);

        try {
            await api.put(`/users/${selectedUserId}`, {
                firstName: editFirstName,
                lastName: editLastName,
                email: editEmail,
                password: editPassword || undefined, // Only send if not empty
                tenantId: editTenantId ? parseInt(editTenantId) : null,
                currentBranchId: editBranchId ? parseInt(editBranchId) : null,
                isActive: editIsActive,
                roles: selectedUserRole ? [selectedUserRole] : []
            });
            
            await loadData();
            setEditSuccess("Usuario actualizado correctamente.");
            setEditPassword(''); // Clear password field
        } catch (error: any) {
            console.error("Error updating user:", error);
            if (error.response) {
                console.error("Server Response Data:", error.response.data);
                if (error.response.data && error.response.data.errors) {
                     console.error("Validation Errors:", JSON.stringify(error.response.data.errors, null, 2));
                }
                console.error("Server Response Status:", error.response.status);
            }
            
            const msg = error.response?.data?.message || (typeof error.response?.data === 'string' ? error.response.data : "Error al actualizar usuario.");
            let finalMsg = "Error al actualizar usuario.";
             if (error.response?.data && Array.isArray(error.response.data)) {
                 finalMsg = error.response.data.map((e: any) => e.description).join(' ');
             } else {
                 finalMsg = msg;
             }
            setEditError(finalMsg);
        } finally {
            setSavingUser(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUserId) return;
        if (!window.confirm("¿Está seguro de que desea eliminar este usuario permanentemente? Esta acción no se puede deshacer.")) return;
        
        setDeleteLoading(true);
        try {
            await api.delete(`/users/${selectedUserId}`);
            setSelectedUserId(null);
            setSelectedUserRole('');
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

    // toggleNewUserRole removed

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
                roles: newRole ? [newRole] : [],
                tenantId: newTenantId ? parseInt(newTenantId) : null,
                currentBranchId: newBranchId ? parseInt(newBranchId) : null
            });

            setNewEmail('');
            setNewFirstName('');
            setNewLastName('');
            setNewPassword('');
            setNewRole('');
            setNewTenantId('');
            setNewBranchId('');

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

    const filteredUsers = users.filter(user => {
        const q = userSearch.toLowerCase().trim();
        if (!q) return true;
        const name = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        const rolesText = (user.roles || []).join(' ').toLowerCase();
        return name.includes(q) || email.includes(q) || rolesText.includes(q);
    });

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

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Sucursal Asignada
                            </label>
                            <select
                                value={newBranchId}
                                onChange={(e) => setNewBranchId(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            >
                                <option value="">-- Seleccionar Sucursal --</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>

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
                                Rol del nuevo usuario
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {roles.map(role => (
                                    <button
                                        key={role.id}
                                        type="button"
                                        onClick={() => setNewRole(role.name)}
                                        className={`px-3 py-1 rounded-full text-xs border ${
                                            newRole === role.name
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-gray-50 text-gray-700 border-gray-300'
                                        }`}
                                    >
                                        {getRoleDisplayName(role.name)}
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
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                                placeholder="Buscar por nombre, correo o rol..."
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                        <div className="space-y-1 max-h-80 overflow-y-auto">
                            {filteredUsers.map(user => (
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
                                                {getRoleDisplayName(role)}
                                            </span>
                                        ))}
                                    </span>
                                </button>
                            ))}
                            {filteredUsers.length === 0 && (
                                <div className="text-xs text-slate-400">
                                    No hay usuarios registrados aparte del administrador inicial.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-bold text-slate-800">
                        {isAdmin ? 'Editar Información de Usuario' : 'Roles por usuario'}
                    </h2>

                    {!selectedUserId && (
                        <div className="bg-white p-6 rounded-xl shadow-md text-gray-500 text-sm">
                            Seleccione un usuario para gestionar su información.
                        </div>
                    )}

                    {selectedUserId && isAdmin && (
                        <form onSubmit={handleUpdateUser} className="bg-white p-6 rounded-xl shadow-md space-y-6">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Nombre</label>
                                    <input
                                        type="text"
                                        value={editFirstName}
                                        onChange={(e) => setEditFirstName(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Apellidos</label>
                                    <input
                                        type="text"
                                        value={editLastName}
                                        onChange={(e) => setEditLastName(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Nueva Contraseña (Opcional)</label>
                                    <input
                                        type="password"
                                        value={editPassword}
                                        onChange={(e) => setEditPassword(e.target.value)}
                                        placeholder="Dejar en blanco para no cambiar"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Estado</label>
                                    <label className="flex items-center space-x-2 mt-2">
                                        <input
                                            type="checkbox"
                                            checked={editIsActive}
                                            onChange={(e) => setEditIsActive(e.target.checked)}
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">Usuario Activo</span>
                                    </label>
                                </div>

                                {/* Tenant selection only for SuperAdmin */}
                                {!currentUser?.tenantId && (
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Empresa (Tenant)</label>
                                        <select
                                            value={editTenantId}
                                            onChange={(e) => setEditTenantId(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="">-- Sin empresa (Host User) --</option>
                                            {tenants.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Sucursal Asignada</label>
                                    <select
                                        value={editBranchId}
                                        onChange={(e) => setEditBranchId(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">-- Seleccionar Sucursal --</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2 border-t pt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Rol Asignado</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {roles.map(role => (
                                        <label key={role.id} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border hover:bg-gray-100 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="userRole"
                                                className="rounded-full text-blue-600 focus:ring-blue-500"
                                                checked={selectedUserRole === role.name}
                                                onChange={() => setSelectedUserRole(role.name)}
                                            />
                                            <span>{getRoleDisplayName(role.name)}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pt-4 border-t">
                                <button
                                    type="submit"
                                    disabled={savingUser}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 transition-colors shadow-sm"
                                >
                                    {savingUser ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                                {editSuccess && <span className="text-sm text-green-600 font-medium">{editSuccess}</span>}
                                {editError && <span className="text-sm text-red-600 font-medium">{editError}</span>}
                            </div>

                            <div className="mt-8 pt-6 border-t border-red-100">
                                <h3 className="text-sm font-semibold text-red-800 mb-2 flex items-center">
                                    <AlertTriangle size={16} className="mr-2" />
                                    Zona de Peligro
                                </h3>
                                <p className="text-xs text-red-600 mb-3">
                                    Eliminar un usuario es una acción irreversible.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleDeleteUser}
                                    disabled={deleteLoading}
                                    className="flex items-center bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 text-sm disabled:opacity-50 transition-colors"
                                >
                                    <Trash2 size={16} className="mr-2" />
                                    {deleteLoading ? 'Eliminando...' : 'Eliminar Usuario'}
                                </button>
                            </div>
                        </form>
                    )}

                    {selectedUserId && !isAdmin && (
                        <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-600">
                                    Marque el rol que desea asignar al usuario seleccionado.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleSaveUserRoles}
                                    disabled={savingRoles}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
                                >
                                    {savingRoles ? 'Guardando...' : 'Guardar rol'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                                {roles.map(role => (
                                    <label
                                        key={role.id}
                                        className="flex items-center gap-2 text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50"
                                    >
                                        <input
                                            type="radio"
                                            name="userRolePanel"
                                            className="rounded-full"
                                            checked={selectedUserRole === role.name}
                                            onChange={() => setSelectedUserRole(role.name)}
                                        />
                                        <span>{getRoleDisplayName(role.name)}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Users;
