import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Phone, Clock, X, CheckCircle } from 'lucide-react';
import { Card, Button } from '../common';
import { RideRequest, RideStatus } from '../../types';

interface RideTrackerProps {
  ride: RideRequest;
  onStatusUpdate?: (status: RideStatus) => void;
  onCancel?: () => void;
  isDriver?: boolean;
  simulatedLocation?: { lat: number; lng: number } | null;
  countdown?: number;
  phase?: 'to_pickup' | 'arriving' | 'waiting_at_pickup' | 'to_drop' | 'completing' | null;
}

export const RideTracker: React.FC<RideTrackerProps> = ({
  ride,
  onStatusUpdate,
  onCancel,
  isDriver = false,
  countdown = 0,
  phase,
}) => {
  const getPhaseText = () => {
    switch (phase) {
      case 'to_pickup':
        return 'Driver is on the way';
      case 'arriving':
        return 'Driver arriving soon';
      case 'waiting_at_pickup':
        return 'Driver waiting at pickup';
      case 'to_drop':
        return 'En route to destination';
      case 'completing':
        return 'Arriving at destination';
      default:
        return ride.status === 'searching' ? 'Finding driver...' : 'Ride in progress';
    }
  };

  const statusColors: Record<string, string> = {
    searching: 'text-yellow-500',
    accepted: 'text-blue-500',
    in_progress: 'text-green-500',
    completed: 'text-emerald-500',
    cancelled: 'text-red-500',
  };

  return (
    <Card className="border border-white/10 bg-black/50 backdrop-blur-xl">
      {/* Status Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <motion.p
            key={phase || ride.status}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-lg font-bold ${statusColors[ride.status] || 'text-white'}`}
          >
            {getPhaseText()}
          </motion.p>
          {countdown > 0 && (
            <p className="text-sm text-white/60 flex items-center gap-2">
              <Clock size={14} /> {countdown}s remaining
            </p>
          )}
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
            ride.status === 'searching'
              ? 'bg-yellow-500/20 text-yellow-500'
              : ride.status === 'accepted'
              ? 'bg-blue-500/20 text-blue-500'
              : 'bg-green-500/20 text-green-500'
          }`}
        >
          {ride.status.replace('_', ' ')}
        </div>
      </div>

      {/* Locations */}
      <div className="space-y-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <MapPin size={16} className="text-emerald-500" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-white/50">Pickup</p>
            <p className="text-sm text-white font-medium">{ride.pickupAddress}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center">
            <Navigation size={16} className="text-rose-500" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-white/50">Drop</p>
            <p className="text-sm text-white font-medium">{ride.dropAddress}</p>
          </div>
        </div>
      </div>

      {/* Fare & Distance */}
      <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl mb-6">
        <div>
          <p className="text-xs text-white/50">Estimated Fare</p>
          <p className="text-2xl font-bold text-white">₹{ride.price}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/50">Distance</p>
          <p className="text-lg font-semibold text-white">{ride.distance}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {isDriver ? (
          <>
            {ride.status === 'accepted' && onStatusUpdate && (
              <Button
                onClick={() => onStatusUpdate('in_progress')}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle size={18} className="mr-2" /> Start Ride
              </Button>
            )}
            {ride.status === 'in_progress' && onStatusUpdate && (
              <Button
                onClick={() => onStatusUpdate('completed')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle size={18} className="mr-2" /> Complete Ride
              </Button>
            )}
          </>
        ) : (
          <>
            {ride.driverId && (
              <Button variant="secondary" className="flex-1">
                <Phone size={18} className="mr-2" /> Call Driver
              </Button>
            )}
            {ride.status === 'searching' && onCancel && (
              <Button variant="danger" onClick={onCancel} className="flex-1">
                <X size={18} className="mr-2" /> Cancel
              </Button>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

export default RideTracker;
