'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { databaseService } from '@/lib/database';
import { Service } from '@/lib/types';
import { formatNairaFromKobo } from '@/lib/validations';
import Link from 'next/link';

export default function DebugServicesPage() {
  const { user, isAuthenticated } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const response = await databaseService.getActiveServices();
      if (response.success && response.data) {
        setServices(response.data);
      } else {
        setError(response.error || 'Failed to load services');
      }
    } catch (error) {
      console.error('Failed to load services:', error);
      setError('Failed to load services');
    } finally {
      setIsLoading(false);
    }
  };

  const testServiceById = async (serviceId: string) => {
    try {
      const response = await databaseService.getServiceById(serviceId);
      if (response.success) {
        alert(`✅ Service found: ${response.data?.name}`);
      } else {
        alert(`❌ Service not found: ${response.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                Gab'z Laundromat
              </Link>
              <span className="text-sm text-gray-500">
                Debug Services
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/book" className="text-gray-600 hover:text-gray-900">
                Original Book
              </Link>
              <Link href="/book-new" className="text-gray-600 hover:text-gray-900">
                New Book
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Services Debug Page</h1>
          <p className="text-gray-600">
            This page helps debug service-related issues in your booking system.
          </p>
        </div>

        {/* Error from the user */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <h3 className="font-semibold text-red-900 mb-2">Reported Error:</h3>
          <p className="text-red-700 text-sm">
            Service not found: 68539dc50038605cad43
          </p>
          <button
            onClick={() => testServiceById('68539dc50038605cad43')}
            className="mt-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
          >
            Test This Service ID
          </button>
        </div>

        {/* Services List */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Available Services</h2>
            <button
              onClick={loadServices}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Refresh Services
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading services...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">❌ Error: {error}</div>
              <p className="text-gray-600 mb-4">
                This could mean:
              </p>
              <ul className="text-left text-sm text-gray-600 space-y-1 max-w-md mx-auto">
                <li>• Your services collection is empty</li>
                <li>• There are permission issues</li>
                <li>• The collection ID is incorrect</li>
                <li>• Your Appwrite configuration is wrong</li>
              </ul>
              
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <h4 className="font-semibold text-yellow-900 mb-2">Quick Fix:</h4>
                <p className="text-yellow-700 text-sm mb-3">
                  Run the seed script to populate your database with sample services:
                </p>
                <pre className="bg-yellow-100 p-2 rounded text-xs text-left overflow-x-auto">
                  <code>
{`1. Update scripts/seed-services.js with your API key
2. npm install node-appwrite
3. node scripts/seed-services.js`}
                  </code>
                </pre>
              </div>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-yellow-600 mb-4">⚠️ No services found</div>
              <p className="text-gray-600 mb-4">
                Your services collection is empty. You need to add some services first.
              </p>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded max-w-md mx-auto">
                <h4 className="font-semibold text-blue-900 mb-2">To fix this:</h4>
                <ol className="text-left text-sm text-blue-700 space-y-1">
                  <li>1. Update the API key in <code>scripts/seed-services.js</code></li>
                  <li>2. Run: <code>npm install node-appwrite</code></li>
                  <li>3. Run: <code>node scripts/seed-services.js</code></li>
                </ol>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4 text-sm text-gray-600">
                Found {services.length} service(s) in your database:
              </div>
              
              <div className="space-y-4">
                {services.map((service) => (
                  <div
                    key={service.$id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{service.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {service.type.replace('_', ' ')}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {formatNairaFromKobo(service.basePrice)}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {service.estimatedDuration}h
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-xs text-gray-500 mb-2">Service ID:</div>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {service.$id}
                        </code>
                        <div className="mt-2">
                          <button
                            onClick={() => testServiceById(service.$id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                          >
                            Test ID
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">How to use this page:</h3>
          <ul className="text-blue-700 text-sm space-y-2">
            <li>• This page shows all services currently in your database</li>
            <li>• If you see services listed, copy their IDs to test in your booking system</li>
            <li>• If no services are shown, you need to populate your database first</li>
            <li>• Use the "Test ID" button to verify a service can be fetched properly</li>
            <li>• The problematic service ID "68539dc50038605cad43" should be tested above</li>
          </ul>
        </div>

        {/* Next Steps */}
        <div className="mt-6 text-center">
          <div className="space-x-4">
            <Link
              href="/book-new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Try New Booking System
            </Link>
            <Link
              href="/dashboard"
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 