import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { Building2, CalendarCheck, CheckCircle, ChevronLeft, ChevronRight, Clock, Mail, Phone, Plus, X } from 'lucide-react';
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

const weekDayLabels = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];

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

const isSameDay = (first: Date, second: Date) =>
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate();

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

const sentenceCase = (value: string) => value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return sentenceCase(new Intl.DateTimeFormat('es-CO', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date));
};

const formatDateLabel = (value: string) => {
    const date = parseDateKey(value);
    if (Number.isNaN(date.getTime())) return value;
    return sentenceCase(new Intl.DateTimeFormat('es-CO', {
        weekday: 'long',
        day: '2-digit',
        month: 'long'
    }).format(date));
};

const formatMonthLabel = (date: Date) => {
    return sentenceCase(new Intl.DateTimeFormat('es-CO', {
        month: 'long',
        year: 'numeric'
    }).format(date));
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
    const [expandedDate, setExpandedDate] = useState('');
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
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
            setExpandedDate('');
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
        setAvailability([]);
        setSelectedDate('');
        setSelectedSlot(null);
        setExpandedDate('');
    };

    const selectDay = (day: CalendarDay) => {
        if (!day.isCurrentMonth || day.date < today || day.date > maxBookableDate) return;
        setSelectedDate(day.key);
        setSelectedSlot(null);
    };

    const toggleExpandedDate = (dayKey: string) => {
        setSelectedDate(dayKey);
        setSelectedSlot(null);
        setExpandedDate(current => current === dayKey ? '' : dayKey);
    };

    const openCreateModal = (slot?: AvailabilitySlot) => {
        const nextSlot = slot || selectedSlot || selectedDaySlots[0] || null;
        if (!nextSlot) return;

        setSelectedSlot(nextSlot);
        setError('');
        setIsBookingModalOpen(true);
    };

    const closeCreateModal = () => {
        setIsBookingModalOpen(false);
        setError('');
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
        <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <img src={logo} alt="Kassa" className="h-10 w-10 rounded-xl border border-slate-200 bg-white object-contain shadow-sm" />
                        <div className="min-w-0">
                            <div className="truncate text-base font-extrabold text-slate-900 sm:text-lg">{info?.businessName}</div>
                            <div className="truncate text-sm text-slate-500">{info?.scheduleName}</div>
                        </div>
                    </div>
                    <div className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
                        {info?.slotDurationMinutes} min
                    </div>
                </div>
            </header>

            <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
                <aside className="w-full shrink-0 border-b border-slate-200 bg-slate-50 p-4 lg:h-[calc(100vh-4rem)] lg:w-80 lg:overflow-y-auto lg:border-b-0 lg:border-r">
                    <button
                        type="button"
                        onClick={() => openCreateModal()}
                        disabled={!selectedSlot && selectedDaySlots.length === 0}
                        className="mb-5 inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-800 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Plus size={20} />
                        Crear cita
                    </button>

                    <section className="mb-5 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                        <div className="mb-3 flex items-center justify-between">
                            <button
                                type="button"
                                disabled={previousDisabled}
                                onClick={() => changeMonth(-1)}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
                                aria-label="Mes anterior"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="text-sm font-extrabold text-slate-800">{formatMonthLabel(visibleMonth)}</div>
                            <button
                                type="button"
                                disabled={nextDisabled}
                                onClick={() => changeMonth(1)}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
                                aria-label="Mes siguiente"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold text-slate-400">
                            {weekDayLabels.map(day => <div key={day}>{day.charAt(0)}</div>)}
                        </div>
                        <div className="mt-2 grid grid-cols-7 gap-1">
                            {calendarDays.map(day => {
                                const slots = availabilityByDate.get(day.key)?.slots.length || 0;
                                const isBookable = day.isCurrentMonth && day.date >= today && day.date <= maxBookableDate;
                                const isSelected = selectedDate === day.key;
                                const isToday = isSameDay(day.date, today);

                                return (
                                    <button
                                        key={day.key}
                                        type="button"
                                        disabled={!isBookable}
                                        onClick={() => selectDay(day)}
                                        className={`relative flex h-8 items-center justify-center rounded-lg text-xs font-bold transition ${isSelected
                                            ? 'bg-blue-600 text-white'
                                            : isToday
                                                ? 'bg-blue-50 text-blue-700'
                                                : isBookable
                                                    ? 'text-slate-700 hover:bg-slate-100'
                                                    : 'text-slate-300'
                                            } ${!day.isCurrentMonth ? 'opacity-40' : ''}`}
                                    >
                                        {day.dayNumber}
                                        {slots > 0 && !isSelected && (
                                            <span className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section className="mb-5 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                        <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-800">
                            <Building2 size={17} className="text-blue-600" />
                            Pagina de reserva
                        </div>
                        <div className="space-y-2 text-sm text-slate-600">
                            <div className="font-bold text-slate-900">{info?.branchName}</div>
                            <div>
                                {info?.branchAddress || 'Direccion por confirmar'}
                                {(info?.branchCity || info?.branchDepartment) && (
                                    <>
                                        <br />
                                        {info?.branchCity}{info?.branchDepartment ? `, ${info.branchDepartment}` : ''}
                                    </>
                                )}
                            </div>
                            {info?.businessPhone && (
                                <div className="flex items-center gap-2">
                                    <Phone size={15} className="text-slate-400" />
                                    <span>{info.businessPhone}</span>
                                </div>
                            )}
                            {info?.businessEmail && (
                                <div className="flex items-center gap-2">
                                    <Mail size={15} className="text-slate-400" />
                                    <span className="min-w-0 truncate">{info.businessEmail}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <Clock size={15} className="text-slate-400" />
                                <span>{totalSlots} horarios este mes</span>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                        <div className="mb-3 text-sm font-extrabold text-slate-800">
                            {selectedDate ? formatDateLabel(selectedDate) : 'Selecciona un dia'}
                        </div>
                        <div className="space-y-2">
                            {selectedDaySlots.map(slot => {
                                const isSelected = selectedSlot?.startAt === slot.startAt;
                                return (
                                    <button
                                        key={slot.startAt}
                                        type="button"
                                        onClick={() => openCreateModal(slot)}
                                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-bold transition ${isSelected
                                            ? 'border-blue-600 bg-blue-600 text-white'
                                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50'
                                            }`}
                                    >
                                        <span>{slot.time}</span>
                                        <span className={`text-xs ${isSelected ? 'text-blue-50' : 'text-blue-600'}`}>{slot.availableCapacity} cupo</span>
                                    </button>
                                );
                            })}
                            {!availabilityLoading && selectedDate && selectedDaySlots.length === 0 && (
                                <p className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-400">Sin horarios disponibles.</p>
                            )}
                        </div>
                    </section>
                </aside>

                <main className="min-w-0 flex-1 overflow-auto p-3 lg:p-4">
                    <section className="min-w-[980px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        <div className="grid grid-cols-7 border-b border-slate-200 bg-white">
                            {weekDayLabels.map(label => (
                                <div key={label} className="border-r border-slate-200 px-4 py-3 text-center text-xs font-extrabold text-slate-500 last:border-r-0">
                                    {label}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7">
                            {calendarDays.map(day => {
                                const dayAvailability = availabilityByDate.get(day.key);
                                const slots = dayAvailability?.slots || [];
                                const isExpanded = expandedDate === day.key;
                                const visibleSlots = isExpanded ? slots : slots.slice(0, 4);
                                const hiddenCount = isExpanded ? 0 : slots.length - visibleSlots.length;
                                const isBookable = day.isCurrentMonth && day.date >= today && day.date <= maxBookableDate;
                                const isSelected = selectedDate === day.key;
                                const isToday = isSameDay(day.date, today);

                                return (
                                    <div
                                        key={day.key}
                                        className={`min-h-[148px] border-b border-r border-slate-200 p-2 transition last:border-r-0 ${isSelected ? 'bg-blue-50/50' : day.isCurrentMonth ? 'bg-white' : 'bg-slate-50/70'}`}
                                        onClick={() => selectDay(day)}
                                    >
                                        <div className="mb-2 flex justify-center">
                                            <button
                                                type="button"
                                                disabled={!isBookable}
                                                className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-extrabold transition ${isSelected
                                                    ? 'bg-blue-600 text-white'
                                                    : isToday
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : day.isCurrentMonth
                                                            ? 'text-slate-700 hover:bg-slate-100'
                                                            : 'text-slate-300'
                                                    }`}
                                            >
                                                {day.dayNumber}
                                            </button>
                                        </div>
                                        <div className="space-y-1">
                                            {visibleSlots.map(slot => {
                                                const isSlotSelected = selectedSlot?.startAt === slot.startAt;
                                                return (
                                                    <button
                                                        key={slot.startAt}
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setSelectedDate(day.key);
                                                            openCreateModal(slot);
                                                        }}
                                                        className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-bold transition ${isSlotSelected
                                                            ? 'bg-blue-600 text-white shadow-sm'
                                                            : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
                                                            }`}
                                                    >
                                                        <span className={`h-2 w-2 shrink-0 rounded-full ${isSlotSelected ? 'bg-white' : 'bg-sky-500'}`} />
                                                        <span className="truncate">{slot.time} disponible</span>
                                                    </button>
                                                );
                                            })}
                                            {hiddenCount > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        toggleExpandedDate(day.key);
                                                    }}
                                                    className="w-full rounded-md px-2 py-1 text-left text-xs font-bold text-blue-600 hover:bg-blue-50"
                                                >
                                                    + {hiddenCount} horarios
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                    {availabilityLoading && (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">
                            Cargando disponibilidad del mes...
                        </div>
                    )}
                </main>
            </div>

            {isBookingModalOpen && selectedSlot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
                    <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                            <div>
                                <h2 className="text-lg font-extrabold text-slate-900">Crear cita</h2>
                                <p className="mt-1 text-sm font-semibold text-blue-700">{formatDateTime(selectedSlot.startAt)}</p>
                            </div>
                            <button type="button" onClick={closeCreateModal} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                                <X size={22} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4 p-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="k-form-label">Nombre</label>
                                    <input required className="k-form-control" placeholder="Nombre completo" value={formData.customerName} onChange={(event) => setFormData({ ...formData, customerName: event.target.value })} />
                                </div>
                                <div>
                                    <label className="k-form-label">Telefono</label>
                                    <input required className="k-form-control" placeholder="300 000 0000" value={formData.customerPhone} onChange={(event) => setFormData({ ...formData, customerPhone: event.target.value })} />
                                </div>
                                <div>
                                    <label className="k-form-label">Correo</label>
                                    <input type="email" className="k-form-control" placeholder="correo@cliente.com" value={formData.customerEmail} onChange={(event) => setFormData({ ...formData, customerEmail: event.target.value })} />
                                </div>
                                <div>
                                    <label className="k-form-label">Servicio</label>
                                    <input required className="k-form-control" placeholder="Revision, diagnostico, mantenimiento..." value={formData.serviceType} onChange={(event) => setFormData({ ...formData, serviceType: event.target.value })} />
                                </div>
                                <div>
                                    <label className="k-form-label">Placa</label>
                                    <input className="k-form-control uppercase" placeholder="ABC123" value={formData.vehiclePlate} onChange={(event) => setFormData({ ...formData, vehiclePlate: event.target.value })} />
                                </div>
                                <div>
                                    <label className="k-form-label">Marca</label>
                                    <input className="k-form-control" placeholder="Toyota, Chevrolet..." value={formData.vehicleBrand} onChange={(event) => setFormData({ ...formData, vehicleBrand: event.target.value })} />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="k-form-label">Modelo</label>
                                    <input className="k-form-control" placeholder="Linea, version o ano" value={formData.vehicleModel} onChange={(event) => setFormData({ ...formData, vehicleModel: event.target.value })} />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="k-form-label">Notas</label>
                                    <textarea rows={3} className="k-form-textarea" placeholder="Observaciones para el taller" value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} />
                                </div>
                            </div>
                            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div>}
                            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                                <button type="button" onClick={closeCreateModal} className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <CalendarCheck size={18} className="mr-2" />
                                    {submitting ? 'Agendando...' : 'Confirmar cita'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicBooking;
