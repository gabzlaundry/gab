'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { databaseService } from '@/lib/database';
import { Service, ServiceType } from '@/lib/types';
import { formatNairaFromKobo, convertNairaToKobo } from '@/lib/validations';
import { withAuth } from '@/lib/context/AuthContext';
import { responsiveClasses as rc, animationClasses as ac } from '@/lib/animations';

function ServiceManagementPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [showCreateService, setShowCreateService] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    type: ServiceType.WASH_AND_FOLD,
    description: '',
    basePrice: '',
    pricePerKg: '',
    pricePerItem: '',
    estimatedDuration: '',
    category: '',
    displayOrder: '',
    availableAreas: [] as string[],
    tags: [] as string[],
    specialInstructions: '',
    isActive: true
  });

  const lagosAreas = [
    'Ajah', 'Abraham Adesanya', 'Sangotedo', 'United Estate', 'GRA', 'Fara park Estate', 'Thomas Estate', 'Ibeju lekki', 'Awoyaya', 'Ogidan', 'Eleko', 'Dangote refinery', 'Lagos Island', 'Lagos Mainland', 'Ikeja', 'Victoria Island', 'Lekki', 'Surulere', 'Yaba', 'Ikoyi', 'sangotedo'
  ];

  const getServiceIcon = (type: ServiceType) => {
    switch (type) {
      case ServiceType.WASH_AND_FOLD:
        return '🧺';
      case ServiceType.DRY_CLEANING:
        return '👔';
      case ServiceType.IRONING:
        return '👕';
      default:
        return '🧽';
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

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

  const resetServiceForm = () => {
    setServiceFormData({
      name: '',
      type: ServiceType.WASH_AND_FOLD,
      description: '',
      basePrice: '',
      pricePerKg: '',
      pricePerItem: '',
      estimatedDuration: '',
      category: '',
      displayOrder: '',
      availableAreas: [],
      tags: [],
      specialInstructions: '',
      isActive: true
    });
    setEditingService(null);
    setShowCreateService(false);
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      
      const serviceData = {
        name: serviceFormData.name,
        type: serviceFormData.type,
        description: serviceFormData.description,
        basePrice: convertNairaToKobo(parseFloat(serviceFormData.basePrice)),
        pricePerKg: serviceFormData.pricePerKg ? convertNairaToKobo(parseFloat(serviceFormData.pricePerKg)) : undefined,
        pricePerItem: serviceFormData.pricePerItem ? convertNairaToKobo(parseFloat(serviceFormData.pricePerItem)) : undefined,
        estimatedDuration: parseInt(serviceFormData.estimatedDuration),
        category: serviceFormData.category,
        displayOrder: parseInt(serviceFormData.displayOrder) || 0,
        availableAreas: serviceFormData.availableAreas,
        tags: serviceFormData.tags,
        specialInstructions: serviceFormData.specialInstructions,
        isActive: serviceFormData.isActive,
        minOrderValue: 0,
        maxOrderValue: 10000000 // ₦100,000 default max
      };

      if (editingService) {
        const response = await databaseService.updateService(editingService.$id, serviceData);
        if (response.success) {
          await loadServices();
          resetServiceForm();
          alert('Service updated successfully!');
        } else {
          alert(`Failed to update service: ${response.error}`);
        }
      } else {
        const response = await databaseService.createService(serviceData);
        if (response.success) {
          await loadServices();
          resetServiceForm();
          alert('Service created successfully!');
        } else {
          alert(`Failed to create service: ${response.error}`);
        }
      }
    } catch (error) {
      console.error('Service operation failed:', error);
      alert('Failed to save service');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditService = (service: Service) => {
    setServiceFormData({
      name: service.name,
      type: service.type,
      description: service.description,
      basePrice: (service.basePrice / 100).toString(),
      pricePerKg: service.pricePerKg ? (service.pricePerKg / 100).toString() : '',
      pricePerItem: service.pricePerItem ? (service.pricePerItem / 100).toString() : '',
      estimatedDuration: service.estimatedDuration.toString(),
      category: service.category,
      displayOrder: service.displayOrder.toString(),
      availableAreas: service.availableAreas,
      tags: service.tags,
      specialInstructions: service.specialInstructions || '',
      isActive: service.isActive
    });
    setEditingService(service);
    setShowCreateService(true);
  };

  const handleToggleServiceStatus = async (service: Service) => {
    try {
      const response = await databaseService.updateService(service.$id, {
        isActive: !service.isActive
      });
      if (response.success) {
        await loadServices();
      } else {
        alert(`Failed to update service status: ${response.error}`);
      }
    } catch (error) {
      console.error('Failed to toggle service status:', error);
      alert('Failed to update service status');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      {/* Enhanced Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className={`flex flex-col md:flex-row md:items-center md:justify-between ${ac.fadeIn}`}>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Service Management 🧺
              </h1>
              <p className="text-gray-600 text-lg">
                Create and manage your laundry services
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <button
                onClick={() => setShowCreateService(true)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add New Service
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Enhanced Service Form Modal */}
        {showCreateService && (
          <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${ac.scaleIn}`}>
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl md:text-2xl font-bold text-white">
                    {editingService ? '✏️ Edit Service' : '➕ Create New Service'}
                  </h2>
                  <button
                    onClick={resetServiceForm}
                    className="text-blue-200 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <form onSubmit={handleCreateService} className="space-y-6">
                  {/* Basic Info Section */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-xl p-4 md:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        ℹ️
                      </span>
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Service Name *</label>
                        <input
                          type="text"
                          value={serviceFormData.name}
                          onChange={(e) => setServiceFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="e.g., Premium Wash & Fold"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Service Type *</label>
                        <div className="relative">
                          <select
                            value={serviceFormData.type}
                            onChange={(e) => setServiceFormData(prev => ({ ...prev, type: e.target.value as ServiceType }))}
                            className="w-full appearance-none px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                            required
                          >
                            {Object.values(ServiceType).map((type) => (
                              <option key={type} value={type}>
                                {getServiceIcon(type)} {type.replace('_', ' ')}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                      <textarea
                        value={serviceFormData.description}
                        onChange={(e) => setServiceFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                        rows={3}
                        placeholder="Describe what this service includes..."
                        required
                      />
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                      <input
                        type="text"
                        value={serviceFormData.category}
                        onChange={(e) => setServiceFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="e.g., Standard, Premium, Express"
                        required
                      />
                    </div>
                  </div>

                  {/* Pricing Section */}
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50/50 rounded-xl p-4 md:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                        💰
                      </span>
                      Pricing Structure
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Base Price (₦) *</label>
                        <input
                          type="number"
                          value={serviceFormData.basePrice}
                          onChange={(e) => setServiceFormData(prev => ({ ...prev, basePrice: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                          placeholder="1000"
                          min="0"
                          step="50"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Price per KG (₦)</label>
                        <input
                          type="number"
                          value={serviceFormData.pricePerKg}
                          onChange={(e) => setServiceFormData(prev => ({ ...prev, pricePerKg: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                          placeholder="500"
                          min="0"
                          step="50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Price per Item (₦)</label>
                        <input
                          type="number"
                          value={serviceFormData.pricePerItem}
                          onChange={(e) => setServiceFormData(prev => ({ ...prev, pricePerItem: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                          placeholder="200"
                          min="0"
                          step="50"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Duration (hours) *</label>
                      <input
                        type="number"
                        value={serviceFormData.estimatedDuration}
                        onChange={(e) => setServiceFormData(prev => ({ ...prev, estimatedDuration: e.target.value }))}
                        className="w-full md:w-1/3 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                        placeholder="24"
                        min="1"
                        max="168"
                        required
                      />
                    </div>
                  </div>

                  {/* Service Areas Section */}
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50/50 rounded-xl p-4 md:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                        🗺️
                      </span>
                      Service Areas
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {lagosAreas.map((area) => (
                        <label key={area} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-purple-50 transition-colors duration-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={serviceFormData.availableAreas.includes(area)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setServiceFormData(prev => ({
                                  ...prev,
                                  availableAreas: [...prev.availableAreas, area]
                                }));
                              } else {
                                setServiceFormData(prev => ({
                                  ...prev,
                                  availableAreas: prev.availableAreas.filter(a => a !== area)
                                }));
                              }
                            }}
                            className="rounded border-gray-300 text-purple-600 shadow-sm focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700 font-medium">{area}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Additional Options Section */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 rounded-xl p-4 md:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                        ⚙️
                      </span>
                      Additional Options
                    </h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
                      <textarea
                        value={serviceFormData.specialInstructions}
                        onChange={(e) => setServiceFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 resize-none"
                        rows={2}
                        placeholder="Any special care instructions for this service..."
                      />
                    </div>

                    <div className="mt-4">
                      <label className="flex items-center p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={serviceFormData.isActive}
                          onChange={(e) => setServiceFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                          className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">
                          Service is active and available for booking
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={resetServiceForm}
                      className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      {isLoading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </span>
                      ) : (
                        editingService ? 'Update Service' : 'Create Service'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Services Grid */}
        <div className={`${ac.fadeIn}`} style={{ animationDelay: '0.2s' }}>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`bg-white rounded-2xl shadow-lg p-6 animate-pulse ${ac.fadeIn}`} style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-24 mb-4"></div>
                  <div className="flex space-x-2">
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                    <div className="h-8 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🧺</span>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">No services yet</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Start by creating your first laundry service to offer to customers.
              </p>
              <button
                onClick={() => setShowCreateService(true)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Your First Service
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service, index) => (
                <div
                  key={service.$id}
                  className={`bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 p-6 transform hover:-translate-y-2 hover:scale-105 border border-gray-100 group ${ac.slideIn}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Service Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                        {getServiceIcon(service.type)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                          {service.name}
                        </h3>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-600 capitalize">
                          {service.type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        service.isActive
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}
                    >
                      {service.isActive ? '✅ Active' : '❌ Inactive'}
                    </span>
                  </div>

                  {/* Service Details */}
                  <div className="mb-4">
                    <p className="text-gray-600 text-sm leading-relaxed mb-3">{service.description}</p>
                    <div className="text-sm text-gray-500 mb-2">
                      <span className="font-medium">Category:</span> {service.category}
                    </div>
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">Duration:</span> {service.estimatedDuration} hours
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-xl p-4 mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Pricing</div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Base Price:</span>
                        <span className="font-bold text-blue-600">{formatNairaFromKobo(service.basePrice)}</span>
                      </div>
                      {service.pricePerKg && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Per KG:</span>
                          <span className="font-medium text-gray-700">{formatNairaFromKobo(service.pricePerKg)}</span>
                        </div>
                      )}
                      {service.pricePerItem && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Per Item:</span>
                          <span className="font-medium text-gray-700">{formatNairaFromKobo(service.pricePerItem)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Service Areas */}
                  <div className="mb-6">
                    <div className="text-sm font-medium text-gray-700 mb-2">Available Areas</div>
                    <div className="flex flex-wrap gap-1">
                      {service.availableAreas.slice(0, 3).map((area) => (
                        <span
                          key={area}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {area}
                        </span>
                      ))}
                      {service.availableAreas.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          +{service.availableAreas.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditService(service)}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2 px-4 rounded-xl font-medium transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleToggleServiceStatus(service)}
                      className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg ${
                        service.isActive
                          ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                          : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white'
                      }`}
                    >
                      {service.isActive ? '🚫 Deactivate' : '✅ Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default withAuth(ServiceManagementPage, true); 