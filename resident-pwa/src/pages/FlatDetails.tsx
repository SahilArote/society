import { Link } from 'react-router-dom';
import { AppHeader } from '../components/layout/AppHeader';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';

export default function FlatDetails() {
  const { user } = useAuth();

  const societyName = user?.societyName || 'Green Gate Society';
  const wing = user?.wing || 'Tower A';
  const flatNumber = user?.flatNumber || 'Flat';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-6">
      <AppHeader title="My Flat" showBack />
      
      <PageContainer className="py-4 space-y-6">
        <Card className="p-4 bg-white border border-slate-100 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">{societyName}</h2>
          <p className="text-slate-500 text-sm mt-1">Residential Gate Access Authorized</p>
        </Card>

        <Card className="bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <span className="text-slate-500 text-sm">Wing / Building</span>
            <span className="font-medium text-slate-900 text-sm">{wing}</span>
          </div>
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <span className="text-slate-500 text-sm">Flat Number</span>
            <span className="font-medium text-slate-900 text-sm">{flatNumber}</span>
          </div>
          <div className="px-4 py-3 flex justify-between items-center">
            <span className="text-slate-500 text-sm">Resident Status</span>
            <Badge variant="success">Active Owner</Badge>
          </div>
        </Card>

        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-slate-900">Family Members</h3>
              <Badge variant="secondary">0</Badge>
            </div>
            <Link to="/family" className="text-primary-600 text-sm font-medium">Manage</Link>
          </div>
          <Card className="bg-white border border-slate-100 shadow-sm p-4 text-center text-xs text-slate-500">
            No additional family members registered yet.
          </Card>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-slate-900">Vehicles</h3>
              <Badge variant="secondary">0</Badge>
            </div>
            <Link to="/vehicles" className="text-primary-600 text-sm font-medium">Manage</Link>
          </div>
          <Card className="bg-white border border-slate-100 shadow-sm p-4 text-center text-xs text-slate-500">
            No registered vehicles.
          </Card>
        </section>

      </PageContainer>
    </div>
  );
}
