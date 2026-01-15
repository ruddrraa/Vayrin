import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { AnimatePresence } from 'framer-motion';
import { Ambulance as AmbulanceIcon, Users, Droplet, Settings, MapPin, Truck, ShoppingBag } from 'lucide-react';
import { toast } from '../lib/toast';

// Component imports
import { DashboardLayout, Header } from '../components/layout';
import { Button, Input, Label, Card } from '../components/common';
import { FleetList } from '../components/fleet';
import { DriverList } from '../components/drivers';
import { BloodStockTable, InventoryTable } from '../components/inventory';
import { BloodLogistics, InterHospitalOrders } from '../components/logistics';
import { inventoryService } from '../src/services/inventoryService';
import { supabase } from '../supabaseClient';
import type { BloodInventory, BloodBankDetails, BloodComponent } from '../types';

type TabType = 'FLEET' | 'BLOOD' | 'LOGISTICS' | 'INTER_ORDERS' | 'DRIVERS' | 'PROFILE';

// Feature flag for new inventory structure
const USE_NEW_INVENTORY = true;

export default function HospitalDashboard() {
  const {
    logout,
    currentUser,
    hospitalStatus,
    toggleHospitalStatus,
    updateProfile,
    ambulances,
    addAmbulance,
    updateAmbulance,
    deleteAmbulance,
    drivers,
    addDriver,
    updateDriver,
    deleteDriver,
    bloodStock,
    addBloodStock,
    updateBloodStock,
    deleteBloodStock,
  } = useApp();

  // New Inventory State
  const [bloodBankDetails, setBloodBankDetails] = useState<BloodBankDetails | null>(null);
  const [inventory, setInventory] = useState<BloodInventory[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  // Persist Active Tab state using localStorage
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hospitalDashboardTab');
      if (saved && ['FLEET', 'BLOOD', 'LOGISTICS', 'INTER_ORDERS', 'DRIVERS', 'ORDERS', 'PROFILE'].includes(saved)) {
        return saved as TabType;
      }
    }
    return 'FLEET';
  });

  // Load new inventory structure
  const loadInventory = useCallback(async () => {
    if (!currentUser?.id || !USE_NEW_INVENTORY) return;
    
    setIsLoadingInventory(true);
    try {
      // Get or create blood bank details
      let bankDetails = await inventoryService.getBloodBankDetails(currentUser.id);
      
      if (!bankDetails) {
        // Create blood bank details for this hospital
        bankDetails = await inventoryService.createBloodBankDetails({
          hospitalId: currentUser.id,
          licenseNumber: `WB/BB/${new Date().getFullYear()}/${Math.floor(Math.random() * 100)}`,
          bankType: 'PRIVATE',
        });
      }
      
      setBloodBankDetails(bankDetails);
      
      // Get inventory with components and batches
      const inv = await inventoryService.getInventory(bankDetails.id);
      setInventory(inv);
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setIsLoadingInventory(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (activeTab === 'BLOOD' && USE_NEW_INVENTORY) {
      loadInventory();
    }
  }, [activeTab, loadInventory]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!bloodBankDetails?.id) return;
    
    const subscription = inventoryService.subscribeToInventory(bloodBankDetails.id, () => {
      loadInventory();
    });
    
    return () => {
      inventoryService.unsubscribeFromInventory(bloodBankDetails.id);
    };
  }, [bloodBankDetails?.id, loadInventory]);

  useEffect(() => {
    localStorage.setItem('hospitalDashboardTab', activeTab);
  }, [activeTab]);

  // Filter resources to show only this hospital's data
  const myAmbulances = ambulances.filter((a) => a.hospitalId === currentUser?.id);
  const myDrivers = drivers.filter((d) => d.hospitalId === currentUser?.id);
  const myBloodStock = bloodStock.filter((b) => b.hospitalId === currentUser?.id);

  // Profile Form State
  const [pName, setPName] = useState(currentUser?.name || '');
  const [pAddress, setPAddress] = useState(currentUser?.address || '');
  const [pCity, setPCity] = useState(currentUser?.city || '');
  const [pPhone, setPPhone] = useState(currentUser?.phone || '');
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  // Sync profile state when currentUser changes
  useEffect(() => {
    setPName(currentUser?.name || '');
    setPAddress(currentUser?.address || '');
    setPCity(currentUser?.city || '');
    setPPhone(currentUser?.phone || '');
  }, [currentUser?.id, currentUser?.name, currentUser?.address, currentUser?.city, currentUser?.phone]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProfile(true);
    try {
      await updateProfile({
        name: pName,
        address: pAddress,
        city: pCity,
        phone: pPhone,
      });
      toast.success('Profile Updated Successfully!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update profile');
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  // Handle blood request from logistics
  const handleRequestBlood = async (supplyingHospitalId: string, component: BloodComponent, quantity: number, urgency: 'NORMAL' | 'URGENT' | 'CRITICAL' = 'NORMAL') => {
    if (!currentUser?.id || !currentUser?.name) return;
    
    try {
      // Get supplying hospital name
      const { data: supplyingHospital } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', supplyingHospitalId)
        .single();

      const { error } = await supabase.from('inter_hospital_orders').insert({
        requesting_hospital_id: currentUser.id,
        requesting_hospital_name: currentUser.name,
        supplying_hospital_id: supplyingHospitalId,
        supplying_hospital_name: supplyingHospital?.name || 'Unknown',
        component_id: component.id,
        component_name: component.displayName,
        blood_group: component.inventoryId, // Will need to pass blood group separately
        quantity,
        price_per_unit: component.processingCharge,
        total_amount: quantity * component.processingCharge,
        status: 'PENDING',
        urgency,
      });

      if (error) throw error;
      toast.success(`Blood request sent successfully! ${urgency !== 'NORMAL' ? `(${urgency})` : ''}`);
      setActiveTab('INTER_ORDERS');
    } catch (error) {
      console.error('Failed to create blood request:', error);
      toast.error('Failed to send request. Please try again.');
    }
  };

  // Tab configuration
  const tabs = [
    { id: 'FLEET', label: 'Fleet Command', icon: <AmbulanceIcon size={24} /> },
    { id: 'DRIVERS', label: 'Personnel', icon: <Users size={24} /> },
    { id: 'BLOOD', label: 'Blood Bank', icon: <Droplet size={24} /> },
    { id: 'LOGISTICS', label: 'Blood Logistics', icon: <Truck size={24} /> },
    { id: 'INTER_ORDERS', label: 'Hospital Orders', icon: <ShoppingBag size={24} /> },
    { id: 'PROFILE', label: 'Settings', icon: <Settings size={24} /> },
  ];

  // Status toggle component
  const StatusToggle = () => (
    <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/10 shadow-sm backdrop-blur">
      <button
        onClick={() => !hospitalStatus && toggleHospitalStatus()}
        className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
          hospitalStatus ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white'
        }`}
      >
        OPEN
      </button>
      <button
        onClick={() => hospitalStatus && toggleHospitalStatus()}
        className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
          !hospitalStatus ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white'
        }`}
      >
        CLOSED
      </button>
    </div>
  );

  // Hospital status subtitle
  const StatusSubtitle = () => (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${
          hospitalStatus ? 'bg-white animate-pulse' : 'bg-white/30'
        }`}
      />
      <p className="text-white/60 text-sm">
        Status:{' '}
        <span className={hospitalStatus ? 'text-white font-bold' : 'text-white/50 font-bold'}>
          {hospitalStatus ? 'Hospital Open' : 'Hospital Closed'}
        </span>
      </p>
    </div>
  );

  const getTitleForTab = (tab: TabType) => {
    switch (tab) {
      case 'FLEET':
        return 'Ambulance Fleet';
      case 'BLOOD':
        return 'Blood Inventory';
      case 'LOGISTICS':
        return 'Blood Logistics';
      case 'INTER_ORDERS':
        return 'Inter-Hospital Orders';
      case 'PROFILE':
        return 'Hospital Profile';
      case 'DRIVERS':
        return 'Driver Management';
      default:
        return '';
    }
  };

  return (
    <DashboardLayout
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as TabType)}
      onLogout={logout}
    >
      {/* Header with status toggle */}
      {activeTab !== 'PROFILE' && (
        <Header
          title={getTitleForTab(activeTab)}
          subtitle={<StatusSubtitle />}
          actions={<StatusToggle />}
        />
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'FLEET' && (
          <FleetList
            ambulances={myAmbulances}
            drivers={myDrivers}
            onAdd={addAmbulance}
            onUpdate={updateAmbulance}
            onDelete={deleteAmbulance}
          />
        )}

        {activeTab === 'DRIVERS' && (
          <DriverList
            drivers={myDrivers}
            onAdd={addDriver}
            onUpdate={updateDriver}
            onDelete={deleteDriver}
          />
        )}

        {activeTab === 'BLOOD' && USE_NEW_INVENTORY && bloodBankDetails && (
          <InventoryTable
            inventory={inventory}
            bloodBankId={bloodBankDetails.id}
            onRefresh={loadInventory}
          />
        )}

        {activeTab === 'BLOOD' && !USE_NEW_INVENTORY && (
          <BloodStockTable
            bloodStock={myBloodStock}
            onAdd={addBloodStock}
            onUpdate={updateBloodStock}
            onDelete={deleteBloodStock}
          />
        )}

        {activeTab === 'LOGISTICS' && currentUser?.id && (
          <BloodLogistics
            currentHospitalId={currentUser.id}
            currentHospitalCity={currentUser.city}
            onRequestBlood={handleRequestBlood}
          />
        )}

        {activeTab === 'INTER_ORDERS' && currentUser?.id && (
          <InterHospitalOrders
            currentHospitalId={currentUser.id}
            currentHospitalName={currentUser.name || 'Unknown Hospital'}
          />
        )}

        {activeTab === 'PROFILE' && (
          <div className="max-w-2xl mx-auto">
            <Header title="Hospital Profile" />
            <Card>
              <div className="mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-white">Hospital Settings</h3>
                <p className="text-white/50 text-sm">Manage your contact details and visibility.</p>
              </div>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <Label>Hospital Name</Label>
                  <Input value={pName} onChange={(e) => setPName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Phone Contact</Label>
                    <Input
                      value={pPhone}
                      onChange={(e) => setPPhone(e.target.value)}
                      placeholder="+91 12345 67890"
                    />
                  </div>
                  <div>
                    <Label>City / Region</Label>
                    <Input
                      value={pCity}
                      onChange={(e) => setPCity(e.target.value)}
                      placeholder="e.g. New Delhi"
                    />
                  </div>
                </div>
                <div>
                  <Label>Full Address</Label>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2">
                    <MapPin size={20} className="text-white/40" />
                    <input
                      className="w-full bg-transparent outline-none text-white placeholder:text-white/40"
                      value={pAddress}
                      onChange={(e) => setPAddress(e.target.value)}
                      placeholder="123 Emergency Lane, Delhi"
                    />
                  </div>
                </div>
                <div className="pt-4">
                  <Button
                    type="submit"
                    isLoading={isSubmittingProfile}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
