import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Card, Button } from '../common';
import { Driver } from '../../types';

interface DriverCardProps {
  driver: Driver;
  onEdit: (driver: Driver) => void;
  onDelete: (id: string) => void;
}

export const DriverCard: React.FC<DriverCardProps> = ({ driver, onEdit, onDelete }) => {
  return (
    <Card className="border border-slate-100 hover:border-indigo-200">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
          {driver.name.charAt(0)}
        </div>
        <div>
          <h3 className="font-bold text-white">{driver.name}</h3>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                driver.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            />
            <span className="text-xs text-white/60">{driver.status}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm text-white mb-4 bg-black p-3 rounded-xl">
        <div className="flex justify-between">
          <span>License</span>
          <span className="text-white/60 font-mono">{driver.licenseNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Wage</span>
          <span className="text-white/60">₹{driver.hourlyWage}/hr</span>
        </div>
        <div className="flex justify-between">
          <span>Hours</span>
          <span className="text-white/60">{driver.totalHours} hrs</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => onEdit(driver)}
          className="flex-1 text-xs py-2 h-8"
        >
          <Edit2 size={14} className="mr-1" /> Edit
        </Button>
        <Button
          variant="danger"
          onClick={() => onDelete(driver.id)}
          className="flex-1 text-xs py-2 h-8 bg-rose-50 text-rose-600 hover:bg-rose-100 shadow-none"
        >
          <Trash2 size={14} className="mr-1" /> Remove
        </Button>
      </div>
    </Card>
  );
};

export default DriverCard;
