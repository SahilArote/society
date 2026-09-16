import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Car, Bike, Trash2, Loader2 } from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { PageContainer } from '../components/layout/PageContainer';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { fetchVehicles, deleteVehicle } from '../services/api';
import { useToast } from '../hooks';
import type { Vehicle } from '../types';

export default function Vehicles() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const data = await fetchVehicles();
      setVehicles(
        Array.isArray(data)
          ? data.map((v: any) => ({
              id: v.id,
              number: v.vehicleNumber || v.number,
              type: (v.type || 'car').toLowerCase(),
              brand: v.brand || '',
              model: v.model || '',
              color: v.color || '#000000',
              status: v.status || 'active',
            }))
          : []
      );
    } catch (err) {
      console.error('Failed to load vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const handleDelete = async (id: string, number: string) => {
    if (!window.confirm(`Are you sure you want to remove vehicle ${number}?`)) return;
    try {
      setDeletingId(id);
      await deleteVehicle(id);
      showToast(`Vehicle ${number} removed`, 'info');
      setVehicles((prev) => prev.filter((v) => v.id !== id));
    } catch (err: any) {
      showToast(err.message || 'Failed to remove vehicle', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-0 select-none">
      <AppHeader
        title="My Vehicles"
        subtitle={loading ? 'Loading...' : `${vehicles.length} registered vehicles`}
        showBack
      />

      <PageContainer className="flex-1 flex flex-col pt-3 pb-24 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs font-semibold">Loading registered vehicles...</p>
          </div>
        ) : vehicles.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/60">
                    {vehicle.type === 'bike' || vehicle.type === 'scooter' ? (
                      <Bike className="w-5 h-5" />
                    ) : (
                      <Car className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs px-2 py-0.5 bg-slate-900 text-white rounded-md tracking-wider">
                        {vehicle.number}
                      </span>
                      {vehicle.color && (
                        <div
                          className="w-3 h-3 rounded-full border border-slate-300 shadow-2xs shrink-0"
                          style={{ backgroundColor: vehicle.color }}
                          title={`Color: ${vehicle.color}`}
                        />
                      )}
                    </div>
                    <h3 className="text-xs font-bold text-slate-800 leading-tight mt-1 truncate">
                      {vehicle.brand || ''} {vehicle.model || ''}
                      {!vehicle.brand && !vehicle.model ? `${vehicle.type.toUpperCase()} Pass` : ''}
                    </h3>
                    <span className="text-[10px] text-emerald-600 capitalize font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Gate Pass Active
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(vehicle.id, vehicle.number)}
                  disabled={deletingId === vehicle.id}
                  className="w-8 h-8 rounded-full hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600 active:scale-95 transition-all shrink-0"
                  title="Remove vehicle"
                >
                  {deletingId === vehicle.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Car}
            title="No vehicles registered"
            description="Add your car or two-wheeler for automated security barrier recognition."
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

