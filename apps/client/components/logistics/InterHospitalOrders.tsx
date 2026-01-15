import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Clock, CheckCircle, XCircle, Truck, Building2, ArrowRight, RefreshCw } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { inventoryService } from '../../src/services/inventoryService';
import { toast } from '../../lib/toast';

export type InterHospitalOrderStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';

export type UrgencyLevel = 'NORMAL' | 'URGENT' | 'CRITICAL';

export interface InterHospitalOrder {
  id: string;
  requestingHospitalId: string;
  requestingHospitalName: string;
  supplyingHospitalId: string;
  supplyingHospitalName: string;
  componentId: string;
  componentName: string;
  bloodGroup: string;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  status: InterHospitalOrderStatus;
  urgency: UrgencyLevel;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface InterHospitalOrdersProps {
  currentHospitalId: string;
  currentHospitalName: string;
}

export const InterHospitalOrders: React.FC<InterHospitalOrdersProps> = ({
  currentHospitalId,
  currentHospitalName,
}) => {
  const [orders, setOrders] = useState<InterHospitalOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OUTGOING' | 'INCOMING'>('ALL');
  const [statusFilter, setStatusFilter] = useState<InterHospitalOrderStatus | 'ALL'>('ALL');
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());

  // Transform DB record to our interface
  const transformOrder = (order: any): InterHospitalOrder => ({
    id: order.id,
    requestingHospitalId: order.requesting_hospital_id,
    requestingHospitalName: order.requesting_hospital_name,
    supplyingHospitalId: order.supplying_hospital_id,
    supplyingHospitalName: order.supplying_hospital_name,
    componentId: order.component_id,
    componentName: order.component_name,
    bloodGroup: order.blood_group,
    quantity: order.quantity,
    pricePerUnit: order.price_per_unit,
    totalAmount: order.total_amount,
    status: order.status,
    urgency: order.urgency || 'NORMAL',
    notes: order.notes,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  });

  useEffect(() => {
    loadOrders();
    
    // Subscribe to realtime updates - handle payload directly instead of reloading
    const subscription = supabase
      .channel('inter_hospital_orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inter_hospital_orders' },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          // Skip if this order is being updated by us (pendingUpdates)
          const orderId = (newRecord as any)?.id || (oldRecord as any)?.id;
          if (orderId && pendingUpdates.has(orderId)) {
            return; // Ignore realtime for our own pending updates
          }
          
          if (eventType === 'INSERT' && newRecord) {
            const transformed = transformOrder(newRecord);
            // Only add if relevant to current hospital
            if (transformed.requestingHospitalId === currentHospitalId || 
                transformed.supplyingHospitalId === currentHospitalId) {
              setOrders(prev => [transformed, ...prev]);
            }
          } else if (eventType === 'UPDATE' && newRecord) {
            const transformed = transformOrder(newRecord);
            setOrders(prev => prev.map(o => o.id === transformed.id ? transformed : o));
          } else if (eventType === 'DELETE' && oldRecord) {
            setOrders(prev => prev.filter(o => o.id !== (oldRecord as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [currentHospitalId, pendingUpdates]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('inter_hospital_orders')
        .select('*')
        .or(`requesting_hospital_id.eq.${currentHospitalId},supplying_hospital_id.eq.${currentHospitalId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform snake_case to camelCase using shared function
      const transformedOrders = (data || []).map(transformOrder);

      setOrders(transformedOrders);
    } catch (error) {
      console.error('Failed to load inter-hospital orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: InterHospitalOrderStatus) => {
    // Mark this order as pending update (ignore realtime events for it)
    setPendingUpdates(prev => new Set(prev).add(orderId));
    
    // Optimistic UI update - immediately show the new status
    const previousOrders = [...orders];
    const orderToUpdate = orders.find(o => o.id === orderId);
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o
    ));

    try {
      console.log('[updateOrderStatus] Updating order:', orderId, 'to status:', newStatus);
      
      const { data, error } = await supabase
        .from('inter_hospital_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select();

      console.log('[updateOrderStatus] Response:', { data, error });

      if (error) {
        console.error('[updateOrderStatus] Supabase error:', error);
        toast.error(`Failed to update status: ${error.message}`);
        // Revert on error
        setOrders(previousOrders);
      } else if (!data || data.length === 0) {
        console.error('[updateOrderStatus] No rows updated - RLS policy might be blocking');
        toast.error('Update failed: You may not have permission to update this order.');
        // Revert if no rows affected
        setOrders(previousOrders);
      } else {
        console.log('[updateOrderStatus] Successfully updated:', data);
        
        // When status changes to IN_TRANSIT, deduct from blood_components inventory
        // This happens when supplying hospital dispatches the blood
        if (newStatus === 'IN_TRANSIT' && orderToUpdate?.componentId) {
          console.log('[updateOrderStatus] Deducting inventory for component:', orderToUpdate.componentId, 'quantity:', orderToUpdate.quantity);
          
          // Get current available units
          const { data: componentData, error: fetchError } = await supabase
            .from('blood_components')
            .select('available_units')
            .eq('id', orderToUpdate.componentId)
            .single();
          
          if (fetchError) {
            console.error('[updateOrderStatus] Failed to fetch component:', fetchError);
          } else if (componentData) {
            const newUnits = Math.max(0, (componentData.available_units || 0) - orderToUpdate.quantity);
            
            const { error: updateError } = await supabase
              .from('blood_components')
              .update({ 
                available_units: newUnits,
                updated_at: new Date().toISOString()
              })
              .eq('id', orderToUpdate.componentId);
            
            if (updateError) {
              console.error('[updateOrderStatus] Failed to update component inventory:', updateError);
              toast.warning('Order status updated but inventory deduction failed.');
            } else {
              console.log('[updateOrderStatus] Inventory deducted successfully. New units:', newUnits);
            }
          }
        }
      }
    } catch (error) {
      console.error('[updateOrderStatus] Exception:', error);
      // Revert on exception
      setOrders(previousOrders);
    } finally {
      // Remove from pending after a delay to ensure realtime doesn't override
      setTimeout(() => {
        setPendingUpdates(prev => {
          const newSet = new Set(prev);
          newSet.delete(orderId);
          return newSet;
        });
      }, 2000);
    }
  };

  const filteredOrders = orders.filter((order) => {
    // Direction filter
    if (activeFilter === 'OUTGOING' && order.requestingHospitalId !== currentHospitalId) return false;
    if (activeFilter === 'INCOMING' && order.supplyingHospitalId !== currentHospitalId) return false;
    
    // Status filter
    if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;
    
    return true;
  });

  const outgoingCount = orders.filter(o => o.requestingHospitalId === currentHospitalId).length;
  const incomingCount = orders.filter(o => o.supplyingHospitalId === currentHospitalId).length;
  const pendingCount = orders.filter(o => o.status === 'PENDING').length;

  const getStatusColor = (status: InterHospitalOrderStatus) => {
    const colors: Record<InterHospitalOrderStatus, string> = {
      'PENDING': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      'APPROVED': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'REJECTED': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      'IN_TRANSIT': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'DELIVERED': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      'CANCELLED': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    };
    return colors[status];
  };

  const getStatusIcon = (status: InterHospitalOrderStatus) => {
    switch (status) {
      case 'PENDING': return <Clock size={14} />;
      case 'APPROVED': return <CheckCircle size={14} />;
      case 'REJECTED': return <XCircle size={14} />;
      case 'IN_TRANSIT': return <Truck size={14} />;
      case 'DELIVERED': return <CheckCircle size={14} />;
      case 'CANCELLED': return <XCircle size={14} />;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUrgencyColor = (urgency: UrgencyLevel) => {
    const colors: Record<UrgencyLevel, string> = {
      'NORMAL': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      'URGENT': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'CRITICAL': 'bg-red-600/30 text-red-400 border-red-500/40 animate-pulse',
    };
    return colors[urgency];
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white/50 text-sm">Total Orders</p>
          <p className="text-2xl font-bold text-white">{orders.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white/50 text-sm">Outgoing Requests</p>
          <p className="text-2xl font-bold text-blue-400">{outgoingCount}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white/50 text-sm">Incoming Requests</p>
          <p className="text-2xl font-bold text-emerald-400">{incomingCount}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white/50 text-sm">Pending Approval</p>
          <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Direction Filter */}
        <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
          {(['ALL', 'OUTGOING', 'INCOMING'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeFilter === filter
                  ? 'bg-white text-black'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {filter === 'ALL' ? 'All Orders' : filter === 'OUTGOING' ? 'My Requests' : 'From Others'}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none cursor-pointer"
        >
          <option value="ALL" className="bg-black">All Status</option>
          <option value="PENDING" className="bg-black">Pending</option>
          <option value="APPROVED" className="bg-black">Approved</option>
          <option value="IN_TRANSIT" className="bg-black">In Transit</option>
          <option value="DELIVERED" className="bg-black">Delivered</option>
          <option value="REJECTED" className="bg-black">Rejected</option>
          <option value="CANCELLED" className="bg-black">Cancelled</option>
        </select>

        <button
          onClick={loadOrders}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all flex items-center gap-2 ml-auto"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="text-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto mb-4" />
          <p className="text-white/50">Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
          <Package size={48} className="mx-auto text-white/30 mb-4" />
          <p className="text-white/50">No inter-hospital orders found.</p>
          <p className="text-white/30 text-sm mt-2">
            Go to "Blood Logistics" tab to request blood from other hospitals.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isOutgoing = order.requestingHospitalId === currentHospitalId;
            const isIncoming = order.supplyingHospitalId === currentHospitalId;

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 "
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Order Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {order.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                        isOutgoing ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {isOutgoing ? '↑ Outgoing' : '↓ Incoming'}
                      </span>
                      {order.urgency !== 'NORMAL' && (
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 ${getUrgencyColor(order.urgency)}`}>
                          ⚡ {order.urgency}
                        </span>
                      )}
                    </div>

                    {/* Hospital Flow */}
                    <div className="flex items-center gap-2 text-sm mb-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-white/50 shrink-0" />
                        <span className={`truncate ${isOutgoing ? 'text-white font-semibold' : 'text-white/70'}`}>
                          {order.requestingHospitalName}
                        </span>
                      </div>
                      <ArrowRight size={16} className="text-white/30 shrink-0" />
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-white/50 shrink-0" />
                        <span className={`truncate ${isIncoming ? 'text-white font-semibold' : 'text-white/70'}`}>
                          {order.supplyingHospitalName}
                        </span>
                      </div>
                    </div>

                    {/* Blood Details */}
                    <div className="flex flex-wrap items-center gapper gap-y-2 ">
                      <div className="flex items-center gapper2">
                        <div className="w-10 widthtake h-10 rounded-lg bg-rose-500/20 flex items-center justify-center shrink-0">
                          <span className="text-rose-400 font-bold text-xs interhos">
                            {inventoryService.bloodGroupToDisplay(order.bloodGroup as any)}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{order.componentName}</p>
                          <p className="text-white/50 text-xs">{order.quantity} units</p>
                        </div>
                      </div>
                      <div className="text-white/50 whitespace-nowrap pricefix">
                        ₹{order.pricePerUnit} × {order.quantity} = 
                        <span className="text-white font-semibold ml-1">₹{order.totalAmount}</span>
                      </div>
                      <div className="text-white/40 text-xs whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 shrink-0 lg:self-center">
                  {isIncoming && order.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'APPROVED')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'REJECTED')}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-all"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {isIncoming && order.status === 'APPROVED' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'IN_TRANSIT')}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2"
                    >
                      <Truck size={16} />
                      Mark In Transit
                    </button>
                  )}

                  {isOutgoing && order.status === 'IN_TRANSIT' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2"
                    >
                      <CheckCircle size={16} />
                      Mark Delivered
                    </button>
                  )}

                  {isOutgoing && order.status === 'PENDING' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'CANCELLED')}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/70 text-sm rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                  )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InterHospitalOrders;
