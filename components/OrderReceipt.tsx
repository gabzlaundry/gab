'use client';

import { useState, useRef } from 'react';
import { Order, OrderItem, Service, DeliveryType } from '@/lib/types';
import { formatNairaFromKobo } from '@/lib/validations';
import html2pdf from 'html2pdf.js';

interface OrderReceiptProps {
  order: Order;
  orderItems: OrderItem[];
  services: Service[];
  onPrint?: () => void;
}

export default function OrderReceipt({ 
  order, 
  orderItems, 
  services, 
  onPrint 
}: OrderReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const getServiceById = (serviceId: string) => {
    return services.find(s => s.$id === serviceId);
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-NG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadPDF = () => {
    if (isDownloading) return;
    setIsDownloading(true);

    const receiptElement = document.getElementById('receipt-content');
    if (!receiptElement) {
      console.error('Receipt content element not found!');
      setIsDownloading(false);
      return;
    }

    // Create a style element to forcefully override any oklch colors
    const style = document.createElement('style');
    style.id = 'temp-pdf-styles';
    style.innerHTML = `
      #receipt-content { background-color: #ffffff !important; }
      .text-blue-600 { color: #2563eb !important; }
      .text-gray-600 { color: #4b5563 !important; }
      .text-gray-500 { color: #6b7280 !important; }
      .text-green-600 { color: #16a34a !important; }
      .text-yellow-600 { color: #ca8a04 !important; }
      .text-red-600 { color: #dc2626 !important; }
      .border-gray-200 { border-color: #e5e7eb !important; }
    `;
    document.head.appendChild(style);

    const opt = {
      margin: 10,
      filename: `receipt-${order.orderNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    // Use a timeout to ensure styles are applied before rendering
    setTimeout(() => {
      html2pdf()
        .from(receiptElement)
        .set(opt)
        .save()
        .catch((err: Error) => {
          console.error('PDF download error:', err);
          alert('Failed to generate PDF. Please check the console for errors.');
        })
        .finally(() => {
          document.head.removeChild(style);
          setIsDownloading(false);
        });
    }, 100); // 100ms delay
  };

  return (
    <div className="max-w-md mx-auto">
      <div 
        ref={receiptRef}
        id="receipt-content"
        className="bg-white border border-gray-200 rounded-lg p-6 print:border-none print:shadow-none"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-blue-600">Gab'z Laundromat</h1>
          <p className="text-sm text-gray-600">Lagos, Nigeria</p>
          <hr className="my-4" />
          <h2 className="text-lg font-semibold">Order Receipt</h2>
          <p className="text-sm text-gray-600">#{order.orderNumber}</p>
        </div>

        {/* Order Information */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-600">Order Date:</span>
            <span className="font-medium">
              {new Date(order.$createdAt).toLocaleDateString('en-NG')}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Service Type:</span>
            <span className="font-medium">
              {order.deliveryType === DeliveryType.PICKUP ? 'Store Pickup' : 'Home Delivery'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Requested Time:</span>
            <span className="font-medium text-sm">
              {formatDateTime(order.requestedDateTime)}
            </span>
          </div>

          {order.confirmedDateTime && (
            <div className="flex justify-between">
              <span className="text-gray-600">Confirmed Time:</span>
              <span className="font-medium text-sm">
                {formatDateTime(order.confirmedDateTime)}
              </span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-gray-600">Payment Method:</span>
            <span className="font-medium capitalize">
              {order.paymentMethod?.replace('_', ' ')}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Payment Status:</span>
            <span className={`font-medium capitalize ${
              order.paymentStatus === 'paid' ? 'text-green-600' : 
              order.paymentStatus === 'pending' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {order.paymentStatus}
            </span>
          </div>
        </div>

        {/* Delivery Information (only for delivery orders) */}
        {order.deliveryType === DeliveryType.DELIVERY && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Delivery Information</h3>
            <div className="space-y-2 text-sm">
              {order.pickupAddress && (
                <div>
                  <span className="text-gray-600">Pickup Address:</span>
                  <p className="font-medium">
                    {typeof order.pickupAddress === 'object' ? order.pickupAddress.street : order.pickupAddress}
                  </p>
                </div>
              )}
              {order.deliveryAddress && (
                <div>
                  <span className="text-gray-600">Delivery Address:</span>
                  <p className="font-medium">
                    {typeof order.deliveryAddress === 'object' ? order.deliveryAddress.street : order.deliveryAddress}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Store Information (only for pickup orders) */}
        {order.deliveryType === DeliveryType.PICKUP && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Store Information</h3>
            <div className="text-sm space-y-1">
              <p className="font-medium">Gab'z Laundromat Store</p>
              <p className="text-gray-600">Lagos, Nigeria</p>
              <p className="text-gray-600">Operating Hours: 8:00 AM - 8:00 PM</p>
            </div>
          </div>
        )}

        {/* Services */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Services</h3>
          <div className="space-y-2">
            {orderItems.map((item) => {
              const service = getServiceById(item.serviceId);
              if (!service) return null;

              return (
                <div key={item.$id} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{service.name}</p>
                    <p className="text-gray-600">
                      {item.quantity} x {formatNairaFromKobo(item.unitPrice)}
                      {item.weight && ` (${item.weight}kg)`}
                    </p>
                    {item.specialInstructions && (
                      <p className="text-xs text-gray-500 italic">
                        Note: {item.specialInstructions}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatNairaFromKobo(item.totalPrice)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Special Instructions */}
        {order.customerNotes && (
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Special Instructions</h3>
            <p className="text-sm text-gray-600 italic">{order.customerNotes}</p>
          </div>
        )}

        {/* Total */}
        <div className="border-t pt-4 mb-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatNairaFromKobo(order.totalAmount)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Discount:</span>
                <span className="text-green-600">-{formatNairaFromKobo(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>{formatNairaFromKobo(order.finalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-6  text-xs text-gray-600">
          {order.deliveryType === DeliveryType.PICKUP ? (
            <div>
              <p className="font-medium">Terms of Acceptance:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>All items are to be checked properly at point of collection as any complaints after 24hrs of pick up or delivery won't be entertained
                </li>
                <li>Items dropped for cleaning if not collected after 3 months of ready/due date, our company will no longer be responsible for them</li>
              </ol>
              <div className="mt-2">
              <p>Bring this receipt when dropping off your items at our store.</p>
              <p>We'll contact you when your order is ready for pickup.</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="font-medium">Next Steps:</p>
              <p>We'll contact you to confirm the pickup time.</p>
              <p>Please have your items ready at the specified pickup address.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>Thank you for choosing Gab'z Laundromat!</p>
          <p>For support, contact us at gabzlaundromat408@gmail.com</p>
          <p>Receipt generated on {new Date().toLocaleDateString('en-NG')}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 text-center print:hidden space-y-3">
        {/* <div className="flex gap-3 justify-center">
          <button
            onClick={downloadPDF}
            disabled={isDownloading}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 disabled:bg-green-400 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <span>{isDownloading ? 'Generating...' : 'Download PDF'}</span>
          </button>
          
          {onPrint && (
            <button
              onClick={onPrint}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print Receipt</span>
            </button>
          )}
        </div> */}
        
        <p className="text-xs text-gray-500">
          Screenshot or print your receipt for your records
        </p>
      </div>
    </div>
  );
}
