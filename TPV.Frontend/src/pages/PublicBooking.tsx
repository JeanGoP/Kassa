import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { CalendarCheck, CheckCircle, ChevronLeft, ChevronRight, Clock, Mail, MapPin, Phone, User, Wrench } from 'lucide-react';
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

interface CalendarDay {
    date: Date;
    key: string;
    dayNumber: number;
    isCurrentMonth: boolean;
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

const weekDayLabels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

const formatDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseDateKey = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const addDays = (date: Date, days: number) => {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const maxDate = (first: Date, second: Date) => first >= second ? first : second;
const minDate = (first: Date, second: Date) => first <= second ? first : second;

const isSameMonth = (first: Date, second: Date) =>
    first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth();

const buildCalendarDays = (month: Date): CalendarDay[] => {
    const firstDay = startOfMonth(month);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = addDays(firstDay, -mondayOffset);

    return Array.from({ length: 42 }, (_, index) => {
        const date = addDays(gridStart, index);
        return {
            date,
            key: formatDateInput(date),
            dayNumber: date.getDate(),
            isCurrentMonth: isSameMonth(date, month)
        };
    });
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

const formatDateLabel = (value: string) => {
    const date = parseDateKey(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-CO', {
        weekday: 'long',
        day: '2-digit',
        month: 'long'
    }).format(date);
};

const formatMonthLabel = (date: Date) => {
    return new Intl.DateTimeFormat('es-CO', {
        month: 'long',
        year: 'numeric'
    }).format(date);
};

const PublicBooking = () => {
    const { slug } = useParams();
    const today = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }, []);

    const [info, setInfo] = useState<BookingInfo | null>(null);
    const [availability, setAvailability] = useState<AvailabilityDay[]>([]);
    const [visibleMonth, setVisibleMonth] = useState(startOfMonth(today));
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
    const [formData, setFormData] = useState(emptyForm);
    const [createdAppointment, setCreatedAppointment] = useState<CreatedAppointment | null>(null);
    const [loading, setLoading] = useState(true);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const maxBookableDate = useMemo(
        () => addDays(today, info?.advanceBookingDays || 14),
        [info?.advanceBookingDays, today]
    );

    const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

    const availabilityByDate = useMemo(() => {
        const map = new Map<string, AvailabilityDay>();
        availability.forEach(day => map.set(day.date, day));
        return map;
    }, [availability]);

    const selectedDay = selectedDate ? availabilityByDate.get(selectedDate) : undefined;
    const selectedDaySlots = selectedDay?.slots || [];

    const totalSlots = useMemo(
        () => availability.reduce((total, day) => total + day.slots.length, 0),
        [availability]
    );

    const previousDisabled = endOfMonth(addDays(visibleMonth, -1)) < today;
    const nextDisabled = startOfMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1)) > maxBookableDate;

    useEffect(() => {
        fetchBookingInfo();
    }, [slug]);

    useEffect(() => {
        if (slug && info) {
            fetchAvailabilityForMonth();
        }
    }, [slug, info, visibleMonth]);

    useEffect(() => {
        if (!info || availabilityLoading) return;

        const currentSelection = selectedDate ? parseDateKey(selectedDate) : null;
        if (currentSelection && isSameMonth(currentSelection, visibleMonth)) return;

        const firstAvailable = availability.find(day => day.slots.length > 0)?.date;
        const firstBookable = calendarDays.find(day =>
            day.isCurrentMonth && day.date >= today && day.date <= maxBookableDate
        )?.key;

        setSelectedDate(firstAvailable || firstBookable || '');
        setSelectedSlot(null);
    }, [availability, availabilityLoading, calendarDays, info, maxBookableDate, selectedDate, today, visibleMonth]);

    const fetchBookingInfo = async () => {
        if (!slug) return;

        try {
            setLoading(true);
            setError('');
            const response = await api.get(`/appointments/public/${slug}`);
            setInfo(response.data);
            setVisibleMonth(startOfMonth(today));
            setSelectedDate('');
            setSelectedSlot(null);
        } catch (requestError: any) {
            setError(requestError.response?.data?.message || 'No fue posible cargar la agenda.');
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailabilityForMonth = async () => {
        if (!slug || !info) return;

        const fromDate = maxDate(startOfMonth(visibleMonth), today);
        const toDate = minDate(endOfMonth(visibleMonth), maxBookableDate);

        if (toDate < fromDate) {
            setAvailability([]);
            return;
        }

        try {
            setAvailabilityLoading(true);
            setError('');
            const from = formatDateInput(fromDate);
            const to = formatDateInput(toDate);
            const response = await api.get(`/appointments/public/${slug}/availability?from=${from}&to=${to}`);
            setAvailability(response.data);
        } catch (requestError: any) {
            setError(requestError.response?.data?.message || 'No fue posible cargar disponibilidad.');
            setAvailability([]);
        } finally {
            setAvailabilityLoading(false);
        }
    };

    const changeMonth = (direction: number) => {
        setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + direction, 1));
        setSelectedDate('');
        setSelectedSlot(null);
    };

    const selectDay = (day: CalendarDay) => {
        if (!day.isCurrentMonth || day.date < today || day.date > maxBookableDate) return;
        setSelectedDate(day.key);
        setSelectedSlot(null);
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
            await fetchAvailabilityForMonth();
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
                                <span>{totalSlots} horarios disponibles este mes</span>
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
                    <div className="mb-5 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <h2 className="flex items-center text-xl font-extrabold text-slate-900">
                                <CalendarCheck size={22} className="mr-2 text-blue-600" /> Escoge dia y hora
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">{info?.timeZone}</p>
                        </div>
                        {selectedSlot && (
                            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
                                {formatDateTime(selectedSlot.startAt)}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
                        <div className="rounded-xl border border-slate-200 p-3 sm:p-4">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <button
                                    type="button"
                                    disabled={previousDisabled}
                                    onClick={() => changeMonth(-1)}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="Mes anterior"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <div className="text-center">
                                    <div className="text-lg font-extrabold capitalize text-slate-900">{formatMonthLabel(visibleMonth)}</div>
                                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Disponibilidad mensual</div>
                                </div>
                                <button
                                    type="button"
                                    disabled={nextDisabled}
                                    onClick={() => changeMonth(1)}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="Mes siguiente"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>

                            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase tracking-wide text-slate-400">
                                {weekDayLabels.map(day => <div key={day} className="py-2">{day}</div>)}
                            </div>

                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map(day => {
                                    const availabilityDay = availabilityByDate.get(day.key);
                                    const slotCount = availabilityDay?.slots.length || 0;
                                    const isSelected = selectedDate === day.key;
                                    const isBookable = day.isCurrentMonth && day.date >= today && day.date <= maxBookableDate;
                                    const hasSlots = slotCount > 0;

                                    return (
                                        <button
                                            key={day.key}
                                            type="button"
                                            disabled={!isBookable}
                                            onClick={() => selectDay(day)}
                                            className={`min-h-[68px] rounded-lg border p-1.5 text-left transition sm:min-h-[76px] sm:p-2 ${isSelected
                                                ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                                : isBookable
                                                    ? 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50'
                                                    : 'border-slate-100 bg-slate-50 text-slate-300'
                                                } ${!day.isCurrentMonth ? 'opacity-40' : ''}`}
                                        >
                                            <div className="flex items-start justify-between gap-1">
                                                <span className={`flex h-7 w-7 items-center justify-center rounded-md text-sm font-extrabold ${isSelected ? 'bg-white/20 text-white' : 'text-slate-800'}`}>
                                                    {day.dayNumber}
                                                </span>
                                                {hasSlots && (
                                                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${isSelected ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'}`}>
                                                        {slotCount}
                                                    </span>
                                                )}
                                            </div>
                                            {isBookable && (
                                                <div className={`mt-3 h-1.5 w-8 rounded-full ${hasSlots ? (isSelected ? 'bg-white' : 'bg-emerald-400') : (isSelected ? 'bg-white/40' : 'bg-slate-200')}`} />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {availabilityLoading && (
                                <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                                    Cargando disponibilidad del mes...
                                </div>
                            )}
                        </div>

                        <div className="rounded-xl border border-slate-200 p-4">
                            <div className="mb-4">
                                <div className="text-sm font-bold uppercase tracking-wide text-slate-400">Horario</div>
                                <div className="mt-1 text-lg font-extrabold text-slate-900">
                                    {selectedDate ? formatDateLabel(selectedDate) : 'Selecciona un dia'}
                                </div>
                            </div>

                            <div className="space-y-2">
                                {selectedDaySlots.map(slot => {
                                    const isSelected = selectedSlot?.startAt === slot.startAt;
                                    return (
                                        <button
                                            key={slot.startAt}
                                            type="button"
                                            onClick={() => setSelectedSlot(slot)}
                                            className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-sm font-bold transition ${isSelected
                                                ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                                : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                                                }`}
                                        >
                                            <span>{slot.time}</span>
                                            <span className={`text-xs ${isSelected ? 'text-blue-50' : 'text-blue-500'}`}>{slot.availableCapacity} cupo</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {!availabilityLoading && selectedDate && selectedDaySlots.length === 0 && (
                                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
                                    <Wrench className="mx-auto mb-3 text-slate-400" />
                                    <p className="font-semibold text-slate-600">No hay horarios en este dia.</p>
                                    <p className="mt-1 text-sm text-slate-400">Puedes escoger otro dia en el calendario.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default PublicBooking;
