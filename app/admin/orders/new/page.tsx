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
import { formatNairaFromKobo } from '@/lib/validations';
import { PaystackButton } from '@/components/PaystackPayment';
import { animationClasses as ac, responsiveClasses as rc } from '@/lib/animations';

interface ServiceSelection {
  serviceId: string;
  quantity: number;
  weight?: number;
  specialInstructions?: string;
}

type Phase = 'search' | 'builder' | 'success';

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

// Guards against records with missing/null name fields (e.g. a stray
// non-customer account in the users collection) so one bad record can't
// crash the whole list render.
function customerDisplayName(customer: { firstName?: string | null; lastName?: string | null }): string {
  const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
  return name || 'Unnamed customer';
}

function customerInitial(customer: { firstName?: string | null }): string {
  return (customer.firstName || '?').charAt(0).toUpperCase();
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

  const [phase, setPhase] = useState<Phase>('search');

  // ----- Phase A: browse/find or create the customer -----
  const [allCustomers, setAllCustomers] = useState<User[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [viewingCustomer, setViewingCustomer] = useState<User | null>(null);
  const [viewingCustomerOrders, setViewingCustomerOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [isRepeatingOrder, setIsRepeatingOrder] = useState(false);
  const [skippedItemCount, setSkippedItemCount] = useState(0);

  const [showCreateForm, setShowCreateForm] = useState(false);
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

  useEffect(() => {
    databaseService.getAllUsers().then(response => {
      if (response.success && response.data) {
        setAllCustomers(response.data);
      }
      setCustomersLoading(false);
    });
  }, []);

  const filteredCustomers = (() => {
    const query = searchQuery.trim().toLowerCase();
    const list = query
      ? allCustomers.filter(c =>
          customerDisplayName(c).toLowerCase().includes(query) ||
          (c.phone?.number || '').includes(searchQuery.trim())
        )
      : allCustomers;
    return [...list].sort((a, b) =>
      customerDisplayName(a).localeCompare(customerDisplayName(b))
    );
  })();

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

  const viewCustomerProfile = async (customer: User) => {
    setViewingCustomer(customer);
    setViewingCustomerOrders([]);
    setOrdersLoading(true);

    const ordersResponse = await databaseService.getOrdersByCustomer(customer.$id);
    if (ordersResponse.success && ordersResponse.data) {
      setViewingCustomerOrders(ordersResponse.data);
    }
    setOrdersLoading(false);
  };

  const backToList = () => {
    setViewingCustomer(null);
    setViewingCustomerOrders([]);
  };

  const enterBuilder = (customer: User) => {
    setSelectedCustomer(customer);
    setRequestedDateTime(new Date().toISOString().slice(0, 16));
    setStep(1);
    setPhase('builder');
  };

  // Best-effort guess at whether the typed search query looks like a phone
  // number or a name, so the "create profile" form starts pre-filled.
  const openCreateForm = () => {
    const query = searchQuery.trim();
    const digitCount = (query.match(/\d/g) || []).length;
    if (query && digitCount >= 6) {
      setNewCustomerForm(prev => ({ ...prev, phone: normalizePhone(query) }));
    } else if (query) {
      const [first, ...rest] = query.split(' ');
      setNewCustomerForm(prev => ({ ...prev, firstName: first || '', lastName: rest.join(' ') }));
    }
    setCreateError('');
    setShowCreateForm(true);
  };

  const closeCreateForm = () => {
    setShowCreateForm(false);
    setCreateError('');
    setNewCustomerForm({ firstName: '', lastName: '', phone: '', isWhatsApp: false, notes: '' });
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

      setAllCustomers(prev => [response.data as User, ...prev]);
      setShowCreateForm(false);
      enterBuilder(response.data);
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleRepeatLastOrder = async () => {
    if (!viewingCustomer || viewingCustomerOrders.length === 0) return;
    const lastOrder = viewingCustomerOrders[0];

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

      enterBuilder(viewingCustomer);
    } finally {
      setIsRepeatingOrder(false);
    }
  };

  const changeCustomer = () => {
    setPhase('search');
    setSearchQuery('');
    backToList();
    closeCreateForm();
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
        contactNumber: selectedCustomer.phone?.number || '',
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
        {/* ---------------- Phase A: browse/find or create the customer ---------------- */}
        {phase === 'search' && !viewingCustomer && (
          <div className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/20 ${ac.fadeIn}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Find Customer</h2>
              <button
                onClick={openCreateForm}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Customer
              </button>
            </div>

            {!showCreateForm && (
              <div className="relative mb-4">
                <svg className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by name or phone..."
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            )}

            {showCreateForm ? (
              <div className="border border-blue-200 bg-blue-50 rounded-2xl p-5">
                <p className="font-medium text-gray-900 mb-4">New walk-in customer profile</p>
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
                    onClick={closeCreateForm}
                    className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : customersLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-xl"></div>
                ))}
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl">
                <p className="text-gray-500 mb-3">
                  {searchQuery ? `No customer matches "${searchQuery}".` : 'No customers yet.'}
                </p>
                <button
                  onClick={openCreateForm}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-300"
                >
                  Create New Profile
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
                </p>
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden max-h-[28rem] overflow-y-auto">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.$id}
                      onClick={() => viewCustomerProfile(customer)}
                      className="w-full text-left p-4 hover:bg-blue-50 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                          {customerInitial(customer)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {customerDisplayName(customer)}
                          </p>
                          <p className="text-sm text-gray-600">{customer.phone?.number || '—'}</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- Phase A: customer profile ---------------- */}
        {phase === 'search' && viewingCustomer && (
          <div className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/20 ${ac.fadeIn}`}>
            <button
              onClick={backToList}
              className="text-sm text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to customer list
            </button>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full flex items-center justify-center font-semibold text-lg">
                  {customerInitial(viewingCustomer)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-lg">
                    {customerDisplayName(viewingCustomer)}
                  </p>
                  <p className="text-sm text-gray-600">{viewingCustomer.phone?.number || '—'}</p>
                </div>
              </div>
              {viewingCustomerOrders.length > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                  Returning customer
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm mb-6">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-gray-500">Orders</p>
                <p className="font-semibold text-gray-900">{viewingCustomerOrders.length}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-gray-500">Total Spent</p>
                <p className="font-semibold text-gray-900">
                  {formatNairaFromKobo(viewingCustomerOrders.reduce((sum, o) => sum + o.finalAmount, 0))}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-gray-500">Last Order</p>
                <p className="font-semibold text-gray-900">
                  {viewingCustomerOrders[0]
                    ? new Date(viewingCustomerOrders[0].$createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
                    : '—'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={() => enterBuilder(viewingCustomer)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-300"
              >
                Start New Order
              </button>
              {viewingCustomerOrders.length > 0 && (
                <button
                  onClick={handleRepeatLastOrder}
                  disabled={isRepeatingOrder || servicesLoading}
                  className="bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 px-5 py-2 rounded-xl font-medium transition-colors"
                >
                  {isRepeatingOrder ? 'Loading last order...' : 'Repeat Last Order'}
                </button>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Order History</h3>
              {ordersLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse h-14 bg-gray-100 rounded-xl"></div>
                  ))}
                </div>
              ) : viewingCustomerOrders.length === 0 ? (
                <p className="text-sm text-gray-500">No previous orders yet.</p>
              ) : (
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
                  {viewingCustomerOrders.map((order) => (
                    <div key={order.$id} className="p-3 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-gray-900">Order #{order.orderNumber}</p>
                        <p className="text-gray-500">
                          {new Date(order.$createdAt).toLocaleDateString('en-NG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatNairaFromKobo(order.finalAmount)}</p>
                        <span className="text-xs text-gray-500 capitalize">{order.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- Phase B: build the order ---------------- */}
        {phase === 'builder' && selectedCustomer && (
          <div>
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 mb-6 border border-white/20 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Building order for</p>
                <p className="font-semibold text-gray-900">
                  {customerDisplayName(selectedCustomer)} · {selectedCustomer.phone?.number || '—'}
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
                          customerName: customerDisplayName(selectedCustomer),
                          phoneNumber: selectedCustomer.phone?.number || ''
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
              {customerDisplayName(selectedCustomer)} · {formatNairaFromKobo(createdOrder.finalAmount)}
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
