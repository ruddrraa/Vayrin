import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Label } from '../common';
import { BloodStock, BloodType } from '../../types';

interface BloodStockFormProps {
  initialData?: BloodStock | null;
  onSubmit: (data: Omit<BloodStock, 'id' | 'hospitalName' | 'hospitalId'>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const BloodStockForm: React.FC<BloodStockFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [type, setType] = useState<BloodType>(initialData?.type || 'O+');
  const [units, setUnits] = useState(initialData?.units || 1);
  const [price, setPrice] = useState(initialData?.price || 100);
  const [expiryDate, setExpiryDate] = useState(initialData?.expiryDate || '');

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setUnits(initialData.units);
      setPrice(initialData.price);
      setExpiryDate(initialData.expiryDate);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      type,
      units,
      price,
      expiryDate: expiryDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isPaused: initialData?.isPaused || false,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Blood Type</Label>
          <Select value={type} onChange={(e) => setType(e.target.value as BloodType)}>
            {BLOOD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Units</Label>
          <Input
            type="number"
            value={units}
            onChange={(e) => setUnits(Number(e.target.value))}
            required
            min={1}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Price per Unit (₹)</Label>
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            required
          />
        </div>
        <div>
          <Label>Expiry Date</Label>
          <Input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
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

export default BloodStockForm;
