import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
class SettingsService {
    // Company Settings Methods
    async getCompanySettings() {
        const settings = await prisma.company_settings.findFirst();
        // If no settings exist, create default
        if (!settings) {
            return await prisma.company_settings.create({
                data: {
                    id: randomUUID(),
                    companyName: 'Tourism Accounting System',
                    companyNameArabic: 'نظام المحاسبة السياحية',
                    addressLine1: 'Dubai, UAE',
                    city: 'Dubai',
                    country: 'United Arab Emirates',
                    phone: '+971 XX XXX XXXX',
                    email: 'info@company.com',
                    defaultCurrency: 'AED',
                    vatRate: 5.0,
                    vatEnabled: true,
                    invoicePrefix: 'INV',
                    filePrefix: 'FILE',
                    updatedAt: new Date()
                },
            });
        }
        return settings;
    }
    async updateCompanySettings(id, data) {
        return await prisma.company_settings.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
    }
    // System Settings Methods
    async getAllSystemSettings() {
        return await prisma.system_settings.findMany({
            orderBy: {
                key: 'asc',
            },
        });
    }
    async getSystemSetting(key) {
        const setting = await prisma.system_settings.findUnique({
            where: { key },
        });
        return setting;
    }
    async upsertSystemSetting(data) {
        return await prisma.system_settings.upsert({
            where: { key: data.key },
            create: {
                id: randomUUID(),
                key: data.key,
                value: data.value,
                description: data.description,
                updatedAt: new Date()
            },
            update: {
                value: data.value,
                description: data.description,
                updatedAt: new Date(),
            },
        });
    }
    async deleteSystemSetting(key) {
        return await prisma.system_settings.delete({
            where: { key },
        });
    }
    // Print Settings (stored in system settings as JSON)
    async getPrintSettings() {
        const setting = await this.getSystemSetting('print_settings');
        if (!setting) {
            return {
                logoPath: null,
                sealPath: null,
            };
        }
        try {
            return JSON.parse(setting.value);
        }
        catch (e) {
            return {
                logoPath: null,
                sealPath: null,
            };
        }
    }
    async updatePrintSettings(data) {
        return await this.upsertSystemSetting({
            key: 'print_settings',
            value: JSON.stringify(data),
            description: 'Print settings for invoices and documents',
        });
    }
}
export const settingsService = new SettingsService();
