import { BarChart3 } from 'lucide-react';
import { ComingSoonFeature } from '../components/common/ComingSoonFeature';

export default function Reports() {
  return (
    <ComingSoonFeature
      title="Society Intelligence & Audit Reports"
      subtitle="Comprehensive security audits, traffic volume insights, and maintenance collection analytics formatted for committee meetings and statutory compliance."
      moduleName="Reports & Intelligence"
      icon={BarChart3}
      accentColor="var(--sky)"
      badgeText="Feature In Development"
      version="v2.2 Enterprise"
      eta="Coming in Next Release"
      features={[
        {
          title: "Visitor Traffic Peak Heatmaps",
          description: "Hourly and day-of-week breakdown of guest entries, cab arrivals, and delivery personnel flow across gates.",
          status: "Testing",
        },
        {
          title: "Guard Shift & Patrol Verification",
          description: "Digital log verification records for security personnel shifts, attendance, and barrier operations.",
          status: "In Development",
        },
        {
          title: "Financial Collections & Defaulter Audits",
          description: "Wing-wise maintenance collection ratios with automated PDF generation for AGM and audit presentations.",
          status: "In Development",
        },
        {
          title: "One-Click PDF & Excel Export",
          description: "Export timestamped, tamper-proof security incident logs and visitor passes in standard Excel/CSV/PDF formats.",
          status: "Architecture",
        },
      ]}
    />
  );
}
