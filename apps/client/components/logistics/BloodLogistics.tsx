import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Phone, Clock, ChevronDown, ChevronUp, Package, ShoppingCart, Building2, AlertTriangle } from 'lucide-react';
import { inventoryService } from '../../src/services/inventoryService';
import type { BloodInventory, BloodComponent } from '../../types';

export type UrgencyLevel = 'NORMAL' | 'URGENT' | 'CRITICAL';

interface BloodLogisticsProps {
  currentHospitalId: string;
  currentHospitalCity?: string;
  onRequestBlood: (hospitalId: string, component: BloodComponent, quantity: number, urgency: UrgencyLevel) => void;
}

interface HospitalInventory {
  hospitalId: string;
  hospitalName: string;
  city: string;
  address: string;
  bloodBankId: string;
  inventory: BloodInventory[];
}

export const BloodLogistics: React.FC<BloodLogisticsProps> = ({
  currentHospitalId,
  currentHospitalCity,
  onRequestBlood,
}) => {
  const [hospitals, setHospitals] = useState<HospitalInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string>('ALL');
  const [expandedHospitals, setExpandedHospitals] = useState<Set<string>>(new Set());
  const [requestingComponent, setRequestingComponent] = useState<{
    hospitalId: string;
    component: BloodComponent;
  } | null>(null);
  const [requestQuantity, setRequestQuantity] = useState(1);
  const [requestUrgency, setRequestUrgency] = useState<UrgencyLevel>('NORMAL');

  useEffect(() => {
    loadAllInventory();
  }, [currentHospitalId, currentHospitalCity]);

  const loadAllInventory = async () => {
    setIsLoading(true);
    try {
      const allInventory = await inventoryService.getAllAvailableInventory();
      
      console.log('=== BloodLogistics Debug ===');
      console.log('All inventory loaded:', allInventory);
      console.log('Current hospital ID:', currentHospitalId);
      console.log('Current hospital city:', currentHospitalCity);
      console.log('Number of inventory items:', allInventory.length);
      
      // Log each inventory item's hospital details
      allInventory.forEach((inv: any, idx: number) => {
        console.log(`Item ${idx}:`, {
          bloodGroup: inv.bloodGroup,
          hospitalId: inv.bloodBank?.hospital?.id || inv.bloodBank?.hospitalId,
          hospitalName: inv.bloodBank?.hospital?.name,
          hospitalCity: inv.bloodBank?.hospital?.city,
        });
      });
      
      // Group by hospital and exclude current hospital
      const hospitalMap = new Map<string, HospitalInventory>();
      
      allInventory.forEach((inv: any) => {
        const hospitalId = inv.bloodBank?.hospital?.id || inv.bloodBank?.hospitalId;
        const hospitalCity = inv.bloodBank?.hospital?.city || '';
        
        console.log(`Processing inventory for hospital ${hospitalId}, city: "${hospitalCity}"`);
        
        // Skip if same hospital OR different city (when city filter is enabled)
        if (!hospitalId || hospitalId === currentHospitalId) {
          console.log(`  -> Skipping: same hospital or no hospitalId`);
          return;
        }
        
        // Filter by same city ONLY if currentHospitalCity is provided and has a value
        if (currentHospitalCity) {
          const normalizedCurrentCity = currentHospitalCity.toLowerCase().trim();
          const normalizedHospitalCity = (hospitalCity || '').toLowerCase().trim();
          console.log(`  -> City comparison: "${normalizedHospitalCity}" vs "${normalizedCurrentCity}"`);
          
          // Skip if other hospital has a city that doesn't match
          if (normalizedHospitalCity && normalizedCurrentCity !== normalizedHospitalCity) {
            console.log(`  -> Skipping: different city`);
            return;
          }
          // If other hospital has no city set, we allow it (they haven't set their city)
        }
        // If currentHospitalCity is not set, show all hospitals (no city filtering)
        
        console.log(`  -> Adding to results`);
        
        if (!hospitalMap.has(hospitalId)) {
          hospitalMap.set(hospitalId, {
            hospitalId,
            hospitalName: inv.bloodBank?.hospital?.name || 'Unknown Hospital',
            city: hospitalCity,
            address: inv.bloodBank?.hospital?.address || '',
            bloodBankId: inv.bloodBank?.id,
            inventory: [],
          });
        }
        
        hospitalMap.get(hospitalId)!.inventory.push(inv);
      });
      
      console.log('Final hospitals in same city:', Array.from(hospitalMap.values()));
      setHospitals(Array.from(hospitalMap.values()));
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleHospital = (hospitalId: string) => {
    const newSet = new Set(expandedHospitals);
    if (newSet.has(hospitalId)) {
      newSet.delete(hospitalId);
    } else {
      newSet.add(hospitalId);
    }
    setExpandedHospitals(newSet);
  };

  const filteredHospitals = hospitals.filter((h) => {
    const matchesSearch = 
      h.hospitalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.city.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedBloodGroup === 'ALL') return matchesSearch;
    
    return matchesSearch && h.inventory.some(inv => 
      inv.bloodGroup === selectedBloodGroup && inv.totalUnitsAvailable > 0
    );
  });

  const handleRequest = () => {
    if (requestingComponent) {
      onRequestBlood(
        requestingComponent.hospitalId,
        requestingComponent.component,
        requestQuantity,
        requestUrgency
      );
      setRequestingComponent(null);
      setRequestQuantity(1);
      setRequestUrgency('NORMAL');
    }
  };

  const BLOOD_GROUPS = [
    'ALL', 'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE',
    'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'
  ];

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
          <input
            type="text"
            placeholder="Search hospitals by name or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>
        <select
          value={selectedBloodGroup}
          onChange={(e) => setSelectedBloodGroup(e.target.value)}
          className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none cursor-pointer"
        >
          {BLOOD_GROUPS.map((bg) => (
            <option key={bg} value={bg} className="bg-black text-white">
              {bg === 'ALL' ? 'All Blood Groups' : inventoryService.bloodGroupToDisplay(bg as any)}
            </option>
          ))}
        </select>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white/50 text-sm">Available Hospitals</p>
          <p className="text-2xl font-bold text-white">{hospitals.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white/50 text-sm">Total Blood Groups</p>
          <p className="text-2xl font-bold text-white">
            {hospitals.reduce((acc, h) => acc + h.inventory.length, 0)}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white/50 text-sm">Total Units</p>
          <p className="text-2xl font-bold text-emerald-400">
            {hospitals.reduce((acc, h) => 
              acc + h.inventory.reduce((sum, inv) => sum + inv.totalUnitsAvailable, 0), 0
            )}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white/50 text-sm">Cities Covered</p>
          <p className="text-2xl font-bold text-white">
            {new Set(hospitals.map(h => h.city).filter(Boolean)).size}
          </p>
        </div>
      </div>

      {/* Hospital List */}
      {isLoading ? (
        <div className="text-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto mb-4" />
          <p className="text-white/50">Loading inventory from hospitals in your city...</p>
        </div>
      ) : filteredHospitals.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
          <Building2 size={48} className="mx-auto text-white/30 mb-4" />
          <p className="text-white/50">No hospitals found in your city with blood inventory.</p>
          {currentHospitalCity && (
            <p className="text-white/30 text-sm mt-2">
              Showing results for: <span className="text-white/50 font-semibold">{currentHospitalCity}</span>
            </p>
          )}
          <p className="text-white/30 text-sm mt-1">
            Make sure other hospitals in your city have added blood inventory.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHospitals.map((hospital) => (
            <motion.div
              key={hospital.hospitalId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
            >
              {/* Hospital Header */}
              <button
                onClick={() => toggleHospital(hospital.hospitalId)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Building2 size={24} className="text-blue-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-white">{hospital.hospitalName}</h3>
                    <div className="flex items-center gap-3 text-sm text-white/50">
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {hospital.city || 'Location N/A'}
                      </span>
                      <span>•</span>
                      <span>{hospital.inventory.length} blood groups</span>
                      <span>•</span>
                      <span className="text-emerald-400">
                        {hospital.inventory.reduce((sum, inv) => sum + inv.totalUnitsAvailable, 0)} units
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Blood Group Pills */}
                  <div className="hidden md:flex gap-1">
                    {hospital.inventory.slice(0, 4).map((inv) => (
                      <span
                        key={inv.id}
                        className="px-2 py-1 bg-rose-500/20 text-rose-400 text-xs font-bold rounded-lg"
                      >
                        {inventoryService.bloodGroupToDisplay(inv.bloodGroup)}
                      </span>
                    ))}
                    {hospital.inventory.length > 4 && (
                      <span className="px-2 py-1 bg-white/10 text-white/50 text-xs rounded-lg">
                        +{hospital.inventory.length - 4}
                      </span>
                    )}
                  </div>
                  {expandedHospitals.has(hospital.hospitalId) ? (
                    <ChevronUp size={20} className="text-white/50" />
                  ) : (
                    <ChevronDown size={20} className="text-white/50" />
                  )}
                </div>
              </button>

              {/* Expanded Inventory */}
              <AnimatePresence>
                {expandedHospitals.has(hospital.hospitalId) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 py-4 bg-black/20 border-t border-white/10">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {hospital.inventory.map((inv) => (
                          <div
                            key={inv.id}
                            className="bg-white/5 rounded-xl p-4 border border-white/10"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
                                  <span className="text-rose-400 font-bold text-sm">
                                    {inventoryService.bloodGroupToDisplay(inv.bloodGroup)}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-semibold text-white">
                                    {inventoryService.bloodGroupToDisplay(inv.bloodGroup)}
                                  </p>
                                  <p className="text-xs text-white/50">
                                    {inv.totalUnitsAvailable} units total
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Components */}
                            {inv.components && inv.components.length > 0 ? (
                              <div className="space-y-2">
                                {inv.components.map((comp) => (
                                  <div
                                    key={comp.id}
                                    className="flex items-center justify-between py-2 px-3 bg-black/20 rounded-lg"
                                  >
                                    <div>
                                      <p className="text-sm text-white">{comp.displayName}</p>
                                      <p className="text-xs text-white/50">
                                        {comp.availableUnits} units · ₹{comp.processingCharge}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => setRequestingComponent({
                                        hospitalId: hospital.hospitalId,
                                        component: comp,
                                      })}
                                      disabled={comp.availableUnits === 0}
                                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-white/10 disabled:text-white/30 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1"
                                    >
                                      <ShoppingCart size={12} />
                                      Request
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-white/40 text-sm text-center py-2">
                                No components listed
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Request Modal */}
      {requestingComponent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4"
          >
            <h3 className="text-xl font-bold text-white mb-4">Request Blood Component</h3>
            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white font-medium">{requestingComponent.component.displayName}</p>
                <p className="text-white/50 text-sm">
                  Available: {requestingComponent.component.availableUnits} units
                </p>
                <p className="text-white/50 text-sm">
                  Price: ₹{requestingComponent.component.processingCharge} per unit
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 mb-2">
                  Quantity Required
                </label>
                <input
                  type="number"
                  value={requestQuantity}
                  onChange={(e) => setRequestQuantity(Math.min(
                    Number(e.target.value),
                    requestingComponent.component.availableUnits
                  ))}
                  min={1}
                  max={requestingComponent.component.availableUnits}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              {/* Urgency Selector */}
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-2">
                  <AlertTriangle size={12} className="inline mr-1" />
                  Urgency Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['NORMAL', 'URGENT', 'CRITICAL'] as UrgencyLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setRequestUrgency(level)}
                      className={`px-3 py-3 rounded-xl text-sm font-semibold transition-all border ${
                        requestUrgency === level
                          ? level === 'CRITICAL'
                            ? 'bg-red-600/30 border-red-500 text-red-400'
                            : level === 'URGENT'
                            ? 'bg-orange-500/30 border-orange-500 text-orange-400'
                            : 'bg-slate-500/30 border-slate-400 text-slate-300'
                          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {level === 'CRITICAL' && '🔴 '}
                      {level === 'URGENT' && '🟠 '}
                      {level === 'NORMAL' && '⚪ '}
                      {level}
                    </button>
                  ))}
                </div>
                {requestUrgency === 'CRITICAL' && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Critical: Immediate attention required
                  </p>
                )}
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-blue-400 font-semibold">
                  Total: ₹{requestQuantity * requestingComponent.component.processingCharge}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setRequestingComponent(null);
                    setRequestUrgency('NORMAL');
                  }}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequest}
                  className={`flex-1 px-4 py-3 font-semibold rounded-xl transition-all ${
                    requestUrgency === 'CRITICAL'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : requestUrgency === 'URGENT'
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  Send Request
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BloodLogistics;
