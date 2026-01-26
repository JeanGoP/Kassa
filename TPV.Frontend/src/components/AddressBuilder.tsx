import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface AddressBuilderProps {
    initialValue?: string;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (address: string) => void;
}

const VIA_TYPES = [
    { value: 'CL', label: 'Calle (CL)' },
    { value: 'KR', label: 'Carrera (KR)' },
    { value: 'DG', label: 'Diagonal (DG)' },
    { value: 'TV', label: 'Transversal (TV)' },
    { value: 'AV', label: 'Avenida (AV)' },
    { value: 'AC', label: 'Avenida Calle (AC)' },
    { value: 'AK', label: 'Avenida Carrera (AK)' },
    { value: 'BL', label: 'Bulevar (BL)' },
    { value: 'CQ', label: 'Circular (CQ)' },
    { value: 'VT', label: 'Variante (VT)' },
    { value: 'VI', label: 'Vía (VI)' },
];

const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)); // A-Z

const CARDINALS = [
    { value: '', label: '-' },
    { value: 'SUR', label: 'Sur' },
    { value: 'ESTE', label: 'Este' },
];

const COMPLEMENTS = [
    { value: '', label: '-' },
    { value: 'AP', label: 'Apartamento' },
    { value: 'CS', label: 'Casa' },
    { value: 'LC', label: 'Local' },
    { value: 'OF', label: 'Oficina' },
    { value: 'BG', label: 'Bodega' },
    { value: 'LO', label: 'Lote' },
    { value: 'PI', label: 'Piso' },
    { value: 'UN', label: 'Unidad' },
    { value: 'TO', label: 'Torre' },
    { value: 'MZ', label: 'Manzana' },
    { value: 'IN', label: 'Interior' },
];

const AddressBuilder: React.FC<AddressBuilderProps> = ({ isOpen, onClose, onConfirm }) => {
    // Via Principal
    const [viaType, setViaType] = useState('CL');
    const [viaNumber, setViaNumber] = useState('');
    const [viaLetter, setViaLetter] = useState('');
    const [viaBis, setViaBis] = useState(false);
    const [viaCardinal, setViaCardinal] = useState('');

    // Cruce (Numero)
    const [crossNumber, setCrossNumber] = useState('');
    const [crossLetter, setCrossLetter] = useState('');
    const [crossCardinal, setCrossCardinal] = useState('');

    // Placa
    const [plateNumber, setPlateNumber] = useState('');

    // Complemento
    const [complementType, setComplementType] = useState('');
    const [complementValue, setComplementValue] = useState('');

    // Otro
    const [generatedAddress, setGeneratedAddress] = useState('');

    useEffect(() => {
        // Build address string
        // Format: [ViaType] [ViaNumber] [ViaLetter] [BIS?] [ViaCardinal] # [CrossNumber] [CrossLetter] [CrossCardinal] - [PlateNumber] [Complement]
        
        let parts = [];
        
        // 1. Via Principal
        if (viaType) parts.push(viaType);
        if (viaNumber) parts.push(viaNumber);
        if (viaLetter) parts.push(viaLetter);
        if (viaBis) parts.push('BIS');
        if (viaCardinal) parts.push(viaCardinal);

        // 2. Separator for intersection
        if (crossNumber || plateNumber) {
            parts.push('#');
        }

        // 3. Cruce
        if (crossNumber) parts.push(crossNumber);
        if (crossLetter) parts.push(crossLetter);
        if (crossCardinal) parts.push(crossCardinal);

        // 4. Separator for plate
        if (plateNumber) {
            parts.push('-');
            parts.push(plateNumber);
        }

        // 5. Complement
        if (complementType && complementValue) {
            parts.push(complementType);
            parts.push(complementValue);
        }

        setGeneratedAddress(parts.join(' '));
    }, [viaType, viaNumber, viaLetter, viaBis, viaCardinal, crossNumber, crossLetter, crossCardinal, plateNumber, complementType, complementValue]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(generatedAddress);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-lg">Generador de Direcciones DIAN</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Vía Principal */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-blue-600 uppercase tracking-wide">1. Vía Principal</h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Vía</label>
                                <select 
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={viaType}
                                    onChange={(e) => setViaType(e.target.value)}
                                >
                                    {VIA_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Número</label>
                                <input 
                                    type="text" 
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={viaNumber}
                                    onChange={(e) => setViaNumber(e.target.value)}
                                    placeholder="Ej: 10"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Letra</label>
                                <select 
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={viaLetter}
                                    onChange={(e) => setViaLetter(e.target.value)}
                                >
                                    <option value="">-</option>
                                    {LETTERS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Cardinal</label>
                                <select 
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={viaCardinal}
                                    onChange={(e) => setViaCardinal(e.target.value)}
                                >
                                    {CARDINALS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <input 
                                type="checkbox" 
                                id="viaBis" 
                                checked={viaBis} 
                                onChange={(e) => setViaBis(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="viaBis" className="text-sm text-gray-700">Bis</label>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Vía Generadora / Cruce */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-blue-600 uppercase tracking-wide">2. Vía Generadora (Cruce)</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                             <div className="flex items-center justify-center font-bold text-gray-400 text-xl">#</div>
                             <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Número</label>
                                <input 
                                    type="text" 
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={crossNumber}
                                    onChange={(e) => setCrossNumber(e.target.value)}
                                    placeholder="Ej: 20"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Letra</label>
                                <select 
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={crossLetter}
                                    onChange={(e) => setCrossLetter(e.target.value)}
                                >
                                    <option value="">-</option>
                                    {LETTERS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Cardinal</label>
                                <select 
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={crossCardinal}
                                    onChange={(e) => setCrossCardinal(e.target.value)}
                                >
                                    {CARDINALS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Placa y Complemento */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-blue-600 uppercase tracking-wide">3. Placa y Complemento</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="flex gap-2 items-end">
                                <span className="mb-2 font-bold text-gray-400 text-xl">-</span>
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Placa (Distancia)</label>
                                    <input 
                                        type="text" 
                                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={plateNumber}
                                        onChange={(e) => setPlateNumber(e.target.value)}
                                        placeholder="Ej: 30"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Tipo Compl.</label>
                                <select 
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={complementType}
                                    onChange={(e) => setComplementType(e.target.value)}
                                >
                                    {COMPLEMENTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Valor Compl.</label>
                                <input 
                                    type="text" 
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={complementValue}
                                    onChange={(e) => setComplementValue(e.target.value)}
                                    placeholder="Ej: 501"
                                    disabled={!complementType}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="bg-slate-100 p-4 rounded-lg text-center">
                        <span className="block text-xs text-gray-500 uppercase mb-1">Vista Previa Dirección</span>
                        <p className="text-xl font-mono font-bold text-slate-800 break-all">
                            {generatedAddress || <span className="text-gray-400 italic">Complete los campos...</span>}
                        </p>
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleConfirm}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-all"
                    >
                        Usar Dirección
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddressBuilder;
