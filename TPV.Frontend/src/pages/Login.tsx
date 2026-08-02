import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Lock, Mail } from 'lucide-react';
import api from '../api/axios';
import logo from '../assets/Logo.png';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await api.post('/auth/login', { email, password, rememberMe: true });
            login(response.data.user);
            navigate('/');
        } catch (err: any) {
            console.error(err);
            const backendMessage = err.response?.data;
            if (typeof backendMessage === 'string') {
                setError(backendMessage);
            } else if (backendMessage?.message) {
                setError(backendMessage.message);
            } else {
                setError('No se pudo iniciar sesión. Intente nuevamente.');
            }
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#101828] px-4 py-8">
            <div className="grid w-full max-w-5xl overflow-hidden rounded-[14px] bg-white shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
                <div className="hidden bg-[#172033] p-10 text-white lg:flex lg:flex-col lg:justify-between">
                    <div>
                        <div className="mb-10 flex items-center gap-3">
                            <img src={logo} alt="Kassa" className="h-12 w-12 rounded-xl bg-white p-2 object-contain" />
                            <div>
                                <h1 className="text-2xl font-extrabold leading-none">Kassa</h1>
                                <p className="mt-1 text-sm text-slate-300">Gestión comercial y taller</p>
                            </div>
                        </div>
                        <h2 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">
                            Control claro para vender, cotizar y operar el taller.
                        </h2>
                        <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">
                            Una experiencia diseñada para trabajar rápido, leer mejor la información y mantener el negocio en orden.
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                            <div className="font-extrabold">POS</div>
                            <div className="mt-1 text-xs text-slate-400">Ventas</div>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                            <div className="font-extrabold">Stock</div>
                            <div className="mt-1 text-xs text-slate-400">Inventario</div>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                            <div className="font-extrabold">Taller</div>
                            <div className="mt-1 text-xs text-slate-400">Órdenes</div>
                        </div>
                    </div>
                </div>

                <div className="k-login-card p-6 sm:p-8 lg:p-10">
                    <div className="mb-8 flex justify-center lg:hidden">
                        <img src={logo} alt="Kassa Logo" className="h-20 w-20 object-contain" />
                    </div>
                    <div className="mb-8">
                        <p className="text-sm font-extrabold uppercase tracking-wide text-blue-700">Acceso seguro</p>
                        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Bienvenido</h2>
                        <p className="mt-2 text-sm text-slate-500">Inicia sesión para continuar con la operación.</p>
                    </div>

                    {error && (
                        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            <AlertCircle size={20} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="mb-2 ml-1 block text-sm">Correo Electrónico</label>
                            <div className="relative">
                                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full py-3 pl-10 pr-4"
                                    placeholder="ejemplo@kassa.com"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="mb-2 ml-1 block text-sm">Contraseña</label>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full py-3 pl-10 pr-4"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="k-button-primary w-full px-4 py-3 text-base"
                        >
                            Ingresar
                            <ArrowRight size={19} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
