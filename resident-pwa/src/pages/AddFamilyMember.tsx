import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/layout/AppHeader';
import { PageContainer } from '../components/layout/PageContainer';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { useToast } from '../hooks';
import { addFamilyMember } from '../services/api';

export default function AddFamilyMember() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('spouse');
  const [mobile, setMobile] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !relationship) {
      showToast('Please enter full name and relationship', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await addFamilyMember({
        name: name.trim(),
        relationship,
        phone: mobile.trim() || undefined,
      });
      showToast('Family member added successfully!', 'success');
      setTimeout(() => {
        navigate(-1);
      }, 400);
    } catch (err: any) {
      showToast(err.message || 'Failed to add family member', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppHeader title="Add Family Member" showBack />
      
      <PageContainer className="flex-1 py-4 flex flex-col">
        <div className="space-y-4">
          <Input
            label="Full Name"
            placeholder="e.g., Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Select
            label="Relationship"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            options={[
              { value: 'spouse', label: 'Spouse' },
              { value: 'parent', label: 'Parent' },
              { value: 'child', label: 'Child' },
              { value: 'sibling', label: 'Sibling' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <Input
            label="Mobile Number"
            type="tel"
            placeholder="+91"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />
        </div>
        
        <div className="mt-8">
          <Button
            variant="primary"
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting ? 'Adding Member...' : 'Add Member'}
          </Button>
        </div>
      </PageContainer>
    </div>
  );
}
