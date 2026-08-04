import { useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import api from '../api/axios';

type Brand = { id: number; code: string; name: string; isActive: boolean };
type VehicleModel = { id: number; brandId: number; brandName: string; code: string; name: string; isActive: boolean };

const inputClass = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-semibold uppercase text-slate-600';

export default function VehicleCatalogs() {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [models, setModels] = useState<VehicleModel[]>([]);
    const [brandForm, setBrandForm] = useState({ id: 0, code: '', name: '' });
    const [modelForm, setModelForm] = useState({ id: 0, brandId: 0, code: '', name: '' });
    const [error, setError] = useState('');

    const load = async () => {
        const [brandResponse, modelResponse] = await Promise.all([
            api.get<Brand[]>('/vehiclecatalogs/brands', { params: { includeInactive: true } }),
            api.get<VehicleModel[]>('/vehiclecatalogs/models', { params: { includeInactive: true } })
        ]);
        setBrands(brandResponse.data);
        setModels(modelResponse.data);
    };

    useEffect(() => { load().catch(() => setError('No fue posible cargar los catálogos.')); }, []);
    const activeBrands = useMemo(() => brands.filter(b => b.isActive), [brands]);

    const saveBrand = async (event: React.FormEvent) => {
        event.preventDefault(); setError('');
        try {
            const payload = { code: brandForm.code.trim().toUpperCase(), name: brandForm.name.trim() };
            brandForm.id ? await api.put(`/vehiclecatalogs/brands/${brandForm.id}`, payload) : await api.post('/vehiclecatalogs/brands', payload);
            setBrandForm({ id: 0, code: '', name: '' }); await load();
        } catch (e: any) { setError(e.response?.data?.message || 'No fue posible guardar la marca.'); }
    };

    const saveModel = async (event: React.FormEvent) => {
        event.preventDefault(); setError('');
        try {
            const payload = { brandId: modelForm.brandId, code: modelForm.code.trim().toUpperCase(), name: modelForm.name.trim() };
            modelForm.id ? await api.put(`/vehiclecatalogs/models/${modelForm.id}`, payload) : await api.post('/vehiclecatalogs/models', payload);
            setModelForm({ id: 0, brandId: 0, code: '', name: '' }); await load();
        } catch (e: any) { setError(e.response?.data?.message || 'No fue posible guardar el modelo.'); }
    };

    const deactivate = async (kind: 'brands' | 'models', id: number) => {
        if (!window.confirm('¿Desea desactivar este registro?')) return;
        try { await api.delete(`/vehiclecatalogs/${kind}/${id}`); await load(); }
        catch (e: any) { setError(e.response?.data?.message || 'No fue posible desactivar el registro.'); }
    };

    return <div className="space-y-8 p-4 md:p-6">
        <div><h1 className="text-2xl font-bold text-slate-900">MARCAS Y MODELOS</h1><p className="text-sm text-slate-500">CATÁLOGO FORMAL POR EMPRESA</p></div>
        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">MARCAS</h2>
            <form onSubmit={saveBrand} className="grid gap-3 border-y border-slate-200 py-4 md:grid-cols-[180px_1fr_auto] md:items-end">
                <label><span className={labelClass}>CÓDIGO</span><input required maxLength={30} className={inputClass} value={brandForm.code} onChange={e => setBrandForm({ ...brandForm, code: e.target.value })} /></label>
                <label><span className={labelClass}>NOMBRE</span><input required maxLength={100} className={inputClass} value={brandForm.name} onChange={e => setBrandForm({ ...brandForm, name: e.target.value })} /></label>
                <div className="flex gap-2"><button title="Guardar marca" className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white"><Save size={17} /> GUARDAR</button>{brandForm.id > 0 && <button type="button" title="Cancelar edición" onClick={() => setBrandForm({ id: 0, code: '', name: '' })} className="h-10 rounded-md border border-slate-300 px-3"><X size={17} /></button>}</div>
            </form>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr><th className="p-3">CÓDIGO</th><th className="p-3">NOMBRE</th><th className="p-3">ESTADO</th><th className="w-24 p-3">ACCIONES</th></tr></thead><tbody>{brands.map(b => <tr key={b.id} className="border-b border-slate-200"><td className="p-3 font-mono">{b.code}</td><td className="p-3 font-medium">{b.name}</td><td className="p-3">{b.isActive ? 'ACTIVA' : 'INACTIVA'}</td><td className="p-3"><div className="flex gap-2"><button title="Editar marca" onClick={() => setBrandForm({ id: b.id, code: b.code, name: b.name })}><Edit2 size={17} /></button>{b.isActive && <button title="Desactivar marca" onClick={() => deactivate('brands', b.id)} className="text-red-600"><Trash2 size={17} /></button>}</div></td></tr>)}</tbody></table></div>
        </section>
        <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">MODELOS</h2>
            <form onSubmit={saveModel} className="grid gap-3 border-y border-slate-200 py-4 md:grid-cols-[1fr_180px_1fr_auto] md:items-end">
                <label><span className={labelClass}>MARCA</span><select required className={inputClass} value={modelForm.brandId || ''} onChange={e => setModelForm({ ...modelForm, brandId: Number(e.target.value) })}><option value="">SELECCIONE</option>{activeBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
                <label><span className={labelClass}>CÓDIGO</span><input required maxLength={30} className={inputClass} value={modelForm.code} onChange={e => setModelForm({ ...modelForm, code: e.target.value })} /></label>
                <label><span className={labelClass}>NOMBRE</span><input required maxLength={100} className={inputClass} value={modelForm.name} onChange={e => setModelForm({ ...modelForm, name: e.target.value })} /></label>
                <div className="flex gap-2"><button title="Guardar modelo" className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white"><Plus size={17} /> GUARDAR</button>{modelForm.id > 0 && <button type="button" title="Cancelar edición" onClick={() => setModelForm({ id: 0, brandId: 0, code: '', name: '' })} className="h-10 rounded-md border border-slate-300 px-3"><X size={17} /></button>}</div>
            </form>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr><th className="p-3">MARCA</th><th className="p-3">CÓDIGO</th><th className="p-3">MODELO</th><th className="p-3">ESTADO</th><th className="w-24 p-3">ACCIONES</th></tr></thead><tbody>{models.map(m => <tr key={m.id} className="border-b border-slate-200"><td className="p-3">{m.brandName}</td><td className="p-3 font-mono">{m.code}</td><td className="p-3 font-medium">{m.name}</td><td className="p-3">{m.isActive ? 'ACTIVO' : 'INACTIVO'}</td><td className="p-3"><div className="flex gap-2"><button title="Editar modelo" onClick={() => setModelForm({ id: m.id, brandId: m.brandId, code: m.code, name: m.name })}><Edit2 size={17} /></button>{m.isActive && <button title="Desactivar modelo" onClick={() => deactivate('models', m.id)} className="text-red-600"><Trash2 size={17} /></button>}</div></td></tr>)}</tbody></table></div>
        </section>
    </div>;
}
