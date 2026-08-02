import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { CalendarCheck, CheckCircle, Clock, Mail, MapPin, Phone, User, Wrench } from 'lucide-react';
import logo from '../assets/Logo.png';

interface BookingInfo {
    businessName: string;
    businessPhone?: string;
    businessEmail?: string;
    scheduleName: string;
    branchName: string;
    branchAddress?: string;
    branchCity?: string;
    branchDepartment?: string;
    advanceBookingDays: number;
    slotDurationMinutes: number;
    timeZone: string;
}

interface AvailabilitySlot {
    startAt: string;
    endAt: string;
    time: string;
    availableCapacity: number;
}

interface AvailabilityDay {
    date: string;
    label: string;
    slots: AvailabilitySlot[];
}

interface CreatedAppointment {
    confirmationCode: string;
    startAt: string;
    customerName: string;
}

const emptyForm = {
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    serviceType: 'Revision de vehiculo',
    vehiclePlate: '',
    vehicleBrand: '',
    vehicleModel: '',
    notes: ''
};

const formatDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
};

const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-CO', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
};

const PublicBooking = () => {
    const { slug } = useParams();
    const [info, setInfo] = useState<BookingInfo | null>(null);
    const [availability, setAvailability] = useState<AvailabilityDay[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
    const [formData, setFormData] = useState(emptyForm);
    const [createdAppointment, setCreatedAppointment] = useState<CreatedAppointment | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const totalSlots = useMemo(
        () => availability.reduce((total, day) => total + day.slots.length, 0),
        [availability]
    );

    useEffect(() => {
        fetchBookingData();
    }, [slug]);

    const fetchBookingData = async () => {
        if (!slug) return;

        try {
            setLoading(true);
            setError('');
            const infoResponse = await api.get(`/appointments/public/${slug}`);
            const bookingInfo = infoResponse.data;
            setInfo(bookingInfo);

            const from = formatDateInput(new Date());
            const rangeDays = Math.min(bookingInfo.advanceBookingDays || 14, 30);
            const to = formatDateInput(addDays(new Date(), rangeDays));
            const availabilityResponse = await api.get(`/appointments/public/${slug}/availability?from=${from}&to=${to}`);
            setAvailability(availabilityResponse.data);
        } catch (requestError: any) {
            setError(requestError.response?.data?.message || 'No fue posible cargar la agenda.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!slug || !selectedSlot) return;

        try {
            setSubmitting(true);
            setError('');
            const response = await api.post(`/appointments/public/${slug}/book`, {
                ...formData,
                startAt: selectedSlot.startAt
            });
            setCreatedAppointment(response.data);
        } catch (requestError: any) {
            setError(requestError.response?.data?.message || 'No fue posible crear la cita.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
                <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 text-sm font-semibold text-slate-600 shadow-sm">
                    Cargando agenda...
                </div>
            </div>
        );
    }

    if (error && !info) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
                <div className="w-full max-w-md rounded-xl border border-red-100 bg-white p-6 text-center shadow-sm">
                    <img src={logo} alt="Kassa" className="mx-auto mb-4 h-12 w-12 rounded-lg object-contain" />
                    <h1 className="text-xl font-bold text-slate-900">Agenda no disponible</h1>
                    <p className="mt-2 text-sm text-slate-500">{error}</p>
                </div>
            </div>
        );
    }

    if (createdAppointment) {
        return (
            <div className="min-h-screen bg-slate-50 px-4 py-8">
                <div className="mx-auto w-full max-w-xl rounded-2xl border border-emerald-100 bg-white p-6 text-center shadow-sm sm:p-8">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <CheckCircle size={30} />
                    </div>
                    <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Cita solicitada</h1>
                    <p className="mt-2 text-slate-600">
                        {createdAppointment.customerName}, tu solicitud quedo registrada para {formatDateTime(createdAppointment.startAt)}.
                    </p>
                    <div className="mt-5 rounded-xl bg-slate-50 p-4">
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Codigo de confirmacion</div>
                        <div className="mt-1 font-mono text-2xl font-extrabold text-slate-900">{createdAppointment.confirmationCode}</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <img src={logo} alt="Kassa" className="h-10 w-10 rounded-lg object-contain shadow-sm" />
                        <div className="min-w-0">
                            <div className="truncate text-lg font-extrabold text-slate-900">{info?.businessName}</div>
                            <div className="truncate text-sm text-slate-500">{info?.scheduleName}</div>
                        </div>
                    </div>
                    <div className="hidden rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700 sm:block">
                        {info?.slotDurationMinutes} min
                    </div>
                </div>
            </header>

            <main className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[360px_1fr]">
                <aside className="space-y-4">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                                <MapPin size={22} />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-xl font-extrabold text-slate-900">{info?.branchName}</h1>
                                <p className="mt-1 text-sm text-slate-500">
                                    {info?.branchAddress || 'Direccion por confirmar'}
                                    {(info?.branchCity || info?.branchDepartment) && (
                                        <>
                                            <br />
                                            {info?.branchCity}{info?.branchDepartment ? `, ${info.branchDepartment}` : ''}
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="mt-5 space-y-2 text-sm text-slate-600">
                            {info?.businessPhone && (
                                <div className="flex items-center gap-2">
                                    <Phone size={16} className="text-slate-400" />
                                    <span>{info.businessPhone}</span>
                                </div>
                            )}
                            {info?.businessEmail && (
                                <div className="flex items-center gap-2">
                                    <Mail size={16} className="text-slate-400" />
                                    <span className="min-w-0 truncate">{info.businessEmail}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <Clock size={16} className="text-slate-400" />
                                <span>{totalSlots} horarios disponibles</span>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="mb-4 flex items-center font-bold text-slate-900">
                            <User size={18} className="mr-2 text-blue-600" /> Tus datos
                        </h2>
                        <form id="public-booking-form" onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Nombre</label>
                                <input required className="w-full rounded-lg border-slate-300" value={formData.customerName} onChange={(event) => setFormData({ ...formData, customerName: event.target.value })} />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Telefono</label>
                                <input required className="w-full rounded-lg border-slate-300" value={formData.customerPhone} onChange={(event) => setFormData({ ...formData, customerPhone: event.target.value })} />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Correo</label>
                                <input type="email" className="w-full rounded-lg border-slate-300" value={formData.customerEmail} onChange={(event) => setFormData({ ...formData, customerEmail: event.target.value })} />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Servicio</label>
                                <input required className="w-full rounded-lg border-slate-300" value={formData.serviceType} onChange={(event) => setFormData({ ...formData, serviceType: event.target.value })} />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Placa</label>
                                    <input className="w-full rounded-lg border-slate-300 uppercase" value={formData.vehiclePlate} onChange={(event) => setFormData({ ...formData, vehiclePlate: event.target.value })} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Marca</label>
                                    <input className="w-full rounded-lg border-slate-300" value={formData.vehicleBrand} onChange={(event) => setFormData({ ...formData, vehicleBrand: event.target.value })} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Modelo</label>
                                    <input className="w-full rounded-lg border-slate-300" value={formData.vehicleModel} onChange={(event) => setFormData({ ...formData, vehicleModel: event.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Notas</label>
                                <textarea rows={3} className="w-full rounded-lg border-slate-300" value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} />
                            </div>
                            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div>}
                            <button
                                type="submit"
                                disabled={!selectedSlot || submitting}
                                className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <CalendarCheck size={18} className="mr-2" /> {submitting ? 'Agendando...' : 'Confirmar cita'}
                            </button>
                        </form>
                    </section>
                </aside>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="flex items-center text-xl font-extrabold text-slate-900">
                                <CalendarCheck size={22} className="mr-2 text-blue-600" /> Escoge el horario
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">{info?.timeZone}</p>
                        </div>
                        {selectedSlot && (
                            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
                                {formatDateTime(selectedSlot.startAt)}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {availability.map(day => (
                            <div key={day.date} className="rounded-xl border border-slate-200 p-4">
                                <div className="mb-3 font-bold text-slate-900">{day.label}</div>
                                <div className="flex flex-wrap gap-2">
                                    {day.slots.map(slot => {
                                        const isSelected = selectedSlot?.startAt === slot.startAt;
                                        return (
                                            <button
                                                key={slot.startAt}
                                                type="button"
                                                onClick={() => setSelectedSlot(slot)}
                                                className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${isSelected
                                                    ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                                    : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                                                    }`}
                                            >
                                                {slot.time}
                                            </button>
                                        );
                                    })}
                                    {day.slots.length === 0 && <span className="text-sm text-slate-400">Sin cupos</span>}
                                </div>
                            </div>
                        ))}
                    </div>

                    {availability.length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                            <Wrench className="mx-auto mb-3 text-slate-400" />
                            <p className="font-semibold text-slate-600">No hay horarios disponibles.</p>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default PublicBooking;
