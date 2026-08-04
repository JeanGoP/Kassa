import { useEffect, useMemo, useState } from 'react';
import { Car, History, Plus, Save, Search, X } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../api/axios';

interface Branch { id: number; name: string; }
interface Customer { id: number; firstName?: string; lastName?: string; taxId?: string; }
interface VehicleHistory {
    source: string; recordId: number; number: string; date: string; mileage?: number;
    branchName?: string; status: string; maintenanceReviewMileage?: number;
}
interface OwnerHistory {
    id: number; customerId: number; customerIdentification?: string; customerName: string;
    ownedFrom: string; ownedUntil?: string;
}
interface Vehicle {
    id: number; branchId: number; branchName?: string; chassisNumber: string; engineNumber?: string;
    plate?: string; brand: string; model: string; year?: number; saleDate?: string;
    currentOwnerId?: number; currentOwnerName?: string; ownerSince?: string; lastKnownMileage?: number;
    isActive: boolean; ownerHistory: OwnerHistory[]; serviceHistory: VehicleHistory[];
}

const emptyForm = () => ({
    branchId: '', chassisNumber: '', engineNumber: '', plate: '', brand: 'Honda', model: '', year: '',
    saleDate: '', currentOwnerId: '', ownerSince: '', lastKnownMileage: ''
});

const Vehicles = () => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selected, setSelected] = useState<Vehicle | null>(null);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState(emptyForm());
    const [saving, setSaving] = useState(false);
    const activeCount = useMemo(() => vehicles.filter(v => v.isActive).length, [vehicles]);

    useEffect(() => { Promise.all([loadVehicles(), loadBranches(), loadCustomers()]); }, []);

    const errorMessage = (error: unknown, fallback: string) => {
        if (typeof error === 'object' && error !== null && 'response' in error) {
            const response = (error as { response?: { data?: { message?: string } } }).response;
            return response?.data?.message ?? fallback;
        }
        return fallback;
    };
    const loadVehicles = async () => setVehicles((await api.get<Vehicle[]>('/vehicles', { params: { search } })).data);
    const loadBranches = async () => setBranches((await api.get<Branch[]>('/branches')).data);
    const loadCustomers = async () => setCustomers((await api.get<Customer[]>('/customers')).data);
    const updateForm = (field: keyof ReturnType<typeof emptyForm>, value: string) => setForm(previous => ({ ...previous, [field]: value }));
    const clearSelection = () => { setSelected(null); setForm(emptyForm()); };

    const selectVehicle = async (vehicle: Vehicle) => {
        const detail = (await api.get<Vehicle>(`/vehicles/${vehicle.id}`)).data;
        setSelected(detail);
        setForm({
            branchId: String(detail.branchId), chassisNumber: detail.chassisNumber, engineNumber: detail.engineNumber ?? '',
            plate: detail.plate ?? '', brand: detail.brand, model: detail.model, year: detail.year?.toString() ?? '',
            saleDate: detail.saleDate?.slice(0, 10) ?? '', currentOwnerId: detail.currentOwnerId?.toString() ?? '',
            ownerSince: detail.ownerSince?.slice(0, 10) ?? '', lastKnownMileage: detail.lastKnownMileage?.toString() ?? ''
        });
    };

    const saveVehicle = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        const payload = {
            branchId: form.branchId ? Number(form.branchId) : null, chassisNumber: form.chassisNumber.toUpperCase(),
            engineNumber: form.engineNumber || null, plate: form.plate || null, brand: form.brand, model: form.model,
            year: form.year ? Number(form.year) : null, saleDate: form.saleDate || null,
            currentOwnerId: form.currentOwnerId ? Number(form.currentOwnerId) : null, ownerSince: form.ownerSince || null,
            lastKnownMileage: form.lastKnownMileage ? Number(form.lastKnownMileage) : null
        };
        try {
            const response = selected ? await api.put<Vehicle>(`/vehicles/${selected.id}`, payload) : await api.post<Vehicle>('/vehicles', payload);
            await Swal.fire('Vehículo guardado', 'El maestro UIO quedó actualizado.', 'success');
            await loadVehicles();
            await selectVehicle(response.data);
        } catch (error) {
            await Swal.fire('No se pudo guardar', errorMessage(error, 'Revisa los datos del vehículo.'), 'error');
        } finally { setSaving(false); }
    };

    const deactivate = async () => {
        if (!selected) return;
        const result = await Swal.fire({ title: 'Desactivar vehículo', text: 'El historial seguirá disponible para consulta.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Desactivar', cancelButtonText: 'Cancelar' });
        if (!result.isConfirmed) return;
        await api.delete(`/vehicles/${selected.id}`);
        clearSelection();
        await loadVehicles();
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div><h1 className="text-2xl font-bold text-slate-900">Vehículos UIO</h1><p className="mt-1 text-sm text-slate-500">Maestro por VIN, propietario e historial de atención.</p></div>
                <div className="flex items-center gap-3 text-sm text-slate-600"><Car size={18} /><span><strong className="text-slate-900">{activeCount}</strong> activos</span></div>
            </header>
            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                <div className="min-w-0 space-y-4">
                    <div className="flex gap-2">
                        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadVehicles()} className="w-full rounded-md border border-slate-300 py-2 pl-10 pr-3" placeholder="Buscar VIN, motor, placa, marca o modelo" /></div>
                        <button type="button" onClick={loadVehicles} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Buscar</button>
                    </div>
                    <div className="overflow-x-auto border-y border-slate-200 bg-white">
                        <table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500"><tr><th className="px-3 py-3">VIN / Chasis</th><th className="px-3 py-3">Vehículo</th><th className="px-3 py-3">Placa</th><th className="px-3 py-3">Propietario</th><th className="px-3 py-3">Sucursal</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">{vehicles.map(vehicle => <tr key={vehicle.id} onClick={() => selectVehicle(vehicle)} className={`cursor-pointer hover:bg-slate-50 ${selected?.id === vehicle.id ? 'bg-blue-50' : ''}`}><td className="px-3 py-3 font-mono font-semibold text-slate-900">{vehicle.chassisNumber}</td><td className="px-3 py-3">{vehicle.brand} {vehicle.model} {vehicle.year ?? ''}</td><td className="px-3 py-3">{vehicle.plate || 'Sin placa'}</td><td className="px-3 py-3">{vehicle.currentOwnerName || 'Sin propietario'}</td><td className="px-3 py-3">{vehicle.branchName}</td></tr>)}
                                {vehicles.length === 0 && <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-500">No hay vehículos registrados.</td></tr>}</tbody></table>
                    </div>
                    {selected && <div className="space-y-3 border-t border-slate-200 pt-4"><h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><History size={18} /> Historial por chasis</h2><div className="divide-y divide-slate-100 border-y border-slate-200">{selected.serviceHistory.map(item => <div key={`${item.source}-${item.recordId}`} className="grid gap-1 px-3 py-3 text-sm sm:grid-cols-[140px_1fr_auto]"><div className="font-semibold text-slate-700">{new Date(item.date).toLocaleDateString()}</div><div><span className="font-medium">{item.source}</span> #{item.number} · {item.branchName} · {item.mileage ?? 0} km</div><div className="text-slate-500">{item.maintenanceReviewMileage ? `Revisión ${item.maintenanceReviewMileage} km` : item.status}</div></div>)}{selected.serviceHistory.length === 0 && <div className="px-3 py-8 text-center text-sm text-slate-500">Aún no tiene atenciones vinculadas.</div>}</div></div>}
                </div>
                <form onSubmit={saveVehicle} className="h-fit space-y-4 border-l border-slate-200 pl-0 xl:pl-6">
                    <div className="flex items-center justify-between"><h2 className="text-base font-bold text-slate-900">{selected ? 'Editar vehículo' : 'Nuevo vehículo'}</h2>{selected && <button type="button" onClick={clearSelection} title="Nuevo vehículo" className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><Plus size={18} /></button>}</div>
                    <label className="block text-sm font-medium">VIN / Chasis<input required minLength={17} maxLength={17} value={form.chassisNumber} onChange={e => updateForm('chassisNumber', e.target.value.toUpperCase())} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono" /></label>
                    <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Motor<input value={form.engineNumber} onChange={e => updateForm('engineNumber', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium">Placa<input value={form.plate} onChange={e => updateForm('plate', e.target.value.toUpperCase())} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium">Marca<input required value={form.brand} onChange={e => updateForm('brand', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium">Modelo<input required value={form.model} onChange={e => updateForm('model', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium">Año<input type="number" min="1900" max="2100" value={form.year} onChange={e => updateForm('year', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium">Kilometraje<input type="number" min="0" step="0.01" value={form.lastKnownMileage} onChange={e => updateForm('lastKnownMileage', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label></div>
                    <label className="block text-sm font-medium">Sucursal<select value={form.branchId} onChange={e => updateForm('branchId', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"><option value="">Sucursal actual</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
                    <label className="block text-sm font-medium">Propietario<select value={form.currentOwnerId} onChange={e => updateForm('currentOwnerId', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"><option value="">Sin propietario</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.firstName} {customer.lastName} {customer.taxId ? `· ${customer.taxId}` : ''}</option>)}</select></label>
                    <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Propietario desde<input type="date" value={form.ownerSince} onChange={e => updateForm('ownerSince', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium">Fecha de venta<input type="date" value={form.saleDate} onChange={e => updateForm('saleDate', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label></div>
                    <div className="flex gap-2 border-t border-slate-200 pt-4"><button disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-60"><Save size={18} /> {saving ? 'Guardando...' : 'Guardar'}</button>{selected && <button type="button" onClick={deactivate} title="Desactivar vehículo" className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"><X size={18} /></button>}</div>
                </form>
            </section>
        </div>
    );
};

export default Vehicles;
