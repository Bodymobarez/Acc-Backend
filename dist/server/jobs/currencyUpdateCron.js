import { currencyService } from '../services/currencyService';
/**
 * Daily Currency Rate Update Cron Job
 * Runs every day at 3:00 AM Gulf Standard Time (GST/UTC+4)
 * Cron expression: '0 3 * * *' (minute hour day month weekday)
 */
let cronJob = null;
export function startCurrencyUpdateCron() {
    // DISABLED: Automatic updates disabled - only manual updates via "Update Rates Online" button
    console.log('ℹ️  Currency automatic updates DISABLED');
    console.log('   Updates will only occur when manually triggered via "Update Rates Online" button');
    // Stop existing job if running
    if (cronJob) {
        cronJob.stop();
        cronJob = null;
    }
    // DO NOT schedule cron job
    // DO NOT run initial update
}
export function stopCurrencyUpdateCron() {
    if (cronJob) {
        cronJob.stop();
        console.log('🛑 Currency update cron job stopped');
    }
}
async function runInitialUpdate() {
    // DISABLED: No automatic initial update
    console.log('ℹ️  Initial currency update DISABLED');
    console.log('   Use "Update Rates Online" button to update rates manually');
}
/**
 * Manual trigger for currency update (can be called via API)
 */
export async function triggerManualUpdate() {
    console.log('🔧 Manual currency update triggered');
    return await currencyService.updateAllRates();
}
