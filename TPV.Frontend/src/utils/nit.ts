export const calculateNitVerificationDigit = (nit: string): string => {
    // Remove any non-numeric characters
    const cleanNit = nit.replace(/\D/g, '');
    
    if (!cleanNit) return '';
    
    // Limits for Colombian NIT usually around 15 digits, but array covers it.
    const primes = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
    let sum = 0;
    
    // Reverse to match weights from right to left
    const reversedNit = cleanNit.split('').reverse().join('');
    
    for (let i = 0; i < reversedNit.length; i++) {
        // If NIT is longer than primes array (unlikely), break or handle
        if (i >= primes.length) break;
        sum += parseInt(reversedNit[i]) * primes[i];
    }
    
    const remainder = sum % 11;
    
    if (remainder <= 1) {
        return remainder.toString();
    } else {
        return (11 - remainder).toString();
    }
};
