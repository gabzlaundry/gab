'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { databaseService } from '@/lib/database';
import { Order, OrderItem, OrderStatus, Service } from '@/lib/types';
import { formatNairaFromKobo } from '@/lib/validations';
import { withAuth } from '@/lib/context/AuthContext';

function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [services, setServices] = useState<Record<string, Service>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      const response = await databaseService.getOrderById(orderId);
      if (response.success && response.data) {
        setOrder(response.data.order);
        setItems(response.data.items);

        // Load service details for each item
        const serviceDetails: Record<string, Service> = {};
        for (const item of response.data.items) {
          const serviceResponse = await databaseService.getServiceById(item.serviceId);
          if (serviceResponse.success && serviceResponse.data) {
            serviceDetails[item.serviceId] = serviceResponse.data;
          }
        }
        setServices(serviceDetails);
      }
    } catch (error) {
      console.error('Failed to load order details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (newStatus: OrderStatus) => {
    if (!user) return;
    
    setIsUpdating(true);
    setUpdateError(null);

    try {
      const response = await databaseService.updateOrderStatus(
        orderId,
        newStatus,
        user.$id,
        `Status updated to ${newStatus} by ${user.name}`
      );

      if (response.success && response.data) {
        setOrder(response.data);
      } else {
        setUpdateError(response.error || 'Failed to update status');
      }
    } catch (error: any) {
      setUpdateError(error.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case OrderStatus.PICKED_UP:
        return 'bg-blue-100 text-blue-800';
      case OrderStatus.IN_PROGRESS:
        return 'bg-purple-100 text-purple-800';
      case OrderStatus.READY:
        return 'bg-green-100 text-green-800';
      case OrderStatus.DELIVERED:
        return 'bg-gray-100 text-gray-800';
      case OrderStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return '⏳';
      case OrderStatus.PICKED_UP:
        return '🚚';
      case OrderStatus.IN_PROGRESS:
        return '🧽';
      case OrderStatus.READY:
        return '✅';
      case OrderStatus.DELIVERED:
        return '📦';
      case OrderStatus.CANCELLED:
        return '❌';
      default:
        return '📋';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Order not found</h2>
            <p className="mt-2 text-gray-600">The order you're looking for doesn't exist or you don't have permission to view it.</p>
            <Link href="/admin/orders" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
              ← Back to Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center space-x-4">
              <Link href="/admin/orders" className="text-blue-600 hover:text-blue-800">
                ← Back to Orders
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Order #{order.orderNumber}
              </h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)} {order.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Created on {new Date(order.$createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Status Update Actions */}
          <div className="flex items-center space-x-3">
            {order.status === OrderStatus.PENDING && (
              <>
                <button
                  onClick={() => updateStatus(OrderStatus.PICKED_UP)}
                  disabled={isUpdating}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Mark as Picked Up
                </button>
                <button
                  onClick={() => updateStatus(OrderStatus.CANCELLED)}
                  disabled={isUpdating}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Cancel Order
                </button>
              </>
            )}
            {order.status === OrderStatus.PICKED_UP && (
              <button
                onClick={() => updateStatus(OrderStatus.IN_PROGRESS)}
                disabled={isUpdating}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Start Processing
              </button>
            )}
            {order.status === OrderStatus.IN_PROGRESS && (
              <button
                onClick={() => updateStatus(OrderStatus.READY)}
                disabled={isUpdating}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Mark as Ready
              </button>
            )}
            {order.status === OrderStatus.READY && (
              <button
                onClick={() => updateStatus(OrderStatus.DELIVERED)}
                disabled={isUpdating}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                Mark as Delivered
              </button>
            )}
          </div>
        </div>

        {updateError && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {updateError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Items */}
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Order Items</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {items.map((item) => {
                  const service = services[item.serviceId];
                  return (
                    <div key={item.$id} className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {service?.name || 'Unknown Service'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {service?.description}
                          </p>
                          {item.weight && (
                            <p className="text-sm text-gray-600">
                              Weight: {item.weight} kg
                            </p>
                          )}
                          {item.specialInstructions && (
                            <p className="text-sm text-gray-600">
                              Special Instructions: {item.specialInstructions}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            {formatNairaFromKobo(item.totalPrice)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {item.quantity} × {formatNairaFromKobo(item.unitPrice)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between text-base font-medium text-gray-900">
                  <p>Total</p>
                  <p>{formatNairaFromKobo(order.finalAmount)}</p>
                </div>
              </div>
            </div>

            {/* Order History */}
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Order History</h2>
              </div>
              <div className="p-6">
                <div className="flow-root">
                  <ul className="-mb-8">
                    {JSON.parse(order.orderHistory || '[]').map((entry: any, idx: number) => (
                      <li key={idx}>
                        <div className="relative pb-8">
                          {idx !== JSON.parse(order.orderHistory || '[]').length - 1 && (
                            <span
                              className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                              aria-hidden="true"
                            />
                          )}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getStatusColor(entry.status)}`}>
                                {getStatusIcon(entry.status)}
                              </span>
                            </div>
                            <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                              <div>
                                <p className="text-sm text-gray-500">
                                  Status changed to <span className="font-medium text-gray-900">{entry.status}</span>
                                </p>
                                {entry.notes && (
                                  <p className="mt-0.5 text-sm text-gray-500">{entry.notes}</p>
                                )}
                              </div>
                              <div className="whitespace-nowrap text-right text-sm text-gray-500">
                                {new Date(entry.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Customer and Delivery Info */}
          <div className="space-y-8">
            {/* Customer Info */}
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Customer Information</h2>
              </div>
              <div className="px-6 py-4">
                <dl className="divide-y divide-gray-200">
                  <div className="py-3 flex justify-between text-sm">
                    <dt className="text-gray-500">Payment Status</dt>
                    <dd className="text-gray-900 font-medium">{order.paymentStatus}</dd>
                  </div>
                  <div className="py-3 flex justify-between text-sm">
                    <dt className="text-gray-500">Payment Method</dt>
                    <dd className="text-gray-900">{order.paymentMethod}</dd>
                  </div>
                  {order.paymentReference && (
                    <div className="py-3 flex justify-between text-sm">
                      <dt className="text-gray-500">Payment Reference</dt>
                      <dd className="text-gray-900">{order.paymentReference}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Delivery Info */}
            {order.deliveryType === 'delivery' && (
              <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Delivery Information</h2>
                </div>
                <div className="px-6 py-4">
                  <dl className="divide-y divide-gray-200">
                    <div className="py-3">
                      <dt className="text-sm font-medium text-gray-500">Pickup Address</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {order.pickupAddress?.street}, {order.pickupAddress?.area}
                      </dd>
                    </div>
                    <div className="py-3">
                      <dt className="text-sm font-medium text-gray-500">Delivery Address</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {order.deliveryAddress?.street}, {order.deliveryAddress?.area}
                      </dd>
                    </div>
                    <div className="py-3">
                      <dt className="text-sm font-medium text-gray-500">Requested Date/Time</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(order.requestedDateTime).toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}

            {/* Notes */}
            {order.customerNotes && (
              <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Customer Notes</h2>
                </div>
                <div className="px-6 py-4">
                  <p className="text-sm text-gray-600">{order.customerNotes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(OrderDetailsPage); 