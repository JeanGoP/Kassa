import { useMemo, useState } from 'react';
import { Check, Clock, Search, X } from 'lucide-react';

export interface MotorcycleServiceOption {
    id: number;
    name: string;
    description?: string;
    estimatedMinutes?: number;
}

interface MotorcycleServicePickerProps {
    services: MotorcycleServiceOption[];
    value: string;
    onChange: (value: string) => void;
    label?: string;
    emptyMessage?: string;
    disabled?: boolean;
}

const normalizeText = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

const MotorcycleServicePicker = ({
    services,
    value,
    onChange,
    label = 'Servicio',
    emptyMessage = 'No hay servicios disponibles.',
    disabled = false
}: MotorcycleServicePickerProps) => {
    const [query, setQuery] = useState('');

    const selectedService = services.find(service => service.name === value);
    const filteredServices = useMemo(() => {
        const normalizedQuery = normalizeText(query.trim());

        return services
            .filter(service => {
                if (!normalizedQuery) return true;
                return normalizeText(`${service.name} ${service.description || ''}`).includes(normalizedQuery);
            })
            .slice(0, 12);
    }, [query, services]);

    return (
        <div>
            <label className="k-form-label">{label}</label>
            {value && (
                <div className="mb-2 flex items-start justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 font-bold text-blue-800">
                            <Check size={16} className="shrink-0" />
                            <span className="truncate">{value}</span>
                        </div>
                        {selectedService?.estimatedMinutes && (
                            <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-blue-600">
                                <Clock size={13} /> {selectedService.estimatedMinutes} min
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        disabled={disabled}
                        className="rounded-md p-1 text-blue-600 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Quitar servicio"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    className="k-form-control pl-10"
                    placeholder="Buscar servicio..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    disabled={disabled}
                />
            </div>
            <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                {filteredServices.map(service => {
                    const isSelected = service.name === value;

                    return (
                        <button
                            key={service.id}
                            type="button"
                            onClick={() => {
                                onChange(service.name);
                                setQuery('');
                            }}
                            disabled={disabled}
                            className={`mb-2 flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2 text-left transition last:mb-0 disabled:cursor-not-allowed disabled:opacity-50 ${isSelected
                                ? 'border-blue-500 bg-blue-50 text-blue-900'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50'
                                }`}
                        >
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-bold">{service.name}</span>
                                {service.description && (
                                    <span className="mt-1 block line-clamp-2 text-xs font-medium text-slate-500">{service.description}</span>
                                )}
                            </span>
                            {service.estimatedMinutes && (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                                    <Clock size={12} /> {service.estimatedMinutes} min
                                </span>
                            )}
                        </button>
                    );
                })}
                {filteredServices.length === 0 && (
                    <div className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm font-semibold text-slate-500">
                        {emptyMessage}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MotorcycleServicePicker;
