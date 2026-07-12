'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { withAuth } from '@/lib/context/AuthContext';
import { authService } from '@/lib/auth';
import { databaseService } from '@/lib/database';
import {
  Service,
  Order,
  User,
  BookingRequest,
  PaymentMethod,
  PaymentStatus,
  DeliveryType,
  NigerianAddress
} from '@/lib/types';
import { formatNairaFromKobo, validateNigerianPhone } from '@/lib/validations';
import { PaystackButton } from '@/components/PaystackPayment';
import { animationClasses as ac, responsiveClasses as rc } from '@/lib/animations';

interface ServiceSelection {
  serviceId: string;
  quantity: number;
  weight?: number;
  specialInstructions?: string;
}

type Phase = 'search' | 'builder' | 'success';
type SearchMode = 'phone' | 'name';
type SearchStatus = 'idle' | 'searching' | 'found' | 'multiple' | 'not-found' | 'error';

// Turns "0801 234 5678", "+234801...", "234801..." into the local 0XXXXXXXXXX
// shape this branch's NIGERIAN_PHONE_REGEX (and the phone index) expects.
function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('234')) {
    digits = digits.slice(3);
  }
  if (!digits.startsWith('0')) {
    digits = `0${digits}`;
  }
  return digits;
}

const PAYMENT_METHODS: Array<{ method: PaymentMethod; label: string }> = [
  { method: PaymentMethod.CASH, label: 'Cash' },
  { method: PaymentMethod.POS, label: 'POS' },
  { method: PaymentMethod.TRANSFER, label: 'Transfer' },
  { method: PaymentMethod.ONLINE, label: 'Online' },
  { method: PaymentMethod.PAY_ON_PICKUP, label: 'Pay on Pickup' }
];

function NewManualOrderPage() {
  // ----- Services (needed for both "repeat last order" mapping and the builder) -----
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  useEffect(() => {
    databaseService.getActiveServices().then(response => {
      if (response.success && response.data) {
        setServices(response.data);
      }
      setServicesLoading(false);
    });
  }, []);

  // ----- Phase A: find or create the customer -----
  const [phase, setPhase] = useState<Phase>('search');
  const [searchMode, setSearchMode] = useState<SearchMode>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const [searchError, setSearchError] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<User | null>(null);
  const [nameResults, setNameResults] = useState<User[]>([]);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [isRepeatingOrder, setIsRepeatingOrder] = useState(false);
  const [skippedItemCount, setSkippedItemCount] = useState(0);

  const [newCustomerForm, setNewCustomerForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    isWhatsApp: false,
    notes: ''
  });
  const [createError, setCreateError] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);

  // ----- Phase B: the order itself -----
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedServices, setSelectedServices] = useState<ServiceSelection[]>([]);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(DeliveryType.PICKUP);
  const [requestedDateTime, setRequestedDateTime] = useState('');
  const [pickupAddress, setPickupAddress] = useState<NigerianAddress | undefined>();
  const [deliveryAddress, setDeliveryAddress] = useState<NigerianAddress | undefined>();
  const [customerNotes, setCustomerNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [markPaidNow, setMarkPaidNow] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  const selectFoundCustomer = async (customer: User) => {
    setFoundCustomer(customer);
    setNameResults([]);
    setSearchStatus('found');

    const ordersResponse = await databaseService.getOrdersByCustomer(customer.$id);
    if (ordersResponse.success && ordersResponse.data) {
      setCustomerOrders(ordersResponse.data);
    }
  };

  const handleSearchByPhone = async () => {
    const normalized = normalizePhone(phoneInput);
    if (!validateNigerianPhone(normalized)) {
      setSearchStatus('error');
      setSearchError('Enter a valid Nigerian phone number, e.g. 0801 234 5678');
      return;
    }

    setSearchStatus('searching');
    setSearchError('');
    setFoundCustomer(null);
    setCustomerOrders([]);

    const response = await authService.getUserByPhone(normalized);
    if (!response.success) {
      setSearchStatus('error');
      setSearchError(response.error || 'Search failed');
      return;
    }

    if (!response.data) {
      setSearchStatus('not-found');
      setNewCustomerForm(prev => ({ ...prev, phone: normalized }));
      return;
    }

    await selectFoundCustomer(response.data);
  };

  // Name search has no unique index to query against, so this fetches the
  // customer list and filters client-side. Fine at current customer volume;
  // would need a real fulltext index + server-side search if that list grows a lot.
  const handleSearchByName = async () => {
    const query = nameInput.trim();
    if (query.length < 2) {
      setSearchStatus('error');
      setSearchError('Enter at least 2 characters to search by name');
      return;
    }

    setSearchStatus('searching');
    setSearchError('');
    setFoundCustomer(null);
    setCustomerOrders([]);
    setNameResults([]);

    const response = await databaseService.getAllUsers();
    if (!response.success || !response.data) {
      setSearchStatus('error');
      setSearchError(response.error || 'Search failed');
      return;
    }

    const queryLower = query.toLowerCase();
    const matches = response.data.filter(u =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(queryLower)
    );

    if (matches.length === 0) {
      setSearchStatus('not-found');
      const [first, ...rest] = query.split(' ');
      setNewCustomerForm(prev => ({
        ...prev,
        firstName: first || '',
        lastName: rest.join(' ')
      }));
      return;
    }

    if (matches.length === 1) {
      await selectFoundCustomer(matches[0]);
      return;
    }

    setNameResults(matches);
    setSearchStatus('multiple');
  };

  const handleSearch = () => {
    if (searchMode === 'phone') {
      handleSearchByPhone();
    } else {
      handleSearchByName();
    }
  };

  const enterBuilder = (customer: User) => {
    setSelectedCustomer(customer);
    setRequestedDateTime(new Date().toISOString().slice(0, 16));
    setStep(1);
    setPhase('builder');
  };

  const handleConfirmFoundCustomer = () => {
    if (!foundCustomer) return;
    enterBuilder(foundCustomer);
  };

  const handleCreateWalkInCustomer = async () => {
    setCreateError('');
    setIsCreatingCustomer(true);
    try {
      const response = await authService.createWalkInCustomer({
        firstName: newCustomerForm.firstName.trim(),
        lastName: newCustomerForm.lastName.trim(),
        phone: normalizePhone(newCustomerForm.phone),
        isWhatsApp: newCustomerForm.isWhatsApp,
        notes: newCustomerForm.notes.trim() || undefined
      });

      if (!response.success || !response.data) {
        setCreateError(response.error || 'Failed to create customer profile');
        return;
      }

      enterBuilder(response.data);
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleRepeatLastOrder = async () => {
    if (customerOrders.length === 0) return;
    const lastOrder = customerOrders[0];

    setIsRepeatingOrder(true);
    try {
      const response = await databaseService.getOrderById(lastOrder.$id);
      if (!response.success || !response.data) return;

      const activeServiceIds = new Set(services.map(s => s.$id));
      const carried: ServiceSelection[] = [];
      let skipped = 0;

      response.data.items.forEach(item => {
        if (activeServiceIds.has(item.serviceId)) {
          carried.push({
            serviceId: item.serviceId,
            quantity: item.quantity,
            weight: item.weight,
            specialInstructions: item.specialInstructions
          });
        } else {
          skipped++;
        }
      });

      setSelectedServices(carried);
      setSkippedItemCount(skipped);
      setDeliveryType(lastOrder.deliveryType);
      setPickupAddress(lastOrder.pickupAddress);
      setDeliveryAddress(lastOrder.deliveryAddress);

      if (foundCustomer) {
        enterBuilder(foundCustomer);
      }
    } finally {
      setIsRepeatingOrder(false);
    }
  };

  const changeCustomer = () => {
    setPhase('search');
    setSearchMode('phone');
    setPhoneInput('');
    setNameInput('');
    setSearchStatus('idle');
    setSearchError('');
    setFoundCustomer(null);
    setNameResults([]);
    setCustomerOrders([]);
    setSelectedCustomer(null);
    resetOrderBuilder();
  };

  const resetOrderBuilder = () => {
    setStep(1);
    setSelectedServices([]);
    setDeliveryType(DeliveryType.PICKUP);
    setRequestedDateTime(new Date().toISOString().slice(0, 16));
    setPickupAddress(undefined);
    setDeliveryAddress(undefined);
    setCustomerNotes('');
    setPaymentMethod(PaymentMethod.CASH);
    setMarkPaidNow(true);
    setSubmitError('');
    setCreatedOrder(null);
    setSkippedItemCount(0);
  };

  const addService = (serviceId: string) => {
    const existing = selectedServices.find(s => s.serviceId === serviceId);
    if (existing) {
      setSelectedServices(prev =>
        prev.map(s => s.serviceId === serviceId ? { ...s, quantity: s.quantity + 1 } : s)
      );
    } else {
      setSelectedServices(prev => [...prev, { serviceId, quantity: 1 }]);
    }
  };

  const removeService = (serviceId: string) => {
    setSelectedServices(prev => prev.filter(s => s.serviceId !== serviceId));
  };

  const updateServiceQuantity = (serviceId: string, quantity: number) => {
    if (quantity <= 0) {
      removeService(serviceId);
      return;
    }
    setSelectedServices(prev =>
      prev.map(s => s.serviceId === serviceId ? { ...s, quantity } : s)
    );
  };

  // Mirrors createOrder's server-side pricing (lib/database.ts) exactly, including
  // pricePerItem overwriting rather than adding to basePrice/weight pricing.
  const calculateTotal = () => {
    let total = 0;
    selectedServices.forEach(selection => {
      const service = services.find(s => s.$id === selection.serviceId);
      if (service) {
        let itemPrice = service.basePrice;
        if (selection.weight && service.pricePerKg) {
          itemPrice += service.pricePerKg * selection.weight;
        }
        if (service.pricePerItem) {
          itemPrice = service.pricePerItem;
        }
        total += itemPrice * selection.quantity;
      }
    });
    return total;
  };

  const finalizeOrder = async (): Promise<Order | null> => {
    if (!selectedCustomer) return null;

    setSubmitError('');
    setIsSubmitting(true);
    try {
      const requestData: BookingRequest = {
        customerId: selectedCustomer.$id,
        services: selectedServices,
        deliveryType,
        requestedDateTime: requestedDateTime || new Date().toISOString(),
        paymentMethod,
        contactNumber: selectedCustomer.phone.number,
        customerNotes: customerNotes || undefined,
        ...(deliveryType === DeliveryType.DELIVERY && {
          pickupAddress,
          deliveryAddress
        })
      };

      const response = await databaseService.createOrder(requestData);
      if (!response.success || !response.data) {
        setSubmitError(response.error || 'Failed to create order');
        return null;
      }

      const collectsPaymentNow = paymentMethod === PaymentMethod.CASH
        || paymentMethod === PaymentMethod.POS
        || paymentMethod === PaymentMethod.TRANSFER;

      if (collectsPaymentNow && markPaidNow) {
        await databaseService.updateOrderPaymentStatus(response.data.$id, PaymentStatus.PAID);
      }

      setCreatedOrder(response.data);
      setPhase('success');
      return response.data;
    } catch (error) {
      setSubmitError('An unexpected error occurred');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const collectsPaymentNow = paymentMethod === PaymentMethod.CASH
    || paymentMethod === PaymentMethod.POS
    || paymentMethod === PaymentMethod.TRANSFER;

  const canProceedToStep2 = selectedServices.length > 0;
  const canProceedToStep3 = !!requestedDateTime && (
    deliveryType === DeliveryType.PICKUP || (!!pickupAddress?.street && !!deliveryAddress?.street)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className={`flex flex-col md:flex-row md:items-center md:justify-between ${ac.fadeIn}`}>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                New Order 🧺
              </h1>
              <p className="text-gray-600 text-lg">
                Look up a walk-in customer by phone or name, or create a new profile, then build their order.
              </p>
            </div>
            <Link
              href="/admin/dashboard"
              className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              </svg>
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className={`${rc.container} py-6 md:py-8`}>
        {/* ---------------- Phase A: find/create customer ---------------- */}
        {phase === 'search' && (
          <div className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/20 ${ac.fadeIn}`}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Find Customer</h2>

            <div className="flex gap-2 mb-3">
              <button
                onClick={() => { setSearchMode('phone'); setSearchStatus('idle'); setSearchError(''); }}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  searchMode === 'phone' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                By Phone
              </button>
              <button
                onClick={() => { setSearchMode('name'); setSearchStatus('idle'); setSearchError(''); }}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  searchMode === 'name' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                By Name
              </button>
            </div>

            <div className="flex gap-3">
              {searchMode === 'phone' ? (
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Phone number, e.g. 0801 234 5678"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              ) : (
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Customer name, e.g. Chidinma Okeke"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              )}
              <button
                onClick={handleSearch}
                disabled={
                  searchStatus === 'searching' ||
                  (searchMode === 'phone' ? !phoneInput : !nameInput)
                }
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-300"
              >
                {searchStatus === 'searching' ? 'Searching...' : 'Search'}
              </button>
            </div>
            {searchStatus === 'error' && (
              <p className="mt-3 text-sm text-red-600">{searchError}</p>
            )}

            {/* Multiple name matches: pick one */}
            {searchStatus === 'multiple' && (
              <div className="mt-6 border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
                {nameResults.map((candidate) => (
                  <button
                    key={candidate.$id}
                    onClick={() => selectFoundCustomer(candidate)}
                    className="w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {candidate.firstName} {candidate.lastName}
                      </p>
                      <p className="text-sm text-gray-600">{candidate.phone.number}</p>
                    </div>
                    <span className="text-sm text-blue-600">Select</span>
                  </button>
                ))}
              </div>
            )}

            {/* Found: show profile + history */}
            {searchStatus === 'found' && foundCustomer && (
              <div className="mt-6 border border-green-200 bg-green-50 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full flex items-center justify-center font-semibold">
                      {foundCustomer.firstName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {foundCustomer.firstName} {foundCustomer.lastName}
                      </p>
                      <p className="text-sm text-gray-600">{foundCustomer.phone.number}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                    Returning customer
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-gray-500">Orders</p>
                    <p className="font-semibold text-gray-900">{customerOrders.length}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-gray-500">Total Spent</p>
                    <p className="font-semibold text-gray-900">
                      {formatNairaFromKobo(customerOrders.reduce((sum, o) => sum + o.finalAmount, 0))}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-gray-500">Last Order</p>
                    <p className="font-semibold text-gray-900">
                      {customerOrders[0]
                        ? new Date(customerOrders[0].$createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
                        : '—'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={handleConfirmFoundCustomer}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    Start New Order
                  </button>
                  {customerOrders.length > 0 && (
                    <button
                      onClick={handleRepeatLastOrder}
                      disabled={isRepeatingOrder || servicesLoading}
                      className="bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 px-5 py-2 rounded-xl font-medium transition-colors"
                    >
                      {isRepeatingOrder ? 'Loading last order...' : 'Repeat Last Order'}
                    </button>
                  )}
                  <button
                    onClick={() => setSearchStatus('idle')}
                    className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm"
                  >
                    Search someone else
                  </button>
                </div>
              </div>
            )}

            {/* Not found: create profile */}
            {searchStatus === 'not-found' && (
              <div className="mt-6 border border-blue-200 bg-blue-50 rounded-2xl p-5">
                <p className="font-medium text-gray-900 mb-4">
                  No customer found with that {searchMode === 'phone' ? 'number' : 'name'} — create a new profile.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={newCustomerForm.firstName}
                      onChange={(e) => setNewCustomerForm(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={newCustomerForm.lastName}
                      onChange={(e) => setNewCustomerForm(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={newCustomerForm.phone}
                      onChange={(e) => setNewCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center space-x-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={newCustomerForm.isWhatsApp}
                        onChange={(e) => setNewCustomerForm(prev => ({ ...prev, isWhatsApp: e.target.checked }))}
                      />
                      <span>This number is on WhatsApp</span>
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                    <textarea
                      value={newCustomerForm.notes}
                      onChange={(e) => setNewCustomerForm(prev => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {createError && (
                  <p className="mt-3 text-sm text-red-600">{createError}</p>
                )}

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleCreateWalkInCustomer}
                    disabled={
                      isCreatingCustomer ||
                      newCustomerForm.firstName.trim().length < 2 ||
                      newCustomerForm.lastName.trim().length < 2
                    }
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    {isCreatingCustomer ? 'Creating...' : 'Create Profile & Continue'}
                  </button>
                  <button
                    onClick={() => setSearchStatus('idle')}
                    className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- Phase B: build the order ---------------- */}
        {phase === 'builder' && selectedCustomer && (
          <div>
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 mb-6 border border-white/20 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Building order for</p>
                <p className="font-semibold text-gray-900">
                  {selectedCustomer.firstName} {selectedCustomer.lastName} · {selectedCustomer.phone.number}
                </p>
              </div>
              <button onClick={changeCustomer} className="text-sm text-blue-600 hover:text-blue-700">
                Change customer
              </button>
            </div>

            {skippedItemCount > 0 && step === 1 && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl text-sm">
                {skippedItemCount} item{skippedItemCount > 1 ? 's' : ''} from their last order are no longer available and were skipped.
              </div>
            )}

            {submitError && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                {submitError}
              </div>
            )}

            {/* Step 1: Services */}
            {step === 1 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/20">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Select Services</h2>

                {servicesLoading ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="animate-pulse border border-gray-200 rounded-xl p-4">
                        <div className="h-6 bg-gray-200 rounded mb-3"></div>
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-8 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {selectedServices.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <h3 className="font-semibold text-blue-900 mb-3">Selected Services</h3>
                        <div className="space-y-2">
                          {selectedServices.map((selection) => {
                            const service = services.find(s => s.$id === selection.serviceId);
                            if (!service) return null;
                            return (
                              <div key={selection.serviceId} className="flex items-center justify-between bg-white rounded-lg p-3">
                                <div>
                                  <span className="font-medium">{service.name}</span>
                                  <span className="text-gray-600 ml-2">x{selection.quantity}</span>
                                </div>
                                <button
                                  onClick={() => removeService(selection.serviceId)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Remove
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 pt-3 border-t border-blue-200 flex justify-between items-center">
                          <span className="font-semibold text-blue-900">Estimated Total:</span>
                          <span className="text-xl font-bold text-blue-900">{formatNairaFromKobo(calculateTotal())}</span>
                        </div>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6">
                      {services.map((service) => {
                        const selection = selectedServices.find(s => s.serviceId === service.$id);
                        return (
                          <div
                            key={service.$id}
                            className={`border rounded-xl p-4 transition-colors ${
                              selection ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                                <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full capitalize">
                                  {service.type.replace('_', ' ')}
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-blue-600">{formatNairaFromKobo(service.basePrice)}</div>
                                {service.pricePerKg && (
                                  <div className="text-sm text-gray-500">+{formatNairaFromKobo(service.pricePerKg)}/kg</div>
                                )}
                              </div>
                            </div>
                            <p className="text-gray-600 text-sm mb-4">{service.description}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">{service.estimatedDuration} hours</span>
                              {selection ? (
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => updateServiceQuantity(service.$id, selection.quantity - 1)}
                                    className="w-8 h-8 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                                  >
                                    -
                                  </button>
                                  <span className="font-medium">{selection.quantity}</span>
                                  <button
                                    onClick={() => updateServiceQuantity(service.$id, selection.quantity + 1)}
                                    className="w-8 h-8 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => addService(service.$id)}
                                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all duration-300"
                                >
                                  Add
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end mt-8">
                  <button
                    onClick={() => setStep(2)}
                    disabled={!canProceedToStep2}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Delivery + schedule */}
            {step === 2 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/20">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Pickup / Delivery</h2>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div
                    className={`border-2 rounded-xl p-6 cursor-pointer transition-colors ${
                      deliveryType === DeliveryType.PICKUP ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setDeliveryType(DeliveryType.PICKUP)}
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-3">🏪</div>
                      <h3 className="font-semibold text-gray-900">In-Store</h3>
                      <p className="text-gray-600 text-sm">Customer drops off and picks up in person</p>
                    </div>
                  </div>
                  <div
                    className={`border-2 rounded-xl p-6 cursor-pointer transition-colors ${
                      deliveryType === DeliveryType.DELIVERY ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setDeliveryType(DeliveryType.DELIVERY)}
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-3">🚚</div>
                      <h3 className="font-semibold text-gray-900">Arrange Delivery</h3>
                      <p className="text-gray-600 text-sm">We pick up from / deliver to an address</p>
                    </div>
                  </div>
                </div>

                {deliveryType === DeliveryType.DELIVERY && (
                  <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-xl">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Address *</label>
                      <textarea
                        value={pickupAddress?.street || ''}
                        onChange={(e) => setPickupAddress(prev => ({
                          street: e.target.value,
                          area: prev?.area || '',
                          lga: prev?.lga || '',
                          state: 'Lagos State',
                          landmark: prev?.landmark
                        }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address *</label>
                      <textarea
                        value={deliveryAddress?.street || ''}
                        onChange={(e) => setDeliveryAddress(prev => ({
                          street: e.target.value,
                          area: prev?.area || '',
                          lga: prev?.lga || '',
                          state: 'Lagos State',
                          landmark: prev?.landmark
                        }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setDeliveryAddress(pickupAddress)}
                        className="text-sm text-blue-600 hover:text-blue-700 mt-1"
                      >
                        Use same as pickup address
                      </button>
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {deliveryType === DeliveryType.PICKUP ? 'Drop-off time' : 'When should we pick up?'}
                  </label>
                  <input
                    type="datetime-local"
                    value={requestedDateTime}
                    onChange={(e) => setRequestedDateTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                  <textarea
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Any special care instructions"
                  />
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-8 py-3 rounded-xl font-medium transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!canProceedToStep3}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    Continue to Payment
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Payment + confirm */}
            {step === 3 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/20">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Payment &amp; Confirm</h2>

                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="space-y-2 mb-3">
                    {selectedServices.map((selection) => {
                      const service = services.find(s => s.$id === selection.serviceId);
                      if (!service) return null;
                      let itemPrice = service.basePrice;
                      if (selection.weight && service.pricePerKg) itemPrice += service.pricePerKg * selection.weight;
                      if (service.pricePerItem) itemPrice = service.pricePerItem;
                      return (
                        <div key={selection.serviceId} className="flex justify-between text-sm">
                          <span>{service.name} x{selection.quantity}</span>
                          <span>{formatNairaFromKobo(itemPrice * selection.quantity)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t pt-3 flex justify-between font-semibold text-lg">
                    <span>Total:</span>
                    <span className="text-blue-600">{formatNairaFromKobo(calculateTotal())}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {PAYMENT_METHODS.map(({ method, label }) => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`p-3 text-center border rounded-xl font-medium transition-colors ${
                          paymentMethod === method
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {collectsPaymentNow && (
                    <label className="flex items-center space-x-2 text-sm text-gray-700 mt-4">
                      <input
                        type="checkbox"
                        checked={markPaidNow}
                        onChange={(e) => setMarkPaidNow(e.target.checked)}
                      />
                      <span>Payment received now</span>
                    </label>
                  )}
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setStep(2)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-8 py-3 rounded-xl font-medium transition-colors"
                  >
                    Back
                  </button>

                  {paymentMethod === PaymentMethod.ONLINE ? (
                    <PaystackButton
                      paymentData={{
                        email: selectedCustomer.email,
                        amount: calculateTotal(),
                        currency: 'NGN',
                        metadata: {
                          orderId: 'temp-order-id',
                          customerId: selectedCustomer.$id,
                          customerName: `${selectedCustomer.firstName} ${selectedCustomer.lastName}`,
                          phoneNumber: selectedCustomer.phone.number
                        },
                        callback_url: `${window.location.origin}/payment/callback`
                      }}
                      onSuccess={async () => {
                        await finalizeOrder();
                      }}
                      onClose={() => {}}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Creating Order...' : `Pay ${formatNairaFromKobo(calculateTotal())}`}
                    </PaystackButton>
                  ) : (
                    <button
                      onClick={finalizeOrder}
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      {isSubmitting ? 'Creating Order...' : 'Confirm Order'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- Success ---------------- */}
        {phase === 'success' && createdOrder && selectedCustomer && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-white/20 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Created</h2>
            <p className="text-gray-600 mb-1">Order #{createdOrder.orderNumber}</p>
            <p className="text-gray-600 mb-6">
              {selectedCustomer.firstName} {selectedCustomer.lastName} · {formatNairaFromKobo(createdOrder.finalAmount)}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => {
                  resetOrderBuilder();
                  setPhase('builder');
                }}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-300"
              >
                Create Another Order for This Customer
              </button>
              <Link
                href={`/admin/orders/${createdOrder.$id}`}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-xl font-medium transition-colors"
              >
                View Order Details
              </Link>
              <Link
                href="/admin/orders"
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-xl font-medium transition-colors"
              >
                Back to Orders
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(NewManualOrderPage, true);
