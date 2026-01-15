import React from 'react';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { OrderCard } from './OrderCard';
import { Order, OrderStatus } from '../../types';

interface OrderListProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  isHospitalView?: boolean;
  title?: string;
}

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  onUpdateStatus,
  isHospitalView = true,
  title = 'Incoming Orders',
}) => {
  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">{title}</h2>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {orders.length > 0 ? (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onUpdateStatus={onUpdateStatus}
              isHospitalView={isHospitalView}
            />
          ))
        ) : (
          <div className="text-center py-20 bg-white/50 rounded-3xl border border-slate-200 border-dashed">
            <Package size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-slate-500 font-medium">
              {isHospitalView ? 'No incoming orders yet.' : 'You have no orders yet.'}
            </h3>
          </div>
        )}
      </motion.div>
    </>
  );
};

export default OrderList;
