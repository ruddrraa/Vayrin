import React from 'react';
import { Package, Truck, CheckCircle } from 'lucide-react';
import { Card, Label } from '../common';
import { Order, OrderStatus } from '../../types';

interface OrderCardProps {
  order: Order;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  isHospitalView?: boolean;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onUpdateStatus,
  isHospitalView = true,
}) => {
  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-mono rounded-full">
              #{order.id.slice(0, 8)}
            </div>
            <span className="text-xs text-slate-400">
              {new Date(order.createdAt).toLocaleString()}
            </span>
          </div>
          <h3 className="font-bold text-slate-800 text-lg mb-4">
            {isHospitalView ? 'Patient Order' : 'Your Order'}
            <span className="text-slate-400 font-normal ml-2">
              {isHospitalView ? `User ID: ${order.userId.slice(0, 6)}...` : ''}
            </span>
          </h3>

          <div className="space-y-2">
            {order.items.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center text-sm p-3 bg-white/[0.03] rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">
                    {item.type}
                  </div>
                  <span className="font-medium text-slate-700">
                    {item.quantity} Unit(s) Blood
                  </span>
                </div>
                <div className="text-slate-500">@ ₹{item.price}/unit</div>
                <div className="font-bold text-slate-700">
                  ₹{item.price * item.quantity}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-right">
            <span className="text-white/60 text-sm mr-2">Total Value:</span>
            <span className="text-xl font-bold text-white">₹{order.totalAmount}</span>
          </div>
        </div>

        {isHospitalView && (
          <div className="w-full md:w-64 flex flex-col gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
            <Label>Update Status</Label>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onUpdateStatus(order.id, 'PROCESSING')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  order.status === 'PROCESSING'
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'border-slate-100 text-slate-400 hover:bg-slate-50'
                }`}
              >
                <Package size={18} /> Processing
                {order.status === 'PROCESSING' && <CheckCircle size={16} className="ml-auto" />}
              </button>
              <button
                onClick={() => onUpdateStatus(order.id, 'DISPATCHED')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  order.status === 'DISPATCHED'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'border-slate-100 text-slate-400 hover:bg-slate-50'
                }`}
              >
                <Truck size={18} /> Dispatched
                {order.status === 'DISPATCHED' && <CheckCircle size={16} className="ml-auto" />}
              </button>
              <button
                onClick={() => onUpdateStatus(order.id, 'DELIVERED')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  order.status === 'DELIVERED'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'border-slate-100 text-slate-400 hover:bg-slate-50'
                }`}
              >
                <CheckCircle size={18} /> Delivered
                {order.status === 'DELIVERED' && <CheckCircle size={16} className="ml-auto" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default OrderCard;
