'use client';

import { Order, OrderItem, Service, DeliveryType } from '@/lib/types';
import { formatNairaFromKobo } from '@/lib/validations';

interface OrderReceiptProps {
  order: Order;
  orderItems: OrderItem[];
  services: Service[];
  onPrint?: () => void;
}

export default function OrderReceipt({
  order,
  orderItems,
  services
}: OrderReceiptProps) {
  const getServiceById = (serviceId: string) => {
    return services.find(s => s.$id === serviceId);
  };

  const deliveryAddressStreet = order.deliveryType === DeliveryType.DELIVERY && order.deliveryAddress
    ? (typeof order.deliveryAddress === 'object' ? order.deliveryAddress.street : order.deliveryAddress)
    : null;

  const statusColor = order.paymentStatus === 'paid'
    ? 'text-green-600'
    : order.paymentStatus === 'pending'
      ? 'text-yellow-600'
      : 'text-red-600';

  return (
    <div className="max-w-sm mx-auto">
      <div
        id="receipt-content"
        className="bg-white border border-gray-200 rounded-lg p-5 print:border-none print:shadow-none text-sm"
      >
        {/* Header */}
        <div className="text-center mb-3">
          <h1 className="text-lg font-bold text-blue-600">Gab'z Laundromat</h1>
          <p className="text-xs text-gray-500">Lagos, Nigeria</p>
        </div>

        {/* Order meta */}
        <div className="border-t border-b border-dashed border-gray-300 py-2 mb-3 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Receipt #{order.orderNumber}</span>
            <span>
              {new Date(order.$createdAt).toLocaleDateString('en-NG', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>
          <div className="flex justify-between mt-1">
            <span>{order.deliveryType === DeliveryType.PICKUP ? 'Store Pickup' : 'Home Delivery'}</span>
            <span className="capitalize">
              {order.paymentMethod?.replace('_', ' ')} · <span className={statusColor}>{order.paymentStatus}</span>
            </span>
          </div>
          {deliveryAddressStreet && (
            <p className="mt-1">Delivery to: {deliveryAddressStreet}</p>
          )}
        </div>

        {/* Items */}
        <div className="mb-3">
          <div className="flex justify-between text-xs font-semibold text-gray-500 border-b border-gray-200 pb-1 mb-1">
            <span>Item</span>
            <span>Amount</span>
          </div>
          {orderItems.map((item) => {
            const service = getServiceById(item.serviceId);
            if (!service) return null;
            return (
              <div key={item.$id} className="flex justify-between py-0.5">
                <span>
                  {service.name} x{item.quantity}
                  {item.weight ? ` (${item.weight}kg)` : ''}
                </span>
                <span>{formatNairaFromKobo(item.totalPrice)}</span>
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div className="border-t border-gray-300 pt-2 mb-3">
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Discount</span>
              <span>-{formatNairaFromKobo(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>{formatNairaFromKobo(order.finalAmount)}</span>
          </div>
        </div>

        {order.customerNotes && (
          <p className="text-xs text-gray-500 italic mb-3">Note: {order.customerNotes}</p>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 border-t border-dashed border-gray-300 pt-2">
          <p>Bring this receipt when collecting your items.</p>
          <p className="mt-1">Thank you! · gabzlaundromat408@gmail.com</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 text-center print:hidden">
        <p className="text-xs text-gray-500">
          Screenshot or print your receipt for your records
        </p>
      </div>
    </div>
  );
}
