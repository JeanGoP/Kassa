import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, Printer, ReceiptText, Search } from 'lucide-react';

const formatDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatCurrency = (value: number) =>
    (value || 0).toLocaleString('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    });

const Reports = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<any[]>([]);
    const [reportType, setReportType] = useState('sales-by-branch');
    const [startDate, setStartDate] = useState(formatDateInput(new Date()));
    const [endDate, setEndDate] = useState(formatDateInput(new Date()));
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('start', startDate);
            if (endDate) params.append('end', endDate);
            if (search.trim()) params.append('search', search.trim());

            let endpoint = `/reports/sales-by-branch?${params.toString()}`;
            if (reportType === 'product-margins') {
                endpoint = `/reports/product-margins?${params.toString()}`;
            }
            if (reportType === 'quotations') {
                endpoint = `/quotations?${params.toString()}`;
            }
            if (reportType === 'quotation-search-history') {
                endpoint = `/quotations/history?date=${encodeURIComponent(startDate || formatDateInput(new Date()))}`;
            }

            const res = await api.get(endpoint);
            setData(res.data);
        } catch (error) {
            console.error(error);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleReportTypeChange = (value: string) => {
        setReportType(value);
        setData([]);
    };

    const renderChart = () => {
        if (!['sales-by-branch', 'product-margins'].includes(reportType) || data.length === 0) {
            return null;
        }

        return (
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={reportType === 'sales-by-branch' ? 'branchName' : 'name'} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                            dataKey={reportType === 'sales-by-branch' ? 'totalSales' : 'margin'}
                            fill="#2563eb"
                            name={reportType === 'sales-by-branch' ? 'Ventas' : 'Margen'}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const renderQuotationsTable = () => (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-gray-100 text-xs uppercase text-slate-500">
                    <tr>
                        <th className="border-b px-4 py-3">No.</th>
                        <th className="border-b px-4 py-3">Fecha</th>
                        <th className="border-b px-4 py-3">Solicitante</th>
                        <th className="border-b px-4 py-3 text-center">Items</th>
                        <th className="border-b px-4 py-3 text-center">Estado</th>
                        <th className="border-b px-4 py-3 text-right">Pendiente</th>
                        <th className="border-b px-4 py-3 text-right">Total</th>
                        <th className="border-b px-4 py-3 text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody className="text-slate-700">
                    {data.map((quote) => (
                        <tr key={quote.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="px-4 py-3 font-semibold text-slate-900">{quote.quotationNumber}</td>
                            <td className="px-4 py-3">{new Date(quote.date).toLocaleString('es-CO')}</td>
                            <td className="px-4 py-3">{quote.requestedByName}</td>
                            <td className="px-4 py-3 text-center">{quote.details?.length || 0}</td>
                            <td className="px-4 py-3 text-center">
                                <span className={`k-badge ${quote.status === 'COMPLETADA' ? 'k-badge-success' : quote.status === 'PARCIAL' ? 'k-badge-warning' : 'k-badge-info'}`}>
                                    {quote.status || 'PENDIENTE'}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-amber-700">{formatCurrency(quote.pendingAmount)}</td>
                            <td className="px-4 py-3 text-right font-semibold">{formatCurrency(quote.totalAmount)}</td>
                            <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                    {quote.status !== 'COMPLETADA' && (
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/pos?quotationId=${quote.id}`)}
                                            className="inline-flex items-center justify-center rounded-lg p-2 text-emerald-700 hover:bg-emerald-50"
                                            title={quote.status === 'PARCIAL' ? 'Facturar pendientes' : 'Convertir en venta'}
                                        >
                                            <ReceiptText size={18} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => window.open(`/quotations/print/${quote.id}`, '_blank', 'noopener,noreferrer')}
                                        className="inline-flex items-center justify-center rounded-lg p-2 text-blue-700 hover:bg-blue-50"
                                        title="Imprimir / PDF"
                                    >
                                        <Printer size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderSearchHistoryTable = () => (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-gray-100 text-xs uppercase text-slate-500">
                    <tr>
                        <th className="border-b px-4 py-3">Fecha</th>
                        <th className="border-b px-4 py-3">Repuesto buscado</th>
                        <th className="border-b px-4 py-3">Producto asociado</th>
                        <th className="border-b px-4 py-3 text-center">Existencia</th>
                        <th className="border-b px-4 py-3 text-right">Cantidad</th>
                    </tr>
                </thead>
                <tbody className="text-slate-700">
                    {data.map((item) => (
                        <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="px-4 py-3">{new Date(item.searchedAt).toLocaleString('es-CO')}</td>
                            <td className="px-4 py-3 font-medium">{item.searchTerm}</td>
                            <td className="px-4 py-3 text-slate-500">{item.matchedProductName || 'Sin coincidencia'}</td>
                            <td className="px-4 py-3 text-center">
                                {item.foundInStock ? (
                                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">Si</span>
                                ) : (
                                    <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">No</span>
                                )}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">{item.totalQuantity}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderGenericTable = () => (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-gray-100 text-xs uppercase text-slate-500">
                    <tr>
                        {data.length > 0 && Object.keys(data[0]).map((key) => (
                            <th key={key} className="border-b px-4 py-3 capitalize">{key}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="text-slate-700">
                    {data.map((row, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                            {Object.values(row).map((val: any, i) => (
                                <td key={i} className="px-4 py-3">{String(val ?? '')}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderTable = () => {
        if (data.length === 0) {
            return <p className="mt-4 text-sm text-gray-500">No hay datos para mostrar.</p>;
        }

        if (reportType === 'quotations') return renderQuotationsTable();
        if (reportType === 'quotation-search-history') return renderSearchHistoryTable();
        return renderGenericTable();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <FileText className="text-slate-700" size={28} />
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Reportes</h2>
                    <p className="text-sm text-slate-500">Consulta ventas, margenes, cotizaciones e historial de busquedas.</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-100 p-4">
                <div className="grid gap-3 lg:grid-cols-[220px_160px_160px_minmax(180px,1fr)_140px]">
                    <select
                        value={reportType}
                        onChange={(e) => handleReportTypeChange(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                        <option value="sales-by-branch">Ventas por Sucursal</option>
                        <option value="product-margins">Margen por Producto</option>
                        <option value="quotations">Cotizaciones emitidas</option>
                        <option value="quotation-search-history">Historial de busquedas</option>
                    </select>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        disabled={reportType === 'quotation-search-history'}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                    />
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            disabled={reportType !== 'quotations'}
                            placeholder="Buscar por numero o solicitante"
                            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                        />
                    </div>
                    <button
                        onClick={fetchReport}
                        disabled={loading}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-blue-300"
                    >
                        {loading ? 'Generando...' : 'Generar'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-100 p-4">
                <div className="space-y-6">
                    {renderChart()}
                    {renderTable()}
                </div>
            </div>
        </div>
    );
};

export default Reports;
