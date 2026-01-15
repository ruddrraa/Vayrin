import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { DriverCard } from './DriverCard';
import { DriverForm } from './DriverForm';
import { Modal, Button } from '../common';
import { Driver } from '../../types';

interface DriverListProps {
  drivers: Driver[];
  onAdd: (data: Omit<Driver, 'id' | 'hospitalId'>) => Promise<void>;
  onUpdate: (id: string, data: Partial<Driver>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const DriverList: React.FC<DriverListProps> = ({
  drivers,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAdd = () => {
    setEditingDriver(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: Omit<Driver, 'id' | 'hospitalId'>) => {
    setIsSubmitting(true);
    try {
      if (editingDriver) {
        await onUpdate(editingDriver.id, data);
      } else {
        await onAdd(data);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Driver operation failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">Driver Management</h2>
        <Button onClick={handleOpenAdd} className="bg-white text-black shadow-black/30 hover:bg-white/90">
          <Plus size={20} /> Add Driver
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {drivers.map((driver) => (
          <DriverCard
            key={driver.id}
            driver={driver}
            onEdit={handleOpenEdit}
            onDelete={onDelete}
          />
        ))}
        {drivers.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed">
            <p className="text-white/50">No drivers added yet. Click "Add Driver" to get started.</p>
          </div>
        )}
      </motion.div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDriver ? 'Edit Driver' : 'Add New Driver'}
      >
        <DriverForm
          initialData={editingDriver}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          isSubmitting={isSubmitting}
        />
      </Modal>
    </>
  );
};

export default DriverList;
