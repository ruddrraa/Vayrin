import React, { useState, useEffect, useMemo } from 'react';
import { Button, Input, Select, Label } from '../common';
import { Ambulance, AmbulanceType, Driver } from '../../types';
import { User, Users, AlertCircle } from 'lucide-react';

interface AmbulanceFormProps {
  initialData?: Ambulance | null;
  allAmbulances: Ambulance[];
  drivers: Driver[];
  onSubmit: (data: Omit<Ambulance, 'id' | 'location' | 'hospitalId'>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const AmbulanceForm: React.FC<AmbulanceFormProps> = ({
  initialData,
  allAmbulances,
  drivers,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [plate, setPlate] = useState(initialData?.plateNumber || '');
  const [type, setType] = useState<AmbulanceType>(initialData?.type || 'BASIC');
  const [baseCharge, setBaseCharge] = useState(initialData?.baseCharge || 50);
  const [pricePerKm, setPricePerKm] = useState(initialData?.pricePerKm || 5);
  const [primaryDriverId, setPrimaryDriverId] = useState<string>(initialData?.primaryDriverId || '');
  const [alternateDriverId, setAlternateDriverId] = useState<string>(initialData?.alternateDriverId || '');

  useEffect(() => {
    if (initialData) {
      setPlate(initialData.plateNumber);
      setType(initialData.type);
      setBaseCharge(initialData.baseCharge);
      setPricePerKm(initialData.pricePerKm);
      setPrimaryDriverId(initialData.primaryDriverId || '');
      setAlternateDriverId(initialData.alternateDriverId || '');
    }
  }, [initialData]);

  // Calculate driver availability
  // Rule: A driver can be assigned to max 2 ambulances (1 primary + 1 alternate)
  const driverAssignments = useMemo(() => {
    const assignments: Record<string, { primaryCount: number; alternateCount: number; ambulanceIds: string[] }> = {};
    
    // Initialize all drivers
    drivers.forEach(driver => {
      assignments[driver.id] = { primaryCount: 0, alternateCount: 0, ambulanceIds: [] };
    });
    
    // Count assignments from all ambulances (excluding current one being edited)
    allAmbulances.forEach(amb => {
      if (initialData && amb.id === initialData.id) return; // Skip current ambulance
      
      if (amb.primaryDriverId && assignments[amb.primaryDriverId]) {
        assignments[amb.primaryDriverId].primaryCount++;
        assignments[amb.primaryDriverId].ambulanceIds.push(amb.id);
      }
      if (amb.alternateDriverId && assignments[amb.alternateDriverId]) {
        assignments[amb.alternateDriverId].alternateCount++;
        assignments[amb.alternateDriverId].ambulanceIds.push(amb.id);
      }
    });
    
    return assignments;
  }, [allAmbulances, drivers, initialData]);

  // Get available drivers for primary role
  const availablePrimaryDrivers = useMemo(() => {
    return drivers.filter(driver => {
      const assignment = driverAssignments[driver.id];
      if (!assignment) return false;
      
      // Already assigned as primary to another ambulance? Not available for primary
      if (assignment.primaryCount >= 1) return false;
      
      // If already primary(1) + alternate(1) = 2 assignments, not available
      const totalAssignments = assignment.primaryCount + assignment.alternateCount;
      if (totalAssignments >= 2) return false;
      
      // If this driver is selected as alternate for current ambulance, they can't be primary
      if (alternateDriverId === driver.id) return false;
      
      return true;
    });
  }, [drivers, driverAssignments, alternateDriverId]);

  // Get available drivers for alternate role
  const availableAlternateDrivers = useMemo(() => {
    return drivers.filter(driver => {
      const assignment = driverAssignments[driver.id];
      if (!assignment) return false;
      
      // Already assigned as alternate to another ambulance? Not available for alternate
      if (assignment.alternateCount >= 1) return false;
      
      // If already primary(1) + alternate(1) = 2 assignments, not available
      const totalAssignments = assignment.primaryCount + assignment.alternateCount;
      if (totalAssignments >= 2) return false;
      
      // If this driver is selected as primary for current ambulance, they can't be alternate too
      if (primaryDriverId === driver.id) return false;
      
      return true;
    });
  }, [drivers, driverAssignments, primaryDriverId]);

  // Get driver name by ID
  const getDriverName = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver?.name || '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get primary driver name for legacy field
    const primaryDriverName = primaryDriverId ? getDriverName(primaryDriverId) : '';
    
    await onSubmit({
      plateNumber: plate,
      driverName: primaryDriverName, // Legacy field
      primaryDriverId: primaryDriverId || null,
      alternateDriverId: alternateDriverId || null,
      type,
      baseCharge,
      pricePerKm,
      status: initialData?.status || 'AVAILABLE',
      equipment: type === 'ICU' ? ['Oxygen', 'Ventilator'] : ['Stretcher'],
      heading: 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Plate Number</Label>
          <Input
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            required
            placeholder="DL 01 AB 1234"
          />
        </div>
        <div>
          <Label>Type</Label>
          <Select value={type} onChange={(e) => setType(e.target.value as AmbulanceType)}>
            <option value="BASIC">Basic</option>
            <option value="ADVANCED">Advanced</option>
            <option value="ICU">ICU</option>
          </Select>
        </div>
      </div>

      {/* Driver Assignment Section */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-white/80 text-sm font-semibold">
          <Users size={16} />
          Driver Assignment
        </div>
        
        {drivers.length === 0 ? (
          <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 p-3 rounded-lg">
            <AlertCircle size={16} />
            No drivers added yet. Add drivers in Personnel section first.
          </div>
        ) : (
          <>
            {/* Primary Driver */}
            <div>
              <Label className="flex items-center gap-2">
                <User size={14} className="text-emerald-400" />
                Primary Driver
              </Label>
              <Select 
                value={primaryDriverId} 
                onChange={(e) => setPrimaryDriverId(e.target.value)}
              >
                <option value="">-- Select Primary Driver --</option>
                {availablePrimaryDrivers.map(driver => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name} ({driver.status})
                  </option>
                ))}
                {/* Show currently assigned driver even if not in available list (for editing) */}
                {primaryDriverId && !availablePrimaryDrivers.find(d => d.id === primaryDriverId) && (
                  <option value={primaryDriverId}>
                    {getDriverName(primaryDriverId)} (Currently Assigned)
                  </option>
                )}
              </Select>
              <p className="text-xs text-white/40 mt-1">
                {availablePrimaryDrivers.length} driver(s) available for primary role
              </p>
            </div>

            {/* Alternate Driver */}
            <div>
              <Label className="flex items-center gap-2">
                <Users size={14} className="text-blue-400" />
                Alternate Driver (Optional)
              </Label>
              <Select 
                value={alternateDriverId} 
                onChange={(e) => setAlternateDriverId(e.target.value)}
              >
                <option value="">-- No Alternate Driver --</option>
                {availableAlternateDrivers.map(driver => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name} ({driver.status})
                  </option>
                ))}
                {/* Show currently assigned driver even if not in available list (for editing) */}
                {alternateDriverId && !availableAlternateDrivers.find(d => d.id === alternateDriverId) && (
                  <option value={alternateDriverId}>
                    {getDriverName(alternateDriverId)} (Currently Assigned)
                  </option>
                )}
              </Select>
              <p className="text-xs text-white/40 mt-1">
                {availableAlternateDrivers.length} driver(s) available for alternate role
              </p>
            </div>
          </>
        )}
        
        <p className="text-xs text-white/30 border-t border-white/10 pt-3">
          ℹ️ Each driver can be assigned to max 2 ambulances (1 as primary, 1 as alternate)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Base Charge (₹)</Label>
          <Input
            type="number"
            value={baseCharge}
            onChange={(e) => setBaseCharge(Number(e.target.value))}
            required
          />
        </div>
        <div>
          <Label>Per Km (₹)</Label>
          <Input
            type="number"
            value={pricePerKm}
            onChange={(e) => setPricePerKm(Number(e.target.value))}
            required
          />
        </div>
      </div>

      <div className="pt-4 flex gap-3">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting} className="flex-1">
          {initialData ? 'Update' : 'Save'}
        </Button>
      </div>
    </form>
  );
};

export default AmbulanceForm;
