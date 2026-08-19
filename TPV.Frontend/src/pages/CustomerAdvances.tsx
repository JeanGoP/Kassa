import { useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Clock3, ReceiptText, Search, UserRound, WalletCards } from 'lucide-react';
import { clsx } from 'clsx';
import api from '../api/axios';

interface AdvanceSummary {
    customerId: number;
    customerName: string;
    identificationType?: string | null;
    taxId?: string | null;
    balance: number;
    lastMovementAt?: string | null;
}

interface AdvanceMovement {
    id: number;
    date: string;
    movementType: 'CONSTITUCION' | 'APLICACION';
    amount: number;
    signedAmount: number;
    balanceAfter: number;
    branchName: string;
    saleId?: number | null;
    invoiceNumber?: string | null;
    paymentMethod: string;
    reference: string;
    notes?: string | null;
}

interface AdvanceAccount {
    customer: AdvanceSummary;
    movements: AdvanceMovement[];
}

const currency = (value: number) => new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
}).format(value || 0);

const dateTime = (value?: string | null) => value
    ? new Date(value).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Sin movimientos';

const CustomerAdvances = () => {
    const [search, setSearch] = useState('');
    const [accounts, setAccounts] = useState<AdvanceSummary[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
    const [account, setAccount] = useState<AdvanceAccount | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingAccount, setLoadingAccount] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let isCurrent = true;
        const timer = setTimeout(async () => {
            setLoading(true);
            setError('');
            try {
                const response = await api.get('/CustomerAdvances', { params: { search: search.trim() || undefined } });
                if (!isCurrent) return;
                const rows = response.data as AdvanceSummary[];
                setAccounts(rows);
                setSelectedCustomerId(current => current && rows.some(row => row.customerId === current)
                    ? current
                    : rows[0]?.customerId ?? null);
            } catch (requestError) {
                console.error('Error loading customer advances', requestError);
                if (isCurrent) {
                    setAccounts([]);
                    setSelectedCustomerId(null);
                    setError('No fue posible consultar los anticipos.');
                }
            } finally {
                if (isCurrent) setLoading(false);
            }
        }, 250);

        return () => {
            isCurrent = false;
            clearTimeout(timer);
        };
    }, [search]);

    useEffect(() => {
        let isCurrent = true;
        if (!selectedCustomerId) {
            setAccount(null);
            return;
        }

        setLoadingAccount(true);
        api.get(`/CustomerAdvances/customer/${selectedCustomerId}`)
            .then(response => {
                if (isCurrent) setAccount(response.data);
            })
            .catch(requestError => {
                console.error('Error loading customer advance account', requestError);
                if (isCurrent) setError('No fue posible cargar el detalle del anticipo.');
            })
            .finally(() => {
                if (isCurrent) setLoadingAccount(false);
            });

        return () => {
            isCurrent = false;
        };
    }, [selectedCustomerId]);

    const totalOpenAdvances = useMemo(
        () => accounts.reduce((sum, item) => sum + Math.max(0, Number(item.balance) || 0), 0),
        [accounts]
    );

    return (
        <div className="mx-auto w-full max-w-[1500px] space-y-5">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <div className="mb-1 flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600">
                            <WalletCards size={22} />
                        </span>
                        <div>
                            <p className="text-xs font-bold uppercase text-slate-500">Operaciones</p>
                            <h1 className="text-2xl font-bold text-slate-950">Anticipos de clientes</h1>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600">Saldos disponibles y trazabilidad de cada valor recibido o aplicado.</p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 sm:min-w-52">
                    <p className="text-xs font-bold uppercase text-emerald-700">Saldo total vigente</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-800">{currency(totalOpenAdvances)}</p>
                </div>
            </header>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
            )}

            <div className="grid min-h-[600px] grid-cols-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-[360px_minmax(0,1fr)]">
                <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
                    <div className="border-b border-slate-200 p-4">
                        <label className="relative block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Buscar cliente o identificación"
                                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </label>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto lg:max-h-[calc(100vh-260px)]">
                        {loading ? (
                            <p className="p-6 text-center text-sm text-slate-500">Consultando anticipos...</p>
                        ) : accounts.length === 0 ? (
                            <div className="p-8 text-center">
                                <WalletCards className="mx-auto mb-3 text-slate-300" size={36} />
                                <p className="font-semibold text-slate-700">No hay movimientos de anticipos</p>
                                <p className="mt-1 text-sm text-slate-500">Los excedentes guardados desde una venta aparecerán aquí.</p>
                            </div>
                        ) : accounts.map(item => (
                            <button
                                key={item.customerId}
                                type="button"
                                onClick={() => setSelectedCustomerId(item.customerId)}
                                className={clsx(
                                    'w-full border-b border-slate-100 px-4 py-4 text-left transition-colors',
                                    selectedCustomerId === item.customerId ? 'bg-blue-50' : 'hover:bg-slate-50'
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-slate-900">{item.customerName}</p>
                                        <p className="mt-1 truncate text-xs text-slate-500">
                                            {[item.identificationType, item.taxId].filter(Boolean).join(' ') || 'Sin identificación'}
                                        </p>
                                    </div>
                                    <span className={clsx('shrink-0 font-bold', item.balance > 0 ? 'text-emerald-700' : 'text-slate-500')}>
                                        {currency(item.balance)}
                                    </span>
                                </div>
                                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                                    <Clock3 size={13} /> {dateTime(item.lastMovementAt)}
                                </p>
                            </button>
                        ))}
                    </div>
                </aside>

                <section className="min-w-0">
                    {loadingAccount ? (
                        <p className="p-10 text-center text-sm text-slate-500">Cargando cuenta del cliente...</p>
                    ) : account ? (
                        <>
                            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                        <UserRound size={21} />
                                    </span>
                                    <div className="min-w-0">
                                        <h2 className="truncate text-lg font-bold text-slate-950">{account.customer.customerName}</h2>
                                        <p className="text-sm text-slate-500">
                                            {[account.customer.identificationType, account.customer.taxId].filter(Boolean).join(' ') || 'Sin identificación'}
                                        </p>
                                    </div>
                                </div>
                                <div className="sm:text-right">
                                    <p className="text-xs font-bold uppercase text-slate-500">Saldo disponible</p>
                                    <p className={clsx('text-2xl font-bold', account.customer.balance > 0 ? 'text-emerald-700' : 'text-slate-700')}>
                                        {currency(account.customer.balance)}
                                    </p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] text-left text-sm">
                                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
                                        <tr>
                                            <th className="px-5 py-3">Fecha</th>
                                            <th className="px-5 py-3">Movimiento</th>
                                            <th className="px-5 py-3">Documento</th>
                                            <th className="px-5 py-3">Sucursal</th>
                                            <th className="px-5 py-3 text-right">Valor</th>
                                            <th className="px-5 py-3 text-right">Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {account.movements.map(movement => {
                                            const isCredit = movement.movementType === 'CONSTITUCION';
                                            return (
                                                <tr key={movement.id} className="hover:bg-slate-50">
                                                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">{dateTime(movement.date)}</td>
                                                    <td className="px-5 py-4">
                                                        <span className={clsx(
                                                            'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold',
                                                            isCredit ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                                                        )}>
                                                            {isCredit ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                                                            {isCredit ? 'Recibido' : 'Aplicado'}
                                                        </span>
                                                        <p className="mt-1 text-xs text-slate-500">{movement.paymentMethod}</p>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <p className="font-semibold text-slate-800">{movement.invoiceNumber || movement.reference}</p>
                                                        {movement.invoiceNumber && movement.reference !== movement.invoiceNumber && (
                                                            <p className="mt-1 text-xs text-slate-500">{movement.reference}</p>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4 text-slate-600">{movement.branchName || 'Sin sucursal'}</td>
                                                    <td className={clsx('whitespace-nowrap px-5 py-4 text-right font-bold', isCredit ? 'text-emerald-700' : 'text-blue-700')}>
                                                        {isCredit ? '+' : '-'}{currency(movement.amount)}
                                                    </td>
                                                    <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-slate-900">{currency(movement.balanceAfter)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center text-slate-500">
                            <ReceiptText className="mb-3 text-slate-300" size={40} />
                            <p className="font-semibold text-slate-700">Selecciona un cliente</p>
                            <p className="mt-1 text-sm">Aquí verás cada anticipo recibido y su aplicación posterior.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default CustomerAdvances;
