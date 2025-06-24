'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { databaseService } from '@/lib/database';
import { Service, ServiceType } from '@/lib/types';
import { formatNairaFromKobo } from '@/lib/validations';
import { Navbar } from '@/components/ui/navbar';
import { responsiveClasses as rc, animationClasses as ac } from '@/lib/animations';

export default function ServicesPage() {
  const { isAuthenticated } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<ServiceType | 'all'>('all');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const serviceTypes = [
    { value: 'all', label: 'All Services' },
    { value: ServiceType.WASH_AND_FOLD, label: 'Wash & Fold' },
    { value: ServiceType.DRY_CLEANING, label: 'Dry Cleaning' },
    { value: ServiceType.IRONING, label: 'Ironing' }
  ];

  const lagosAreas = [
    'Lagos Island', 'Victoria Island', 'Ikoyi', 'Lekki', 'Ikeja', 
    'Surulere', 'Yaba', 'Gbagada', 'Magodo', 'Ojodu'
  ];

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    filterServices();
  }, [services, selectedType, selectedArea, searchQuery]);

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

  const filterServices = () => {
    let filtered = services;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(service => service.type === selectedType);
    }

    // Filter by area
    if (selectedArea) {
      filtered = filtered.filter(service => 
        service.availableAreas.includes(selectedArea)
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(query) ||
        service.description.toLowerCase().includes(query) ||
        service.type.toLowerCase().includes(query)
      );
    }

    setFilteredServices(filtered);
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <style jsx global>{`
        /* Custom select dropdown styling */
        select option {
          padding: 12px 16px;
          font-size: 14px;
          color: #374151;
          background-color: white;
          border: none;
        }
        
        select option:hover {
          background-color: #f3f4f6;
        }
        
        select option:checked {
          background-color: #3b82f6;
          color: white;
        }
        
        /* Custom scrollbar for dropdown */
        select::-webkit-scrollbar {
          width: 8px;
        }
        
        select::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        
        select::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        
        select::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        /* Firefox dropdown styling */
        select {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }
      `}</style>

      <Navbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className={`text-4xl md:text-5xl font-bold mb-6 ${ac.fadeIn}`}>
              Professional Laundry Services
            </h1>
            <p className={`text-xl text-blue-100 mb-8 ${ac.fadeIn}`} style={{ animationDelay: '0.2s' }}>
              Experience premium cleaning services tailored for Lagos lifestyle. 
              From everyday essentials to delicate garments, we've got you covered.
            </p>
            <div className={`flex flex-wrap justify-center gap-4 ${ac.fadeIn}`} style={{ animationDelay: '0.3s' }}>
              {isAuthenticated ? (
                <Link
                  href="/book"
                  className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Book Now
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Get Started
                </Link>
              )}
              <a
                href="#services"
                className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300"
              >
                View Services
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div id="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className={`bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-8 transform ${ac.fadeIn}`}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Search Filter */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Services
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search services..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Service Type Filter */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Type
              </label>
              <div className="relative">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as ServiceType | 'all')}
                  className="w-full appearance-none pl-4 pr-10 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white cursor-pointer text-gray-700 font-medium"
                  style={{ minHeight: '44px' }}
                >
                  {serviceTypes.map((type) => (
                    <option key={type.value} value={type.value} className="py-3 px-4 text-gray-700 bg-white hover:bg-blue-50">
                      {type.label}
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

            {/* Area Filter */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Area
              </label>
              <div className="relative">
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="w-full appearance-none pl-4 pr-10 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white cursor-pointer text-gray-700 font-medium"
                  style={{ minHeight: '44px' }}
                >
                  <option value="" className="py-3 px-4 text-gray-700 bg-white hover:bg-blue-50">All Areas</option>
                  {lagosAreas.map((area) => (
                    <option key={area} value={area} className="py-3 px-4 text-gray-700 bg-white hover:bg-blue-50">
                      {area}
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

            {/* Results count and Clear filters */}
            <div className="flex items-end justify-between md:justify-start">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold">{filteredServices.length}</span> of{' '}
                <span className="font-semibold">{services.length}</span> services
              </p>
              {(selectedType !== 'all' || selectedArea || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedType('all');
                    setSelectedArea('');
                    setSearchQuery('');
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium ml-4"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Services Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:gap-6 lg:gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`bg-white rounded-2xl shadow-lg p-4 md:p-6 animate-pulse ${ac.fadeIn}`} style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-3"></div>
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className={`text-center py-12 ${ac.fadeIn}`}>
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-medium text-gray-900 mb-2">No services found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your filters or search query.
            </p>
            <button
              onClick={() => {
                setSelectedType('all');
                setSelectedArea('');
                setSearchQuery('');
              }}
              className="inline-flex items-center justify-center px-6 py-2 border border-blue-600 rounded-xl text-blue-600 hover:bg-blue-50 font-medium transition-colors"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-6 lg:gap-8">
            {filteredServices.map((service, index) => (
              <div
                key={service.$id}
                className={`bg-white rounded-xl md:rounded-2xl shadow p-3 md:p-6 hover:shadow-lg transition-all duration-300 ${ac.fadeIn}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Service header */}
                <div className="flex items-start justify-between mb-3 md:mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-1 md:mb-2">
                      {service.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {service.type.replace('_', ' ')}
                      </span>
                      <span className="text-2xl">{getServiceIcon(service.type)}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4 line-clamp-2 break-words overflow-hidden">
                  {service.description}
                </p>

                {/* Pricing */}
                <div className="space-y-2 mb-3 md:mb-4 bg-gray-50 rounded-lg p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Base Price</span>
                    <span className="text-base md:text-lg font-bold text-blue-600">
                      {formatNairaFromKobo(service.basePrice)}
                    </span>
                  </div>
                  
                  {service.pricePerKg && (
                    <div className="flex items-center justify-between text-xs md:text-sm">
                      <span className="text-gray-500">Per kg</span>
                      <span className="font-medium text-gray-700">
                        {formatNairaFromKobo(service.pricePerKg)}
                      </span>
                    </div>
                  )}

                  {service.pricePerItem && (
                    <div className="flex items-center justify-between text-xs md:text-sm">
                      <span className="text-gray-500">Per item</span>
                      <span className="font-medium text-gray-700">
                        {formatNairaFromKobo(service.pricePerItem)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Service areas */}
                <div className="mb-4">
                  <span className="text-xs md:text-sm font-medium text-gray-700 mb-1.5 block">
                    Available in:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {service.availableAreas.slice(0, 3).map((area) => (
                      <span
                        key={area}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {area}
                      </span>
                    ))}
                    {service.availableAreas.length > 3 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        +{service.availableAreas.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* CTA Button */}
                <Link
                  href={isAuthenticated ? `/book?service=${service.$id}` : '/register'}
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-3 px-4 rounded-lg md:rounded-xl font-medium transition-all duration-300 text-sm md:text-base"
                >
                  {isAuthenticated ? 'Book Now' : 'Sign Up to Book'}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className={`max-w-3xl mx-auto ${ac.fadeIn}`}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Experience Premium Laundry Service?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Quick pickup, professional cleaning, and convenient delivery across Lagos State.
            </p>
            <Link
              href={isAuthenticated ? "/book" : "/register"}
              className="inline-block bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              {isAuthenticated ? "Book Service Now" : "Get Started Today"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}