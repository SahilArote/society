import { BarChart3 } from 'lucide-react';
import { ComingSoonFeature } from '../components/common/ComingSoonFeature';

export default function Reports() {
  return (
    <ComingSoonFeature
      featureName="Reports & Intelligence"
      icon={BarChart3}
      accentColor="var(--sky)"
      description="Society visitor traffic audits, maintenance collection reports and analytics are coming soon."
    />
  );
}

