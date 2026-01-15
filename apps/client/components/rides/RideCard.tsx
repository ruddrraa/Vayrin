import React from 'react';
import { Navigation, CheckCircle, X } from 'lucide-react';
import { Card, Button } from '../common';
import { RideRequest } from '../../types';

interface RideCardProps {
  ride: RideRequest;
  onAccept?: (rideId: string) => void;
  onCancel?: (rideId: string) => void;
  isDriverView?: boolean;
}

export const RideCard: React.FC<RideCardProps> = ({
  ride,
  onAccept,
  onCancel,
  isDriverView = false,
}) => {
  const statusColors: Record<string, string> = {
    searching: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-green-100 text-green-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <Card className="border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/10">
            <Navigation size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white">Ride Request</p>
            <p className="text-xs text-white/60">
              {new Date(ride.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
            statusColors[ride.status] || 'bg-slate-100 text-slate-600'
          }`}
        >
          {ride.status.replace('_', ' ')}
        </span>
      </div>

      <div className="space-y-3 mb-4">
        <div className="p-3 bg-black/30 rounded-xl">
          <p className="text-xs text-white/50 mb-1">Pickup</p>
          <p className="text-sm text-white font-medium">{ride.pickupAddress}</p>
        </div>
        <div className="p-3 bg-black/30 rounded-xl">
          <p className="text-xs text-white/50 mb-1">Drop</p>
          <p className="text-sm text-white font-medium">{ride.dropAddress}</p>
        </div>
      </div>

      <div className="flex justify-between items-center text-sm text-white/60 mb-4">
        <span>Distance: {ride.distance}</span>
        <span className="font-bold text-white text-lg">₹{ride.price}</span>
      </div>

      {isDriverView && ride.status === 'searching' && onAccept && (
        <Button onClick={() => onAccept(ride.id)} className="w-full">
          <CheckCircle size={18} className="mr-2" /> Accept Ride
        </Button>
      )}

      {!isDriverView && ride.status === 'searching' && onCancel && (
        <Button variant="danger" onClick={() => onCancel(ride.id)} className="w-full">
          <X size={18} className="mr-2" /> Cancel Request
        </Button>
      )}
    </Card>
  );
};

export default RideCard;
