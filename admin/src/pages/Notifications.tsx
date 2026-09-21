import { Bell } from 'lucide-react';
import { ComingSoonFeature } from '../components/common/ComingSoonFeature';

export default function Notifications() {
  return (
    <ComingSoonFeature
      featureName="Notifications"
      icon={Bell}
      accentColor="#D97706"
      gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
      description="Automated push alerts, WhatsApp reminders and emergency sirens are coming soon."
    />
  );
}


