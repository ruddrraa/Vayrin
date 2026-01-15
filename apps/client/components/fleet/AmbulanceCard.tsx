import React from 'react';
import { Ambulance as AmbulanceIcon, Edit2, Trash2, User, Users } from 'lucide-react';
import { Card, Button } from '../common';
import { Ambulance, AmbulanceStatus, Driver } from '../../types';

interface AmbulanceCardProps {
  ambulance: Ambulance;
  drivers: Driver[];
  onEdit: (ambulance: Ambulance) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: AmbulanceStatus) => void;
}

export const AmbulanceCard: React.FC<AmbulanceCardProps> = ({
  ambulance,
  drivers,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  // Get driver names from IDs
  const primaryDriver = drivers.find(d => d.id === ambulance.primaryDriverId);
  const alternateDriver = drivers.find(d => d.id === ambulance.alternateDriverId);

  return (
    <Card className="relative group border border-slate-100 hover:border-blue-200 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-2xl text-white ${
              ambulance.type === 'ICU'
                ? 'bg-rose-500 shadow-lg shadow-rose-500/20'
                : 'bg-blue-500 shadow-lg shadow-blue-500/20'
            }`}
          >
            <AmbulanceIcon size={24} />
          </div>
          <div>
            <h3 className="font-bold text-white/60">{ambulance.plateNumber}</h3>
            <span className="text-xs text-white px-2 py-0.5 rounded font-medium">
              {ambulance.type}
            </span>
          </div>
        </div>
        <select
          value={ambulance.status}
          onChange={(e) => onStatusChange(ambulance.id, e.target.value as AmbulanceStatus)}
          className={`text-[10px] font-bold tracking-wide uppercase px-2 py-1 rounded-full outline-none cursor-pointer border-0 ${
            ambulance.status === 'AVAILABLE'
              ? 'bg-emerald-100 text-emerald-700'
              : ambulance.status === 'BUSY'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-200 text-slate-600'
          }`}
        >
          <option value="AVAILABLE">AVAILABLE</option>
          <option value="BUSY">BUSY</option>
          <option value="MAINTENANCE">MAINTENANCE</option>
        </select>
      </div>

      <div className="space-y-2 text-sm text-white mb-6 bg-black p-3 rounded-xl">
        {/* Driver Section */}
        <div className="border-b border-white/10 pb-2 mb-2">
          <div className="flex items-center gap-2 mb-1">
            <User size={14} className="text-emerald-400" />
            <span className="text-xs text-white/50 uppercase">Primary Driver</span>
          </div>
          <span className="font-medium text-white">
            {primaryDriver?.name || ambulance.driverName || 'Not Assigned'}
          </span>
        </div>
        <div className="border-b border-white/10 pb-2 mb-2">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-blue-400" />
            <span className="text-xs text-white/50 uppercase">Alternate Driver</span>
          </div>
          <span className="font-medium text-white/70">
            {alternateDriver?.name || 'Not Assigned'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Base Rate</span>
          <span className="font-medium text-white/60">₹{ambulance.baseCharge}</span>
        </div>
        <div className="flex justify-between">
          <span>Per Km</span>
          <span className="font-medium text-white/60">₹{ambulance.pricePerKm}/km</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => onEdit(ambulance)}
          className="flex-1 text-xs py-2 h-8"
        >
          <Edit2 size={14} className="mr-1" /> Edit
        </Button>
        <Button
          variant="danger"
          onClick={() => onDelete(ambulance.id)}
          className="flex-1 text-xs py-2 h-8 bg-rose-50 text-rose-600 hover:bg-rose-100 shadow-none"
        >
          <Trash2 size={14} className="mr-1" /> Delete
        </Button>
      </div>
    </Card>
  );
};

export default AmbulanceCard;
