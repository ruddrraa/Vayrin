import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronDown, ChevronUp, Package, AlertTriangle, Clock } from 'lucide-react';
import { BloodInventory, BloodComponent, BloodBatch, BloodGroup } from '../../types';
import { inventoryService } from '../../src/services/inventoryService';
import { Modal, Button } from '../common';
import { ComponentForm } from './ComponentForm';
import { BatchForm } from './BatchForm';
import { BatchCard } from './BatchCard';

interface InventoryTableProps {
  inventory: BloodInventory[];
  bloodBankId: string;
  onRefresh: () => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  inventory,
  bloodBankId,
  onRefresh,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set());
  const [isAddingInventory, setIsAddingInventory] = useState(false);
  const [addingComponentTo, setAddingComponentTo] = useState<string | null>(null);
  const [addingBatchTo, setAddingBatchTo] = useState<string | null>(null);

  const toggleGroup = (id: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedGroups(newSet);
  };

  const toggleComponent = (id: string) => {
    const newSet = new Set(expandedComponents);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedComponents(newSet);
  };

  const handleAddInventory = async (bloodGroup: BloodGroup) => {
    const rhFactor = bloodGroup.includes('POSITIVE') ? '+' : '-';
    await inventoryService.createInventory({ bloodBankId, bloodGroup, rhFactor });
    onRefresh();
    setIsAddingInventory(false);
  };

  const getStatusIcon = (components: BloodComponent[] | undefined) => {
    if (!components?.length) return null;
    
    const hasCritical = components.some(c => 
      c.batches?.some(b => ['CRITICAL_STOCK', 'URGENT_DISPOSAL'].includes(b.status))
    );
    const hasNearExpiry = components.some(c =>
      c.batches?.some(b => b.status === 'NEAR_EXPIRY')
    );

    if (hasCritical) return <AlertTriangle size={16} className="text-rose-500" />;
    if (hasNearExpiry) return <Clock size={16} className="text-amber-500" />;
    return null;
  };

  const BLOOD_GROUPS: BloodGroup[] = [
    'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE',
    'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'
  ];

  const existingGroups = new Set(inventory.map(i => i.bloodGroup));
  const availableGroups = BLOOD_GROUPS.filter(g => !existingGroups.has(g));

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">Blood Inventory</h2>
        <Button 
          onClick={() => setIsAddingInventory(true)} 
          className="bg-white text-black shadow-black/30 hover:bg-white/90"
          disabled={availableGroups.length === 0}
        >
          <Plus size={20} /> Add Blood Group
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {inventory.map((inv) => (
          <div
            key={inv.id}
            className="rounded-2xl border border-white bg-black/70 backdrop-blur-xl shadow-sm overflow-hidden"
          >
            {/* Blood Group Header */}
            <button
              onClick={() => toggleGroup(inv.id)}
              className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-rose-50 to-white hover:from-rose-100 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                  <span className="text-rose-600 font-bold text-lg">
                    {inventoryService.bloodGroupToDisplay(inv.bloodGroup)}
                  </span>
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-white">
                    {inventoryService.bloodGroupToDisplay(inv.bloodGroup)} Blood Group
                  </h3>
                  <p className="text-sm text-white/60">
                    {inv.totalUnitsAvailable} units available · {inv.components?.length || 0} components
                  </p>
                </div>
                {getStatusIcon(inv.components)}
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  inv.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  {inv.isActive ? 'Active' : 'Inactive'}
                </span>
                {expandedGroups.has(inv.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </button>

            {/* Components */}
            <AnimatePresence>
              {expandedGroups.has(inv.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 py-4 bg-black/70 border-t border-white/10">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-white/70">Components</h4>
                      <button
                        onClick={() => setAddingComponentTo(inv.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-white/5 text-sm font-semibold rounded-xl transition-all shadow-sm"
                      >
                        <Plus size={16} /> Add Component
                      </button>
                    </div>

                    {inv.components?.length === 0 && (
                      <p className="text-slate-400 text-center py-8">
                        No components added. Add PRBC, FFP, or other components.
                      </p>
                    )}

                    <div className="space-y-3">
                      {inv.components?.map((comp) => (
                        <div key={comp.id} className="bg-white rounded-xl border shadow-sm">
                          {/* Component Header */}
                          <button
                            onClick={() => toggleComponent(comp.id)}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-all rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <Package size={18} className="text-blue-500" />
                              <div className="text-left">
                                <span className="font-medium text-slate-900">{comp.displayName}</span>
                                <span className="ml-2 text-xs text-slate-400">({comp.typeCode})</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-semibold text-slate-700">
                                {comp.availableUnits} units
                              </span>
                              <span className="text-sm text-slate-500">
                                ₹{comp.processingCharge}
                              </span>
                              {comp.isGovtCapped && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                  Govt. Capped
                                </span>
                              )}
                              {expandedComponents.has(comp.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </button>

                          {/* Batches */}
                          <AnimatePresence>
                            {expandedComponents.has(comp.id) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 py-3 bg-slate-50 border-t">
                                  <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-medium text-slate-600">Batches</span>
                                    <button
                                      onClick={() => setAddingBatchTo(comp.id)}
                                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-all"
                                    >
                                      <Plus size={14} /> Add Batch
                                    </button>
                                  </div>

                                  {comp.batches?.length === 0 && (
                                    <p className="text-slate-400 text-center py-4 text-sm">
                                      No batches. Add blood units with expiry dates.
                                    </p>
                                  )}

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {comp.batches?.map((batch) => (
                                      <BatchCard
                                        key={batch.id}
                                        batch={batch}
                                        onUpdate={async (updates) => {
                                          await inventoryService.updateBatch(batch.id, updates);
                                          onRefresh();
                                        }}
                                        onDelete={async () => {
                                          await inventoryService.deleteBatch(batch.id);
                                          onRefresh();
                                        }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {inventory.length === 0 && (
          <div className="text-center py-20 bg-black/50 rounded-3xl border border-white/10">
            <Package size={48} className="mx-auto text-white/30 mb-4" />
            <p className="text-white/50">
              No blood inventory yet. Click "Add Blood Group" to start.
            </p>
          </div>
        )}
      </motion.div>

      {/* Add Inventory Modal */}
      <Modal
        isOpen={isAddingInventory}
        onClose={() => setIsAddingInventory(false)}
        title="Add Blood Group"
      >
        <div className="grid grid-cols-2 gap-3">
          {availableGroups.map((group) => (
            <button
              key={group}
              onClick={() => handleAddInventory(group)}
              className="p-4 rounded-xl border hover:border-rose-300 hover:bg-rose-50 transition-all text-center"
            >
              <span className="text-2xl font-bold text-rose-600">
                {inventoryService.bloodGroupToDisplay(group)}
              </span>
            </button>
          ))}
        </div>
      </Modal>

      {/* Add Component Modal */}
      <Modal
        isOpen={!!addingComponentTo}
        onClose={() => setAddingComponentTo(null)}
        title="Add Blood Component"
      >
        <ComponentForm
          inventoryId={addingComponentTo || ''}
          onSubmit={async (data) => {
            await inventoryService.createComponent(data);
            onRefresh();
            setAddingComponentTo(null);
          }}
          onCancel={() => setAddingComponentTo(null)}
        />
      </Modal>

      {/* Add Batch Modal */}
      <Modal
        isOpen={!!addingBatchTo}
        onClose={() => setAddingBatchTo(null)}
        title="Add Blood Batch"
      >
        <BatchForm
          componentId={addingBatchTo || ''}
          onSubmit={async (data) => {
            await inventoryService.createBatch(data);
            onRefresh();
            setAddingBatchTo(null);
          }}
          onCancel={() => setAddingBatchTo(null)}
        />
      </Modal>
    </>
  );
};

export default InventoryTable;
