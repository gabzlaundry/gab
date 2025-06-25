// 'use client';

// import { useState, useEffect, Suspense } from 'react';
// import Link from 'next/link';
// import { useRouter, useSearchParams } from 'next/navigation';
// import { useAuth } from '@/lib/context/AuthContext';
// import { databaseService } from '@/lib/database';
// import { Service, BookingRequest, ServiceType, PaymentMethod, DeliveryType, NigerianAddress } from '@/lib/types';
// import { formatNairaFromKobo } from '@/lib/validations';
// import { LAGOS_LGAS } from '@/lib/types';
// import { PaystackButton } from '@/components/PaystackPayment';

// interface ServiceSelection {
//   serviceId: string;
//   quantity: number;
//   weight?: number;
//   specialInstructions?: string;
// }

// function BookPageContent() {
//   const { user, isAuthenticated } = useAuth();
//   const router = useRouter();
//   const searchParams = useSearchParams();
  
//   // State management
//   const [currentStep, setCurrentStep] = useState(1);
//   const [services, setServices] = useState<Service[]>([]);
//   const [selectedServices, setSelectedServices] = useState<ServiceSelection[]>([]);
//   const [deliveryType, setDeliveryType] = useState<DeliveryType | null>(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [error, setError] = useState('');
//   const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

//   // Form data
//   const [bookingData, setBookingData] = useState<Partial<BookingRequest>>({
//     paymentMethod: PaymentMethod.ONLINE,
//     customerNotes: '',
//     requestedDateTime: ''
//   });

//   useEffect(() => {
//     if (!isAuthenticated) {
//       router.push('/login');
//       return;
//     }

//     loadServices();
    
//     // Pre-select service if coming from service page
//     const serviceId = searchParams.get('service');
//     if (serviceId) {
//       setSelectedServices([{ serviceId, quantity: 1 }]);
//     }
//   }, [isAuthenticated, router, searchParams]);

//   const loadServices = async () => {
//     try {
//       const response = await databaseService.getActiveServices();
//       if (response.success && response.data) {
//         setServices(response.data);
//       }
//     } catch (error) {
//       console.error('Failed to load services:', error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const addService = (serviceId: string) => {
//     const existing = selectedServices.find(s => s.serviceId === serviceId);
//     if (existing) {
//       setSelectedServices(prev => 
//         prev.map(s => s.serviceId === serviceId 
//           ? { ...s, quantity: s.quantity + 1 }
//           : s
//         )
//       );
//     } else {
//       setSelectedServices(prev => [...prev, { serviceId, quantity: 1 }]);
//     }
//   };

//   const removeService = (serviceId: string) => {
//     setSelectedServices(prev => prev.filter(s => s.serviceId !== serviceId));
//   };

//   const updateServiceQuantity = (serviceId: string, quantity: number) => {
//     if (quantity <= 0) {
//       removeService(serviceId);
//       return;
//     }
    
//     setSelectedServices(prev => 
//       prev.map(s => s.serviceId === serviceId 
//         ? { ...s, quantity }
//         : s
//       )
//     );
//   };

//   const calculateTotal = () => {
//     let total = 0;
//     selectedServices.forEach(selection => {
//       const service = services.find(s => s.$id === selection.serviceId);
//       if (service) {
//         let itemPrice = service.basePrice;
//         if (selection.weight && service.pricePerKg) {
//           itemPrice += service.pricePerKg * selection.weight;
//         }
//         if (service.pricePerItem) {
//           itemPrice = service.pricePerItem;
//         }
//         total += itemPrice * selection.quantity;
//       }
//     });
//     return total;
//   };

//   const handleSubmit = async () => {
//     if (!user || !deliveryType) return;

//     setError('');
//     setIsSubmitting(true);

//     try {
//       const requestData: BookingRequest = {
//         customerId: user.$id,
//         services: selectedServices,
//         deliveryType: deliveryType,
//         requestedDateTime: bookingData.requestedDateTime!,
//         paymentMethod: bookingData.paymentMethod!,
//         customerNotes: bookingData.customerNotes,
//         ...(deliveryType === DeliveryType.DELIVERY && {
//           pickupAddress: bookingData.pickupAddress,
//           deliveryAddress: bookingData.deliveryAddress
//         })
//       };

//       const response = await databaseService.createOrder(requestData);
      
//       if (response.success && response.data) {
//         // For online payment, store order ID for payment processing
//         if (bookingData.paymentMethod === PaymentMethod.ONLINE) {
//           setCreatedOrderId(response.data.$id);
//           setIsSubmitting(false); // Reset loading state for payment
//           return response.data.$id; // Return order ID for payment
//         } else {
//           // For other payment methods, redirect to receipt page
//           router.push(`/receipt/${response.data.$id}?success=true`);
//         }
//       } else {
//         setError(response.error || 'Failed to create order');
//         setIsSubmitting(false);
//         return null;
//       }
//     } catch (error) {
//       setError('An unexpected error occurred');
//       setIsSubmitting(false);
//       return null;
//     }
//   };

//   const handlePaymentSuccess = async (reference: string) => {
//     console.log('Payment successful:', reference);
    
//     // If we have a created order ID, redirect to receipt
//     if (createdOrderId) {
//       router.push(`/receipt/${createdOrderId}?payment=success`);
//     } else {
//       // Fallback: create the order if not already created
//       const orderId = await handleSubmit();
//       if (orderId) {
//         router.push(`/receipt/${orderId}?payment=success`);
//       }
//     }
//   };

//   const canProceedToStep2 = selectedServices.length > 0;
//   const canProceedToStep3 = deliveryType !== null && bookingData.requestedDateTime;
//   const canSubmit = deliveryType === DeliveryType.PICKUP ? 
//     (bookingData.requestedDateTime && bookingData.paymentMethod) :
//     (bookingData.requestedDateTime && bookingData.pickupAddress && bookingData.deliveryAddress && bookingData.paymentMethod);

//   if (!isAuthenticated || !user) {
//     return null;
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Navigation */}
//       <nav className="bg-white shadow-sm border-b border-gray-200">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex justify-between items-center h-16">
//             <div className="flex items-center space-x-4">
//               <Link href="/" className="text-2xl font-bold text-blue-600">
//                 Gab'z Laundromat
//               </Link>
//               <span className="text-sm text-gray-500 hidden sm:block">
//                 Book Service (New Simplified)
//               </span>
//             </div>
            
//             <div className="flex items-center space-x-4">
//               <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
//                 Dashboard
//               </Link>
//             </div>
//           </div>
//         </div>
//       </nav>

//       <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {/* Progress Steps */}
//         <div className="mb-8">
//           <div className="flex items-center justify-center">
//             {[1, 2, 3].map((step) => (
//               <div key={step} className="flex items-center">
//                 <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
//                   currentStep >= step 
//                     ? 'bg-blue-600 text-white' 
//                     : 'bg-gray-200 text-gray-600'
//                 }`}>
//                   {step}
//                 </div>
//                 {step < 3 && (
//                   <div className={`w-16 h-1 mx-4 ${
//                     currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
//                   }`} />
//                 )}
//               </div>
//             ))}
//           </div>
//           <div className="flex justify-center mt-4">
//             <div className="text-center">
//               <p className="text-sm font-medium text-gray-900">
//                 Step {currentStep} of 3
//               </p>
//               <p className="text-sm text-gray-600">
//                 {currentStep === 1 && 'Select Services'}
//                 {currentStep === 2 && 'Choose Delivery Method'}
//                 {currentStep === 3 && 'Complete Order'}
//               </p>
//             </div>
//           </div>
//         </div>

//         {error && (
//           <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
//             {error}
//           </div>
//         )}

//         {/* Step 1: Service Selection */}
//         {currentStep === 1 && (
//           <div className="bg-white rounded-lg shadow-sm p-6">
//             <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Your Services</h2>
            
//             {isLoading ? (
//               <div className="grid md:grid-cols-2 gap-6">
//                 {[...Array(4)].map((_, i) => (
//                   <div key={i} className="animate-pulse border border-gray-200 rounded-lg p-4">
//                     <div className="h-6 bg-gray-200 rounded mb-3"></div>
//                     <div className="h-4 bg-gray-200 rounded mb-2"></div>
//                     <div className="h-8 bg-gray-200 rounded"></div>
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <div className="space-y-6">
//                 {/* Selected Services Summary */}
//                 {selectedServices.length > 0 && (
//                   <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
//                     <h3 className="font-semibold text-blue-900 mb-3">Selected Services</h3>
//                     <div className="space-y-2">
//                       {selectedServices.map((selection) => {
//                         const service = services.find(s => s.$id === selection.serviceId);
//                         if (!service) return null;
                        
//                         return (
//                           <div key={selection.serviceId} className="flex items-center justify-between bg-white rounded p-3">
//                             <div>
//                               <span className="font-medium">{service.name}</span>
//                               <span className="text-gray-600 ml-2">x{selection.quantity}</span>
//                             </div>
//                             <button
//                               onClick={() => removeService(selection.serviceId)}
//                               className="text-red-600 hover:text-red-700"
//                             >
//                               Remove
//                             </button>
//                           </div>
//                         );
//                       })}
//                     </div>
//                     <div className="mt-4 pt-3 border-t border-blue-200">
//                       <div className="flex justify-between items-center">
//                         <span className="font-semibold text-blue-900">Estimated Total:</span>
//                         <span className="text-xl font-bold text-blue-900">
//                           {formatNairaFromKobo(calculateTotal())}
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                 )}

//                 {/* Available Services */}
//                 <div className="grid md:grid-cols-2 gap-6">
//                   {services.map((service) => {
//                     const isSelected = selectedServices.some(s => s.serviceId === service.$id);
                    
//                     return (
//                       <div
//                         key={service.$id}
//                         className={`border rounded-lg p-4 transition-colors ${
//                           isSelected 
//                             ? 'border-blue-500 bg-blue-50' 
//                             : 'border-gray-200 hover:border-gray-300'
//                         }`}
//                       >
//                         <div className="flex justify-between items-start mb-3">
//                           <div>
//                             <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
//                             <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full capitalize">
//                               {service.type.replace('_', ' ')}
//                             </span>
//                           </div>
//                           <div className="text-right">
//                             <div className="text-lg font-bold text-blue-600">
//                               {formatNairaFromKobo(service.basePrice)}
//                             </div>
//                             {service.pricePerKg && (
//                               <div className="text-sm text-gray-500">
//                                 +{formatNairaFromKobo(service.pricePerKg)}/kg
//                               </div>
//                             )}
//                           </div>
//                         </div>
                        
//                         <p className="text-gray-600 text-sm mb-4">{service.description}</p>
                        
//                         <div className="flex items-center justify-between">
//                           <span className="text-sm text-gray-500">
//                             {service.estimatedDuration} hours
//                           </span>
                          
//                           {isSelected ? (
//                             <div className="flex items-center space-x-2">
//                               <button
//                                 onClick={() => {
//                                   const selection = selectedServices.find(s => s.serviceId === service.$id);
//                                   if (selection) {
//                                     updateServiceQuantity(service.$id, selection.quantity - 1);
//                                   }
//                                 }}
//                                 className="w-8 h-8 bg-blue-600 text-white rounded-full hover:bg-blue-700"
//                               >
//                                 -
//                               </button>
//                               <span className="font-medium">
//                                 {selectedServices.find(s => s.serviceId === service.$id)?.quantity || 0}
//                               </span>
//                               <button
//                                 onClick={() => {
//                                   const selection = selectedServices.find(s => s.serviceId === service.$id);
//                                   if (selection) {
//                                     updateServiceQuantity(service.$id, selection.quantity + 1);
//                                   }
//                                 }}
//                                 className="w-8 h-8 bg-blue-600 text-white rounded-full hover:bg-blue-700"
//                               >
//                                 +
//                               </button>
//                             </div>
//                           ) : (
//                             <button
//                               onClick={() => addService(service.$id)}
//                               className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
//                             >
//                               Add Service
//                             </button>
//                           )}
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>
//             )}

//             <div className="flex justify-end mt-8">
//               <button
//                 onClick={() => setCurrentStep(2)}
//                 disabled={!canProceedToStep2}
//                 className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-medium transition-colors"
//               >
//                 Continue
//               </button>
//             </div>
//           </div>
//         )}

//         {/* Step 2: Delivery Method Selection */}
//         {currentStep === 2 && (
//           <div className="bg-white rounded-lg shadow-sm p-6">
//             <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Your Service Method</h2>
            
//             <div className="space-y-6">
//               {/* Delivery Method Selection */}
//               <div className="grid md:grid-cols-2 gap-6">
//                 {/* Pickup Option */}
//                 <div 
//                   className={`border-2 rounded-lg p-6 cursor-pointer transition-colors ${
//                     deliveryType === DeliveryType.PICKUP 
//                       ? 'border-blue-500 bg-blue-50' 
//                       : 'border-gray-200 hover:border-gray-300'
//                   }`}
//                   onClick={() => setDeliveryType(DeliveryType.PICKUP)}
//                 >
//                   <div className="text-center">
//                     <div className="text-4xl mb-4">🏪</div>
//                     <h3 className="text-xl font-semibold text-gray-900 mb-2">Store Pickup</h3>
//                     <p className="text-gray-600 text-sm mb-4">
//                       Drop off and pick up your items directly at our store
//                     </p>
//                     <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
//                       No delivery fees
//                     </div>
//                   </div>
//                 </div>

//                 {/* Delivery Option */}
//                 <div 
//                   className={`border-2 rounded-lg p-6 cursor-pointer transition-colors ${
//                     deliveryType === DeliveryType.DELIVERY 
//                       ? 'border-blue-500 bg-blue-50' 
//                       : 'border-gray-200 hover:border-gray-300'
//                   }`}
//                   onClick={() => setDeliveryType(DeliveryType.DELIVERY)}
//                 >
//                   <div className="text-center">
//                     <div className="text-4xl mb-4">🚚</div>
//                     <h3 className="text-xl font-semibold text-gray-900 mb-2">Home Delivery</h3>
//                     <p className="text-gray-600 text-sm mb-4">
//                       We pick up from and deliver to your preferred address
//                     </p>
//                     <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
//                       Convenient service
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Delivery Address Fields - Only show for delivery */}
//               {deliveryType === DeliveryType.DELIVERY && (
//                 <div className="space-y-4 mt-6 p-4 bg-gray-50 rounded-lg">
//                   <h4 className="font-semibold text-gray-900">Delivery Information</h4>
                  
//                   {/* Pickup Address */}
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       Pickup Address *
//                     </label>
//                     <textarea
//                       value={bookingData.pickupAddress?.street || ''}
//                       onChange={(e) => setBookingData(prev => ({ 
//                         ...prev, 
//                         pickupAddress: {
//                           street: e.target.value,
//                           area: prev.pickupAddress?.area || '',
//                           lga: prev.pickupAddress?.lga || '',
//                           state: 'Lagos State',
//                           landmark: prev.pickupAddress?.landmark
//                         }
//                       }))}
//                       rows={3}
//                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                       placeholder="Enter your full pickup address including area and LGA"
//                       required
//                     />
//                   </div>

//                   {/* Delivery Address */}
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       Delivery Address *
//                     </label>
//                     <textarea
//                       value={bookingData.deliveryAddress?.street || ''}
//                       onChange={(e) => setBookingData(prev => ({ 
//                         ...prev, 
//                         deliveryAddress: {
//                           street: e.target.value,
//                           area: prev.deliveryAddress?.area || '',
//                           lga: prev.deliveryAddress?.lga || '',
//                           state: 'Lagos State',
//                           landmark: prev.deliveryAddress?.landmark
//                         }
//                       }))}
//                       rows={3}
//                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                       placeholder="Enter delivery address (can be same as pickup)"
//                       required
//                     />
//                     <button
//                       type="button"
//                       onClick={() => setBookingData(prev => ({ 
//                         ...prev, 
//                         deliveryAddress: prev.pickupAddress 
//                       }))}
//                       className="text-sm text-blue-600 hover:text-blue-700 mt-1"
//                     >
//                       Use same as pickup address
//                     </button>
//                   </div>

//                   {/* Contact Number */}
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       Contact Number for Delivery
//                     </label>
//                     <input
//                       type="tel"
//                       value={user?.phone || ''}
//                       disabled
//                       className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
//                       placeholder="+234..."
//                     />
//                     <p className="text-xs text-gray-500 mt-1">
//                       Using your registered phone number
//                     </p>
//                   </div>
//                 </div>
//               )}

//               {/* Requested Date/Time */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   When do you want us to {deliveryType === DeliveryType.PICKUP ? 'receive your items' : 'pick up your items'}? *
//                 </label>
//                 <input
//                   type="datetime-local"
//                   min={new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16)} // 2 hours from now
//                   value={bookingData.requestedDateTime || ''}
//                   onChange={(e) => setBookingData(prev => ({ ...prev, requestedDateTime: e.target.value }))}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                   required
//                 />
//                 <p className="text-xs text-gray-500 mt-1">
//                   If this time isn't available, we'll contact you to arrange an alternative
//                 </p>
//               </div>

//               {/* Special Instructions */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Special Instructions (Optional)
//                 </label>
//                 <textarea
//                   value={bookingData.customerNotes || ''}
//                   onChange={(e) => setBookingData(prev => ({ ...prev, customerNotes: e.target.value }))}
//                   rows={3}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                   placeholder="Any special care instructions or notes for your items"
//                 />
//               </div>
//             </div>

//             <div className="flex justify-between mt-8">
//               <button
//                 onClick={() => setCurrentStep(1)}
//                 className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-8 py-3 rounded-lg font-medium transition-colors"
//               >
//                 Back to Services
//               </button>
//               <button
//                 onClick={() => setCurrentStep(3)}
//                 disabled={!canProceedToStep3}
//                 className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-medium transition-colors"
//               >
//                 Continue to Payment
//               </button>
//             </div>
//           </div>
//         )}

//         {/* Step 3: Review & Payment */}
//         {currentStep === 3 && (
//           <div className="bg-white rounded-lg shadow-sm p-6">
//             <h2 className="text-2xl font-bold text-gray-900 mb-6">Review & Payment</h2>
            
//             <div className="space-y-6">
//               {/* Order Summary */}
//               <div className="bg-gray-50 rounded-lg p-4">
//                 <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
                
//                 {/* Service Type */}
//                 <div className="mb-4 p-3 bg-white rounded border">
//                   <div className="flex items-center space-x-2">
//                     <span className="text-2xl">
//                       {deliveryType === DeliveryType.PICKUP ? '🏪' : '🚚'}
//                     </span>
//                     <div>
//                       <p className="font-medium">
//                         {deliveryType === DeliveryType.PICKUP ? 'Store Pickup' : 'Home Delivery'}
//                       </p>
//                       <p className="text-sm text-gray-600">
//                         {deliveryType === DeliveryType.PICKUP 
//                           ? 'You will drop off and pick up items at our store'
//                           : 'We will pick up and deliver to your specified addresses'
//                         }
//                       </p>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Services */}
//                 <div className="space-y-2 mb-4">
//                   {selectedServices.map((selection) => {
//                     const service = services.find(s => s.$id === selection.serviceId);
//                     if (!service) return null;
                    
//                     let itemPrice = service.basePrice;
//                     if (selection.weight && service.pricePerKg) {
//                       itemPrice += service.pricePerKg * selection.weight;
//                     }
//                     if (service.pricePerItem) {
//                       itemPrice = service.pricePerItem;
//                     }
                    
//                     return (
//                       <div key={selection.serviceId} className="flex justify-between text-sm">
//                         <span>{service.name} x{selection.quantity}</span>
//                         <span>{formatNairaFromKobo(itemPrice * selection.quantity)}</span>
//                       </div>
//                     );
//                   })}
//                 </div>

//                 {/* Requested Date/Time */}
//                 <div className="mb-4 p-3 bg-white rounded border">
//                   <p className="font-medium">Requested Time</p>
//                   <p className="text-sm text-gray-600">
//                     {new Date(bookingData.requestedDateTime || '').toLocaleString('en-NG', {
//                       weekday: 'long',
//                       year: 'numeric',
//                       month: 'long',
//                       day: 'numeric',
//                       hour: '2-digit',
//                       minute: '2-digit'
//                     })}
//                   </p>
//                   <p className="text-xs text-orange-600 mt-1">
//                     We'll confirm availability and contact you if changes are needed
//                   </p>
//                 </div>

//                 {/* Addresses for delivery */}
//                 {deliveryType === DeliveryType.DELIVERY && (
//                   <div className="mb-4 p-3 bg-white rounded border">
//                     <p className="font-medium mb-2">Addresses</p>
//                     <div className="text-sm space-y-1">
//                       <p><strong>Pickup:</strong> {bookingData.pickupAddress?.street}</p>
//                       <p><strong>Delivery:</strong> {bookingData.deliveryAddress?.street}</p>
//                     </div>
//                   </div>
//                 )}

//                 <div className="border-t pt-4 mt-4">
//                   <div className="flex justify-between font-semibold text-lg">
//                     <span>Total Amount:</span>
//                     <span className="text-blue-600">{formatNairaFromKobo(calculateTotal())}</span>
//                   </div>
//                 </div>
//               </div>

//               {/* Payment Method */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Payment Method
//                 </label>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                   <button
//                     onClick={() => setBookingData(prev => ({ ...prev, paymentMethod: PaymentMethod.ONLINE }))}
//                     className={`p-4 text-left border rounded-lg transition-colors ${
//                       bookingData.paymentMethod === PaymentMethod.ONLINE
//                         ? 'border-blue-500 bg-blue-50 text-blue-700'
//                         : 'border-gray-200 hover:border-gray-300'
//                     }`}
//                   >
//                     <div className="font-medium">Pay Online</div>
//                     <div className="text-sm text-gray-500 mt-1">
//                       Secure payment with Paystack
//                     </div>
//                   </button>
                  
//                   {/* <button
//                     onClick={() => setBookingData(prev => ({ ...prev, paymentMethod: PaymentMethod.TRANSFER }))}
//                     className={`p-4 text-left border rounded-lg transition-colors ${
//                       bookingData.paymentMethod === PaymentMethod.TRANSFER
//                         ? 'border-blue-500 bg-blue-50 text-blue-700'
//                         : 'border-gray-200 hover:border-gray-300'
//                     }`}
//                   >
//                     <div className="font-medium">Bank Transfer</div>
//                     <div className="text-sm text-gray-500 mt-1">
//                       Transfer to our account
//                     </div>
//                   </button> */}
//                 </div>
//               </div>
//             </div>

//             <div className="flex justify-between mt-8">
//               <button
//                 onClick={() => setCurrentStep(2)}
//                 className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-8 py-3 rounded-lg font-medium transition-colors"
//               >
//                 Back
//               </button>
              
//               {/* Payment Button */}
//               {bookingData.paymentMethod === PaymentMethod.ONLINE ? (
//                 !createdOrderId ? (
//                   <button
//                     onClick={async () => {
//                       // Create order first
//                       await handleSubmit();
//                     }}
//                     disabled={!canSubmit || isSubmitting}
//                     className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-medium transition-colors"
//                   >
//                     {isSubmitting ? 'Creating Order...' : 'Create Order & Pay'}
//                   </button>
//                 ) : (
//                   <PaystackButton
//                     paymentData={{
//                       email: user?.email || '',
//                       amount: calculateTotal(),
//                       currency: 'NGN',
//                       metadata: {
//                         orderId: createdOrderId,
//                         customerId: user?.$id || '',
//                         customerName: user?.name || '',
//                         phoneNumber: user?.phone || ''
//                       },
//                       callback_url: `${window.location.origin}/payment/callback?orderId=${createdOrderId}`
//                     }}
//                     onSuccess={async (reference: string) => {
//                       await handlePaymentSuccess(reference);
//                     }}
//                     onClose={() => {
//                       console.log('Payment modal closed');
//                     }}
//                     disabled={isSubmitting}
//                   >
//                     {`Pay ${formatNairaFromKobo(calculateTotal())}`}
//                   </PaystackButton>
//                 )
//               ) : (
//                 <button
//                   onClick={handleSubmit}
//                   disabled={!canSubmit || isSubmitting}
//                   className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-medium transition-colors"
//                 >
//                   {isSubmitting ? 'Creating Order...' : 'Confirm Order'}
//                 </button>
//               )}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default function NewBookingPage() {
//   return (
//     <Suspense fallback={
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
//       </div>
//     }>
//       <BookPageContent />
//     </Suspense>
//   );
// } 