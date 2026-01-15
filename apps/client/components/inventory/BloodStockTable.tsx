import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Eye, EyeOff, Edit2, Trash2 } from 'lucide-react';
import { BloodStockForm } from './BloodStockForm';
import { Modal, Button } from '../common';
import { BloodStock } from '../../types';

interface BloodStockTableProps {
  bloodStock: BloodStock[];
  onAdd: (data: Omit<BloodStock, 'id' | 'hospitalName' | 'hospitalId'>) => Promise<void>;
  onUpdate: (id: string, data: Partial<BloodStock>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const BloodStockTable: React.FC<BloodStockTableProps> = ({
  bloodStock,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<BloodStock | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAdd = () => {
    setEditingStock(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (stock: BloodStock) => {
    setEditingStock(stock);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: Omit<BloodStock, 'id' | 'hospitalName' | 'hospitalId'>) => {
    setIsSubmitting(true);
    try {
      if (editingStock) {
        await onUpdate(editingStock.id, data);
      } else {
        await onAdd(data);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Blood stock operation failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePause = async (stock: BloodStock) => {
    await onUpdate(stock.id, { isPaused: !stock.isPaused });
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">Blood Inventory</h2>
        <Button onClick={handleOpenAdd} className="bg-white text-black shadow-black/30 hover:bg-white/90">
          <Plus size={20} /> Add Stock
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-xl shadow-sm"
      >
        <table className="w-full text-left border-collapse">
          <thead className="bg-black/90 text-white/60 text-xs uppercase font-bold tracking-wider">
            <tr>
              <th className="p-6">Type</th>
              <th className="p-6">Stock</th>
              <th className="p-6">Price</th>
              <th className="p-6">Expiry</th>
              <th className="p-6">Visibility</th>
              <th className="p-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {bloodStock.map((stock) => (
              <tr
                key={stock.id}
                className={`bg-black ${stock.isPaused ? 'opacity-60' : ''}`}
              >
                <td className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-xs">
                      {stock.type}
                    </div>
                  </div>
                </td>
                <td className="p-6 font-medium text-white">{stock.units} units</td>
                <td className="p-6 text-white">₹{stock.price}</td>
                <td className="p-6 text-white/60">{stock.expiryDate}</td>
                <td className="p-6">
                  <button
                    onClick={() => togglePause(stock)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      !stock.isPaused
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {stock.isPaused ? <EyeOff size={12} /> : <Eye size={12} />}
                    {stock.isPaused ? 'Paused' : 'Active'}
                  </button>
                </td>
                <td className="p-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleOpenEdit(stock)}
                      className="p-2 hover:bg-slate-200 rounded-full text-slate-500"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(stock.id)}
                      className="p-2 hover:bg-rose-100 rounded-full text-rose-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {bloodStock.length === 0 && (
              <tr>
                <td colSpan={6} className="p-20 text-center text-white/50 bg-black">
                  No blood stock added yet. Click "Add Stock" to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStock ? 'Edit Blood Stock' : 'Add Blood Stock'}
      >
        <BloodStockForm
          initialData={editingStock}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          isSubmitting={isSubmitting}
        />
      </Modal>
    </>
  );
};

export default BloodStockTable;
