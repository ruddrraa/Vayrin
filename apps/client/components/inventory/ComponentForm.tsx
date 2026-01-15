import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Label } from '../common';
import { ComponentTypeCode } from '../../types';

interface ComponentFormProps {
  inventoryId: string;
  initialData?: {
    typeCode: ComponentTypeCode;
    displayName: string;
    processingCharge: number;
    isGovtCapped: boolean;
  } | null;
  onSubmit: (data: {
    inventoryId: string;
    typeCode: ComponentTypeCode;
    displayName: string;
    processingCharge: number;
    isGovtCapped?: boolean;
  }) => Promise<void>;
  onCancel: () => void;
}

const COMPONENT_TYPES: { code: ComponentTypeCode; name: string; defaultPrice: number }[] = [
  { code: 'WB', name: 'Whole Blood', defaultPrice: 1050 },
  { code: 'PRBC', name: 'Packed Red Blood Cells', defaultPrice: 1550 },
  { code: 'FFP', name: 'Fresh Frozen Plasma', defaultPrice: 400 },
  { code: 'RDP', name: 'Random Donor Platelets', defaultPrice: 400 },
  { code: 'SDP', name: 'Single Donor Platelets', defaultPrice: 15000 },
  { code: 'CRYO', name: 'Cryoprecipitate', defaultPrice: 500 },
  { code: 'PC', name: 'Platelet Concentrate', defaultPrice: 1200 },
];

export const ComponentForm: React.FC<ComponentFormProps> = ({
  inventoryId,
  initialData,
  onSubmit,
  onCancel,
}) => {
  const [typeCode, setTypeCode] = useState<ComponentTypeCode>(initialData?.typeCode || 'PRBC');
  const [displayName, setDisplayName] = useState(initialData?.displayName || 'Packed Red Blood Cells');
  const [processingCharge, setProcessingCharge] = useState(initialData?.processingCharge || 1550);
  const [isGovtCapped, setIsGovtCapped] = useState(initialData?.isGovtCapped || false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const selected = COMPONENT_TYPES.find(c => c.code === typeCode);
    if (selected && !initialData) {
      setDisplayName(selected.name);
      setProcessingCharge(selected.defaultPrice);
    }
  }, [typeCode, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        inventoryId,
        typeCode,
        displayName,
        processingCharge,
        isGovtCapped,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Component Type</Label>
        <Select
          value={typeCode}
          onChange={(e) => setTypeCode(e.target.value as ComponentTypeCode)}
        >
          {COMPONENT_TYPES.map((c) => (
            <option key={c.code} value={c.code} className="bg-black text-white bloodcomponent-option">
              {c.name} ({c.code})
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label>Display Name</Label>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
      </div>

      <div>
        <Label>Processing Charge (₹)</Label>
        <Input
          type="number"
          value={processingCharge}
          onChange={(e) => setProcessingCharge(Number(e.target.value))}
          required
          min={0}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isGovtCapped"
          checked={isGovtCapped}
          onChange={(e) => setIsGovtCapped(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300"
        />
        <label htmlFor="isGovtCapped" className="text-xs font-semibold text-white/60 cursor-pointer">
          Government Capped Price
        </label>
      </div>

      <div className="pt-4 flex gap-3">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting} className="flex-1">
          {initialData ? 'Update' : 'Add Component'}
        </Button>
      </div>
    </form>
  );
};

export default ComponentForm;
