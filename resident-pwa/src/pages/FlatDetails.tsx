import React from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../components/layout/AppHeader';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { mockFamily } from '../data/mockFamily';
import { mockVehicles } from '../data/mockVehicles';

export default function FlatDetails() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-6">
      <AppHeader title="My Flat" showBack />
      
      <PageContainer className="py-4 space-y-6">
        <Card className="p-4 bg-white border border-slate-100 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Green Valley Residency</h2>
          <p className="text-slate-500 text-sm mt-1">123 Green Avenue, West Pune 411045</p>
        </Card>

        <Card className="bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <span className="text-slate-500 text-sm">Building</span>
            <span className="font-medium text-slate-900 text-sm">Tower A</span>
          </div>
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <span className="text-slate-500 text-sm">Floor</span>
            <span className="font-medium text-slate-900 text-sm">4th Floor</span>
          </div>
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <span className="text-slate-500 text-sm">Flat Number</span>
            <span className="font-medium text-slate-900 text-sm">A-402</span>
          </div>
          <div className="px-4 py-3 flex justify-between items-center">
            <span className="text-slate-500 text-sm">Resident Status</span>
            <Badge variant="success">Active</Badge>
          </div>
        </Card>

        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-slate-900">Family Members</h3>
              <Badge variant="secondary">{mockFamily.length}</Badge>
            </div>
            <Link to="/family" className="text-primary-600 text-sm font-medium">View All</Link>
          </div>
          <Card className="bg-white border border-slate-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {mockFamily.slice(0, 3).map((member) => (
                <div key={member.id} className="flex items-center px-4 py-3">
                  <Avatar name={member.name} size="md" />
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-slate-900">{member.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{member.relationship}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-slate-900">Vehicles</h3>
              <Badge variant="secondary">{mockVehicles.length}</Badge>
            </div>
            <Link to="/vehicles" className="text-primary-600 text-sm font-medium">View All</Link>
          </div>
          <Card className="bg-white border border-slate-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {mockVehicles.slice(0, 3).map((vehicle) => (
                <div key={vehicle.id} className="flex items-center justify-between px-4 py-3">
                  <div className="font-medium text-slate-900">{vehicle.number}</div>
                  <div className="text-sm text-slate-500 capitalize">{vehicle.type} • {vehicle.model}</div>
                </div>
              ))}
            </div>
          </Card>
        </section>

      </PageContainer>
    </div>
  );
}
