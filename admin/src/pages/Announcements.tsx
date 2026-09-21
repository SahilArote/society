import { Megaphone } from 'lucide-react';
import { ComingSoonFeature } from '../components/common/ComingSoonFeature';

export default function Announcements() {
  return (
    <ComingSoonFeature
      title="Official Society Announcements"
      subtitle="The digital broadcast terminal for society management. Draft, schedule, and dispatch verified circulars directly to resident mobile apps."
      moduleName="Announcements Engine"
      icon={Megaphone}
      accentColor="var(--accent)"
      badgeText="Feature In Development"
      version="v2.2 Enterprise"
      eta="Coming in Next Release"
      features={[
        {
          title: "Wing & Building Segmentation",
          description: "Target notices to specific towers (e.g., Wing A only) or broadcast society-wide emergencies in 1 tap.",
          status: "Testing",
        },
        {
          title: "Multi-Channel Push & SMS",
          description: "Instant push notification sirens with automated SMS delivery for critical infrastructure updates.",
          status: "In Development",
        },
        {
          title: "Digital Read Receipts & Acknowledgment",
          description: "Live audit logs showing which flats opened and acknowledged urgent society notices.",
          status: "In Development",
        },
        {
          title: "PDF & Document Attachments",
          description: "Attach AGM agendas, balance sheets, and vendor quotes directly to digital circulars.",
          status: "Architecture",
        },
      ]}
    />
  );
}
