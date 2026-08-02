import React, { useState } from 'react';
import { X, Lock, Save, Loader2 } from 'lucide-react';
import api from '../api/axios';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (newPassword !== confirmNewPassword) {
            setError("La nueva contraseña y su confirmación no coinciden.");
            return;
        }

        if (newPassword.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/auth/change-password', {
                currentPassword,
                newPassword,
                confirmNewPassword
            });
            setSuccess(response.data.message);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
            setTimeout(() => {
                onClose();
                setSuccess(null);
            }, 2000);
        } catch (err: any) {
            console.error(err);
            if (err.response && err.response.data) {
                if (Array.isArray(err.response.data)) {
                    setError(err.response.data.map((e: any) => e.description).join(', '));
                } else {
                    setError(err.response.data.message || "Error al cambiar la contraseña.");
                }
            } else {
                setError("Error de conexión al intentar cambiar la contraseña.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="k-document max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto bg-white">
                <div className="k-panel-header flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-900">
                        <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                            <Lock size={20} />
                        </div>
                        <h2 className="text-lg font-extrabold">Cambiar Contraseña</h2>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                        <X size={22} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 p-6">
                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">
                            {success}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="block text-sm">Contraseña Actual</label>
                        <input
                            type="password"
                            required
                            className="w-full px-3 py-2"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm">Nueva Contraseña</label>
                        <input
                            type="password"
                            required
                            className="w-full px-3 py-2"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm">Confirmar Nueva Contraseña</label>
                        <input
                            type="password"
                            required
                            className="w-full px-3 py-2"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="k-button-secondary px-4 py-2 text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="k-button-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Guardar Cambios
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
