import { useNavigate } from 'react-router-dom';
import { Plus, Car } from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { PageContainer } from '../components/layout/PageContainer';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { mockVehicles } from '../data/mockVehicles';

export default function Vehicles() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-0 select-none">
      <AppHeader
        title="My Vehicles"
        subtitle={`${mockVehicles.length} registered vehicles`}
        showBack
      />

      <PageContainer className="flex-1 flex flex-col pt-3 pb-24 space-y-3">
        {mockVehicles.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {mockVehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="number-plate">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                    <span>{vehicle.number}</span>
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 leading-tight">
                      {vehicle.brand} {vehicle.model}
                    </h3>
                    <span className="text-[10px] text-slate-500 capitalize font-medium">
                      {vehicle.type} · Gate Pass Active
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs"
                    style={{ backgroundColor: vehicle.color }}
                    title={`Color: ${vehicle.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Car}
            title="No vehicles registered"
            description="Add your car or two-wheeler for automated security barrier recognition."
            actionLabel="Add Vehicle"
            onAction={() => navigate('/add-vehicle')}
          />
        )}

        {/* Bottom Add Vehicle CTA */}
        <div className="pt-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => navigate('/add-vehicle')}
            className="h-12 font-bold text-sm rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-md shadow-indigo-600/20"
            icon={<Plus className="w-4 h-4" />}
          >
            Add Vehicle
          </Button>
        </div>
      </PageContainer>
    </div>
  );
}
