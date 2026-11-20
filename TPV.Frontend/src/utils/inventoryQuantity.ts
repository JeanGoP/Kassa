const quantityFormat = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 4 });

export function inventoryUnitLabel(unitCode: string | null | undefined) {
    const code = unitCode?.trim();
    return code?.toUpperCase() === 'ML' ? 'mL' : code || 'unidad sin registrar';
}

export function formatInventoryQuantity(quantity: number, unitCode: string | null | undefined) {
    return `${quantityFormat.format(quantity)} ${inventoryUnitLabel(unitCode)}`;
}
