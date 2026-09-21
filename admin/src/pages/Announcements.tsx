import { Megaphone } from 'lucide-react';
import { ComingSoonFeature } from '../components/common/ComingSoonFeature';

export default function Announcements() {
  return (
    <ComingSoonFeature
      featureName="Announcements"
      icon={Megaphone}
      accentColor="var(--accent)"
      description="Official society circulars, announcements and digital broadcasting features are coming soon."
    />
  );
}

