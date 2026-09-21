import { Bell } from 'lucide-react';
import { ComingSoonFeature } from '../components/common/ComingSoonFeature';

export default function Notifications() {
  return (
    <ComingSoonFeature
      title="Automated Society Notification Center"
      subtitle="Intelligent alert dispatch system. Manage multi-channel resident alerts, maintenance payment reminders, and emergency sirens."
      moduleName="Notification Hub"
      icon={Bell}
      accentColor="var(--amber)"
      badgeText="Feature In Development"
      version="v2.2 Enterprise"
      eta="Coming in Next Release"
      features={[
        {
          title: "Automated Maintenance Dues Reminders",
          description: "Scheduled recurring WhatsApp and push alerts dispatched automatically ahead of monthly due dates.",
          status: "Testing",
        },
        {
          title: "Gate Security Perimeter Alerts",
          description: "Instant high-priority sirens sent to all residents in case of security protocol deviations.",
          status: "In Development",
        },
        {
          title: "Official WhatsApp Business Gateway",
          description: "Deliver official society alerts directly into residents' WhatsApp with verified green-tick templates.",
          status: "In Development",
        },
        {
          title: "Customizable Alert Templates",
          description: "Pre-approved templates for water supply maintenance, lift shutdowns, and festival announcements.",
          status: "Architecture",
        },
      ]}
    />
  );
}
