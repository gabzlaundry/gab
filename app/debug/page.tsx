'use client';

import { useState } from 'react';
import { databaseService } from '@/lib/database';
import { PaymentStatus, OrderStatus } from '@/lib/types';

export default function DebugPage() {
  const [orderId, setOrderId] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (result: any) => {
    setResults(prev => [{ timestamp: new Date().toLocaleTimeString(), ...result }, ...prev]);
  };

  const debugPaymentStatus = async () => {
    if (!orderId.trim()) {
      alert('Please enter an order ID');
      return;
    }

    setIsLoading(true);
    addResult({ action: 'Starting debug', orderId });

    try {
      // Get order details
      const orderResponse = await databaseService.getOrderById(orderId);
      if (!orderResponse.success) {
        addResult({ action: 'Get Order Failed', error: orderResponse.error });
        return;
      }

      const order = orderResponse.data?.order;
      addResult({ 
        action: 'Order Found', 
        orderNumber: order?.orderNumber,
        paymentStatus: order?.paymentStatus,
        orderStatus: order?.status 
      });

      // Try to update payment status to paid
      const paymentUpdate = await databaseService.updateOrderPaymentStatus(
        orderId,
        PaymentStatus.PAID,
        'debug-reference-' + Date.now(),
        order?.finalAmount || 0
      );

      if (paymentUpdate.success) {
        addResult({ action: 'Payment Status Updated', status: 'success' });
        
        // Update order status to confirmed
        const statusUpdate = await databaseService.updateOrderStatus(
          orderId,
          OrderStatus.CONFIRMED,
          'debug-system',
          'Debug payment confirmation'
        );

        if (statusUpdate.success) {
          addResult({ action: 'Order Status Updated', status: 'confirmed' });
        } else {
          addResult({ action: 'Order Status Update Failed', error: statusUpdate.error });
        }
      } else {
        addResult({ action: 'Payment Status Update Failed', error: paymentUpdate.error });
      }

    } catch (error: any) {
      addResult({ action: 'Debug Error', error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const checkOrderStatus = async () => {
    if (!orderId.trim()) {
      alert('Please enter an order ID');
      return;
    }

    setIsLoading(true);
    
    try {
      const orderResponse = await databaseService.getOrderById(orderId);
      if (orderResponse.success && orderResponse.data) {
        const order = orderResponse.data.order;
        addResult({
          action: 'Current Order Status',
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          orderStatus: order.status,
          finalAmount: order.finalAmount
        });
        
        // Show in console for easy copying
        console.log('Order Details:', {
          id: order.$id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          orderStatus: order.status,
          finalAmount: order.finalAmount,
          created: order.$createdAt
        });
      } else {
        addResult({ action: 'Order Not Found', error: orderResponse.error });
      }
    } catch (error: any) {
      addResult({ action: 'Check Error', error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Payment Debug Tool</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order ID
              </label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter order ID (e.g., 6856bc8d002c13617d2d)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={checkOrderStatus}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'Checking...' : 'Check Order Status'}
              </button>
              
              <button
                onClick={debugPaymentStatus}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'Processing...' : 'Debug & Fix Payment'}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Debug Results</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{result.action}</span>
                    <span className="text-xs text-gray-500">{result.timestamp}</span>
                  </div>
                  <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => setResults([])}
              className="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Clear Results
            </button>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
          <h3 className="font-medium text-yellow-800 mb-2">How to use:</h3>
          <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-1">
            <li>Enter the Order ID from the URL (e.g., 6856bc8d002c13617d2d)</li>
            <li>Click "Check Order Status" to see current status</li>
            <li>Click "Debug & Fix Payment" to manually mark payment as completed</li>
            <li>Check the browser console for detailed order information</li>
          </ol>
        </div>
      </div>
    </div>
  );
} 