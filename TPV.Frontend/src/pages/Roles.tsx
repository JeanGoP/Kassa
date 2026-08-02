import React, { useEffect, useState } from 'react';
import api from '../api/axios';

interface Role {
    id: string;
    name: string;
}

interface Permission {
    key: string;
    description: string;
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

const permissionTranslations: { [key: string]: string } = {
    'Host.Tenants.Manage': 'Gestionar Empresas (Tenants)',
    'Admin.Users.Manage': 'Gestionar Usuarios',
    'Admin.Roles.Manage': 'Gestionar Roles y Permisos',
    'Menus.Dashboard.View': 'Ver Dashboard Principal',
    'Menus.POS.View': 'Ver Punto de Venta (POS)',
    'Menus.Purchases.View': 'Ver Compras y Entradas de Stock',
    'Menus.Workshop.View': 'Ver Taller y Órdenes de Servicio',
    'Menus.Products.View': 'Ver Catálogo de Productos y Categorías',
    'Menus.MotorcycleServices.View': 'Ver Catalogo de Servicios de Moto',
    'Menus.Customers.View': 'Ver Gestión de Clientes',
    'Menus.Suppliers.View': 'Ver Gestión de Proveedores',
    'Menus.Technicians.View': 'Ver Gestión de Técnicos',
    'Menus.WorkshopManagers.View': 'Ver Gestión de Jefes de Taller',
    'Menus.Branches.View': 'Ver Gestión de Sucursales',
    'Menus.Inventory.View': 'Ver Inventario, Ajustes y Traslados',
    'Menus.Cash.View': 'Ver Control de Caja',
    'Menus.Reports.View': 'Ver Reportes y Estadísticas',
    'Menus.Warranties.View': 'Ver Gestión de Garantías'
};

const getPermissionDisplayName = (key: string) => {
    if (!key) return '';
    const cleanKey = key.trim();
    return permissionTranslations[cleanKey] || cleanKey;
};

const Roles = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [rolePermissions, setRolePermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
    const [editingRoleName, setEditingRoleName] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const [rolesResponse, permissionsResponse] = await Promise.all([
                api.get('/roles'),
                api.get('/roles/permissions')
            ]);
            setRoles(rolesResponse.data);
            setPermissions(permissionsResponse.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadRolePermissions = async (roleId: string) => {
        setSelectedRoleId(roleId);
        try {
            const response = await api.get(`/roles/${roleId}/permissions`);
            setRolePermissions(response.data);
        } catch (error) {
            console.error(error);
            setRolePermissions([]);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const togglePermission = (key: string) => {
        if (!selectedRoleId) return;
        if (rolePermissions.includes(key)) {
            setRolePermissions(rolePermissions.filter(p => p !== key));
        } else {
            setRolePermissions([...rolePermissions, key]);
        }
    };

    const handleSavePermissions = async () => {
        if (!selectedRoleId) return;
        setSaving(true);
        try {
            await api.put(`/roles/${selectedRoleId}/permissions`, rolePermissions);
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoleName.trim()) return;
        try {
            await api.post('/roles', { name: newRoleName.trim() });
            setNewRoleName('');
            await loadData();
        } catch (error) {
            console.error(error);
        }
    };

    const startEditRole = (role: Role) => {
        setEditingRoleId(role.id);
        setEditingRoleName(role.name);
    };

    const cancelEditRole = () => {
        setEditingRoleId(null);
        setEditingRoleName('');
    };

    const handleUpdateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRoleId || !editingRoleName.trim()) return;
        try {
            await api.put(`/roles/${editingRoleId}`, { name: editingRoleName.trim() });
            setEditingRoleId(null);
            setEditingRoleName('');
            await loadData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteRole = async (roleId: string) => {
        if (!window.confirm('¿Eliminar este rol?')) return;
        try {
            await api.delete(`/roles/${roleId}`);
            if (selectedRoleId === roleId) {
                setSelectedRoleId(null);
                setRolePermissions([]);
            }
            await loadData();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
                <h2 className="text-xl font-bold text-slate-800">Roles</h2>

                <form onSubmit={editingRoleId ? handleUpdateRole : handleCreateRole} className="bg-white p-4 rounded-xl shadow-md space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {editingRoleId ? 'Editar rol' : 'Nuevo rol'}
                        </label>
                        <input
                            type="text"
                            value={editingRoleId ? editingRoleName : newRoleName}
                            onChange={(e) => {
                                if (editingRoleId) {
                                    setEditingRoleName(e.target.value);
                                } else {
                                    setNewRoleName(e.target.value);
                                }
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Nombre del rol"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="submit"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                        >
                            {editingRoleId ? 'Guardar cambios' : 'Crear rol'}
                        </button>
                        {editingRoleId && (
                            <button
                                type="button"
                                onClick={cancelEditRole}
                                className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                            >
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>

                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="border-b px-4 py-3 text-sm font-semibold text-slate-700">
                        Lista de roles
                    </div>
                    <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                        {loading && (
                            <div className="p-4 text-center text-gray-400 text-sm">
                                Cargando...
                            </div>
                        )}
                        {!loading && roles.length === 0 && (
                            <div className="p-4 text-center text-gray-400 text-sm">
                                No hay roles definidos.
                            </div>
                        )}
                        {roles.map(role => (
                            <div
                                key={role.id}
                                className={`flex items-center justify-between px-4 py-2 text-sm cursor-pointer ${selectedRoleId === role.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
                                onClick={() => loadRolePermissions(role.id)}
                            >
                                <span className="font-medium">{getRoleDisplayName(role.name)}</span>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        onClick={() => startEditRole(role)}
                                        className="text-xs text-blue-600 hover:underline"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteRole(role.id)}
                                        className="text-xs text-red-600 hover:underline"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xl font-bold text-slate-800">Permisos por rol</h2>

                {!selectedRoleId && (
                    <div className="bg-white p-6 rounded-xl shadow-md text-gray-500 text-sm">
                        Seleccione un rol para gestionar sus permisos.
                    </div>
                )}

                {selectedRoleId && (
                    <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                                Marque los permisos que desea asignar al rol seleccionado.
                            </p>
                            <button
                                type="button"
                                onClick={handleSavePermissions}
                                disabled={saving}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
                            >
                                {saving ? 'Guardando...' : 'Guardar permisos'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                            {permissions?.map(p => (
                                <label key={p.key} className="flex items-center gap-2 text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        className="rounded"
                                        checked={rolePermissions?.includes(p.key)}
                                        onChange={() => togglePermission(p.key)}
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-medium">{getPermissionDisplayName(p.key)}</span>
                                        <span className="text-xs text-gray-400">{p.key}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Roles;

