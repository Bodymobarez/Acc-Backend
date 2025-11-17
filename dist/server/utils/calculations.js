/**
 * Calculate VAT for UAE bookings
 * UAE Booking: VAT extracted from total (reverse calculation)
 * Formula: Net Before VAT = Sale Amount / 1.05
 *          VAT Amount = Sale Amount - Net Before VAT
 *          Gross Profit = Net Before VAT - Cost Amount
 * Note: VAT calculation on profit happens AFTER commission deduction
 *
 * Special Case for FLIGHT bookings: VAT is ONLY 5% on net profit (not extracted from total)
 */
export function calculateVATForUAE(saleAmount, costAmount, vatRate = 5.0, serviceType) {
    // Special handling for FLIGHT bookings - VAT only on net profit
    if (serviceType === 'FLIGHT') {
        const grossProfit = saleAmount - costAmount;
        // VAT will be calculated later on net profit (after commissions)
        // For now, we set it to 0 and calculate it after commission deduction
        return {
            isUAEBooking: true,
            saleAmount,
            costAmount,
            netBeforeVAT: saleAmount,
            vatAmount: 0, // Will be calculated later on net profit
            totalWithVAT: saleAmount,
            grossProfit: parseFloat(grossProfit.toFixed(2)),
            netProfit: parseFloat(grossProfit.toFixed(2))
        };
    }
    // Normal UAE booking calculation (non-flight)
    const divisor = 1 + (vatRate / 100);
    const netBeforeVAT = saleAmount / divisor;
    const vatAmount = saleAmount - netBeforeVAT;
    const totalWithVAT = saleAmount;
    const grossProfit = netBeforeVAT - costAmount; // Profit from net amount (BEFORE commissions)
    const netProfit = grossProfit; // Will be recalculated after commissions
    return {
        isUAEBooking: true,
        saleAmount,
        costAmount,
        netBeforeVAT: parseFloat(netBeforeVAT.toFixed(2)),
        vatAmount: parseFloat(vatAmount.toFixed(2)),
        totalWithVAT: parseFloat(totalWithVAT.toFixed(2)),
        grossProfit: parseFloat(grossProfit.toFixed(2)),
        netProfit: parseFloat(netProfit.toFixed(2))
    };
}
/**
 * Calculate VAT for VAT Applicable ONLY (not UAE)
 * VAT = 5% of Net Profit (calculated after commissions)
 * Formula: Gross Profit = Sale Amount - Cost Amount
 *          (Commissions calculated from Gross Profit - done separately)
 *          VAT Amount = Profit After Commissions × 5%
 *          Total With VAT = Sale Amount + VAT Amount
 * Note: This function calculates gross profit; VAT on profit happens AFTER commission deduction
 */
export function calculateVATForNonUAE(saleAmount, costAmount, vatRate = 5.0) {
    const grossProfit = saleAmount - costAmount; // Profit BEFORE commissions
    const vatAmount = (grossProfit * vatRate) / 100; // Placeholder - will be recalculated after commissions
    const netBeforeVAT = saleAmount; // Sale amount is net
    const totalWithVAT = saleAmount + vatAmount; // Add VAT to sale
    const netProfit = grossProfit; // Will be recalculated after commissions
    return {
        isUAEBooking: false,
        saleAmount,
        costAmount,
        netBeforeVAT: parseFloat(netBeforeVAT.toFixed(2)),
        vatAmount: parseFloat(vatAmount.toFixed(2)),
        totalWithVAT: parseFloat(totalWithVAT.toFixed(2)),
        grossProfit: parseFloat(grossProfit.toFixed(2)),
        netProfit: parseFloat(netProfit.toFixed(2))
    };
}
/**
 * Main VAT calculation function
 */
export function calculateVAT(saleAmount, costAmount, isUAEBooking, vatRate = 5.0, serviceType) {
    if (isUAEBooking) {
        return calculateVATForUAE(saleAmount, costAmount, vatRate, serviceType);
    }
    else {
        return calculateVATForNonUAE(saleAmount, costAmount, vatRate);
    }
}
/**
 * Calculate VAT on profit after commissions
 * This is the correct VAT calculation: VAT should be on NET PROFIT (after commission deduction)
 */
export function calculateVATOnProfit(profitAfterCommission, vatRate = 5.0) {
    return parseFloat(((profitAfterCommission * vatRate) / 100).toFixed(2));
}
/**
 * Calculate commissions for booking agent and sales agent
 * CRITICAL: Commissions are calculated from GROSS PROFIT (before VAT deduction)
 * Formula:
 *   1. Gross Profit = Sale Amount - Cost Amount
 *   2. Booking Agent Commission = Gross Profit × Agent Rate%
 *   3. Sales Agent Commission = Gross Profit × Sales Rate%
 *   4. Total Commission = Booking Agent Commission + Sales Agent Commission
 *   5. Profit After Commission = Gross Profit - Total Commission
 *   6. VAT = Profit After Commission × 5% (calculated separately)
 *   7. Net Profit = Profit After Commission - VAT
 */
export function calculateCommissions(grossProfit, // Changed from netProfit to grossProfit
agentCommissionRate = 0, csCommissionRate = 0) {
    const agentCommissionAmount = (grossProfit * agentCommissionRate) / 100;
    const csCommissionAmount = (grossProfit * csCommissionRate) / 100;
    const totalCommission = agentCommissionAmount + csCommissionAmount;
    const profitAfterCommission = grossProfit - totalCommission;
    return {
        netProfit: parseFloat(grossProfit.toFixed(2)), // Kept for compatibility - represents gross profit
        agentCommissionRate,
        agentCommissionAmount: parseFloat(agentCommissionAmount.toFixed(2)),
        csCommissionRate,
        csCommissionAmount: parseFloat(csCommissionAmount.toFixed(2)),
        totalCommission: parseFloat(totalCommission.toFixed(2)),
        profitAfterCommission: parseFloat(profitAfterCommission.toFixed(2))
    };
}
/**
 * Convert amount from one currency to AED using exchange rate
 */
export function convertToAED(amount, exchangeRate) {
    return parseFloat((amount * exchangeRate).toFixed(2));
}
/**
 * Generate booking number with prefix and sequence
 */
export function generateBookingNumber(prefix = 'BKG', sequence) {
    const paddedSequence = sequence.toString().padStart(6, '0');
    const year = new Date().getFullYear();
    return `${prefix}-${year}-${paddedSequence}`;
}
/**
 * Generate invoice number with prefix and sequence
 */
export function generateInvoiceNumber(prefix = 'INV', sequence) {
    const paddedSequence = sequence.toString().padStart(6, '0');
    const year = new Date().getFullYear();
    return `${prefix}-${year}-${paddedSequence}`;
}
/**
 * Generate file number with prefix and sequence
 */
export function generateFileNumber(prefix = 'FILE', sequence) {
    const paddedSequence = sequence.toString().padStart(6, '0');
    const year = new Date().getFullYear();
    return `${prefix}-${year}-${paddedSequence}`;
}
