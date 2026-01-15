import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Label } from '../common';
import { Driver } from '../../types';

type DriverStatus = 'ACTIVE' | 'OFF_DUTY' | 'ON_LEAVE';

interface DriverFormProps {
  initialData?: Driver | null;
  onSubmit: (data: Omit<Driver, 'id' | 'hospitalId'>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const DriverForm: React.FC<DriverFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [licenseNumber, setLicenseNumber] = useState(initialData?.licenseNumber || '');
  const [contact, setContact] = useState(initialData?.contact || '');
  const [hourlyWage, setHourlyWage] = useState(initialData?.hourlyWage || 20);
  const [status, setStatus] = useState<DriverStatus>((initialData?.status as DriverStatus) || 'ACTIVE');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setLicenseNumber(initialData.licenseNumber);
      setContact(initialData.contact);
      setHourlyWage(initialData.hourlyWage);
      setStatus(initialData.status as DriverStatus);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name,
      licenseNumber,
      contact,
      hourlyWage,
      status,
      totalHours: initialData?.totalHours || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Full Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="John Doe"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>License #</Label>
          <Input
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            required
            placeholder="DL123456789"
          />
        </div>
        <div>
          <Label>Contact</Label>
          <Input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
            placeholder="+91 98765 43210"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Hourly Wage (₹)</Label>
          <Input
            type="number"
            value={hourlyWage}
            onChange={(e) => setHourlyWage(Number(e.target.value))}
            required
          />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value as DriverStatus)}>
            <option value="ACTIVE">Active</option>
            <option value="OFF_DUTY">Off Duty</option>
            <option value="ON_LEAVE">On Leave</option>
          </Select>
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

export default DriverForm;
