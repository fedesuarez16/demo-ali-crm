'use client';

import React, { useState } from 'react';
import AppLayout from "../components/AppLayout";
import LeadCards from "../components/LeadCards";
import { Lead, LeadStatus } from "../types";
import { updateLeadStatus } from "../services/leadService";

export default function Page() {
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);

  const handleLeadStatusChange = (leadId: string, newStatus: LeadStatus) => {
    updateLeadStatus(leadId, newStatus);
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>
        <div className="bg-white mb-8 overflow-hidden">
          <div className="">
            <LeadCards 
              leads={filteredLeads} 
              onLeadStatusChange={handleLeadStatusChange}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
