import { useNavigate } from 'react-router-dom';
import { Plus, Phone, Heart } from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { PageContainer } from '../components/layout/PageContainer';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { mockFamily } from '../data/mockFamily';

export default function Family() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-0 select-none">
      <AppHeader
        title="Family Members"
        subtitle={`${mockFamily.length} registered residents`}
        showBack
      />

      <PageContainer className="flex-1 flex flex-col pt-3 pb-24 space-y-3">
        {mockFamily.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {mockFamily.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={member.name} size="md" className="ring-2 ring-indigo-50 font-bold" />
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 leading-tight">
                      {member.name}
                    </h3>
                    <span className="text-[11px] font-medium text-slate-500 capitalize">
                      {member.relationship}
                    </span>
                  </div>
                </div>

                {member.phone && (
                  <a
                    href={`tel:${member.phone}`}
                    className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 active:scale-95 transition-all tap-target focus:outline-none"
                    aria-label={`Call ${member.name}`}
                  >
                    <Phone className="w-4 h-4 text-indigo-600" />
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Heart}
            title="No family members added"
            description="Add your family members so they can also authorize visitors and receive alerts."
            actionLabel="Add Family Member"
            onAction={() => navigate('/add-family')}
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
