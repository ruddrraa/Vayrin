import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { AmbulanceCard } from './AmbulanceCard';
import { AmbulanceForm } from './AmbulanceForm';
import { Modal, Button } from '../common';
import { Ambulance, AmbulanceStatus, Driver } from '../../types';

interface FleetListProps {
  ambulances: Ambulance[];
  drivers: Driver[];
  onAdd: (data: Omit<Ambulance, 'id' | 'location' | 'hospitalId'>) => Promise<void>;
  onUpdate: (id: string, data: Partial<Ambulance>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const FleetList: React.FC<FleetListProps> = ({
  ambulances,
  drivers,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAmbulance, setEditingAmbulance] = useState<Ambulance | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAdd = () => {
    setEditingAmbulance(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ambulance: Ambulance) => {
    setEditingAmbulance(ambulance);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: Omit<Ambulance, 'id' | 'location' | 'hospitalId'>) => {
    setIsSubmitting(true);
    try {
      if (editingAmbulance) {
        await onUpdate(editingAmbulance.id, data);
      } else {
        await onAdd(data);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Fleet operation failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: AmbulanceStatus) => {
    await onUpdate(id, { status });
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">Ambulance Fleet</h2>
        <Button onClick={handleOpenAdd} className="bg-white text-black shadow-black/30 hover:bg-white/90">
          <Plus size={20} /> Add Vehicle
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {ambulances.map((ambulance) => (
          <AmbulanceCard
            key={ambulance.id}
            ambulance={ambulance}
            drivers={drivers}
            onEdit={handleOpenEdit}
            onDelete={onDelete}
            onStatusChange={handleStatusChange}
          />
        ))}
        {ambulances.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed">
            <p className="text-white/50">No ambulances added yet. Click "Add Vehicle" to get started.</p>
          </div>
        )}
      </motion.div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAmbulance ? 'Edit Ambulance' : 'Add New Ambulance'}
      >
        <AmbulanceForm
          initialData={editingAmbulance}
          allAmbulances={ambulances}
          drivers={drivers}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          isSubmitting={isSubmitting}
        />
      </Modal>
    </>
  );
};

export default FleetList;
