#!/bin/bash

# This script creates simple wrapper routes for remaining controllers

routes=(
  "employeeRoutes:employees"
  "accountRoutes:accounts"
  "assignmentRoutes:assignments"
  "placesRoutes:places"
  "receiptRoutes:receipts"
  "journalRoutes:journalEntries"
  "systemSettingsRoutes:systemSettings"
  "relationshipRoutes:relationships"
  "commissionRoutes:commissions"
  "customerAssignmentRoutes:customerAssignments"
  "airlineRoutes:airlines"
  "migrationRoutes:migrations"
  "reportRoutes:reports"
  "advancedReportRoutes:advancedReports"
  "notificationRoutes:notifications"
  "employeeCommissionRoutes:employeeCommissions"
  "bankAccountRoutes:bankAccounts"
)

echo "Routes to create: ${#routes[@]}"
