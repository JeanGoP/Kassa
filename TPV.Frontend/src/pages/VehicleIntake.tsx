import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { calculateNitVerificationDigit } from '../utils/nit';
import AddressBuilder from '../components/AddressBuilder';
import { Camera, Search, X, UserPlus, Printer, MapPin, ScrollText } from 'lucide-react';

interface Customer {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    taxId: string;
    identificationType: string;
}

interface NewCustomer {
    firstName1: string;
    firstName2: string;
    lastName1: string;
    lastName2: string;
    email: string;
    phone: string;
    address: string;
    taxId: string;
    identificationType: string;
}

const IDENTIFICATION_TYPES = [
    "RCN Registro Civil de Nacimiento",
    "TI Tarjeta de Identidad",
    "CC Cédula de Ciudadanía",
    "CD Cédula Digital",
    "CE Cédula de Extranjería",
    "PA Pasaporte",
    "PEP Permiso Especial de Permanencia",
    "PPT Permiso por Protección Temporal",
    "NUIP Número Único de Identificación Personal",
    "NIT Número de Identificación Tributaria"
];

const formatDateTimeLocal = (date = new Date()) => {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
};

const MAX_VISUAL_EVIDENCE_IMAGES = 6;

const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);

        image.onload = () => {
            const maxSize = 1280;
            const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));

            const context = canvas.getContext('2d');
            if (!context) {
                URL.revokeObjectURL(objectUrl);
                reject(new Error('No fue posible procesar la imagen.'));
                return;
            }

            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(objectUrl);
            resolve(canvas.toDataURL('image/jpeg', 0.72));
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('No fue posible cargar la imagen.'));
        };

        image.src = objectUrl;
    });
};

const VehicleIntake = () => {
    const [formData, setFormData] = useState({
        plate: '',
        brand: '',
        model: '',
        year: '',
        mileage: '',
        intakeDateTime: formatDateTimeLocal(),
        fuelLevel: '',
        initialObservations: '',
        visualCondition: '',
        workshopManager: '',
    });

    // Customers State
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);

    // Create Customer Modal State
    const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
    const [showAddressBuilder, setShowAddressBuilder] = useState(false);
    const [personType, setPersonType] = useState<'Natural' | 'Juridica'>('Natural');
    const [newCustomer, setNewCustomer] = useState<NewCustomer>({
        firstName1: '',
        firstName2: '',
        lastName1: '',
        lastName2: '',
        email: '',
        phone: '',
        address: '',
        taxId: '',
        identificationType: ''
    });
    const [creatingCustomer, setCreatingCustomer] = useState(false);
    const [lastServiceOrder, setLastServiceOrder] = useState<any | null>(null);
    const [orderSearch, setOrderSearch] = useState('');
    const [orderResults, setOrderResults] = useState<any[]>([]);
    const [searchingOrders, setSearchingOrders] = useState(false);
    const evidenceInputRef = useRef<HTMLInputElement | null>(null);
    const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [visualEvidenceImages, setVisualEvidenceImages] = useState<string[]>([]);
    const [signatureDataUrl, setSignatureDataUrl] = useState('');
    const [isSigning, setIsSigning] = useState(false);

    // Warranty State
    const [activeWarranties, setActiveWarranties] = useState<any[]>([]);

    useEffect(() => {
        const fetchCurrentBranchManager = async () => {
            try {
                const response = await api.get('/branches/current');
                const branch = response.data;
                const managerName = branch.workshopManagerName || branch.managerName || '';
                setFormData(prev => ({ ...prev, workshopManager: managerName }));
            } catch (error) {
                console.error("Error fetching current branch info", error);
                setFormData(prev => ({ ...prev, workshopManager: '' }));
            }
        };

        fetchCurrentBranchManager();
    }, []);

    useEffect(() => {
        if (customerSearch.length > 2) {
            const timer = setTimeout(() => {
                fetchCustomers();
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setCustomers([]);
        }
    }, [customerSearch]);

    // Technicians State (no se asigna técnico en el ingreso inicial)

    const fetchCustomers = async () => {
        try {
            const response = await api.get(`/customers?search=${customerSearch}`);
            setCustomers(response.data);
        } catch (error) {
            console.error("Error fetching customers", error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckTaxId = async () => {
        if (!newCustomer.taxId || newCustomer.taxId.trim().length < 3) return;
        
        try {
            const response = await api.get(`/customers?search=${newCustomer.taxId.trim()}`);
            if (response.data && response.data.length > 0) {
                // Check if exact match
                const match = response.data.find((c: Customer) => c.taxId === newCustomer.taxId.trim());
                if (match) {
                    alert(`Advertencia: Ya existe un cliente registrado con la identificación ${newCustomer.taxId}.\nNombre: ${match.firstName} ${match.lastName}`);
                }
            }
        } catch (error) {
            console.error("Error checking taxId", error);
        }
    };

    const handleCreateCustomer = async () => {
        const isJuridica = personType === 'Juridica';

        if (isJuridica) {
            if (!newCustomer.firstName1) {
                alert("Razón Social es obligatoria");
                return;
            }
        } else {
            if (!newCustomer.firstName1 || !newCustomer.lastName1) {
                alert("Primer Nombre y Primer Apellido son obligatorios");
                return;
            }
        }

        setCreatingCustomer(true);
        try {
            const payload = {
                firstName: isJuridica 
                    ? newCustomer.firstName1.trim()
                    : `${newCustomer.firstName1} ${newCustomer.firstName2}`.trim(),
                lastName: isJuridica
                    ? "."
                    : `${newCustomer.lastName1} ${newCustomer.lastName2}`.trim(),
                email: newCustomer.email,
                phone: newCustomer.phone,
                address: newCustomer.address,
                taxId: newCustomer.taxId,
                identificationType: newCustomer.identificationType
            };

            const response = await api.post('/customers', payload);
            const createdCustomer = response.data;
            
            setCustomers([createdCustomer]);
            setSelectedCustomer(createdCustomer);
            setShowCreateCustomerModal(false);
            setCustomerSearch('');
            setPersonType('Natural');
            setNewCustomer({
                firstName1: '',
                firstName2: '',
                lastName1: '',
                lastName2: '',
                email: '',
                phone: '',
                address: '',
                taxId: '',
                identificationType: ''
            });
        } catch (error: any) {
            console.error("Error creating customer", error);
            const errorMessage = error.response?.data?.detail || error.response?.data?.message || "Error al crear el cliente.";
            alert(errorMessage);
        } finally {
            setCreatingCustomer(false);
        }
    };

    // Check for warranties when plate changes
    useEffect(() => {
        const checkWarranties = async () => {
            if (formData.plate.length >= 3) {
                try {
                    const response = await api.get(`/warranties/active/${formData.plate}`);
                    setActiveWarranties(response.data);
                } catch (error) {
                    console.error("Error fetching warranties", error);
                }
            } else {
                setActiveWarranties([]);
            }
        };

        const timeoutId = setTimeout(checkWarranties, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.plate]);

    const handleEvidenceFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files || []);
        event.target.value = '';

        if (selectedFiles.length === 0) return;

        const remainingSlots = MAX_VISUAL_EVIDENCE_IMAGES - visualEvidenceImages.length;
        if (remainingSlots <= 0) {
            alert(`Solo puedes adjuntar hasta ${MAX_VISUAL_EVIDENCE_IMAGES} evidencias.`);
            return;
        }

        try {
            const compressedImages = await Promise.all(
                selectedFiles
                    .filter(file => file.type.startsWith('image/'))
                    .slice(0, remainingSlots)
                    .map(compressImageFile)
            );

            setVisualEvidenceImages(prev => [...prev, ...compressedImages].slice(0, MAX_VISUAL_EVIDENCE_IMAGES));
        } catch (error) {
            console.error('Error processing evidence images', error);
            alert('No fue posible procesar una de las fotografias.');
        }
    };

    const removeEvidenceImage = (index: number) => {
        setVisualEvidenceImages(prev => prev.filter((_, currentIndex) => currentIndex !== index));
    };

    const getSignaturePoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * (canvas.width / rect.width),
            y: (event.clientY - rect.top) * (canvas.height / rect.height)
        };
    };

    const startSignature = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = signatureCanvasRef.current;
        const point = getSignaturePoint(event);
        if (!canvas || !point) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        event.currentTarget.setPointerCapture(event.pointerId);
        context.strokeStyle = '#0f172a';
        context.lineWidth = 3;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.beginPath();
        context.moveTo(point.x, point.y);
        setIsSigning(true);
    };

    const drawSignature = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isSigning) return;

        const canvas = signatureCanvasRef.current;
        const point = getSignaturePoint(event);
        if (!canvas || !point) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        context.lineTo(point.x, point.y);
        context.stroke();
    };

    const finishSignature = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isSigning) return;

        const canvas = signatureCanvasRef.current;
        if (!canvas) return;

        setIsSigning(false);
        setSignatureDataUrl(canvas.toDataURL('image/png'));
        event.currentTarget.releasePointerCapture(event.pointerId);
    };

    const clearSignature = () => {
        const canvas = signatureCanvasRef.current;
        const context = canvas?.getContext('2d');
        if (canvas && context) {
            context.clearRect(0, 0, canvas.width, canvas.height);
        }
        setSignatureDataUrl('');
        setIsSigning(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer) {
            alert('Por favor seleccione un cliente.');
            return;
        }

        if (!signatureDataUrl) {
            alert('Solicita la firma del cliente antes de guardar el ingreso.');
            return;
        }
        
        const intakeData = {
            ...formData,
            intakeDateTime: formData.intakeDateTime || formatDateTimeLocal(),
            visualEvidenceImages,
            intakeCustomerSignatureDataUrl: signatureDataUrl,
            customerId: selectedCustomer.id,
            customerName: `${selectedCustomer.firstName} ${selectedCustomer.lastName}`,
            status: "ABIERTA"
        };

        try {
            const response = await api.post('/ServiceOrders', intakeData);
            setLastServiceOrder(response.data);
            alert('Ingreso de vehículo registrado exitosamente.');
            // Reset form
            setFormData(prev => ({
                plate: '',
                brand: '',
                model: '',
                year: '',
                mileage: '',
                intakeDateTime: formatDateTimeLocal(),
                fuelLevel: '',
                initialObservations: '',
                visualCondition: '',
                workshopManager: prev.workshopManager
            }));
            setSelectedCustomer(null);
            setCustomerSearch('');
            setVisualEvidenceImages([]);
            clearSignature();
        } catch (error) {
            console.error('Error saving service order', error);
            alert('Error al registrar el ingreso.');
        }
    };

    const handlePrint = (orderToPrint = lastServiceOrder) => {
        if (!orderToPrint) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const evidenceImages = Array.isArray(orderToPrint.visualEvidenceImages)
            ? orderToPrint.visualEvidenceImages
            : [];
        const evidenceHtml = evidenceImages.length > 0
            ? evidenceImages.map((image: string, index: number) => `
                <div class="evidence-item">
                    <img src="${image}" alt="Evidencia ${index + 1}" />
                    <div>Evidencia ${index + 1}</div>
                </div>
            `).join('')
            : '<div class="empty-evidence">Sin evidencias fotograficas adjuntas.</div>';
        const signatureHtml = orderToPrint.intakeCustomerSignatureDataUrl
            ? `<img class="signature-image" src="${orderToPrint.intakeCustomerSignatureDataUrl}" alt="Firma del cliente" />`
            : '<div class="empty-evidence">Firma no capturada.</div>';

        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charSet="utf-8" />
    <title>Comprobante de ingreso de vehículo</title>
    <style>
        :root {
            --bg-page: #f3f4f6;
            --bg-card: #ffffff;
            --border-subtle: #e5e7eb;
            --text-main: #111827;
            --text-muted: #6b7280;
            --accent: #111827;
            --badge-open-bg: #ecfdf3;
            --badge-open-text: #166534;
            --badge-default-bg: #f3f4f6;
            --badge-default-text: #374151;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            padding: 32px 16px;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background-color: var(--bg-page);
            color: var(--text-main);
        }

        .page {
            max-width: 840px;
            margin: 0 auto;
            background-color: var(--bg-card);
            border-radius: 16px;
            box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12);
            padding: 28px 32px 30px;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
        }

        .brand {
            font-size: 14px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--text-muted);
        }

        .title {
            font-size: 22px;
            font-weight: 700;
            margin-top: 4px;
            color: var(--accent);
        }

        .meta {
            text-align: right;
            font-size: 12px;
            color: var(--text-muted);
        }

        .meta-row {
            margin-bottom: 4px;
        }

        .badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }

        .badge-open {
            background-color: var(--badge-open-bg);
            color: var(--badge-open-text);
        }

        .badge-default {
            background-color: var(--badge-default-bg);
            color: var(--badge-default-text);
        }

        .section {
            padding-top: 18px;
            margin-top: 18px;
            border-top: 1px solid var(--border-subtle);
        }

        .section-title {
            font-size: 12px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: var(--text-muted);
            margin-bottom: 10px;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px 24px;
            font-size: 13px;
        }

        .field-label {
            font-size: 11px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--text-muted);
            margin-bottom: 2px;
        }

        .field-value {
            font-size: 13px;
        }

        .field-value-strong {
            font-size: 14px;
            font-weight: 600;
        }

        .text-blocks {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px 24px;
            font-size: 13px;
        }

        .text-box {
            padding: 10px 0;
        }

        .text-content {
            margin-top: 4px;
            padding: 10px 12px;
            min-height: 64px;
            border-radius: 10px;
            border: 1px solid var(--border-subtle);
            background-color: #f9fafb;
            white-space: pre-wrap;
        }

        .evidence-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
        }

        .evidence-item {
            border: 1px solid var(--border-subtle);
            border-radius: 10px;
            overflow: hidden;
            background-color: #ffffff;
            font-size: 10px;
            color: var(--text-muted);
        }

        .evidence-item img {
            display: block;
            width: 100%;
            height: 105px;
            object-fit: cover;
        }

        .evidence-item div {
            padding: 6px 8px;
        }

        .signature-box {
            border: 1px solid var(--border-subtle);
            border-radius: 10px;
            background: #ffffff;
            padding: 10px;
            min-height: 118px;
        }

        .signature-image {
            display: block;
            max-width: 100%;
            max-height: 105px;
            margin: 0 auto;
        }

        .empty-evidence {
            border: 1px dashed var(--border-subtle);
            border-radius: 10px;
            padding: 14px;
            color: var(--text-muted);
            background-color: #f9fafb;
            font-size: 12px;
        }

        .footer {
            margin-top: 26px;
            font-size: 11px;
            color: var(--text-muted);
            display: flex;
            justify-content: space-between;
        }

        .footer-divider {
            height: 1px;
            background: linear-gradient(to right, transparent, var(--border-subtle), transparent);
            margin: 22px 0 12px;
        }

        @media print {
            body {
                background-color: #ffffff;
                padding: 0;
            }

            .page {
                box-shadow: none;
                border-radius: 0;
                max-width: 100%;
                padding: 20px 24px;
            }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <div>
                <div class="brand">Ingreso de vehículo</div>
                <div class="title">Comprobante de ingreso</div>
            </div>
            <div class="meta">
                <div class="meta-row">
                    <span class="badge ${orderToPrint.status === 'ABIERTA' ? 'badge-open' : 'badge-default'}">
                        ${orderToPrint.status || ''}
                    </span>
                </div>
                <div class="meta-row">
                    Ingreso: ${new Date(orderToPrint.intakeDateTime).toLocaleString()}
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Datos del cliente</div>
            <div class="grid">
                <div>
                    <div class="field-label">Nombre</div>
                    <div class="field-value-strong">${orderToPrint.customerName}</div>
                </div>
                <div>
                    <div class="field-label">Jefe de Taller</div>
                    <div class="field-value">${orderToPrint.workshopManager || ''}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Datos del vehículo</div>
            <div class="grid">
                <div>
                    <div class="field-label">Placa</div>
                    <div class="field-value-strong">${orderToPrint.plate}</div>
                </div>
                <div>
                    <div class="field-label">Marca / Modelo</div>
                    <div class="field-value">${orderToPrint.brand} ${orderToPrint.model}</div>
                </div>
                <div>
                    <div class="field-label">Año</div>
                    <div class="field-value">${orderToPrint.year}</div>
                </div>
                <div>
                    <div class="field-label">Kilometraje</div>
                    <div class="field-value">${orderToPrint.mileage}</div>
                </div>
                <div>
                    <div class="field-label">Nivel de combustible</div>
                    <div class="field-value">${orderToPrint.fuelLevel}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Detalles de ingreso</div>
            <div class="text-blocks">
                <div class="text-box">
                    <div class="field-label">Observaciones iniciales</div>
                    <div class="text-content">
                        ${orderToPrint.initialObservations || 'Sin observaciones registradas.'}
                    </div>
                </div>
                <div class="text-box">
                    <div class="field-label">Estado visual</div>
                    <div class="text-content">
                        ${orderToPrint.visualCondition || 'Sin descripción del estado visual.'}
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Evidencias fotograficas</div>
            <div class="evidence-grid">
                ${evidenceHtml}
            </div>
        </div>

        <div class="section">
            <div class="section-title">Firma de aceptacion del cliente</div>
            <div class="signature-box">
                ${signatureHtml}
            </div>
        </div>

        <div class="footer-divider"></div>
        <div class="footer">
            <div>Este documento es solo informativo para el ingreso del vehículo.</div>
            <div>Generado por el sistema de taller</div>
        </div>
    </div>
</body>
</html>`;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };

    const handlePrintThermal = (orderToPrint = lastServiceOrder) => {
        if (!orderToPrint) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const evidenceCount = Array.isArray(orderToPrint.visualEvidenceImages)
            ? orderToPrint.visualEvidenceImages.length
            : 0;
        const signatureStatus = orderToPrint.intakeCustomerSignatureDataUrl ? 'Capturada' : 'No capturada';

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Tirilla de Ingreso</title>
    <style>
        @page {
            margin: 0;
            size: 80mm auto;
        }
        body {
            font-family: 'Courier New', Courier, monospace;
            width: 80mm;
            margin: 0;
            padding: 5px;
            font-size: 12px;
            color: #000;
        }
        .header {
            text-align: center;
            margin-bottom: 10px;
        }
        .title {
            font-weight: bold;
            font-size: 14px;
            text-transform: uppercase;
        }
        .subtitle {
            font-size: 10px;
            margin-top: 5px;
        }
        .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
        }
        .label {
            font-weight: bold;
        }
        .footer {
            text-align: center;
            margin-top: 15px;
            font-size: 10px;
        }
        .text-wrap {
            white-space: pre-wrap;
            font-size: 11px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">INGRESO DE VEHICULO</div>
        <div class="subtitle">Fecha: ${new Date(orderToPrint.intakeDateTime).toLocaleString()}</div>
        <div class="subtitle">Orden #: ${orderToPrint.id || '---'}</div>
    </div>
    
    <div class="divider"></div>
    
    <div>
        <div class="label">CLIENTE:</div>
        <div>${orderToPrint.customerName}</div>
    </div>
    
    <div class="divider"></div>

    <div class="info-row">
        <span class="label">PLACA:</span>
        <span style="font-size: 14px; font-weight: bold;">${orderToPrint.plate}</span>
    </div>
    <div class="info-row">
        <span class="label">MARCA:</span>
        <span>${orderToPrint.brand}</span>
    </div>
    <div class="info-row">
        <span class="label">MODELO:</span>
        <span>${orderToPrint.model}</span>
    </div>
    <div class="info-row">
        <span class="label">AÑO:</span>
        <span>${orderToPrint.year}</span>
    </div>
    <div class="info-row">
        <span class="label">KM:</span>
        <span>${orderToPrint.mileage}</span>
    </div>
    <div class="info-row">
        <span class="label">COMB:</span>
        <span>${orderToPrint.fuelLevel}</span>
    </div>
    
    <div class="divider"></div>
    
    <div class="label">OBSERVACIONES:</div>
    <div class="text-wrap">${orderToPrint.initialObservations || 'Ninguna'}</div>
    
    <br/>
    <div class="label">ESTADO VISUAL:</div>
    <div class="text-wrap">${orderToPrint.visualCondition || 'Sin novedades'}</div>

    <div class="divider"></div>
    <div class="info-row">
        <span class="label">EVIDENCIAS:</span>
        <span>${evidenceCount}</span>
    </div>
    <div class="info-row">
        <span class="label">FIRMA:</span>
        <span>${signatureStatus}</span>
    </div>

    <div class="footer">
        <div class="divider"></div>
        <div>Recibido por: ${orderToPrint.workshopManager || 'Taller'}</div>
        <br/>
        <div>*** CONSERVE ESTE TIQUETE ***</div>
    </div>
</body>
</html>`;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    const handleSearchOrders = async () => {
        if (!orderSearch || orderSearch.trim().length < 2) {
            alert('Ingrese al menos 2 caracteres para buscar.');
            return;
        }

        setSearchingOrders(true);
        try {
            const response = await api.get(`/ServiceOrders?search=${encodeURIComponent(orderSearch.trim())}`);
            setOrderResults(response.data);
        } catch {
            alert('Error al buscar ingresos de vehículos.');
        } finally {
            setSearchingOrders(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-6 relative">
            <h1 className="text-2xl font-bold mb-4 text-slate-800">Ingreso del Vehículo</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer Search Section */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                        {!selectedCustomer ? (
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Buscar cliente..."
                                    className="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={customerSearch}
                                    onChange={(e) => {
                                        setCustomerSearch(e.target.value);
                                        setShowCustomerSearch(true);
                                    }}
                                    onFocus={() => setShowCustomerSearch(true)}
                                />
                                <Search size={16} className="absolute right-3 top-2.5 text-gray-400" />
                                
                                {/* Customer Dropdown */}
                                {showCustomerSearch && (
                                    <div className="absolute top-full left-0 right-0 bg-white shadow-xl rounded-lg mt-1 border border-gray-100 z-50 max-h-60 overflow-y-auto">
                                        {customers.length > 0 ? (
                                            customers.map(c => (
                                                <div 
                                                    key={c.id}
                                                    className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                    onClick={() => {
                                                        setSelectedCustomer(c);
                                                        setShowCustomerSearch(false);
                                                        setCustomerSearch('');
                                                    }}
                                                >
                                                    <div className="font-bold text-sm text-gray-800">{c.firstName} {c.lastName}</div>
                                                    <div className="text-xs text-gray-500">{c.taxId || 'Sin ID'}</div>
                                                </div>
                                            ))
                                        ) : (
                                            customerSearch.length > 2 && (
                                                <div className="p-3 text-sm text-gray-500 text-center">No se encontraron clientes</div>
                                            )
                                        )}
                                        
                                        <div 
                                            className="p-3 bg-blue-50 hover:bg-blue-100 cursor-pointer border-t border-gray-100 flex items-center justify-center text-blue-700 font-bold text-sm gap-2 sticky bottom-0"
                                            onClick={() => {
                                                setShowCustomerSearch(false);
                                                setShowCreateCustomerModal(true);
                                            }}
                                        >
                                            <UserPlus size={16} /> Crear Nuevo Cliente
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-blue-50 p-2 rounded-lg border border-blue-100 flex items-center justify-between h-[42px]">
                                <div>
                                    <div className="font-bold text-blue-900 text-sm">{selectedCustomer.firstName} {selectedCustomer.lastName}</div>
                                </div>
                                <button type="button" onClick={() => setSelectedCustomer(null)} className="text-red-500 hover:text-red-700 bg-white rounded-full p-1">
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Jefe de Taller</label>
                        <input
                            type="text"
                            name="workshopManager"
                            value={formData.workshopManager}
                            readOnly
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none bg-gray-50 text-gray-600"
                            placeholder="Sin jefe asignado"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
                        <input
                            type="text"
                            name="plate"
                            value={formData.plate}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                        {activeWarranties.length > 0 && (
                            <div className="mt-2 space-y-2">
                                {activeWarranties.map((w: any) => {
                                    const currentMileage = parseFloat(formData.mileage) || 0;
                                    const limits = [w.limitMileage1, w.limitMileage2, w.limitMileage3]
                                        .filter(l => l != null && l > 0)
                                        .sort((a, b) => a - b);
                                    
                                    const maxLimit = limits.length > 0 ? limits[limits.length - 1] : null;
                                    const isMileageExpired = maxLimit !== null && currentMileage > maxLimit;

                                    if (isMileageExpired) {
                                        return (
                                            <div key={w.id} className="bg-red-50 border border-red-200 rounded-lg p-2">
                                                <p className="text-xs font-bold text-red-800 flex items-center gap-1">
                                                    <X size={12} />
                                                    Garantía Expirada por Kilometraje
                                                </p>
                                                <p className="text-xs text-red-700">{w.type} - {w.description}</p>
                                                <p className="text-xs text-red-600">
                                                    Límites: {limits.join(', ')} km (Actual: {currentMileage})
                                                </p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={w.id} className="bg-green-50 border border-green-200 rounded-lg p-2">
                                            <p className="text-xs font-bold text-green-800 flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                                Garantía Activa
                                            </p>
                                            <p className="text-xs text-green-700">{w.type} - {w.description}</p>
                                            {limits.length > 0 && (
                                                <div className="text-xs text-green-600">
                                                    Límites: 
                                                    <div className="flex gap-1 flex-wrap mt-1">
                                                        {limits.map((l, idx) => {
                                                            const isPassed = currentMileage >= l;
                                                            return (
                                                                <span key={idx} className={`px-1.5 py-0.5 rounded border ${isPassed ? 'bg-gray-100 text-gray-500 border-gray-200 line-through' : 'bg-green-100 text-green-700 border-green-200'}`}>
                                                                    {l} km
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                        <input
                            type="text"
                            name="brand"
                            value={formData.brand}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                        <input
                            type="text"
                            name="model"
                            value={formData.model}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                        <input
                            type="number"
                            name="year"
                            value={formData.year || ''}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kilometraje</label>
                        <input
                            type="number"
                            name="mileage"
                            value={formData.mileage || ''}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <div className="mb-1 flex items-center justify-between gap-2">
                            <label className="block text-sm font-medium text-gray-700">Fecha y hora de ingreso</label>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, intakeDateTime: formatDateTimeLocal() }))}
                                className="text-xs font-semibold text-blue-600 transition hover:text-blue-700"
                            >
                                Usar ahora
                            </button>
                        </div>
                        <input
                            type="datetime-local"
                            name="intakeDateTime"
                            value={formData.intakeDateTime}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de combustible</label>
                        <select
                            name="fuelLevel"
                            value={formData.fuelLevel}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        >
                            <option value="">Seleccione...</option>
                            <option value="1/4">1/4</option>
                            <option value="1/2">1/2</option>
                            <option value="3/4">3/4</option>
                            <option value="Lleno">Lleno</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones iniciales</label>
                        <textarea
                            name="initialObservations"
                            value={formData.initialObservations}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-28 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Estado visual (golpes, rayones)</label>
                        <textarea
                            name="visualCondition"
                            value={formData.visualCondition}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-28 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="font-semibold text-slate-900">Evidencias del estado visual</h3>
                                <p className="text-sm text-slate-500">Toma fotografias de golpes, rayones o accesorios al recibir el vehiculo.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => evidenceInputRef.current?.click()}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
                            >
                                <Camera size={17} />
                                Tomar foto
                            </button>
                            <input
                                ref={evidenceInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                multiple
                                className="hidden"
                                onChange={handleEvidenceFiles}
                            />
                        </div>

                        {visualEvidenceImages.length > 0 ? (
                            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {visualEvidenceImages.map((image, index) => (
                                    <div key={`${image.slice(0, 40)}-${index}`} className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white">
                                        <img src={image} alt={`Evidencia ${index + 1}`} className="aspect-video w-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeEvidenceImage(index)}
                                            className="absolute right-2 top-2 rounded-full bg-white/95 p-1.5 text-red-600 shadow transition hover:bg-red-50"
                                            title="Eliminar evidencia"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm font-medium text-slate-500">
                                Sin fotografias adjuntas.
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                                <h3 className="font-semibold text-slate-900">Firma del cliente</h3>
                                <p className="text-sm text-slate-500">Acepta el ingreso y el estado visual registrado.</p>
                            </div>
                            <button
                                type="button"
                                onClick={clearSignature}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                                Limpiar
                            </button>
                        </div>
                        <canvas
                            ref={signatureCanvasRef}
                            width={700}
                            height={220}
                            onPointerDown={startSignature}
                            onPointerMove={drawSignature}
                            onPointerUp={finishSignature}
                            onPointerCancel={finishSignature}
                            className="h-44 w-full touch-none rounded-lg border border-slate-300 bg-white shadow-inner"
                        />
                        <p className={`mt-2 text-xs font-semibold ${signatureDataUrl ? 'text-emerald-600' : 'text-red-500'}`}>
                            {signatureDataUrl ? 'Firma capturada.' : 'La firma es obligatoria para guardar el ingreso.'}
                        </p>
                    </div>
                </div>

                <div className="flex justify-between items-center gap-4">
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            Guardar ingreso
                        </button>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => handlePrint(lastServiceOrder)}
                                disabled={!lastServiceOrder}
                                className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${lastServiceOrder ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                                title="Imprimir Formato Carta"
                            >
                                <Printer size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePrintThermal(lastServiceOrder)}
                                disabled={!lastServiceOrder}
                                className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${lastServiceOrder ? 'bg-slate-600 text-white hover:bg-slate-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                                title="Imprimir Tirilla"
                            >
                                <ScrollText size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            <div className="mt-8 border-t pt-6">
                <h2 className="text-lg font-semibold mb-4 text-slate-800">Buscar ingresos de vehículo</h2>
                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                    <input
                        type="text"
                        placeholder="Buscar por cliente, placa o técnico..."
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={handleSearchOrders}
                        className="px-6 py-2 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
                        disabled={searchingOrders}
                    >
                        {searchingOrders ? 'Buscando...' : 'Buscar ingresos'}
                    </button>
                </div>

                {orderResults.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha ingreso</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placa</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca/Modelo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {orderResults.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {new Date(order.intakeDateTime).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {order.plate}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {order.customerName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {order.brand} {order.model}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${order.status === 'ABIERTA' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handlePrint(order)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="Imprimir Carta"
                                                >
                                                    <Printer size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handlePrintThermal(order)}
                                                    className="text-slate-600 hover:text-slate-900"
                                                    title="Imprimir Tirilla"
                                                >
                                                    <ScrollText size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Customer Modal */}
            {showCreateCustomerModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center">
                                <UserPlus className="mr-2 text-blue-600" /> Nuevo Cliente
                            </h3>
                            <button onClick={() => setShowCreateCustomerModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Persona</label>
                                <div className="flex space-x-4 mt-2">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            value="Natural"
                                            checked={personType === 'Natural'}
                                            onChange={() => setPersonType('Natural')}
                                            className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                                        />
                                        <span className="text-gray-700">Natural</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            value="Juridica"
                                            checked={personType === 'Juridica'}
                                            onChange={() => setPersonType('Juridica')}
                                            className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                                        />
                                        <span className="text-gray-700">Jurídica</span>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Identificación</label>
                                    <select
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newCustomer.identificationType}
                                        onChange={e => setNewCustomer({ ...newCustomer, identificationType: e.target.value })}
                                    >
                                        <option value="">Seleccione...</option>
                                        {IDENTIFICATION_TYPES.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número de Identificación</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newCustomer.taxId}
                                            onChange={e => setNewCustomer({ ...newCustomer, taxId: e.target.value })}
                                            onBlur={handleCheckTaxId}
                                        />
                                        {newCustomer.identificationType.includes('NIT') && (
                                            <div className="w-20">
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border rounded-lg text-center bg-gray-50 text-gray-500 outline-none"
                                                    value={calculateNitVerificationDigit(newCustomer.taxId)}
                                                    readOnly
                                                    title="Dígito de Verificación"
                                                    placeholder="DV"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {personType === 'Juridica' ? (
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Razón Social *</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newCustomer.firstName1}
                                        onChange={e => setNewCustomer({ ...newCustomer, firstName1: e.target.value })}
                                    />
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Primer Nombre *</label>
                                            <input 
                                                type="text" 
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={newCustomer.firstName1}
                                                onChange={e => setNewCustomer({...newCustomer, firstName1: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Segundo Nombre</label>
                                            <input 
                                                type="text" 
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={newCustomer.firstName2}
                                                onChange={e => setNewCustomer({...newCustomer, firstName2: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Primer Apellido *</label>
                                            <input 
                                                type="text" 
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={newCustomer.lastName1}
                                                onChange={e => setNewCustomer({...newCustomer, lastName1: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Segundo Apellido</label>
                                            <input 
                                                type="text" 
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={newCustomer.lastName2}
                                                onChange={e => setNewCustomer({...newCustomer, lastName2: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teléfono</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newCustomer.phone}
                                        onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                    <input 
                                        type="email" 
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newCustomer.email}
                                        onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dirección</label>
                                <div className="flex gap-2">
                                    <textarea 
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20 bg-gray-50"
                                        value={newCustomer.address}
                                        readOnly
                                        placeholder="Use el generador de direcciones"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowAddressBuilder(true)}
                                        className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-2 rounded-lg border border-blue-200 transition-colors h-fit"
                                        title="Generador de Direcciones DIAN"
                                    >
                                        <MapPin size={20} />
                                    </button>
                                </div>
                                <AddressBuilder
                                    isOpen={showAddressBuilder}
                                    onClose={() => setShowAddressBuilder(false)}
                                    onConfirm={(addr) => setNewCustomer({...newCustomer, address: addr})}
                                    initialValue={newCustomer.address}
                                />
                            </div>
                        </div>

                        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                            <button 
                                onClick={() => setShowCreateCustomerModal(false)}
                                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleCreateCustomer}
                                disabled={creatingCustomer}
                                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {creatingCustomer ? 'Guardando...' : 'Guardar Cliente'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VehicleIntake;
