import { Bell } from 'lucide-react';
import { ComingSoonFeature } from '../components/common/ComingSoonFeature';

export default function Notifications() {
  return (
    <ComingSoonFeature
      featureName="Notifications"
      icon={Bell}
      accentColor="var(--amber)"
      description="Automated push alerts, WhatsApp reminders and emergency sirens are coming soon."
    />
  );
}

