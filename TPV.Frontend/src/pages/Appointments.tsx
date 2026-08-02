import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import {
    CalendarCheck,
    CalendarDays,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    Copy,
    Edit,
    ExternalLink,
    Link2,
    Plus,
    Settings,
    Trash,
    X
} from 'lucide-react';

interface Branch {
    id: number;
    name: string;
}

interface AvailabilityRule {
    id?: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
}

interface AppointmentSchedule {
    id: number;
    branchId: number;
    branchName: string;
    name: string;
    publicSlug: string;
    calendarProvider: string;
    externalCalendarId?: string;
    slotDurationMinutes: number;
    maxAppointmentsPerSlot: number;
    advanceBookingDays: number;
    minNoticeHours: number;
    timeZone: string;
    isPublicBookingEnabled: boolean;
    publicBookingPath: string;
    availabilityRules: AvailabilityRule[];
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

interface Appointment {
    id: number;
    appointmentScheduleId: number;
    scheduleName: string;
    branchName: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    serviceType: string;
    vehiclePlate?: string;
    vehicleBrand?: string;
    vehicleModel?: string;
    notes?: string;
    startAt: string;
    endAt: string;
    status: string;
    source: string;
    confirmationCode: string;
}

interface CalendarDay {
    date: Date;
    key: string;
    dayNumber: number;
    isCurrentMonth: boolean;
}

const dayLabels = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const weekDayLabels = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];

const defaultRules: AvailabilityRule[] = [1, 2, 3, 4, 5].map(dayOfWeek => ({
    dayOfWeek,
    startTime: '08:00',
    endTime: '17:00'
}));

const emptyScheduleForm = {
    branchId: '',
    name: '',
    publicSlug: '',
    calendarProvider: 'Internal',
    externalCalendarId: '',
    slotDurationMinutes: 60,
    maxAppointmentsPerSlot: 1,
    advanceBookingDays: 30,
    minNoticeHours: 2,
    timeZone: 'America/Bogota',
    isPublicBookingEnabled: true,
    availabilityRules: defaultRules
};

const emptyAppointmentForm = {
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    serviceType: 'Revision de vehiculo',
    vehiclePlate: '',
    vehicleBrand: '',
    vehicleModel: '',
    notes: '',
    startAt: ''
};

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

const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
        Pending: 'Pendiente',
        Confirmed: 'Confirmada',
        Cancelled: 'Cancelada',
        Completed: 'Finalizada'
    };
    return labels[status] || status;
};

const statusClass = (status: string) => {
    const classes: Record<string, string> = {
        Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
        Confirmed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        Cancelled: 'bg-red-50 text-red-700 ring-red-200',
        Completed: 'bg-blue-50 text-blue-700 ring-blue-200'
    };
    return classes[status] || 'bg-slate-50 text-slate-700 ring-slate-200';
};

const Appointments = () => {
    const today = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }, []);

    const [branches, setBranches] = useState<Branch[]>([]);
    const [schedules, setSchedules] = useState<AppointmentSchedule[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [availability, setAvailability] = useState<AvailabilityDay[]>([]);
    const [selectedScheduleId, setSelectedScheduleId] = useState('');
    const [visibleMonth, setVisibleMonth] = useState(startOfMonth(today));
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
    const [expandedDate, setExpandedDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<AppointmentSchedule | null>(null);
    const [scheduleForm, setScheduleForm] = useState(emptyScheduleForm);
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [appointmentForm, setAppointmentForm] = useState(emptyAppointmentForm);

    const selectedSchedule = useMemo(
        () => schedules.find(schedule => schedule.id.toString() === selectedScheduleId) || null,
        [schedules, selectedScheduleId]
    );

    const maxBookableDate = useMemo(
        () => addDays(today, selectedSchedule?.advanceBookingDays || 30),
        [selectedSchedule?.advanceBookingDays, today]
    );

    const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

    const availabilityByDate = useMemo(() => {
        const map = new Map<string, AvailabilityDay>();
        availability.forEach(day => map.set(day.date, day));
        return map;
    }, [availability]);

    const appointmentsByDate = useMemo(() => {
        const map = new Map<string, Appointment[]>();
        appointments.forEach(appointment => {
            const key = formatDateInput(new Date(appointment.startAt));
            map.set(key, [...(map.get(key) || []), appointment]);
        });
        return map;
    }, [appointments]);

    const availableSlots = useMemo(
        () => availability.flatMap(day => day.slots.map(slot => ({ ...slot, dayLabel: day.label, dayDate: day.date }))),
        [availability]
    );

    const selectedDay = selectedDate ? availabilityByDate.get(selectedDate) : undefined;
    const selectedDaySlots = selectedDay?.slots || [];
    const selectedDayAppointments = selectedDate ? appointmentsByDate.get(selectedDate) || [] : [];

    const totalSlots = useMemo(
        () => availability.reduce((total, day) => total + day.slots.length, 0),
        [availability]
    );

    const selectedAppointmentSlot = useMemo(
        () => availableSlots.find(slot => slot.startAt === appointmentForm.startAt) || null,
        [appointmentForm.startAt, availableSlots]
    );

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedScheduleId) {
            fetchScheduleData();
        } else {
            setAppointments([]);
            setAvailability([]);
        }
    }, [selectedScheduleId, visibleMonth, maxBookableDate]);

    useEffect(() => {
        if (!selectedScheduleId || availabilityLoading) return;
        if (availability.length === 0) return;

        const currentSelection = selectedDate ? parseDateKey(selectedDate) : null;
        if (currentSelection && isSameMonth(currentSelection, visibleMonth)) return;

        const firstAvailable = availability.find(day => day.slots.length > 0)?.date;
        const firstCurrentMonthDay = calendarDays.find(day => day.isCurrentMonth)?.key;

        setSelectedDate(firstAvailable || firstCurrentMonthDay || '');
        setSelectedSlot(null);
    }, [availability, availabilityLoading, calendarDays, selectedDate, selectedScheduleId, visibleMonth]);

    const fetchInitialData = async () => {
        try {
            const [branchResponse, scheduleResponse] = await Promise.all([
                api.get('/branches'),
                api.get('/appointments/schedules')
            ]);
            setBranches(branchResponse.data);
            setSchedules(scheduleResponse.data);
            if (scheduleResponse.data.length > 0) {
                setSelectedScheduleId(scheduleResponse.data[0].id.toString());
            }
        } catch (error) {
            console.error(error);
            alert('Error al cargar el modulo de agenda.');
        } finally {
            setLoading(false);
        }
    };

    const refreshSchedules = async () => {
        const response = await api.get('/appointments/schedules');
        setSchedules(response.data);
        if (!selectedScheduleId && response.data.length > 0) {
            setSelectedScheduleId(response.data[0].id.toString());
        }
    };

    const fetchScheduleData = async () => {
        if (!selectedScheduleId) return;

        const appointmentFrom = formatDateInput(startOfMonth(visibleMonth));
        const appointmentTo = formatDateInput(endOfMonth(visibleMonth));
        const availabilityFromDate = maxDate(startOfMonth(visibleMonth), today);
        const availabilityToDate = minDate(endOfMonth(visibleMonth), maxBookableDate);
        const availabilityRequest = availabilityToDate >= availabilityFromDate
            ? api.get(`/appointments/schedules/${selectedScheduleId}/availability?from=${formatDateInput(availabilityFromDate)}&to=${formatDateInput(availabilityToDate)}`)
            : Promise.resolve({ data: [] as AvailabilityDay[] });

        try {
            setAvailabilityLoading(true);
            const [appointmentResponse, availabilityResponse] = await Promise.all([
                api.get(`/appointments?scheduleId=${selectedScheduleId}&from=${appointmentFrom}&to=${appointmentTo}`),
                availabilityRequest
            ]);
            setAppointments(appointmentResponse.data);
            setAvailability(availabilityResponse.data);
        } catch (error) {
            console.error(error);
            alert('Error al cargar disponibilidad de agenda.');
        } finally {
            setAvailabilityLoading(false);
        }
    };

    const handleScheduleChange = (value: string) => {
        setSelectedScheduleId(value);
        setVisibleMonth(startOfMonth(today));
        setSelectedDate('');
        setSelectedSlot(null);
        setExpandedDate('');
    };

    const changeMonth = (direction: number) => {
        setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + direction, 1));
        setAvailability([]);
        setAppointments([]);
        setSelectedDate('');
        setSelectedSlot(null);
        setExpandedDate('');
    };

    const goToToday = () => {
        setVisibleMonth(startOfMonth(today));
        setSelectedDate(formatDateInput(today));
        setSelectedSlot(null);
        setExpandedDate('');
    };

    const selectDay = (day: CalendarDay) => {
        if (!day.isCurrentMonth) return;
        setSelectedDate(day.key);
        setSelectedSlot(null);
    };

    const toggleExpandedDate = (dayKey: string) => {
        setSelectedDate(dayKey);
        setSelectedSlot(null);
        setExpandedDate(current => current === dayKey ? '' : dayKey);
    };

    const openScheduleModal = (schedule?: AppointmentSchedule) => {
        if (schedule) {
            setEditingSchedule(schedule);
            setScheduleForm({
                branchId: schedule.branchId.toString(),
                name: schedule.name,
                publicSlug: schedule.publicSlug,
                calendarProvider: schedule.calendarProvider,
                externalCalendarId: schedule.externalCalendarId || '',
                slotDurationMinutes: schedule.slotDurationMinutes,
                maxAppointmentsPerSlot: schedule.maxAppointmentsPerSlot,
                advanceBookingDays: schedule.advanceBookingDays,
                minNoticeHours: schedule.minNoticeHours,
                timeZone: schedule.timeZone,
                isPublicBookingEnabled: schedule.isPublicBookingEnabled,
                availabilityRules: schedule.availabilityRules.length > 0 ? schedule.availabilityRules : defaultRules
            });
        } else {
            setEditingSchedule(null);
            setScheduleForm({
                ...emptyScheduleForm,
                branchId: branches[0]?.id.toString() || '',
                availabilityRules: defaultRules
            });
        }
        setIsScheduleModalOpen(true);
    };

    const closeScheduleModal = () => {
        setIsScheduleModalOpen(false);
        setEditingSchedule(null);
        setScheduleForm(emptyScheduleForm);
    };

    const saveSchedule = async (event: React.FormEvent) => {
        event.preventDefault();
        const payload = {
            ...scheduleForm,
            branchId: Number(scheduleForm.branchId),
            slotDurationMinutes: Number(scheduleForm.slotDurationMinutes),
            maxAppointmentsPerSlot: Number(scheduleForm.maxAppointmentsPerSlot),
            advanceBookingDays: Number(scheduleForm.advanceBookingDays),
            minNoticeHours: Number(scheduleForm.minNoticeHours)
        };

        try {
            if (editingSchedule) {
                await api.put(`/appointments/schedules/${editingSchedule.id}`, payload);
            } else {
                await api.post('/appointments/schedules', payload);
            }
            await refreshSchedules();
            closeScheduleModal();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al guardar la agenda.');
        }
    };

    const deleteSchedule = async (schedule: AppointmentSchedule) => {
        if (!window.confirm(`Deseas desactivar la agenda ${schedule.name}?`)) return;

        try {
            await api.delete(`/appointments/schedules/${schedule.id}`);
            const response = await api.get('/appointments/schedules');
            setSchedules(response.data);
            setSelectedScheduleId(response.data[0]?.id?.toString() || '');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al desactivar la agenda.');
        }
    };

    const updateStatus = async (appointment: Appointment, status: string) => {
        try {
            await api.patch(`/appointments/${appointment.id}/status`, { status });
            await fetchScheduleData();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al actualizar la cita.');
        }
    };

    const openAppointmentModal = (slot?: AvailabilitySlot) => {
        const nextSlot = slot || selectedSlot || selectedDaySlots[0] || availableSlots[0] || null;
        if (!nextSlot) return;

        setSelectedSlot(nextSlot);
        setAppointmentForm({
            ...emptyAppointmentForm,
            startAt: nextSlot.startAt
        });
        setIsAppointmentModalOpen(true);
    };

    const closeAppointmentModal = () => {
        setIsAppointmentModalOpen(false);
        setAppointmentForm(emptyAppointmentForm);
        setSelectedSlot(null);
    };

    const saveAppointment = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedScheduleId || !appointmentForm.startAt) return;

        try {
            await api.post('/appointments', {
                ...appointmentForm,
                appointmentScheduleId: Number(selectedScheduleId)
            });
            await fetchScheduleData();
            closeAppointmentModal();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al crear la cita.');
            await fetchScheduleData();
        }
    };

    const toggleRuleDay = (dayOfWeek: number) => {
        const exists = scheduleForm.availabilityRules.some(rule => rule.dayOfWeek === dayOfWeek);
        if (exists) {
            setScheduleForm({
                ...scheduleForm,
                availabilityRules: scheduleForm.availabilityRules.filter(rule => rule.dayOfWeek !== dayOfWeek)
            });
            return;
        }

        setScheduleForm({
            ...scheduleForm,
            availabilityRules: [
                ...scheduleForm.availabilityRules,
                { dayOfWeek, startTime: '08:00', endTime: '17:00' }
            ].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
        });
    };

    const updateRule = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
        setScheduleForm({
            ...scheduleForm,
            availabilityRules: scheduleForm.availabilityRules.map(rule =>
                rule.dayOfWeek === dayOfWeek ? { ...rule, [field]: value } : rule
            )
        });
    };

    const copyPublicLink = async (schedule: AppointmentSchedule) => {
        const link = `${window.location.origin}${schedule.publicBookingPath}`;
        await navigator.clipboard.writeText(link);
        alert('Link copiado al portapapeles.');
    };

    if (loading) return <div>Cargando agenda...</div>;

    return (
        <div className="space-y-6">
            <div className="h-1 rounded-full bg-gradient-to-r from-blue-500 via-teal-500 to-amber-500" />

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <h2 className="flex items-center text-2xl font-bold text-slate-900">
                        <CalendarDays className="mr-2 text-blue-600" /> Agenda de citas
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">Calendario mensual, disponibilidad por sucursal y reservas desde link publico.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                        onClick={() => openAppointmentModal()}
                        disabled={!selectedSchedule || availableSlots.length === 0}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <CalendarCheck size={18} className="mr-2" /> Nueva cita
                    </button>
                    <button
                        onClick={() => openScheduleModal()}
                        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700"
                    >
                        <Plus size={18} className="mr-2" /> Nueva agenda
                    </button>
                </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                <aside className="space-y-4">
                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <h3 className="font-bold text-slate-800">Agendas</h3>
                            <Settings size={18} className="text-slate-400" />
                        </div>
                        <div className="space-y-3">
                            {schedules.map(schedule => (
                                <button
                                    type="button"
                                    key={schedule.id}
                                    onClick={() => handleScheduleChange(schedule.id.toString())}
                                    className={`w-full rounded-lg border p-4 text-left transition ${selectedScheduleId === schedule.id.toString()
                                        ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100'
                                        : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate font-bold text-slate-900">{schedule.name}</div>
                                            <div className="mt-1 text-sm text-slate-500">{schedule.branchName}</div>
                                        </div>
                                        <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                                            {schedule.calendarProvider === 'Internal' ? 'Propia' : schedule.calendarProvider}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                                        <span className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-200">{schedule.slotDurationMinutes} min</span>
                                        <span className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-200">{schedule.maxAppointmentsPerSlot} cupo(s)</span>
                                        {schedule.isPublicBookingEnabled && <span className="rounded-md bg-emerald-50 px-2 py-1 font-bold text-emerald-700 ring-1 ring-emerald-200">Publica</span>}
                                    </div>
                                </button>
                            ))}
                            {schedules.length === 0 && (
                                <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                                    No hay agendas configuradas.
                                </div>
                            )}
                        </div>
                    </section>

                    {selectedSchedule && (
                        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 className="truncate font-bold text-slate-900">{selectedSchedule.name}</h3>
                                    <p className="text-sm text-slate-500">{selectedSchedule.branchName}</p>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                    <button onClick={() => openScheduleModal(selectedSchedule)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="Editar">
                                        <Edit size={18} />
                                    </button>
                                    <button onClick={() => deleteSchedule(selectedSchedule)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Desactivar">
                                        <Trash size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="mt-4 border-t border-slate-100 pt-3">
                                <div className="mb-2 flex items-center text-sm font-bold text-slate-700">
                                    <Link2 size={16} className="mr-2" /> Link publico
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        value={`${window.location.origin}${selectedSchedule.publicBookingPath}`}
                                        className="k-form-control min-w-0 flex-1 text-sm"
                                    />
                                    <button onClick={() => copyPublicLink(selectedSchedule)} className="rounded-lg bg-slate-900 px-3 text-white hover:bg-slate-700" title="Copiar">
                                        <Copy size={18} />
                                    </button>
                                    <a href={selectedSchedule.publicBookingPath} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 hover:bg-slate-50" title="Abrir">
                                        <ExternalLink size={18} />
                                    </a>
                                </div>
                            </div>
                        </section>
                    )}

                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
                                        onClick={() => {
                                            setSelectedSlot(slot);
                                            openAppointmentModal(slot);
                                        }}
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

                        {selectedDayAppointments.length > 0 && (
                            <div className="mt-4 border-t border-slate-100 pt-4">
                                <div className="mb-2 text-xs font-extrabold uppercase text-slate-400">Citas del dia</div>
                                <div className="space-y-2">
                                    {selectedDayAppointments.map(appointment => (
                                        <div key={appointment.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="truncate font-bold text-slate-900">{appointment.customerName}</span>
                                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${statusClass(appointment.status)}`}>
                                                    {statusLabel(appointment.status)}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-xs text-slate-500">{formatDateTime(appointment.startAt)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                </aside>

                <section className="min-w-0 space-y-5">
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                    <h3 className="flex items-center font-bold text-slate-900">
                                        <Clock size={18} className="mr-2 text-blue-600" /> Disponibilidad
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {totalSlots} horarios disponibles en {formatMonthLabel(visibleMonth)}.
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                                    <div className="min-w-[220px]">
                                        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Agenda</label>
                                        <select className="k-form-select" value={selectedScheduleId} onChange={(event) => handleScheduleChange(event.target.value)}>
                                            <option value="">Seleccionar</option>
                                            {schedules.map(schedule => <option key={schedule.id} value={schedule.id}>{schedule.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => changeMonth(-1)}
                                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                                            aria-label="Mes anterior"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={goToToday}
                                            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                        >
                                            Hoy
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => changeMonth(1)}
                                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                                            aria-label="Mes siguiente"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <div className="min-w-[980px]">
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
                                        const dayAppointments = appointmentsByDate.get(day.key) || [];
                                        const slots = dayAvailability?.slots || [];
                                        const visibleAppointments = dayAppointments.slice(0, 2);
                                        const slotLimit = visibleAppointments.length > 0 ? 3 : 4;
                                        const isExpanded = expandedDate === day.key;
                                        const visibleSlots = isExpanded ? slots : slots.slice(0, slotLimit);
                                        const hiddenCount = isExpanded ? 0 : slots.length - visibleSlots.length;
                                        const isBookable = day.isCurrentMonth && day.date >= today && day.date <= maxBookableDate;
                                        const isSelected = selectedDate === day.key;
                                        const isToday = isSameDay(day.date, today);

                                        return (
                                            <div
                                                key={day.key}
                                                className={`min-h-[152px] border-b border-r border-slate-200 p-2 transition last:border-r-0 ${isSelected ? 'bg-blue-50/50' : day.isCurrentMonth ? 'bg-white' : 'bg-slate-50/70'}`}
                                                onClick={() => selectDay(day)}
                                            >
                                                <div className="mb-2 flex justify-center">
                                                    <button
                                                        type="button"
                                                        disabled={!day.isCurrentMonth}
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
                                                    {visibleAppointments.map(appointment => (
                                                        <button
                                                            key={appointment.id}
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                setSelectedDate(day.key);
                                                            }}
                                                            className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[11px] font-bold ring-1 ${statusClass(appointment.status)}`}
                                                        >
                                                            <span className="truncate">{formatDateTime(appointment.startAt).split(',').pop()?.trim()} {appointment.customerName}</span>
                                                        </button>
                                                    ))}
                                                    {visibleSlots.map(slot => {
                                                        const isSlotSelected = selectedSlot?.startAt === slot.startAt;
                                                        return (
                                                            <button
                                                                key={slot.startAt}
                                                                type="button"
                                                                disabled={!isBookable}
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    setSelectedDate(day.key);
                                                                    openAppointmentModal(slot);
                                                                }}
                                                                className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${isSlotSelected
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
                            </div>
                        </div>

                        {availabilityLoading && (
                            <div className="border-t border-slate-100 px-4 py-3 text-sm font-semibold text-slate-500">
                                Cargando disponibilidad del mes...
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
                            <h3 className="font-bold text-slate-900">Citas agendadas</h3>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{appointments.length}</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {appointments.map(appointment => (
                                <div key={appointment.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold text-slate-900">{appointment.customerName}</span>
                                            <span className={`rounded-full px-2 py-1 text-xs font-bold ring-1 ${statusClass(appointment.status)}`}>
                                                {statusLabel(appointment.status)}
                                            </span>
                                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{appointment.source === 'PublicLink' ? 'Link publico' : 'Interna'}</span>
                                        </div>
                                        <div className="mt-1 text-sm text-slate-500">{formatDateTime(appointment.startAt)} - {appointment.serviceType}</div>
                                        <div className="mt-1 text-sm text-slate-500">
                                            {appointment.customerPhone}
                                            {appointment.vehiclePlate && ` - Placa ${appointment.vehiclePlate}`}
                                            {appointment.vehicleBrand && ` - ${appointment.vehicleBrand}`}
                                            {appointment.vehicleModel && ` ${appointment.vehicleModel}`}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 lg:justify-end">
                                        <select
                                            className="k-form-select text-sm"
                                            value={appointment.status}
                                            onChange={(event) => updateStatus(appointment, event.target.value)}
                                        >
                                            <option value="Pending">Pendiente</option>
                                            <option value="Confirmed">Confirmada</option>
                                            <option value="Completed">Finalizada</option>
                                            <option value="Cancelled">Cancelada</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                            {appointments.length === 0 && (
                                <div className="p-8 text-center text-sm text-slate-400">No hay citas en este mes.</div>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            {isScheduleModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
                    <div className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                            <h3 className="text-lg font-bold text-slate-900">{editingSchedule ? 'Editar agenda' : 'Nueva agenda'}</h3>
                            <button onClick={closeScheduleModal} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                                <X size={22} />
                            </button>
                        </div>
                        <form onSubmit={saveSchedule} className="space-y-5 p-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="k-form-label">Nombre</label>
                                    <input required className="k-form-control" placeholder="Nombre de la agenda" value={scheduleForm.name} onChange={(event) => setScheduleForm({ ...scheduleForm, name: event.target.value })} />
                                </div>
                                <div>
                                    <label className="k-form-label">Sucursal</label>
                                    <select required className="k-form-select" value={scheduleForm.branchId} onChange={(event) => setScheduleForm({ ...scheduleForm, branchId: event.target.value })}>
                                        <option value="">Seleccionar sucursal</option>
                                        {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="k-form-label">Proveedor calendario</label>
                                    <select className="k-form-select" value={scheduleForm.calendarProvider} onChange={(event) => setScheduleForm({ ...scheduleForm, calendarProvider: event.target.value })}>
                                        <option value="Internal">Agenda propia</option>
                                        <option value="Microsoft365">Microsoft 365</option>
                                        <option value="Google">Google Calendar</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="k-form-label">ID calendario externo</label>
                                    <input className="k-form-control" placeholder="Opcional" value={scheduleForm.externalCalendarId} onChange={(event) => setScheduleForm({ ...scheduleForm, externalCalendarId: event.target.value })} />
                                </div>
                                <div>
                                    <label className="k-form-label">Slug publico</label>
                                    <input className="k-form-control" placeholder="agenda-sucursal-principal" value={scheduleForm.publicSlug} onChange={(event) => setScheduleForm({ ...scheduleForm, publicSlug: event.target.value })} />
                                </div>
                                <div>
                                    <label className="k-form-label">Zona horaria</label>
                                    <input className="k-form-control" placeholder="America/Bogota" value={scheduleForm.timeZone} onChange={(event) => setScheduleForm({ ...scheduleForm, timeZone: event.target.value })} />
                                </div>
                                <div>
                                    <label className="k-form-label">Duracion del turno</label>
                                    <input type="number" min={15} max={240} className="k-form-control" value={scheduleForm.slotDurationMinutes} onChange={(event) => setScheduleForm({ ...scheduleForm, slotDurationMinutes: Number(event.target.value) })} />
                                </div>
                                <div>
                                    <label className="k-form-label">Cupos por hora</label>
                                    <input type="number" min={1} max={20} className="k-form-control" value={scheduleForm.maxAppointmentsPerSlot} onChange={(event) => setScheduleForm({ ...scheduleForm, maxAppointmentsPerSlot: Number(event.target.value) })} />
                                </div>
                                <div>
                                    <label className="k-form-label">Dias anticipados</label>
                                    <input type="number" min={1} max={180} className="k-form-control" value={scheduleForm.advanceBookingDays} onChange={(event) => setScheduleForm({ ...scheduleForm, advanceBookingDays: Number(event.target.value) })} />
                                </div>
                                <div>
                                    <label className="k-form-label">Horas minimas antes</label>
                                    <input type="number" min={0} max={240} className="k-form-control" value={scheduleForm.minNoticeHours} onChange={(event) => setScheduleForm({ ...scheduleForm, minNoticeHours: Number(event.target.value) })} />
                                </div>
                            </div>

                            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <input type="checkbox" checked={scheduleForm.isPublicBookingEnabled} onChange={(event) => setScheduleForm({ ...scheduleForm, isPublicBookingEnabled: event.target.checked })} />
                                Permitir reservas desde link publico
                            </label>

                            <div>
                                <div className="mb-3 text-sm font-bold text-slate-800">Horario semanal</div>
                                <div className="grid gap-2 md:grid-cols-2">
                                    {dayLabels.map((label, index) => {
                                        const rule = scheduleForm.availabilityRules.find(item => item.dayOfWeek === index);
                                        return (
                                            <div key={label} className={`rounded-lg border p-3 ${rule ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-slate-50'}`}>
                                                <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                                    <input type="checkbox" checked={!!rule} onChange={() => toggleRuleDay(index)} />
                                                    {label}
                                                </label>
                                                {rule && (
                                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                                        <input type="time" className="k-form-control" value={rule.startTime} onChange={(event) => updateRule(index, 'startTime', event.target.value)} />
                                                        <input type="time" className="k-form-control" value={rule.endTime} onChange={(event) => updateRule(index, 'endTime', event.target.value)} />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                                <button type="button" onClick={closeScheduleModal} className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
                                <button type="submit" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
                                    <CheckCircle size={18} className="mr-2" /> Guardar agenda
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isAppointmentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
                    <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Nueva cita</h3>
                                <p className="mt-1 text-sm font-semibold text-blue-700">
                                    {selectedAppointmentSlot ? formatDateTime(selectedAppointmentSlot.startAt) : 'Selecciona un horario'}
                                </p>
                            </div>
                            <button onClick={closeAppointmentModal} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                                <X size={22} />
                            </button>
                        </div>
                        <form onSubmit={saveAppointment} className="space-y-4 p-6">
                            <div>
                                <label className="k-form-label">Horario disponible</label>
                                <select
                                    required
                                    className="k-form-select"
                                    value={appointmentForm.startAt}
                                    onChange={(event) => {
                                        const nextSlot = availableSlots.find(slot => slot.startAt === event.target.value) || null;
                                        setSelectedSlot(nextSlot);
                                        setAppointmentForm({ ...appointmentForm, startAt: event.target.value });
                                    }}
                                >
                                    <option value="">Seleccionar horario</option>
                                    {availableSlots.map(slot => (
                                        <option key={slot.startAt} value={slot.startAt}>{slot.dayLabel} - {slot.time}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="k-form-label">Nombre solicitante</label>
                                    <input required className="k-form-control" placeholder="Nombre completo" value={appointmentForm.customerName} onChange={(event) => setAppointmentForm({ ...appointmentForm, customerName: event.target.value })} />
                                </div>
                                <div>
                                    <label className="k-form-label">Telefono</label>
                                    <input required className="k-form-control" placeholder="300 000 0000" value={appointmentForm.customerPhone} onChange={(event) => setAppointmentForm({ ...appointmentForm, customerPhone: event.target.value })} />
                                </div>
                                <div>
                                    <label className="k-form-label">Correo</label>
                                    <input type="email" className="k-form-control" placeholder="correo@cliente.com" value={appointmentForm.customerEmail} onChange={(event) => setAppointmentForm({ ...appointmentForm, customerEmail: event.target.value })} />
                                </div>
                                <div>
                                    <label className="k-form-label">Servicio</label>
                                    <input required className="k-form-control" placeholder="Revision, diagnostico, mantenimiento..." value={appointmentForm.serviceType} onChange={(event) => setAppointmentForm({ ...appointmentForm, serviceType: event.target.value })} />
                                </div>
                                <div>
                                    <label className="k-form-label">Placa</label>
                                    <input className="k-form-control uppercase" placeholder="ABC123" value={appointmentForm.vehiclePlate} onChange={(event) => setAppointmentForm({ ...appointmentForm, vehiclePlate: event.target.value })} />
                                </div>
                                <div>
                                    <label className="k-form-label">Marca</label>
                                    <input className="k-form-control" placeholder="Toyota, Chevrolet..." value={appointmentForm.vehicleBrand} onChange={(event) => setAppointmentForm({ ...appointmentForm, vehicleBrand: event.target.value })} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="k-form-label">Modelo</label>
                                    <input className="k-form-control" placeholder="Linea, version o ano" value={appointmentForm.vehicleModel} onChange={(event) => setAppointmentForm({ ...appointmentForm, vehicleModel: event.target.value })} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="k-form-label">Notas</label>
                                    <textarea rows={3} className="k-form-textarea" placeholder="Observaciones para el taller" value={appointmentForm.notes} onChange={(event) => setAppointmentForm({ ...appointmentForm, notes: event.target.value })} />
                                </div>
                            </div>
                            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                                <button type="button" onClick={closeAppointmentModal} className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
                                <button type="submit" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
                                    <CalendarCheck size={18} className="mr-2" /> Agendar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Appointments;
