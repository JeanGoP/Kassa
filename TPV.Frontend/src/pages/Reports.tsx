import React, { useState } from 'react';
import api from '../api/axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'; // Assuming recharts is installed or I should stick to simple table if not

// I didn't install recharts, so I'll use simple tables for now to avoid errors.
// Or I can just show JSON data. I'll use a table.

const Reports = () => {
    const [data, setData] = useState<any[]>([]);
    const [reportType, setReportType] = useState('sales-by-branch');
    const [loading, setLoading] = useState(false);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const endpoint = reportType === 'sales-by-branch' ? '/reports/sales-by-branch' : '/reports/product-margins';
            const res = await api.get(endpoint);
            setData(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Reportes</h2>
            
            <div className="flex gap-4 mb-6">
                <select 
                    value={reportType} 
                    onChange={(e) => setReportType(e.target.value)}
                    className="p-2 border rounded"
                >
                    <option value="sales-by-branch">Ventas por Sucursal</option>
                    <option value="product-margins">Margen por Producto</option>
                </select>
                <button 
                    onClick={fetchReport}
                    className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700"
                >
                    Generar
                </button>
            </div>

            {loading ? <div>Loading...</div> : (
                <div className="space-y-8">
                    {data.length > 0 && (
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
                                        fill="#3b82f6" 
                                        name={reportType === 'sales-by-branch' ? 'Ventas' : 'Margen'}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-100">
                                <tr>
                                    {data.length > 0 && Object.keys(data[0]).map(key => (
                                        <th key={key} className="p-3 border-b capitalize">{key}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, idx) => (
                                    <tr key={idx} className="border-b">
                                        {Object.values(row).map((val: any, i) => (
                                            <td key={i} className="p-3">{val}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {data.length === 0 && <p className="text-gray-500 mt-4">No hay datos para mostrar</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;