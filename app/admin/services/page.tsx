'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { databaseService } from '@/lib/database';
import { Service, ServiceType } from '@/lib/types';
import { formatNairaFromKobo } from '@/lib/validations';
import { withAuth } from '@/lib/context/AuthContext';

function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalServices: 0,
    activeServices: 0,
    servicesByType: {} as Record<ServiceType, number>,
    areasServed: new Set<string>()
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const response = await databaseService.getActiveServices();
      if (response.success && response.data) {
        setServices(response.data);
        
        // Calculate stats
        const servicesByType = {} as Record<ServiceType, number>;
        const areasServed = new Set<string>();
        let activeCount = 0;

        response.data.forEach(service => {
          // Count by type
          servicesByType[service.type] = (servicesByType[service.type] || 0) + 1;
          
          // Count active services
          if (service.isActive) activeCount++;
          
          // Collect unique areas
          service.availableAreas.forEach(area => areasServed.add(area));
        });

        setStats({
          totalServices: response.data.length,
          activeServices: activeCount,
          servicesByType,
          areasServed
        });
      }
    } catch (error) {
      console.error('Failed to load services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getServiceTypeIcon = (type: ServiceType) => {
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Services Overview</h1>
            <p className="text-gray-600">Manage your laundry service offerings</p>
          </div>
          <Link
            href="/admin/services/manage"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Manage Services
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Services</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalServices}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Services</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeServices}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Areas Served</p>
                <p className="text-2xl font-bold text-gray-900">{stats.areasServed.size}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Service Types</p>
                <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.servicesByType).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Services by Type */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Services by Type</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(stats.servicesByType).map(([type, count]) => (
                <div key={type} className="flex items-center p-4 border border-gray-200 rounded-lg">
                  <span className="text-2xl mr-4">{getServiceTypeIcon(type as ServiceType)}</span>
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{type.replace('_', ' ')}</p>
                    <p className="text-sm text-gray-600">{count} services</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active Services List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Active Services</h2>
              <Link
                href="/admin/services/manage"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Manage all services
              </Link>
            </div>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded"></div>
                ))}
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🧺</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
                <p className="text-gray-600">
                  Start by adding some services to your laundromat.
                </p>
                <Link
                  href="/admin/services/manage"
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Add Services
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {services.filter(s => s.isActive).map((service) => (
                  <div
                    key={service.$id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">{getServiceTypeIcon(service.type)}</div>
                      <div>
                        <h3 className="font-medium text-gray-900">{service.name}</h3>
                        <p className="text-sm text-gray-600">{service.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">
                        {formatNairaFromKobo(service.basePrice)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {service.availableAreas.length} areas
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(ServicesPage, true); 