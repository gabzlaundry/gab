'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { databaseService } from '@/lib/database';
import { Service, BookingRequest, ServiceType, PaymentMethod, DeliveryType, NigerianAddress } from '@/lib/types';
import { formatNairaFromKobo } from '@/lib/validations';
import { LAGOS_LGAS } from '@/lib/types';
import { PaystackButton } from '@/components/PaystackPayment';

interface ServiceSelection {
  serviceId: string;
  quantity: number;
  weight?: number;
  specialInstructions?: string;
}

function BookPageContent() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<ServiceSelection[]>([]);
  const [deliveryType, setDeliveryType] = useState<DeliveryType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Form data
  const [bookingData, setBookingData] = useState<Partial<BookingRequest>>({
    paymentMethod: PaymentMethod.ONLINE,
    customerNotes: '',
    requestedDateTime: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadServices();
    
    // Pre-select service if coming from service page
    const serviceId = searchParams.get('service');
    if (serviceId) {
      setSelectedServices([{ serviceId, quantity: 1 }]);
    }
  }, [isAuthenticated, router, searchParams]);

  // Initialize contact number with user's phone when user data is available
  useEffect(() => {
    if (user?.phone && !bookingData.contactNumber) {
      setBookingData(prev => ({ ...prev, contactNumber: user.phone }));
    }
  }, [user?.phone, bookingData.contactNumber]);

  const loadServices = async () => {
    try {
      const response = await databaseService.getActiveServices();
      if (response.success && response.data) {
        setServices(response.data);
      }
    } catch (error) {
      console.error('Failed to load services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addService = (serviceId: string) => {
    const existing = selectedServices.find(s => s.serviceId === serviceId);
    if (existing) {
      setSelectedServices(prev => 
        prev.map(s => s.serviceId === serviceId 
          ? { ...s, quantity: s.quantity + 1 }
          : s
        )
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
      prev.map(s => s.serviceId === serviceId 
        ? { ...s, quantity }
        : s
      )
    );
  };

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

  const handleSubmit = async (paymentReference?: string) => {
    if (!user || !deliveryType) return;

    setError('');
    setIsSubmitting(true);

    try {
      const requestData: BookingRequest = {
        customerId: user.$id,
        services: selectedServices,
        deliveryType: deliveryType,
        requestedDateTime: bookingData.requestedDateTime!,
        paymentMethod: bookingData.paymentMethod!,
        contactNumber: bookingData.contactNumber,
        customerNotes: bookingData.customerNotes,
        ...(deliveryType === DeliveryType.DELIVERY && {
          pickupAddress: bookingData.pickupAddress,
          deliveryAddress: bookingData.deliveryAddress
        }),
        ...(paymentReference && { paymentReference })
      };

      const response = await databaseService.createOrder(requestData);
      
      if (response.success && response.data) {
        router.push(`/orders/${response.data.$id}?success=true`);
      } else {
        setError(response.error || 'Failed to create order');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentInitialization = async () => {
    if (!user || !deliveryType) return null;

    setError('');
    setIsSubmitting(true);

    try {
      // Create order first
      const requestData: BookingRequest = {
        customerId: user.$id,
        services: selectedServices,
        deliveryType: deliveryType,
        requestedDateTime: bookingData.requestedDateTime!,
        paymentMethod: bookingData.paymentMethod!,
        contactNumber: bookingData.contactNumber,
        customerNotes: bookingData.customerNotes,
        ...(deliveryType === DeliveryType.DELIVERY && {
          pickupAddress: bookingData.pickupAddress,
          deliveryAddress: bookingData.deliveryAddress
        })
      };

      const response = await databaseService.createOrder(requestData);
      
      if (response.success && response.data) {
        // Return the order ID for payment initialization
        return response.data.$id;
      } else {
        setError(response.error || 'Failed to create order');
        return null;
      }
    } catch (error) {
      setError('An unexpected error occurred');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedToStep2 = selectedServices.length > 0;
  const canProceedToStep3 = deliveryType !== null && bookingData.requestedDateTime;
  const canSubmit = deliveryType === DeliveryType.PICKUP ? 
    (bookingData.requestedDateTime && bookingData.paymentMethod) :
    (bookingData.requestedDateTime && bookingData.pickupAddress && bookingData.deliveryAddress && bookingData.paymentMethod);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      {/* Enhanced Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 transition-all duration-200"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <Link href="/" className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Gab'z Laundromat
              </Link>
              <span className="text-xs md:text-sm text-gray-500 hidden sm:block">
                Book Service
              </span>
            </div>
            
            <div className="hidden lg:flex items-center space-x-6">
              <Link href="/services" className="text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200">Services</Link>
              <Link href="/dashboard" className="text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200">Dashboard</Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden lg:flex items-center space-x-3">
                <span className="text-sm text-gray-600">Hello, {user?.name?.split(' ')[0] || 'User'}</span>
                <div className="w-8 h-8 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Enhanced Mobile Sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${isSidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)}></div>
        <div className={`fixed inset-y-0 left-0 w-64 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 shadow-2xl transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-full flex flex-col py-6 px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Menu</h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-white/60 transition-all duration-200"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col space-y-2">
              <Link href="/dashboard" className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 py-3 px-4 rounded-xl transition-all duration-200 backdrop-blur-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                </svg>
                <span>Dashboard</span>
              </Link>
              <Link href="/services" className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 py-3 px-4 rounded-xl transition-all duration-200 backdrop-blur-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Services</span>
              </Link>
             
              <div className="border-t border-gray-200/50 mt-4 pt-4">
                <div className="flex items-center space-x-3 px-4 py-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  currentStep >= step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-16 h-1 mx-4 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">
                Step {currentStep} of 3
              </p>
              <p className="text-sm text-gray-600">
                {currentStep === 1 && 'Select Services'}
                {currentStep === 2 && 'Choose Delivery Method'}
                {currentStep === 3 && 'Complete Order'}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Step 1: Service Selection */}
        {currentStep === 1 && (
                      <div className="bg-white/80 backdrop-blur-md rounded-xl md:rounded-2xl shadow-lg border border-gray-200/50 p-4 md:p-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">Select Your Services</h2>
            
            {isLoading ? (
              <div className="grid md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse border border-gray-200 rounded-lg p-4">
                    <div className="h-6 bg-gray-200 rounded mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Selected Services Summary */}
                {selectedServices.length > 0 && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-xl md:rounded-2xl p-4 md:p-6 mb-6 md:mb-8 shadow-sm">
                    <h3 className="text-lg font-bold text-blue-900 mb-4">Selected Services</h3>
                    <div className="space-y-2">
                      {selectedServices.map((selection) => {
                        const service = services.find(s => s.$id === selection.serviceId);
                        if (!service) return null;
                        
                        return (
                          <div key={selection.serviceId} className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-lg md:rounded-xl p-3 md:p-4 shadow-sm border border-gray-100">
                            <div>
                              <span className="font-semibold text-gray-900">{service.name}</span>
                              <span className="text-blue-600 ml-2 font-medium">x{selection.quantity}</span>
                            </div>
                            <button
                              onClick={() => removeService(selection.serviceId)}
                              className="text-red-500 hover:text-red-700 font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition-all duration-200"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-6 pt-4 border-t border-blue-200/50">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-blue-900">Estimated Total:</span>
                        <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          {formatNairaFromKobo(calculateTotal())}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Available Services */}
                <div className="grid gap-6 md:gap-8">
                  {services.map((service) => {
                    const isSelected = selectedServices.some(s => s.serviceId === service.$id);
                    
                    return (
                      <div
                        key={service.$id}
                        className={`border rounded-xl md:rounded-2xl p-4 md:p-8 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg ${
                          isSelected 
                            ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md' 
                            : 'border-gray-200 hover:border-blue-300 bg-white/50 backdrop-blur-sm'
                        }`}
                      >
                        {/* Mobile Layout */}
                        <div className="block md:hidden mb-4">
                          <div className="flex items-start space-x-3 mb-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-xl">
                                {service.type === 'wash_and_fold' ? '🧺' : 
                                 service.type === 'dry_cleaning' ? '👔' : 
                                 service.type === 'ironing' ? '👕' : '🧽'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">{service.name}</h3>
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full capitalize">
                                {service.type.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                {formatNairaFromKobo(service.basePrice)}
                              </div>
                              {service.pricePerKg && (
                                <div className="text-xs text-gray-600 font-medium">
                                  +{formatNairaFromKobo(service.pricePerKg)}/kg
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden md:flex justify-between items-start mb-6">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">
                                  {service.type === 'wash_and_fold' ? '🧺' : 
                                   service.type === 'dry_cleaning' ? '👔' : 
                                   service.type === 'ironing' ? '👕' : '🧽'}
                                </span>
                              </div>
                          <div>
                                <h3 className="text-2xl font-bold text-gray-900">{service.name}</h3>
                                <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full capitalize">
                              {service.type.replace('_', ' ')}
                            </span>
                          </div>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                              {formatNairaFromKobo(service.basePrice)}
                            </div>
                            {service.pricePerKg && (
                              <div className="text-sm text-gray-600 font-medium">
                                +{formatNairaFromKobo(service.pricePerKg)}/kg
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-gray-600 text-sm md:text-base leading-relaxed mb-3 md:mb-6 px-1 md:px-0">{service.description}</p>
                        
                        {/* Mobile Info */}
                        <div className="block md:hidden bg-gray-50 rounded-lg p-3 mb-4">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-700">
                              ⏱️ {service.estimatedDuration}h
                            </span>
                            <span className="text-xs font-medium text-gray-700">
                              📍 Lagos
                            </span>
                          </div>
                        </div>

                        {/* Desktop Info */}
                        <div className="hidden md:block bg-gray-50 rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                              ⏱️ Duration: {service.estimatedDuration} hours
                          </span>
                            <span className="text-sm font-medium text-gray-700">
                              📍 Available in Lagos
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          
                          {isSelected ? (
                            <>
                              {/* Mobile Selected State */}
                              <div className="block md:hidden">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-sm font-bold text-green-600">✓ Selected</span>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  const selection = selectedServices.find(s => s.serviceId === service.$id);
                                  if (selection) {
                                    updateServiceQuantity(service.$id, selection.quantity - 1);
                                  }
                                }}
                                      className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-bold text-sm"
                              >
                                -
                              </button>
                                    <span className="text-lg font-bold text-gray-900 min-w-[2rem] text-center">
                                {selectedServices.find(s => s.serviceId === service.$id)?.quantity || 0}
                              </span>
                              <button
                                onClick={() => {
                                  const selection = selectedServices.find(s => s.serviceId === service.$id);
                                  if (selection) {
                                    updateServiceQuantity(service.$id, selection.quantity + 1);
                                  }
                                }}
                                      className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-bold text-sm"
                              >
                                +
                              </button>
                            </div>
                                </div>
                              </div>

                              {/* Desktop Selected State */}
                              <div className="hidden md:flex items-center justify-between w-full">
                                <span className="text-lg font-bold text-green-600">✓ Selected</span>
                                <div className="flex items-center space-x-3">
                                  <button
                                    onClick={() => {
                                      const selection = selectedServices.find(s => s.serviceId === service.$id);
                                      if (selection) {
                                        updateServiceQuantity(service.$id, selection.quantity - 1);
                                      }
                                    }}
                                    className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-bold text-lg"
                                  >
                                    -
                                  </button>
                                  <span className="text-xl font-bold text-gray-900 min-w-[3rem] text-center">
                                    {selectedServices.find(s => s.serviceId === service.$id)?.quantity || 0}
                                  </span>
                                  <button
                                    onClick={() => {
                                      const selection = selectedServices.find(s => s.serviceId === service.$id);
                                      if (selection) {
                                        updateServiceQuantity(service.$id, selection.quantity + 1);
                                      }
                                    }}
                                    className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-bold text-lg"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <button
                              onClick={() => addService(service.$id)}
                              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl text-sm md:text-lg font-semibold transition-all duration-200 transform hover:scale-105"
                            >
                              Add Service
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-8 md:mt-10">
              <button
                onClick={() => setCurrentStep(2)}
                disabled={!canProceedToStep2}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-6 md:px-10 py-3 md:py-4 rounded-lg md:rounded-xl text-base md:text-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <span className="hidden md:inline">Continue to Delivery Options →</span>
                <span className="md:hidden">Continue →</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Delivery Method Selection */}
        {currentStep === 2 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Your Service Method</h2>
            
            <div className="space-y-6">
              {/* Delivery Method Selection */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Pickup Option */}
                <div 
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-colors ${
                    deliveryType === DeliveryType.PICKUP 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setDeliveryType(DeliveryType.PICKUP)}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-4">🏪</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Store Pickup</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Drop off and pick up your items directly at our store
                    </p>
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      No delivery fees
                    </div>
                  </div>
                </div>

                {/* Delivery Option */}
                <div 
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-colors ${
                    deliveryType === DeliveryType.DELIVERY 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setDeliveryType(DeliveryType.DELIVERY)}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-4">🚚</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Home Delivery</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      We pick up from and deliver to your preferred address
                    </p>
                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      Convenient service
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Address Fields - Only show for delivery */}
              {deliveryType === DeliveryType.DELIVERY && (
                <div className="space-y-4 mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900">Delivery Information</h4>

              {/* Pickup Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pickup Address *
                </label>
                <textarea
                      value={bookingData.pickupAddress?.street || ''}
                      onChange={(e) => setBookingData(prev => ({ 
                        ...prev, 
                        pickupAddress: {
                          street: e.target.value,
                          area: prev.pickupAddress?.area || '',
                          lga: prev.pickupAddress?.lga || '',
                          state: 'Lagos State',
                          landmark: prev.pickupAddress?.landmark
                        }
                      }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your full pickup address including area and LGA"
                      required
                />
              </div>

              {/* Delivery Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Address *
                </label>
                <textarea
                      value={bookingData.deliveryAddress?.street || ''}
                      onChange={(e) => setBookingData(prev => ({ 
                        ...prev, 
                        deliveryAddress: {
                          street: e.target.value,
                          area: prev.deliveryAddress?.area || '',
                          lga: prev.deliveryAddress?.lga || '',
                          state: 'Lagos State',
                          landmark: prev.deliveryAddress?.landmark
                        }
                      }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter delivery address (can be same as pickup)"
                      required
                />
                <button
                  type="button"
                  onClick={() => setBookingData(prev => ({ 
                    ...prev, 
                        deliveryAddress: prev.pickupAddress 
                  }))}
                  className="text-sm text-blue-600 hover:text-blue-700 mt-1"
                >
                  Use same as pickup address
                </button>
              </div>

                  {/* Contact Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Number for Delivery
                    </label>
                    <input
                      type="tel"
                      value={bookingData.contactNumber || user?.phone || ''}
                      onChange={(e) => setBookingData(prev => ({ ...prev, contactNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+234..."
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Default: {user?.phone || 'Not set'} • You can change this for this order
                    </p>
                  </div>
                </div>
              )}

              {/* Requested Date/Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  When do you want us to {deliveryType === DeliveryType.PICKUP ? 'receive your items' : 'pick up your items'}? *
                </label>
                <input
                  type="datetime-local"
                  min={new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16)} // 2 hours from now
                  value={bookingData.requestedDateTime || ''}
                  onChange={(e) => setBookingData(prev => ({ ...prev, requestedDateTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  If this time isn't available, we'll contact you to arrange an alternative
                </p>
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Instructions (Optional)
                </label>
                <textarea
                  value={bookingData.customerNotes || ''}
                  onChange={(e) => setBookingData(prev => ({ ...prev, customerNotes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any special care instructions or notes for your items"
                />
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setCurrentStep(1)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-8 py-3 rounded-lg font-medium transition-colors"
              >
                Back to Services
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                disabled={!canProceedToStep3}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                Continue to Payment
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Payment */}
        {currentStep === 3 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Review & Payment</h2>
            
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
                
                {/* Service Type */}
                <div className="mb-4 p-3 bg-white rounded border">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">
                      {deliveryType === DeliveryType.PICKUP ? '🏪' : '🚚'}
                    </span>
                    <div>
                      <p className="font-medium">
                        {deliveryType === DeliveryType.PICKUP ? 'Store Pickup' : 'Home Delivery'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {deliveryType === DeliveryType.PICKUP 
                          ? 'You will drop off and pick up items at our store'
                          : 'We will pick up and deliver to your specified addresses'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Services */}
                <div className="space-y-2 mb-4">
                  {selectedServices.map((selection) => {
                    const service = services.find(s => s.$id === selection.serviceId);
                    if (!service) return null;
                    
                    let itemPrice = service.basePrice;
                    if (selection.weight && service.pricePerKg) {
                      itemPrice += service.pricePerKg * selection.weight;
                    }
                    if (service.pricePerItem) {
                      itemPrice = service.pricePerItem;
                    }
                    
                    return (
                      <div key={selection.serviceId} className="flex justify-between text-sm">
                        <span>{service.name} x{selection.quantity}</span>
                        <span>{formatNairaFromKobo(itemPrice * selection.quantity)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Requested Date/Time */}
                <div className="mb-4 p-3 bg-white rounded border">
                  <p className="font-medium">Requested Time</p>
                  <p className="text-sm text-gray-600">
                    {new Date(bookingData.requestedDateTime || '').toLocaleString('en-NG', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    We'll confirm availability and contact you if changes are needed
                  </p>
                </div>

                {/* Addresses for delivery */}
                {deliveryType === DeliveryType.DELIVERY && (
                  <div className="mb-4 p-3 bg-white rounded border">
                    <p className="font-medium mb-2">Addresses</p>
                    <div className="text-sm space-y-1">
                      <p><strong>Pickup:</strong> {bookingData.pickupAddress?.street}</p>
                      <p><strong>Delivery:</strong> {bookingData.deliveryAddress?.street}</p>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total Amount:</span>
                    <span className="text-blue-600">{formatNairaFromKobo(calculateTotal())}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={() => setBookingData(prev => ({ ...prev, paymentMethod: PaymentMethod.ONLINE }))}
                    className={`p-4 text-left border rounded-lg transition-colors ${
                      bookingData.paymentMethod === PaymentMethod.ONLINE
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">Pay Now</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Pay immediately with Paystack
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setBookingData(prev => ({ ...prev, paymentMethod: PaymentMethod.PAY_ON_PICKUP }))}
                    className={`p-4 text-left border rounded-lg transition-colors ${
                      bookingData.paymentMethod === PaymentMethod.PAY_ON_PICKUP
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">Pay on Pickup</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Pay online when order is ready
                    </div>
                  </button>
                </div>
                {bookingData.paymentMethod === PaymentMethod.PAY_ON_PICKUP && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800">
                      <strong>Pay on Pickup:</strong> We'll notify you when your order is ready.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setCurrentStep(2)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-8 py-3 rounded-lg font-medium transition-colors"
              >
                Back
              </button>
              
              {/* Payment Button */}
              {bookingData.paymentMethod === PaymentMethod.ONLINE ? (
                <button
                  onClick={async () => {
                    // Create order first, then initialize payment
                    const orderId = await handlePaymentInitialization();
                    if (orderId) {
                      // Now initialize payment with the real order ID
                      const paymentData = {
                        email: user?.email || '',
                        amount: calculateTotal(),
                        currency: 'NGN',
                        metadata: {
                          orderId: orderId,
                          customerId: user?.$id || '',
                          customerName: user?.name || '',
                          phoneNumber: user?.phone || ''
                        },
                        callback_url: `${window.location.origin}/payment/callback`
                      };

                      try {
                        const response = await fetch('/api/payment/initialize', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ paymentData }),
                        });

                        const result = await response.json();

                        if (result.success && result.data?.authorizationUrl) {
                          // Redirect to Paystack payment page
                          window.location.href = result.data.authorizationUrl;
                        } else {
                          setError(result.error || 'Failed to initialize payment');
                        }
                      } catch (error) {
                        setError('Failed to initialize payment');
                      }
                    }
                  }}
                  disabled={!canSubmit || isSubmitting}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-medium transition-colors"
                >
                  {isSubmitting ? 'Creating Order...' : `Pay Now ${formatNairaFromKobo(calculateTotal())}`}
                </button>
              ) : (
                <button
                  onClick={() => handleSubmit()}
                  disabled={!canSubmit || isSubmitting}
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-medium transition-colors"
                >
                  {isSubmitting ? 'Creating Order...' : 'Confirm Order - Pay Later'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <BookPageContent />
    </Suspense>
  );
} 