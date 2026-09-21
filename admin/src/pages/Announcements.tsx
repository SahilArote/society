import { Megaphone } from 'lucide-react';
import { ComingSoonFeature } from '../components/common/ComingSoonFeature';

export default function Announcements() {
  return (
    <ComingSoonFeature
      featureName="Announcements"
      icon={Megaphone}
      accentColor="#2563EB"
      gradient="linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)"
      description="Official society circulars, announcements and digital broadcasting features are coming soon."
    />
  );
}


