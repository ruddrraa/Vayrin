import React, { useState } from 'react';
import { Button, Input, Select, Label } from '../common';
import { BatchStatus } from '../../types';

interface BatchFormProps {
  componentId: string;
  initialData?: {
    batchId: string;
    quantity: number;
    expiryDate: string;
    status: BatchStatus;
    collectionDate?: string;
    donorId?: string;
    notes?: string;
  } | null;
  onSubmit: (data: {
    componentId: string;
    batchId: string;
    quantity: number;
    expiryDate: string;
    status?: BatchStatus;
    collectionDate?: string;
    donorId?: string;
    notes?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

const generateBatchId = (): string => {
  const prefix = ['b', 'f', 'p', 'c'][Math.floor(Math.random() * 4)];
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}_${number}`;
};

export const BatchForm: React.FC<BatchFormProps> = ({
  componentId,
  initialData,
  onSubmit,
  onCancel,
}) => {
  const [batchId, setBatchId] = useState(initialData?.batchId || generateBatchId());
  const [quantity, setQuantity] = useState(initialData?.quantity || 1);
  const [expiryDate, setExpiryDate] = useState(
    initialData?.expiryDate || 
    new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [collectionDate, setCollectionDate] = useState(
    initialData?.collectionDate || new Date().toISOString().split('T')[0]
  );
  const [donorId, setDonorId] = useState(initialData?.donorId || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        componentId,
        batchId,
        quantity,
        expiryDate,
        collectionDate: collectionDate || undefined,
        donorId: donorId || undefined,
        notes: notes || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Batch ID</Label>
          <Input
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            required
            placeholder="e.g. b_7890"
          />
        </div>
        <div>
          <Label>Quantity (Units)</Label>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
            min={1}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Collection Date</Label>
          <Input
            type="date"
            value={collectionDate}
            onChange={(e) => setCollectionDate(e.target.value)}
          />
        </div>
        <div>
          <Label>Expiry Date</Label>
          <Input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label>Donor ID (Optional)</Label>
        <Input
          value={donorId}
          onChange={(e) => setDonorId(e.target.value)}
          placeholder="Anonymous if empty"
        />
      </div>

      <div>
        <Label>Notes (Optional)</Label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes"
        />
      </div>

      <div className="pt-4 flex gap-3">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting} className="flex-1">
          {initialData ? 'Update' : 'Add Batch'}
        </Button>
      </div>
    </form>
  );
};

export default BatchForm;
