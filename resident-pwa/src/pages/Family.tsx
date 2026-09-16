import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Phone, Heart, Trash2, Loader2 } from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { PageContainer } from '../components/layout/PageContainer';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { fetchFamilyMembers, deleteFamilyMember } from '../services/api';
import { useToast } from '../hooks';
import type { FamilyMember } from '../types';

export default function Family() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadFamily = async () => {
    try {
      setLoading(true);
      const data = await fetchFamilyMembers();
      setFamilyMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load family members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFamily();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;
    try {
      setDeletingId(id);
      await deleteFamilyMember(id);
      showToast(`${name} removed successfully`, 'info');
      setFamilyMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      showToast(err.message || 'Failed to remove family member', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-0 select-none">
      <AppHeader
        title="Family Members"
        subtitle={loading ? 'Loading...' : `${familyMembers.length} registered members`}
        showBack
      />

      <PageContainer className="flex-1 flex flex-col pt-3 pb-24 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs font-semibold">Loading family members...</p>
          </div>
        ) : familyMembers.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {familyMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={member.name} size="md" className="ring-2 ring-indigo-50 font-bold shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-xs font-extrabold text-slate-900 leading-tight truncate">
                      {member.name}
                    </h3>
                    <span className="text-[11px] font-medium text-slate-500 capitalize">
                      {member.relationship}
                    </span>
                    {member.phone && (
                      <p className="text-[10px] text-slate-400 font-semibold">{member.phone}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {member.phone && (
                    <a
                      href={`tel:${member.phone}`}
                      className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 active:scale-95 transition-all"
                      aria-label={`Call ${member.name}`}
                    >
                      <Phone className="w-3.5 h-3.5 text-indigo-600" />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDelete(member.id, member.name)}
                    disabled={deletingId === member.id}
                    className="w-8 h-8 rounded-full hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600 active:scale-95 transition-all"
                    title="Remove member"
                  >
                    {deletingId === member.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Heart}
            title="No family members added"
            description="Add your family members so they can also authorize visitors and receive alerts."
          />
        )}

        {/* Bottom Add Member Button */}
        <div className="pt-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => navigate('/add-family')}
            className="h-12 font-bold text-sm rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-md shadow-indigo-600/20"
            icon={<Plus className="w-4 h-4" />}
          >
            Add Family Member
          </Button>
        </div>
      </PageContainer>
    </div>
  );
}

