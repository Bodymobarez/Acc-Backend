use wasm_bindgen::prelude::*;
use rust_decimal::Decimal;
use rust_decimal::prelude::*;
use serde::{Deserialize, Serialize};

// ==================== Data Structures ====================

#[derive(Serialize, Deserialize, Debug)]
pub struct BookingInput {
    pub cost_amount: f64,
    pub sale_amount: f64,
    pub vat_rate: f64,
    pub commission_rate: f64,
    pub currency: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BookingFinancials {
    pub gross_profit: f64,
    pub vat_amount: f64,
    pub net_before_vat: f64,
    pub total_with_vat: f64,
    pub commission_amount: f64,
    pub net_profit: f64,
    pub profit_margin_percentage: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct JournalEntry {
    pub account_code: String,
    pub account_name: String,
    pub debit: f64,
    pub credit: f64,
    pub description: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct JournalEntries {
    pub entries: Vec<JournalEntry>,
    pub total_debit: f64,
    pub total_credit: f64,
    pub is_balanced: bool,
}

// ==================== Booking Calculations ====================

#[wasm_bindgen]
pub fn calculate_booking_financials(input_json: &str) -> String {
    let input: BookingInput = match serde_json::from_str(input_json) {
        Ok(val) => val,
        Err(e) => return format!("{{\"error\": \"Invalid input: {}\"}}", e),
    };

    // Convert to Decimal for precision
    let cost = Decimal::from_f64(input.cost_amount).unwrap_or(Decimal::ZERO);
    let sale = Decimal::from_f64(input.sale_amount).unwrap_or(Decimal::ZERO);
    let vat_rate = Decimal::from_f64(input.vat_rate).unwrap_or(Decimal::ZERO);
    let commission_rate = Decimal::from_f64(input.commission_rate).unwrap_or(Decimal::ZERO);

    // Calculate gross profit
    let gross_profit = sale - cost;

    // Calculate VAT (assuming VAT is included in sale price)
    let vat_divisor = Decimal::ONE + (vat_rate / Decimal::from(100));
    let net_before_vat = sale / vat_divisor;
    let vat_amount = sale - net_before_vat;
    let total_with_vat = sale;

    // Calculate commission (based on gross profit)
    let commission_amount = gross_profit * (commission_rate / Decimal::from(100));

    // Calculate net profit
    let net_profit = gross_profit - commission_amount;

    // Calculate profit margin percentage
    let profit_margin = if sale > Decimal::ZERO {
        (net_profit / sale) * Decimal::from(100)
    } else {
        Decimal::ZERO
    };

    let result = BookingFinancials {
        gross_profit: gross_profit.to_f64().unwrap_or(0.0),
        vat_amount: vat_amount.to_f64().unwrap_or(0.0),
        net_before_vat: net_before_vat.to_f64().unwrap_or(0.0),
        total_with_vat: total_with_vat.to_f64().unwrap_or(0.0),
        commission_amount: commission_amount.to_f64().unwrap_or(0.0),
        net_profit: net_profit.to_f64().unwrap_or(0.0),
        profit_margin_percentage: profit_margin.to_f64().unwrap_or(0.0),
    };

    serde_json::to_string(&result).unwrap_or_else(|_| "{}".to_string())
}

// ==================== Journal Entry Generation ====================

#[wasm_bindgen]
pub fn generate_journal_entries_for_booking(input_json: &str) -> String {
    let input: BookingInput = match serde_json::from_str(input_json) {
        Ok(val) => val,
        Err(e) => return format!("{{\"error\": \"Invalid input: {}\"}}", e),
    };

    let cost = Decimal::from_f64(input.cost_amount).unwrap_or(Decimal::ZERO);
    let sale = Decimal::from_f64(input.sale_amount).unwrap_or(Decimal::ZERO);
    let vat_rate = Decimal::from_f64(input.vat_rate).unwrap_or(Decimal::ZERO);

    // Calculate VAT
    let vat_divisor = Decimal::ONE + (vat_rate / Decimal::from(100));
    let net_before_vat = sale / vat_divisor;
    let vat_amount = sale - net_before_vat;

    let mut entries = Vec::new();

    // Entry 1: Debit Customer Account (Receivable)
    entries.push(JournalEntry {
        account_code: "1201".to_string(),
        account_name: "Accounts Receivable - Customers".to_string(),
        debit: sale.to_f64().unwrap_or(0.0),
        credit: 0.0,
        description: "Customer invoice for booking".to_string(),
    });

    // Entry 2: Credit Revenue Account
    entries.push(JournalEntry {
        account_code: "4101".to_string(),
        account_name: "Sales Revenue - Tourism Services".to_string(),
        debit: 0.0,
        credit: net_before_vat.to_f64().unwrap_or(0.0),
        description: "Revenue from booking (net of VAT)".to_string(),
    });

    // Entry 3: Credit VAT Payable
    entries.push(JournalEntry {
        account_code: "2301".to_string(),
        account_name: "VAT Payable".to_string(),
        debit: 0.0,
        credit: vat_amount.to_f64().unwrap_or(0.0),
        description: "VAT collected on sale".to_string(),
    });

    // Entry 4: Debit Cost of Sales
    entries.push(JournalEntry {
        account_code: "5101".to_string(),
        account_name: "Cost of Sales - Tourism Services".to_string(),
        debit: cost.to_f64().unwrap_or(0.0),
        credit: 0.0,
        description: "Cost paid to supplier".to_string(),
    });

    // Entry 5: Credit Accounts Payable (Supplier)
    entries.push(JournalEntry {
        account_code: "2101".to_string(),
        account_name: "Accounts Payable - Suppliers".to_string(),
        debit: 0.0,
        credit: cost.to_f64().unwrap_or(0.0),
        description: "Amount due to supplier".to_string(),
    });

    // Calculate totals
    let total_debit: f64 = entries.iter().map(|e| e.debit).sum();
    let total_credit: f64 = entries.iter().map(|e| e.credit).sum();
    let is_balanced = (total_debit - total_credit).abs() < 0.01; // Allow small rounding difference

    let result = JournalEntries {
        entries,
        total_debit,
        total_credit,
        is_balanced,
    };

    serde_json::to_string(&result).unwrap_or_else(|_| "{}".to_string())
}

// ==================== Batch Calculations ====================

#[derive(Serialize, Deserialize, Debug)]
pub struct BatchBookingInput {
    pub bookings: Vec<BookingInput>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BatchBookingResult {
    pub results: Vec<BookingFinancials>,
    pub summary: BatchSummary,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BatchSummary {
    pub total_cost: f64,
    pub total_revenue: f64,
    pub total_profit: f64,
    pub total_vat: f64,
    pub total_commission: f64,
    pub average_profit_margin: f64,
    pub booking_count: usize,
}

#[wasm_bindgen]
pub fn calculate_batch_bookings(input_json: &str) -> String {
    let input: BatchBookingInput = match serde_json::from_str(input_json) {
        Ok(val) => val,
        Err(e) => return format!("{{\"error\": \"Invalid input: {}\"}}", e),
    };

    let mut results = Vec::new();
    let mut total_cost = Decimal::ZERO;
    let mut total_revenue = Decimal::ZERO;
    let mut total_profit = Decimal::ZERO;
    let mut total_vat = Decimal::ZERO;
    let mut total_commission = Decimal::ZERO;

    for booking in &input.bookings {
        let result_json = calculate_booking_financials(&serde_json::to_string(booking).unwrap());
        if let Ok(result) = serde_json::from_str::<BookingFinancials>(&result_json) {
            total_cost += Decimal::from_f64(booking.cost_amount).unwrap_or(Decimal::ZERO);
            total_revenue += Decimal::from_f64(booking.sale_amount).unwrap_or(Decimal::ZERO);
            total_profit += Decimal::from_f64(result.net_profit).unwrap_or(Decimal::ZERO);
            total_vat += Decimal::from_f64(result.vat_amount).unwrap_or(Decimal::ZERO);
            total_commission += Decimal::from_f64(result.commission_amount).unwrap_or(Decimal::ZERO);
            
            results.push(result);
        }
    }

    let average_profit_margin = if total_revenue > Decimal::ZERO {
        (total_profit / total_revenue) * Decimal::from(100)
    } else {
        Decimal::ZERO
    };

    let summary = BatchSummary {
        total_cost: total_cost.to_f64().unwrap_or(0.0),
        total_revenue: total_revenue.to_f64().unwrap_or(0.0),
        total_profit: total_profit.to_f64().unwrap_or(0.0),
        total_vat: total_vat.to_f64().unwrap_or(0.0),
        total_commission: total_commission.to_f64().unwrap_or(0.0),
        average_profit_margin: average_profit_margin.to_f64().unwrap_or(0.0),
        booking_count: input.bookings.len(),
    };

    let result = BatchBookingResult { results, summary };

    serde_json::to_string(&result).unwrap_or_else(|_| "{}".to_string())
}

// ==================== Unit Tests ====================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_booking_financials() {
        let input = BookingInput {
            cost_amount: 1000.0,
            sale_amount: 1500.0,
            vat_rate: 5.0,
            commission_rate: 10.0,
            currency: "USD".to_string(),
        };

        let input_json = serde_json::to_string(&input).unwrap();
        let result_json = calculate_booking_financials(&input_json);
        let result: BookingFinancials = serde_json::from_str(&result_json).unwrap();

        assert!(result.gross_profit > 0.0);
        assert!(result.vat_amount > 0.0);
        assert!(result.commission_amount > 0.0);
        assert!(result.net_profit > 0.0);
    }

    #[test]
    fn test_journal_entries_balanced() {
        let input = BookingInput {
            cost_amount: 1000.0,
            sale_amount: 1500.0,
            vat_rate: 5.0,
            commission_rate: 10.0,
            currency: "USD".to_string(),
        };

        let input_json = serde_json::to_string(&input).unwrap();
        let result_json = generate_journal_entries_for_booking(&input_json);
        let result: JournalEntries = serde_json::from_str(&result_json).unwrap();

        assert!(result.is_balanced);
        assert_eq!(result.total_debit, result.total_credit);
    }
}
