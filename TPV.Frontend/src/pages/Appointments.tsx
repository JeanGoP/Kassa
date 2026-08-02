import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { CalendarCheck, CalendarDays, CheckCircle, Clock, Copy, Edit, ExternalLink, Link2, Plus, Settings, Trash, X } from 'lucide-react';

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

const dayLabels = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
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

const addDays = (date: Date, days: number) => {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
};

const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-CO', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
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
    const [branches, setBranches] = useState<Branch[]>([]);
    const [schedules, setSchedules] = useState<AppointmentSchedule[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [availability, setAvailability] = useState<AvailabilityDay[]>([]);
    const [selectedScheduleId, setSelectedScheduleId] = useState('');
    const [fromDate, setFromDate] = useState(formatDateInput(new Date()));
    const [toDate, setToDate] = useState(formatDateInput(addDays(new Date(), 14)));
    const [loading, setLoading] = useState(true);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<AppointmentSchedule | null>(null);
    const [scheduleForm, setScheduleForm] = useState(emptyScheduleForm);
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [appointmentForm, setAppointmentForm] = useState(emptyAppointmentForm);

    const selectedSchedule = useMemo(
        () => schedules.find(schedule => schedule.id.toString() === selectedScheduleId) || null,
        [schedules, selectedScheduleId]
    );

    const availableSlots = useMemo(
        () => availability.flatMap(day => day.slots.map(slot => ({ ...slot, dayLabel: day.label }))),
        [availability]
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
    }, [selectedScheduleId, fromDate, toDate]);

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
        try {
            const [appointmentResponse, availabilityResponse] = await Promise.all([
                api.get(`/appointments?scheduleId=${selectedScheduleId}&from=${fromDate}&to=${toDate}`),
                api.get(`/appointments/schedules/${selectedScheduleId}/availability?from=${fromDate}&to=${toDate}`)
            ]);
            setAppointments(appointmentResponse.data);
            setAvailability(availabilityResponse.data);
        } catch (error) {
            console.error(error);
            alert('Error al cargar disponibilidad de agenda.');
        }
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
        setAppointmentForm({
            ...emptyAppointmentForm,
            startAt: slot?.startAt || availableSlots[0]?.startAt || ''
        });
        setIsAppointmentModalOpen(true);
    };

    const closeAppointmentModal = () => {
        setIsAppointmentModalOpen(false);
        setAppointmentForm(emptyAppointmentForm);
    };

    const saveAppointment = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedScheduleId) return;

        try {
            await api.post('/appointments', {
                ...appointmentForm,
                appointmentScheduleId: Number(selectedScheduleId)
            });
            await fetchScheduleData();
            closeAppointmentModal();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al crear la cita.');
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
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <h2 className="flex items-center text-2xl font-bold text-slate-900">
                        <CalendarDays className="mr-2 text-blue-600" /> Agenda de citas
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">Disponibilidad por sucursal y reservas desde link publico.</p>
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

            <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
                <section className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <h3 className="font-bold text-slate-800">Agendas</h3>
                            <Settings size={18} className="text-slate-400" />
                        </div>
                        <div className="space-y-3">
                            {schedules.map(schedule => (
                                <button
                                    type="button"
                                    key={schedule.id}
                                    onClick={() => setSelectedScheduleId(schedule.id.toString())}
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
                    </div>

                    {selectedSchedule && (
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
                            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                <div className="mb-2 flex items-center text-sm font-bold text-slate-700">
                                    <Link2 size={16} className="mr-2" /> Link publico
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        value={`${window.location.origin}${selectedSchedule.publicBookingPath}`}
                                        className="min-w-0 flex-1 rounded-lg border-slate-200 bg-white text-sm"
                                    />
                                    <button onClick={() => copyPublicLink(selectedSchedule)} className="rounded-lg bg-slate-900 px-3 text-white hover:bg-slate-700" title="Copiar">
                                        <Copy size={18} />
                                    </button>
                                    <a href={selectedSchedule.publicBookingPath} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 hover:bg-slate-50" title="Abrir">
                                        <ExternalLink size={18} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                <section className="space-y-5">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <h3 className="flex items-center font-bold text-slate-900">
                                    <Clock size={18} className="mr-2 text-blue-600" /> Disponibilidad
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">Dias y horas con cupo disponible.</p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Agenda</label>
                                    <select className="w-full rounded-lg border-slate-300" value={selectedScheduleId} onChange={(event) => setSelectedScheduleId(event.target.value)}>
                                        <option value="">Seleccionar</option>
                                        {schedules.map(schedule => <option key={schedule.id} value={schedule.id}>{schedule.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Desde</label>
                                    <input type="date" className="w-full rounded-lg border-slate-300" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Hasta</label>
                                    <input type="date" className="w-full rounded-lg border-slate-300" value={toDate} onChange={(event) => setToDate(event.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                            {availability.map(day => (
                                <div key={day.date} className="rounded-lg border border-slate-200 p-4">
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <div className="font-bold text-slate-900">{day.label}</div>
                                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{day.slots.length}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {day.slots.map(slot => (
                                            <button
                                                key={slot.startAt}
                                                onClick={() => openAppointmentModal(slot)}
                                                className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                                            >
                                                {slot.time}
                                            </button>
                                        ))}
                                        {day.slots.length === 0 && <span className="text-sm text-slate-400">Sin cupos</span>}
                                    </div>
                                </div>
                            ))}
                            {selectedSchedule && availability.length === 0 && (
                                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 md:col-span-2">
                                    No hay disponibilidad en el rango seleccionado.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 p-4">
                            <h3 className="font-bold text-slate-900">Citas agendadas</h3>
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
                                        <div className="mt-1 text-sm text-slate-500">{formatDateTime(appointment.startAt)} · {appointment.serviceType}</div>
                                        <div className="mt-1 text-sm text-slate-500">
                                            {appointment.customerPhone}
                                            {appointment.vehiclePlate && ` · Placa ${appointment.vehiclePlate}`}
                                            {appointment.vehicleBrand && ` · ${appointment.vehicleBrand}`}
                                            {appointment.vehicleModel && ` ${appointment.vehicleModel}`}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 lg:justify-end">
                                        <select
                                            className="rounded-lg border-slate-300 text-sm"
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
                                <div className="p-8 text-center text-sm text-slate-400">No hay citas en este rango.</div>
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
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Nombre</label>
                                    <input required className="w-full rounded-lg border-slate-300" value={scheduleForm.name} onChange={(event) => setScheduleForm({ ...scheduleForm, name: event.target.value })} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Sucursal</label>
                                    <select required className="w-full rounded-lg border-slate-300" value={scheduleForm.branchId} onChange={(event) => setScheduleForm({ ...scheduleForm, branchId: event.target.value })}>
                                        <option value="">Seleccionar sucursal</option>
                                        {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Proveedor calendario</label>
                                    <select className="w-full rounded-lg border-slate-300" value={scheduleForm.calendarProvider} onChange={(event) => setScheduleForm({ ...scheduleForm, calendarProvider: event.target.value })}>
                                        <option value="Internal">Agenda propia</option>
                                        <option value="Microsoft365">Microsoft 365</option>
                                        <option value="Google">Google Calendar</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">ID calendario externo</label>
                                    <input className="w-full rounded-lg border-slate-300" value={scheduleForm.externalCalendarId} onChange={(event) => setScheduleForm({ ...scheduleForm, externalCalendarId: event.target.value })} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Slug publico</label>
                                    <input className="w-full rounded-lg border-slate-300" value={scheduleForm.publicSlug} onChange={(event) => setScheduleForm({ ...scheduleForm, publicSlug: event.target.value })} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Zona horaria</label>
                                    <input className="w-full rounded-lg border-slate-300" value={scheduleForm.timeZone} onChange={(event) => setScheduleForm({ ...scheduleForm, timeZone: event.target.value })} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Duracion del turno</label>
                                    <input type="number" min={15} max={240} className="w-full rounded-lg border-slate-300" value={scheduleForm.slotDurationMinutes} onChange={(event) => setScheduleForm({ ...scheduleForm, slotDurationMinutes: Number(event.target.value) })} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Cupos por hora</label>
                                    <input type="number" min={1} max={20} className="w-full rounded-lg border-slate-300" value={scheduleForm.maxAppointmentsPerSlot} onChange={(event) => setScheduleForm({ ...scheduleForm, maxAppointmentsPerSlot: Number(event.target.value) })} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Dias anticipados</label>
                                    <input type="number" min={1} max={180} className="w-full rounded-lg border-slate-300" value={scheduleForm.advanceBookingDays} onChange={(event) => setScheduleForm({ ...scheduleForm, advanceBookingDays: Number(event.target.value) })} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Horas minimas antes</label>
                                    <input type="number" min={0} max={240} className="w-full rounded-lg border-slate-300" value={scheduleForm.minNoticeHours} onChange={(event) => setScheduleForm({ ...scheduleForm, minNoticeHours: Number(event.target.value) })} />
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
                                                        <input type="time" className="rounded-lg border-slate-300" value={rule.startTime} onChange={(event) => updateRule(index, 'startTime', event.target.value)} />
                                                        <input type="time" className="rounded-lg border-slate-300" value={rule.endTime} onChange={(event) => updateRule(index, 'endTime', event.target.value)} />
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
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                            <h3 className="text-lg font-bold text-slate-900">Nueva cita</h3>
                            <button onClick={closeAppointmentModal} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                                <X size={22} />
                            </button>
                        </div>
                        <form onSubmit={saveAppointment} className="space-y-4 p-6">
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Horario disponible</label>
                                <select required className="w-full rounded-lg border-slate-300" value={appointmentForm.startAt} onChange={(event) => setAppointmentForm({ ...appointmentForm, startAt: event.target.value })}>
                                    <option value="">Seleccionar horario</option>
                                    {availableSlots.map(slot => (
                                        <option key={slot.startAt} value={slot.startAt}>{slot.dayLabel} · {slot.time}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Nombre solicitante</label>
                                    <input required className="w-full rounded-lg border-slate-300" value={appointmentForm.customerName} onChange={(event) => setAppointmentForm({ ...appointmentForm, customerName: event.target.value })} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Telefono</label>
                                    <input required className="w-full rounded-lg border-slate-300" value={appointmentForm.customerPhone} onChange={(event) => setAppointmentForm({ ...appointmentForm, customerPhone: event.target.value })} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Correo</label>
                                    <input type="email" className="w-full rounded-lg border-slate-300" value={appointmentForm.customerEmail} onChange={(event) => setAppointmentForm({ ...appointmentForm, customerEmail: event.target.value })} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Servicio</label>
                                    <input required className="w-full rounded-lg border-slate-300" value={appointmentForm.serviceType} onChange={(event) => setAppointmentForm({ ...appointmentForm, serviceType: event.target.value })} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Placa</label>
                                    <input className="w-full rounded-lg border-slate-300 uppercase" value={appointmentForm.vehiclePlate} onChange={(event) => setAppointmentForm({ ...appointmentForm, vehiclePlate: event.target.value })} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Marca</label>
                                    <input className="w-full rounded-lg border-slate-300" value={appointmentForm.vehicleBrand} onChange={(event) => setAppointmentForm({ ...appointmentForm, vehicleBrand: event.target.value })} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Modelo</label>
                                    <input className="w-full rounded-lg border-slate-300" value={appointmentForm.vehicleModel} onChange={(event) => setAppointmentForm({ ...appointmentForm, vehicleModel: event.target.value })} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Notas</label>
                                    <textarea rows={3} className="w-full rounded-lg border-slate-300" value={appointmentForm.notes} onChange={(event) => setAppointmentForm({ ...appointmentForm, notes: event.target.value })} />
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
