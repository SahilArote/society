import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/layout/AppHeader';
import { PageContainer } from '../components/layout/PageContainer';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { useToast } from '../hooks';

export default function AddVehicle() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [number, setNumber] = useState('');
  const [type, setType] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');

  const handleSubmit = () => {
    showToast('Vehicle added successfully!', 'success');
    setTimeout(() => {
      navigate(-1);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppHeader title="Add Vehicle" showBack />
      
      <PageContainer className="flex-1 py-4 flex flex-col">
        <div className="space-y-4">
          <Input
            label="Vehicle Number"
            placeholder="MH 12 AB 1234"
            value={number}
            onChange={(e) => setNumber(e.target.value.toUpperCase())}
            required
          />
          <Select
            label="Vehicle Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={[
              { value: 'car', label: 'Car' },
              { value: 'bike', label: 'Bike' },
              { value: 'scooter', label: 'Scooter' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <Input
            label="Brand / Model"
            placeholder="e.g., Hyundai Creta"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
          <Input
            label="Color"
            placeholder="e.g., White"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
        
        <div className="mt-8">
          <Button
            variant="primary"
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={!number || !type}
          >
            Add Vehicle
          </Button>
        </div>
      </PageContainer>
    </div>
  );
}
