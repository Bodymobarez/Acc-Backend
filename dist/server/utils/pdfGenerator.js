import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
/**
 * Generate Invoice PDF
 */
export async function generateInvoicePDF(invoice, companySettings, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);
            // Header
            doc.fontSize(20).font('Helvetica-Bold').text(companySettings.companyName, { align: 'center' });
            if (companySettings.companyNameArabic) {
                doc.fontSize(16).text(companySettings.companyNameArabic, { align: 'center' });
            }
            doc.fontSize(10).font('Helvetica')
                .text(companySettings.addressLine1, { align: 'center' })
                .text(`${companySettings.city}, ${companySettings.country}`, { align: 'center' })
                .text(`Phone: ${companySettings.phone} | Email: ${companySettings.email}`, { align: 'center' });
            if (companySettings.taxRegistrationNo) {
                doc.text(`TRN: ${companySettings.taxRegistrationNo}`, { align: 'center' });
            }
            doc.moveDown(2);
            // Invoice Title
            doc.fontSize(24).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
            doc.moveDown(1);
            // Invoice Details
            const leftColumn = 50;
            const rightColumn = 350;
            let yPosition = doc.y;
            doc.fontSize(10).font('Helvetica-Bold').text('Invoice Number:', leftColumn, yPosition);
            doc.font('Helvetica').text(invoice.invoiceNumber, leftColumn + 100, yPosition);
            doc.font('Helvetica-Bold').text('Invoice Date:', rightColumn, yPosition);
            doc.font('Helvetica').text(new Date(invoice.invoiceDate).toLocaleDateString(), rightColumn + 80, yPosition);
            yPosition += 20;
            doc.font('Helvetica-Bold').text('Booking Number:', leftColumn, yPosition);
            doc.font('Helvetica').text(invoice.booking.bookingNumber, leftColumn + 100, yPosition);
            if (invoice.dueDate) {
                doc.font('Helvetica-Bold').text('Due Date:', rightColumn, yPosition);
                doc.font('Helvetica').text(new Date(invoice.dueDate).toLocaleDateString(), rightColumn + 80, yPosition);
            }
            doc.moveDown(2);
            // Customer Details
            doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', leftColumn);
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica');
            const customer = invoice.customer;
            if (customer.type === 'CORPORATE' && customer.companyName) {
                doc.text(customer.companyName);
            }
            doc.text(`${customer.firstName} ${customer.lastName}`);
            doc.text(customer.addressLine1);
            if (customer.addressLine2)
                doc.text(customer.addressLine2);
            doc.text(`${customer.city}, ${customer.country}`);
            doc.text(`Phone: ${customer.phone}`);
            doc.text(`Email: ${customer.email}`);
            if (customer.taxNumber)
                doc.text(`TRN: ${customer.taxNumber}`);
            doc.moveDown(2);
            // Service Details Table
            const tableTop = doc.y;
            const tableHeaders = ['Service Type', 'Description', 'Amount'];
            const tableWidths = [150, 250, 100];
            let currentX = leftColumn;
            // Table Header
            doc.fontSize(10).font('Helvetica-Bold');
            tableHeaders.forEach((header, i) => {
                doc.text(header, currentX, tableTop, { width: tableWidths[i] });
                currentX += tableWidths[i];
            });
            // Table Border
            doc.moveTo(leftColumn, tableTop + 15).lineTo(leftColumn + 500, tableTop + 15).stroke();
            // Table Content
            currentX = leftColumn;
            const contentTop = tableTop + 20;
            doc.fontSize(10).font('Helvetica');
            const booking = invoice.booking;
            doc.text(booking.serviceType, leftColumn, contentTop, { width: tableWidths[0] });
            // Service description based on type
            let description = `Booking ${booking.bookingNumber}`;
            if (booking.travelDate) {
                description += `\nTravel Date: ${new Date(booking.travelDate).toLocaleDateString()}`;
            }
            doc.text(description, leftColumn + tableWidths[0], contentTop, { width: tableWidths[1] });
            doc.text(`${invoice.currency} ${invoice.subtotal.toFixed(2)}`, leftColumn + tableWidths[0] + tableWidths[1], contentTop, { width: tableWidths[2], align: 'right' });
            doc.moveDown(4);
            // Totals
            const totalsX = 400;
            let totalsY = doc.y;
            doc.fontSize(10).font('Helvetica');
            doc.text('Subtotal:', totalsX, totalsY);
            doc.text(`${invoice.currency} ${invoice.subtotal.toFixed(2)}`, totalsX + 100, totalsY, { align: 'right' });
            totalsY += 20;
            doc.text(`VAT (${companySettings.vatRate}%):`, totalsX, totalsY);
            doc.text(`${invoice.currency} ${invoice.vatAmount.toFixed(2)}`, totalsX + 100, totalsY, { align: 'right' });
            totalsY += 20;
            doc.fontSize(12).font('Helvetica-Bold');
            doc.text('Total Amount:', totalsX, totalsY);
            doc.text(`${invoice.currency} ${invoice.totalAmount.toFixed(2)}`, totalsX + 100, totalsY, { align: 'right' });
            doc.moveDown(3);
            // Notes
            if (invoice.notes) {
                doc.fontSize(10).font('Helvetica-Bold').text('Notes:');
                doc.font('Helvetica').text(invoice.notes);
                doc.moveDown(1);
            }
            // Terms & Conditions
            if (invoice.termsConditions) {
                doc.fontSize(10).font('Helvetica-Bold').text('Terms & Conditions:');
                doc.fontSize(8).font('Helvetica').text(invoice.termsConditions);
            }
            // Footer
            if (companySettings.invoiceFooter) {
                doc.fontSize(8).font('Helvetica')
                    .text(companySettings.invoiceFooter, 50, 700, { align: 'center' });
            }
            doc.end();
            stream.on('finish', () => {
                resolve(outputPath);
            });
            stream.on('error', (error) => {
                reject(error);
            });
        }
        catch (error) {
            reject(error);
        }
    });
}
/**
 * Generate File PDF
 */
export async function generateFilePDF(file, companySettings, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);
            const fileData = file.fileData;
            // Header
            doc.fontSize(20).font('Helvetica-Bold').text(companySettings.companyName, { align: 'center' });
            doc.fontSize(10).font('Helvetica').text(companySettings.addressLine1, { align: 'center' });
            doc.moveDown(2);
            // File Title
            doc.fontSize(20).font('Helvetica-Bold').text('BOOKING FILE', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(14).text(`File Number: ${file.fileNumber}`, { align: 'center' });
            doc.moveDown(2);
            // Booking Information
            doc.fontSize(12).font('Helvetica-Bold').text('Booking Information');
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica');
            doc.text(`Booking Number: ${fileData.bookingNumber}`);
            doc.text(`Service Type: ${fileData.serviceType}`);
            doc.text(`Booking Date: ${new Date(fileData.bookingDate).toLocaleDateString()}`);
            if (fileData.travelDate) {
                doc.text(`Travel Date: ${new Date(fileData.travelDate).toLocaleDateString()}`);
            }
            doc.moveDown(1);
            // Customer Information
            doc.fontSize(12).font('Helvetica-Bold').text('Customer Information');
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica');
            doc.text(`Customer Code: ${fileData.customer.code}`);
            doc.text(`Name: ${fileData.customer.name}`);
            doc.text(`Email: ${fileData.customer.email}`);
            doc.text(`Phone: ${fileData.customer.phone}`);
            doc.text(`Address: ${fileData.customer.address.line1}, ${fileData.customer.address.city}, ${fileData.customer.address.country}`);
            doc.moveDown(1);
            // Supplier Information
            doc.fontSize(12).font('Helvetica-Bold').text('Supplier Information');
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica');
            doc.text(`Supplier Code: ${fileData.supplier.code}`);
            doc.text(`Name: ${fileData.supplier.name}`);
            doc.text(`Contact: ${fileData.supplier.contact}`);
            doc.text(`Email: ${fileData.supplier.email}`);
            doc.text(`Phone: ${fileData.supplier.phone}`);
            doc.moveDown(1);
            // Financial Information
            doc.fontSize(12).font('Helvetica-Bold').text('Financial Summary');
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica');
            doc.text(`Cost Amount: ${fileData.financial.costCurrency} ${fileData.financial.costAmount.toFixed(2)} (AED ${fileData.financial.costInAED.toFixed(2)})`);
            doc.text(`Sale Amount: ${fileData.financial.saleCurrency} ${fileData.financial.saleAmount.toFixed(2)} (AED ${fileData.financial.saleInAED.toFixed(2)})`);
            doc.text(`Gross Profit: AED ${fileData.financial.grossProfit.toFixed(2)}`);
            doc.text(`Net Profit: AED ${fileData.financial.netProfit.toFixed(2)}`);
            if (fileData.financial.vatAmount > 0) {
                doc.text(`VAT Amount: AED ${fileData.financial.vatAmount.toFixed(2)}`);
                doc.text(`Total with VAT: AED ${fileData.financial.totalWithVAT.toFixed(2)}`);
            }
            doc.moveDown(1);
            // Commission Information
            if (fileData.commissions.total > 0) {
                doc.fontSize(12).font('Helvetica-Bold').text('Commission Details');
                doc.moveDown(0.5);
                doc.fontSize(10).font('Helvetica');
                if (fileData.commissions.bookingAgent) {
                    doc.text(`Booking Agent: ${fileData.commissions.bookingAgent.name}`);
                    doc.text(`  Rate: ${fileData.commissions.bookingAgent.rate}% | Amount: AED ${fileData.commissions.bookingAgent.amount.toFixed(2)}`);
                }
                if (fileData.commissions.customerService) {
                    doc.text(`Customer Service: ${fileData.commissions.customerService.name}`);
                    doc.text(`  Rate: ${fileData.commissions.customerService.rate}% | Amount: AED ${fileData.commissions.customerService.amount.toFixed(2)}`);
                }
                doc.text(`Total Commission: AED ${fileData.commissions.total.toFixed(2)}`, { underline: true });
                doc.moveDown(1);
            }
            // Service Details
            doc.fontSize(12).font('Helvetica-Bold').text('Service Details');
            doc.moveDown(0.5);
            doc.fontSize(9).font('Helvetica');
            doc.text(JSON.stringify(fileData.serviceDetails, null, 2));
            doc.end();
            stream.on('finish', () => {
                resolve(outputPath);
            });
            stream.on('error', (error) => {
                reject(error);
            });
        }
        catch (error) {
            reject(error);
        }
    });
}
/**
 * Ensure upload directory exists
 * Skipped on serverless platforms (Netlify/Vercel)
 */
export function ensureUploadDir() {
    // Skip on serverless platforms
    if (process.env.NETLIFY || process.env.VERCEL) {
        console.log('⏭️  Skipping upload directory creation on serverless platform');
        return;
    }
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const pdfDir = path.join(uploadDir, 'pdfs');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
    }
}
