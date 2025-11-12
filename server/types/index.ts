import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  permissions: Record<string, boolean>;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

// Service-Specific Details Types

export interface FlightDetails {
  // Booking Information
  pnr: string;
  airline: string;
  flightNumber: string;
  bookingClass: string;
  
  // Departure
  departureAirport: string;
  departureDate: string;
  departureTime: string;
  
  // Arrival
  arrivalAirport: string;
  arrivalDate: string;
  arrivalTime: string;
  
  // Passenger Details
  passengers: Array<{
    title: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    passportNumber: string;
    nationality: string;
    ticketNumber?: string;
  }>;
  
  // Additional
  baggage: string;
  mealPreference?: string;
  seatNumbers?: string;
  notes?: string;
}

export interface HotelDetails {
  // Booking Information
  confirmationNumber: string;
  hotelName: string;
  hotelAddress: string;
  city: string;
  country: string;
  
  // Room Details
  roomType: string;
  numberOfRooms: number;
  mealPlan: string; // BB, HB, FB, AI
  
  // Dates
  checkInDate: string;
  checkOutDate: string;
  numberOfNights: number;
  
  // Guest Details
  guests: Array<{
    title: string;
    firstName: string;
    lastName: string;
    age?: number;
  }>;
  
  // Additional
  specialRequests?: string;
  notes?: string;
}

export interface TransferDetails {
  // Booking Information
  confirmationNumber: string;
  transferType: 'AIRPORT_TO_HOTEL' | 'HOTEL_TO_AIRPORT' | 'POINT_TO_POINT' | 'HOURLY';
  vehicleType: string;
  
  // Pickup
  pickupLocation: string;
  pickupDate: string;
  pickupTime: string;
  
  // Dropoff
  dropoffLocation: string;
  dropoffDate?: string;
  dropoffTime?: string;
  
  // Details
  numberOfPassengers: number;
  numberOfLuggage: number;
  flightNumber?: string;
  
  // Additional
  driverName?: string;
  vehicleNumber?: string;
  specialRequests?: string;
  notes?: string;
}

export interface RentCarDetails {
  // Booking Information
  confirmationNumber: string;
  rentalCompany: string;
  
  // Vehicle
  vehicleType: string;
  vehicleMake?: string;
  vehicleModel?: string;
  transmissionType: 'AUTOMATIC' | 'MANUAL';
  
  // Rental Period
  pickupDate: string;
  pickupTime: string;
  pickupLocation: string;
  
  returnDate: string;
  returnTime: string;
  returnLocation: string;
  
  numberOfDays: number;
  
  // Driver Details
  driverName: string;
  driverLicenseNumber: string;
  driverDateOfBirth: string;
  driverNationality: string;
  
  // Insurance & Extras
  insuranceType?: string;
  fuelPolicy: string;
  mileageLimit?: string;
  additionalDrivers?: number;
  gps?: boolean;
  childSeat?: boolean;
  
  // Additional
  notes?: string;
}

export interface VisaDetails {
  // Booking Information
  confirmationNumber: string;
  visaType: string; // Tourist, Business, Transit, etc.
  visaDuration: string; // 30 days, 90 days, etc.
  entryType: 'SINGLE' | 'MULTIPLE';
  
  // Processing
  processingType: 'NORMAL' | 'EXPRESS' | 'URGENT';
  applicationDate: string;
  expectedIssuanceDate?: string;
  actualIssuanceDate?: string;
  visaNumber?: string;
  
  // Applicant Details
  applicants: Array<{
    title: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    passportNumber: string;
    passportIssueDate: string;
    passportExpiryDate: string;
    occupation?: string;
  }>;
  
  // Destination
  destinationCountry: string;
  purposeOfVisit: string;
  
  // Additional
  notes?: string;
}

export interface TrainDetails {
  // Booking Information
  pnr: string;
  trainOperator: string;
  trainNumber: string;
  trainName?: string;
  class: string;
  
  // Departure
  departureStation: string;
  departureDate: string;
  departureTime: string;
  
  // Arrival
  arrivalStation: string;
  arrivalDate: string;
  arrivalTime: string;
  
  // Passenger Details
  passengers: Array<{
    title: string;
    firstName: string;
    lastName: string;
    age?: number;
    seatNumber?: string;
    berthNumber?: string;
    ticketNumber?: string;
  }>;
  
  // Additional
  mealIncluded?: boolean;
  notes?: string;
}

export interface CruiseDetails {
  // Booking Information
  confirmationNumber: string;
  cruiseLine: string;
  shipName: string;
  cruiseDuration: string;
  
  // Itinerary
  embarkationPort: string;
  embarkationDate: string;
  disembarkationPort: string;
  disembarkationDate: string;
  
  portsOfCall: Array<{
    port: string;
    arrivalDate: string;
    departureDate: string;
  }>;
  
  // Cabin Details
  cabinType: string;
  cabinNumber?: string;
  deckNumber?: string;
  cabinOccupancy: number;
  
  // Passenger Details
  passengers: Array<{
    title: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    passportNumber: string;
    nationality: string;
  }>;
  
  // Package Details
  mealPlan: string;
  drinksPackage?: string;
  excursions?: Array<{
    port: string;
    excursionName: string;
    date: string;
  }>;
  
  // Additional
  specialRequests?: string;
  notes?: string;
}

export type ServiceDetails = 
  | FlightDetails 
  | HotelDetails 
  | TransferDetails 
  | RentCarDetails 
  | VisaDetails 
  | TrainDetails 
  | CruiseDetails;

// VAT Calculation
export interface VATCalculation {
  isUAEBooking: boolean;
  saleAmount: number;
  costAmount: number;
  netBeforeVAT: number;
  vatAmount: number;
  totalWithVAT: number;
  grossProfit: number;
  netProfit: number;
}

// Commission Calculation
export interface CommissionCalculation {
  netProfit: number;
  agentCommissionRate: number;
  agentCommissionAmount: number;
  csCommissionRate: number;
  csCommissionAmount: number;
  totalCommission: number;
  profitAfterCommission: number;
}

// Multi-Supplier Booking Item
export interface BookingSupplierItem {
  supplierId: string;
  serviceType: string;
  costAmount: number;
  costCurrency: string;
  description?: string;
}

// Permissions Structure
export interface UserPermissions {
  // Dashboard
  viewDashboard: boolean;
  
  // Bookings
  viewBookings: boolean;
  createBooking: boolean;
  editBooking: boolean;
  deleteBooking: boolean;
  reviewBooking: boolean; // For accountants
  
  // Customers
  viewCustomers: boolean;
  createCustomer: boolean;
  editCustomer: boolean;
  deleteCustomer: boolean;
  
  // Suppliers
  viewSuppliers: boolean;
  createSupplier: boolean;
  editSupplier: boolean;
  deleteSupplier: boolean;
  
  // Invoices
  viewInvoices: boolean;
  createInvoice: boolean;
  editInvoice: boolean;
  deleteInvoice: boolean;
  generateInvoice: boolean;
  
  // Files
  viewFiles: boolean;
  createFile: boolean;
  editFile: boolean;
  deleteFile: boolean;
  generateFile: boolean;
  
  // Reports
  viewReports: boolean;
  viewFinancialReports: boolean;
  viewCommissionReports: boolean;
  viewVATReports: boolean;
  exportReports: boolean;
  
  // Employees
  viewEmployees: boolean;
  createEmployee: boolean;
  editEmployee: boolean;
  deleteEmployee: boolean;
  manageCommissions: boolean;
  
  // Settings
  viewSettings: boolean;
  editSettings: boolean;
  manageUsers: boolean;
  manageCurrencies: boolean;
  
  // System
  accessAuditLogs: boolean;
  managePermissions: boolean;
}

