import React from 'react';
import { FamilyMember } from '../../types';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Chip } from '../ui/Chip';
import { getInitials, cn } from '../../lib/utils';
import { MoreVertical, Phone } from 'lucide-react';
import { IconButton } from '../ui/IconButton';

export interface FamilyMemberCardProps {
  member: FamilyMember;
  className?: string;
}

export default function FamilyMemberCard({ member, className }: FamilyMemberCardProps) {
  const getRelationshipColor = (rel: string) => {
    switch (rel.toLowerCase()) {
      case 'spouse': return 'bg-purple-100 text-purple-700';
      case 'child': return 'bg-blue-100 text-blue-700';
      case 'parent': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <Card className={cn('p-4 flex items-center justify-between', className)}>
      <div className="flex items-center gap-4">
        <Avatar 
          initials={getInitials(member.name)} 
          className="bg-slate-100 text-slate-600"
        />
        <div>
          <h4 className="font-medium text-slate-900">{member.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn('text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full', getRelationshipColor(member.relationship))}>
              {member.relationship}
            </span>
            <div className="flex items-center text-xs text-slate-500">
              <Phone className="w-3 h-3 mr-1" />
              {member.phone}
            </div>
          </div>
        </div>
      </div>
      <IconButton variant="ghost" size="sm" aria-label="More options">
        <MoreVertical className="w-5 h-5 text-slate-400" />
      </IconButton>
    </Card>
  );
}
