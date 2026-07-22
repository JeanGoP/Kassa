import React, { useState } from 'react';
import { X, Lock, Save } from 'lucide-react';
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-2xl transform transition-all scale-100">
                <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center text-white space-x-2">
                        <Lock size={20} className="text-blue-400" />
                        <h2 className="text-lg font-bold">Cambiar Contraseña</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm border border-green-100">
                            {success}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Contraseña Actual</label>
                        <input
                            type="password"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Nueva Contraseña</label>
                        <input
                            type="password"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Confirmar Nueva Contraseña</label>
                        <input
                            type="password"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                        />
                    </div>

                    <div className="pt-4 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/30 transition-all flex items-center font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Guardando...
                                </span>
                            ) : (
                                <>
                                    <Save size={18} className="mr-2" />
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
