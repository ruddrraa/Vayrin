import React from 'react';
import { Trash2, Calendar, Package } from 'lucide-react';
import { BloodBatch, BatchStatus } from '../../types';
import { inventoryService } from '../../src/services/inventoryService';

interface BatchCardProps {
  batch: BloodBatch;
  onUpdate: (updates: Partial<BloodBatch>) => Promise<void>;
  onDelete: () => Promise<void>;
}

export const BatchCard: React.FC<BatchCardProps> = ({
  batch,
  onUpdate,
  onDelete,
}) => {
  const statusColor = inventoryService.getStatusColor(batch.status);
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getDaysUntilExpiry = () => {
    const expiry = new Date(batch.expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilExpiry = getDaysUntilExpiry();

  return (
    <div className="bg-white rounded-lg border p-3 flex items-center justify-between hover:shadow-sm transition-all">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
          <Package size={14} className="text-slate-500" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-slate-700">
              {batch.batchId}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor}`}>
              {batch.status.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
            <span className="flex items-center gap-1">
              <Package size={10} />
              {batch.quantity} units
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {formatDate(batch.expiryDate)}
              {daysUntilExpiry > 0 && daysUntilExpiry <= 7 && (
                <span className="text-amber-600 ml-1">({daysUntilExpiry}d)</span>
              )}
              {daysUntilExpiry <= 0 && (
                <span className="text-rose-600 ml-1">(Expired)</span>
              )}
            </span>
          </div>
        </div>
      </div>
      
      <button
        onClick={onDelete}
        className="p-2 hover:bg-rose-50 rounded-lg text-rose-500 transition-all"
        title="Delete batch"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};

export default BatchCard;
