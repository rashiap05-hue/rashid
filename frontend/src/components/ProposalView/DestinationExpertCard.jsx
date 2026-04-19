import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { api, resolveImageUrl } from '@/App';

export default function DestinationExpertCard({ proposal }) {
  const [expert, setExpert] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpert = async () => {
      if (!proposal.assigned_expert_id) { setLoading(false); return; }
      try {
        const res = await api.get(`/experts/${proposal.assigned_expert_id}`);
        setExpert(res.data);
      } catch { setExpert(null); }
      setLoading(false);
    };
    fetchExpert();
  }, [proposal.assigned_expert_id]);

  if (loading || !expert) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm" data-testid="destination-expert-card">
      <p className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-4">Destination Expert</p>
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {expert.photo ? (
            <img src={resolveImageUrl(expert.photo)} alt={expert.name} className="w-full h-full object-cover" />
          ) : (
            <User size={28} className="text-gray-400" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 text-sm leading-tight" data-testid="expert-name">{expert.name}</p>
          {expert.location && <p className="text-sm text-gray-500 mt-1">Based in {expert.location}</p>}
          {expert.email && <p className="text-sm text-gray-500 mt-0.5 truncate">{expert.email}</p>}
          {expert.phone && <p className="text-sm text-gray-500 mt-0.5">{expert.phone}</p>}
        </div>
      </div>
    </div>
  );
}
