
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button, Input, Select, Label } from '../components/ui';
import { Droplet, Ambulance as AmbulanceIcon, LogOut, Plus, Edit2, Trash2, X, Users, Eye, EyeOff, Package, Truck, CheckCircle, Settings, MapPin, Phone, Activity } from 'lucide-react';
import { motion as motionOriginal, AnimatePresence } from 'framer-motion';
import { BloodType, AmbulanceType, Ambulance, BloodStock, Driver, AmbulanceStatus, OrderStatus } from '../types';

const motion = motionOriginal as any;

export default function HospitalDashboard() {
  const { 
    logout, currentUser, hospitalStatus, toggleHospitalStatus, updateProfile,
    ambulances, addAmbulance, updateAmbulance, deleteAmbulance,
    drivers, addDriver, updateDriver, deleteDriver,
    bloodStock, addBloodStock, updateBloodStock, deleteBloodStock,
    incomingOrders, updateOrderStatus
  } = useApp();
  
  // Persist Active Tab state using localStorage
  const [activeTab, setActiveTab] = useState<'FLEET' | 'BLOOD' | 'DRIVERS' | 'ORDERS' | 'PROFILE'>(() => {
      if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('hospitalDashboardTab');
          if (saved && ['FLEET', 'BLOOD', 'DRIVERS', 'ORDERS', 'PROFILE'].includes(saved)) {
              return saved as 'FLEET' | 'BLOOD' | 'DRIVERS' | 'ORDERS' | 'PROFILE';
          }
      }
      return 'FLEET';
  });

  useEffect(() => {
      localStorage.setItem('hospitalDashboardTab', activeTab);
  }, [activeTab]);
  
  // Filter resources to show only this hospital's data
  const myAmbulances = ambulances.filter(a => a.hospitalId === currentUser?.id);
  const myDrivers = drivers.filter(d => d.hospitalId === currentUser?.id);
  const myBloodStock = bloodStock.filter(b => b.hospitalId === currentUser?.id);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fleet Form
  const [plate, setPlate] = useState('');
  const [driverRef, setDriverRef] = useState(''); 
  const [ambType, setAmbType] = useState<AmbulanceType>('BASIC');
  const [baseCharge, setBaseCharge] = useState(50);
  const [priceKm, setPriceKm] = useState(5);

  // Blood Form
  const [bType, setBType] = useState<BloodType>('O+');
  const [units, setUnits] = useState(1);
  const [bloodPrice, setBloodPrice] = useState(100);

  // Driver Form
  const [dName, setDName] = useState('');
  const [dLicense, setDLicense] = useState('');
  const [dContact, setDContact] = useState('');
  const [dWage, setDWage] = useState(20);
  const [dStatus, setDStatus] = useState<'ACTIVE' | 'OFF_DUTY'>('ACTIVE');

  // Profile Form State
  const [pName, setPName] = useState(currentUser?.name || '');
  const [pAddress, setPAddress] = useState(currentUser?.address || '');
  const [pCity, setPCity] = useState(currentUser?.city || '');
  const [pPhone, setPPhone] = useState(currentUser?.phone || '');
  const [pLogo, setPLogo] = useState(currentUser?.logoUrl || '');

  const resetForm = () => {
    setPlate(''); setDriverRef(''); setAmbType('BASIC'); setBaseCharge(50); setPriceKm(5);
    setBType('O+'); setUnits(1); setBloodPrice(100);
    setDName(''); setDLicense(''); setDContact(''); setDWage(20); setDStatus('ACTIVE');
    setEditingId(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (item: any, type: typeof activeTab) => {
    setEditingId(item.id);
    if (type === 'FLEET') {
      const amb = item as Ambulance;
      setPlate(amb.plateNumber); setDriverRef(amb.driverName); setAmbType(amb.type); setBaseCharge(amb.baseCharge); setPriceKm(amb.pricePerKm);
    } else if (type === 'BLOOD') {
      const stock = item as BloodStock;
      setBType(stock.type); setUnits(stock.units); setBloodPrice(stock.price);
    } else if (type === 'DRIVERS') {
      const drv = item as Driver;
      setDName(drv.name); setDLicense(drv.licenseNumber); setDContact(drv.contact); setDWage(drv.hourlyWage); setDStatus(drv.status as any);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        if (activeTab === 'FLEET') {
            const data = { plateNumber: plate, driverName: driverRef, type: ambType, baseCharge, pricePerKm: priceKm, status: 'AVAILABLE' as const, equipment: ambType === 'ICU' ? ['Oxygen', 'Ventilator'] : ['Stretcher'] };
            editingId ? await updateAmbulance(editingId, data) : await addAmbulance(data);
        } else if (activeTab === 'BLOOD') {
            const data = { type: bType, units, price: bloodPrice, expiryDate: '2025-06-01', isPaused: false };
            editingId ? await updateBloodStock(editingId, data) : await addBloodStock(data);
        } else if (activeTab === 'DRIVERS') {
            const data = { name: dName, licenseNumber: dLicense, contact: dContact, hourlyWage: dWage, status: dStatus, totalHours: 0 };
            editingId ? await updateDriver(editingId, data) : await addDriver(data);
        }
        setIsModalOpen(false);
    } catch (error) {
        console.error(error);
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        await updateProfile({
            name: pName,
            address: pAddress,
            city: pCity,
            phone: pPhone,
            logoUrl: pLogo
        });
        alert("Profile Updated Successfully!");
    } catch(e) {
        console.error(e);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setPLogo(base64String);
        await updateProfile({ logoUrl: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen flex bg-black text-white">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-black/80 backdrop-blur-xl border-r border-white/10 flex flex-col items-center lg:items-start py-8 lg:px-6 fixed h-full z-20 transition-all duration-300 overflow-y-auto">
        <div className="mb-10 flex items-center gap-3 text-white font-bold text-2xl shrink-0">
           {/* VAYRIN Logo */}
           <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg shadow-black/40">
              <Activity className="text-black" size={20} />
           </div>
          <span className="hidden lg:block tracking-tight">VAYRIN</span>
        </div>
        
        <nav className="flex-1 w-full space-y-4 shrink-0">
          <button onClick={() => setActiveTab('FLEET')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${activeTab === 'FLEET' ? 'bg-white/10 text-white shadow-sm' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
            <AmbulanceIcon size={24} /> <span className="hidden lg:block font-medium">Fleet Command</span>
          </button>
          <button onClick={() => setActiveTab('DRIVERS')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${activeTab === 'DRIVERS' ? 'bg-white/10 text-white shadow-sm' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
            <Users size={24} /> <span className="hidden lg:block font-medium">Personnel</span>
          </button>
          <button onClick={() => setActiveTab('BLOOD')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${activeTab === 'BLOOD' ? 'bg-white/10 text-white shadow-sm' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
            <Droplet size={24} /> <span className="hidden lg:block font-medium">Blood Bank</span>
          </button>
           <button onClick={() => setActiveTab('ORDERS')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${activeTab === 'ORDERS' ? 'bg-white/10 text-white shadow-sm' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
            <Package size={24} /> <span className="hidden lg:block font-medium">Order Dispatch</span>
          </button>
          <button onClick={() => setActiveTab('PROFILE')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${activeTab === 'PROFILE' ? 'bg-white/10 text-white shadow-sm' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
            <Settings size={24} /> <span className="hidden lg:block font-medium">Settings</span>
          </button>
        </nav>

        <button onClick={logout} className="mt-8 lg:mt-auto flex items-center gap-4 text-white/60 hover:text-white px-4 mb-4 shrink-0 cursor-pointer">
          <LogOut size={24} /> <span className="hidden lg:block">Logout</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-20 lg:ml-64 p-4 lg:p-8">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white">
              {activeTab === 'FLEET' ? 'Ambulance Fleet' : activeTab === 'BLOOD' ? 'Blood Inventory' : activeTab === 'ORDERS' ? 'Incoming Orders' : activeTab === 'PROFILE' ? 'Hospital Profile' : 'Driver Management'}
            </h2>
            {activeTab !== 'PROFILE' && (
                <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${hospitalStatus ? 'bg-white animate-pulse' : 'bg-white/30'}`} />
                <p className="text-white/60 text-sm">
                    Status: <span className={hospitalStatus ? "text-white font-bold" : "text-white/50 font-bold"}>{hospitalStatus ? 'Hospital Open' : 'Hospital Closed'}</span>
                </p>
                </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
             {/* Hospital Open/Close Toggle */}
             {activeTab !== 'PROFILE' && (
              <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/10 shadow-sm backdrop-blur">
                    <button 
                    onClick={() => !hospitalStatus && toggleHospitalStatus()}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${hospitalStatus ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white'}`}
                    >
                    OPEN
                    </button>
                    <button 
                    onClick={() => hospitalStatus && toggleHospitalStatus()}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${!hospitalStatus ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white'}`}
                    >
                    CLOSED
                    </button>
                </div>
             )}
             
             {['FLEET', 'BLOOD', 'DRIVERS'].includes(activeTab) && (
               <Button onClick={openAddModal} className="bg-white text-black shadow-black/30 hover:bg-white/90">
                <Plus size={20} /> Add {activeTab === 'FLEET' ? 'Vehicle' : activeTab === 'BLOOD' ? 'Stock' : 'Driver'}
                </Button>
             )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'FLEET' && (
            <motion.div key="fleet" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myAmbulances.map((amb) => (
                <Card key={amb.id} className="relative group border border-slate-100 hover:border-blue-200 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl text-white ${amb.type === 'ICU' ? 'bg-rose-500 shadow-lg shadow-rose-500/20' : 'bg-blue-500 shadow-lg shadow-blue-500/20'}`}>
                        <AmbulanceIcon size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white/60">{amb.plateNumber}</h3>
                        <span className="text-xs text-white px-2 py-0.5 rounded font-medium">{amb.type}</span>
                      </div>
                    </div>
                    <select 
                      value={amb.status} 
                      onChange={(e) => updateAmbulance(amb.id, { status: e.target.value as AmbulanceStatus })}
                      className={`text-[10px] font-bold tracking-wide uppercase px-2 py-1 rounded-full outline-none cursor-pointer border-0 ${amb.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : amb.status === 'BUSY' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="BUSY">BUSY</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                    </select>
                  </div>
                  <div className="space-y-2 text-sm text-white mb-6 bg-black p-3 rounded-xl cursor-pointer">
                    <div className="flex justify-between"><span>Driver</span><span className="font-medium text-white/60">{amb.driverName}</span></div>
                    <div className="flex justify-between"><span>Base Rate</span><span className="font-medium text-white/60">${amb.baseCharge}</span></div>
                    <div className="flex justify-between"><span>Per Km</span><span className="font-medium text-white/60">${amb.pricePerKm}/km</span></div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => openEditModal(amb, 'FLEET')} className="flex-1 text-xs py-2 h-8"><Edit2 size={14} className="mr-1"/> Edit</Button>
                    <Button variant="danger" onClick={() => deleteAmbulance(amb.id)} className="flex-1 text-xs py-2 h-8 bg-rose-50 text-rose-600 hover:bg-rose-100 shadow-none"><Trash2 size={14} className="mr-1"/> Delete</Button>
                  </div>
                </Card>
              ))}
            </motion.div>
          )}

          {activeTab === 'DRIVERS' && (
             <motion.div key="drivers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {myDrivers.map(drv => (
                    <Card key={drv.id} className="border border-slate-100 hover:border-indigo-200">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                                {drv.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-white">{drv.name}</h3>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${drv.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                    <span className="text-xs text-white/60">{drv.status}</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm text-white mb-4 bg-black p-3 rounded-xl">
                            <div className="flex justify-between"><span>License</span> <span className="text-white/60 font-mono">{drv.licenseNumber}</span></div>
                            <div className="flex justify-between"><span>Wage</span> <span className="text-white/60">${drv.hourlyWage}/hr</span></div>
                            <div className="flex justify-between"><span>Hours</span> <span className="text-white/60">{drv.totalHours} hrs</span></div>
                        </div>
                         <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => openEditModal(drv, 'DRIVERS')} className="flex-1 text-xs py-2 h-8"><Edit2 size={14} className="mr-1"/> Edit</Button>
                            <Button variant="danger" onClick={() => deleteDriver(drv.id)} className="flex-1 text-xs py-2 h-8 bg-rose-50 text-rose-600 hover:bg-rose-100 shadow-none"><Trash2 size={14} className="mr-1"/> Remove</Button>
                        </div>
                    </Card>
                ))}
             </motion.div>
          )}

          {activeTab === 'BLOOD' && (
            <motion.div key="blood" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="overflow-hidden rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-xl shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-black/90 text-white/60 text-xs uppercase font-bold tracking-wider">
                  <tr><th className="p-6">Type</th><th className="p-6">Stock</th><th className="p-6">Price</th><th className="p-6">Market Visibility</th><th className="p-6 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-white/10 ">
                  {myBloodStock.map((stock) => (
                    <tr key={stock.id} className={`hoverblood bg-black ${stock.isPaused ? 'opacity-60 bg-slate-50' : ''}`}>
                      <td className="p-6"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-xs">{stock.type}</div></div></td>
                      <td className="p-6 font-medium text-slate-white">{stock.units} units</td>
                      <td className="p-6 text-white">₹{stock.price}</td>
                      <td className="p-6">
                        <button 
                            onClick={() => updateBloodStock(stock.id, { isPaused: !stock.isPaused })}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${!stock.isPaused ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}
                        >
                            {stock.isPaused ? <EyeOff size={12} /> : <Eye size={12} />}
                            {stock.isPaused ? 'Paused' : 'Active'}
                        </button>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2">
                           <button onClick={() => openEditModal(stock, 'BLOOD')} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><Edit2 size={16} /></button>
                           <button onClick={() => deleteBloodStock(stock.id)} className="p-2 hover:bg-rose-100 rounded-full text-rose-500"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
          
          {activeTab === 'ORDERS' && (
            <motion.div key="orders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                {incomingOrders.length > 0 ? (
                    incomingOrders.map(order => (
                         <Card key={order.id} className="border border-slate-200 shadow-sm">
                             <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                                 <div className="flex-1">
                                     <div className="flex items-center gap-3 mb-2">
                                         <div className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-mono rounded-full">#{order.id.slice(0,8)}</div>
                                         <span className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleString()}</span>
                                     </div>
                                     <h3 className="font-bold text-slate-800 text-lg mb-4">Patient Order <span className="text-slate-400 font-normal">from User ID: {order.userId.slice(0,6)}...</span></h3>
                                     
                                     <div className="space-y-2">
                                         {order.items.map((item, idx) => (
                                             <div key={idx} className="flex justify-between items-center text-sm p-3 bg-white/[0.03] rounded-xl">
                                                 <div className="flex items-center gap-3">
                                                      <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">{item.type}</div>
                                                      <span className="font-medium unitsblood ">{item.quantity} Unit(s) Blood</span>
                                                 </div>
                                                 <div className="unitsblood">@ ₹{item.price}/unit</div>
                                                 <div className="font-bold unitsblood">₹{item.price * item.quantity}</div>
                                             </div>
                                         ))}
                                     </div>
                                     <div className="mt-4 text-right">
                                         <span className="text-white/60 text-sm mr-2">Total Value:</span>
                                         <span className="text-xl font-bold text-white">₹{order.totalAmount}</span>
                                     </div>
                                 </div>
                                 
                                 <div className="w-full md:w-64 flex flex-col gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                                     <Label>Update Status</Label>
                                     <div className="flex flex-col gap-2">
                                         <button 
                                            onClick={() => updateOrderStatus(order.id, 'PROCESSING')}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${order.status === 'PROCESSING' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                                         >
                                            <Package size={18} /> Processing
                                            {order.status === 'PROCESSING' && <CheckCircle size={16} className="ml-auto" />}
                                         </button>
                                         <button 
                                            onClick={() => updateOrderStatus(order.id, 'DISPATCHED')}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${order.status === 'DISPATCHED' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                                         >
                                            <Truck size={18} /> Dispatched
                                            {order.status === 'DISPATCHED' && <CheckCircle size={16} className="ml-auto" />}
                                         </button>
                                         <button 
                                            onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${order.status === 'DELIVERED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                                         >
                                            <CheckCircle size={18} /> Delivered
                                            {order.status === 'DELIVERED' && <CheckCircle size={16} className="ml-auto" />}
                                         </button>
                                     </div>
                                 </div>
                             </div>
                         </Card>
                    ))
                ) : (
                    <div className="text-center py-20 bg-white/50 rounded-3xl border border-slate-200 border-dashed">
                        <Package size={48} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-slate-500 font-medium">No incoming orders yet.</h3>
                    </div>
                )}
            </motion.div>
          )}

          {activeTab === 'PROFILE' && (
             <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-2xl mx-auto">
                 <Card>
                    <div className="mb-6 border-b border-slate-100 pb-4">
                        <h3 className="text-xl font-bold text-slate-800">Hospital Settings</h3>
                        <p className="text-slate-500 text-sm">Manage your contact details and visibility.</p>
                    </div>
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                         <div><Label>Hospital Name</Label><Input value={pName} onChange={e => setPName(e.target.value)} /></div>
                         <div className="grid grid-cols-2 gap-4">
                             <div><Label>Phone Contact</Label><Input value={pPhone} onChange={e => setPPhone(e.target.value)} placeholder="+1 234 567 890" /></div>
                             <div><Label>City / Region</Label><Input value={pCity} onChange={e => setPCity(e.target.value)} placeholder="e.g. New York" /></div>
                         </div>
                         <div>
                             <Label>Full Address</Label>
                             <div className="flex items-center gap-2 bg-white/50 border border-slate-200 rounded-2xl px-3 py-2">
                                 <MapPin size={20} className="text-slate-400" />
                                 <input className="w-full bg-transparent outline-none text-slate-700" value={pAddress} onChange={e => setPAddress(e.target.value)} placeholder="123 Emergency Lane, NY" />
                             </div>
                         </div>
                         <div className="pt-4">
                             <Button type="submit" isLoading={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700">Save Changes</Button>
                         </div>
                    </form>
                 </Card>
             </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" />
             <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-black">
                    <h3 className="text-xl font-bold text-white">{editingId ? 'Edit Record' : 'Add New Record'}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 addamb">
                    {activeTab === 'FLEET' && (
                        <div className="space-y-4 ">
                             <div className="grid grid-cols-2 gap-4">
                                <div><Label>Plate Number</Label><Input value={plate} onChange={e => setPlate(e.target.value)} required /></div>
                                <div><Label>Type</Label><Select value={ambType} onChange={e => setAmbType(e.target.value as any)}><option value="BASIC">Basic</option><option value="ADVANCED">Advanced</option><option value="ICU">ICU</option></Select></div>
                             </div>
                             <div><Label>Primary Driver</Label><Input value={driverRef} onChange={e => setDriverRef(e.target.value)} required /></div>
                             <div className="grid grid-cols-2 gap-4">
                                <div><Label>Base Charge ($)</Label><Input type="number" value={baseCharge} onChange={e => setBaseCharge(Number(e.target.value))} required /></div>
                                <div><Label>Per Km ($)</Label><Input type="number" value={priceKm} onChange={e => setPriceKm(Number(e.target.value))} required /></div>
                             </div>
                        </div>
                    )}
                    {activeTab === 'DRIVERS' && (
                        <div className="space-y-4">
                            <div><Label>Full Name</Label><Input value={dName} onChange={e => setDName(e.target.value)} required /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>License #</Label><Input value={dLicense} onChange={e => setDLicense(e.target.value)} required /></div>
                                <div><Label>Contact</Label><Input value={dContact} onChange={e => setDContact(e.target.value)} required /></div>
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div><Label>Hourly Wage ($)</Label><Input type="number" value={dWage} onChange={e => setDWage(Number(e.target.value))} required /></div>
                                <div><Label>Status</Label><Select value={dStatus} onChange={e => setDStatus(e.target.value as any)}><option value="ACTIVE">Active</option><option value="OFF_DUTY">Off Duty</option></Select></div>
                             </div>
                        </div>
                    )}
                    {activeTab === 'BLOOD' && (
                        <div className="space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                <div><Label>Type</Label><Select value={bType} onChange={e => setBType(e.target.value as any)}>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => <option key={t} value={t}>{t}</option>)}</Select></div>
                                <div><Label>Units</Label><Input type="number" value={units} onChange={e => setUnits(Number(e.target.value))} required /></div>
                             </div>
                             <div><Label>Price per Unit ($)</Label><Input type="number" value={bloodPrice} onChange={e => setBloodPrice(Number(e.target.value))} required /></div>
                        </div>
                    )}
                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1">Cancel</Button>
                        <Button type="submit" isLoading={isSubmitting} className="flex-1">{editingId ? 'Update' : 'Save'}</Button>
                    </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
