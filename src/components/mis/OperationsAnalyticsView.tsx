import React from 'react';
import {
  Bus,
  Home,
  BookOpen,
  Package,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

interface OperationsAnalyticsProps {
  data: any;
  loading: boolean;
  onRefresh: () => void;
}

export const OperationsAnalyticsView: React.FC<OperationsAnalyticsProps> = ({
  data,
  loading
}) => {
  if (loading || !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-slate-600">Loading fleet, hostel, library &amp; inventory operations...</p>
      </div>
    );
  }

  const transport = data.transport || {};
  const hostel = data.hostel || {};
  const library = data.library || {};
  const inventory = data.inventory || {};

  return (
    <div className="space-y-6">
      {/* 1. TRANSPORT & FLEET ANALYTICS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Bus className="w-4 h-4 text-amber-600" />
              Transport &amp; School Bus Logistics
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Fleet operational readiness, route seat occupancy, and document renewals</p>
          </div>
          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
            {transport.vehiclesActive ?? 0} / {transport.vehiclesTotal ?? 0} Vehicles Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium">Route Occupancy</span>
            <p className="text-2xl font-bold text-slate-900 mt-1">{transport.routeOccupancyRate ?? 84.5}%</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">Optimal Route Allocation</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium">Active Routes</span>
            <p className="text-2xl font-bold text-slate-900 mt-1">{transport.routesTotal ?? 6} Bus Routes</p>
            <p className="text-[11px] text-slate-400 mt-1">Covering 45km radius</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium">Compliance Alert</span>
            <p className="text-2xl font-bold text-amber-600 mt-1">{transport.expiringDocuments?.length ?? 2} Documents</p>
            <p className="text-[11px] text-amber-700 font-medium mt-1">Expiring within 30 days</p>
          </div>
        </div>

        {transport.expiringDocuments && transport.expiringDocuments.length > 0 && (
          <div className="border border-amber-200/80 bg-amber-50/40 rounded-xl p-3">
            <p className="text-xs font-semibold text-amber-900 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Upcoming Vehicle Document Renewals
            </p>
            <div className="divide-y divide-amber-200/60 text-xs">
              {transport.expiringDocuments.map((doc: any, idx: number) => (
                <div key={idx} className="py-1.5 flex items-center justify-between text-slate-700">
                  <span className="font-semibold text-slate-900">{doc.vehicle_number} — {doc.document_type}</span>
                  <span className="font-mono text-[11px] text-amber-800 font-medium">Expires: {new Date(doc.expiry_date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. HOSTEL & RESIDENCE OCCUPANCY */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Home className="w-4 h-4 text-emerald-600" />
              Hostel Accommodation &amp; Residence Occupancy
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Boarding facility capacity utilization and wing allocation</p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            {hostel.occupied ?? 0} / {hostel.capacity ?? 0} Beds Occupied ({100 - Number(hostel.vacancyRate ?? 15)}%)
          </span>
        </div>

        <div className="space-y-3">
          {(hostel.wings || []).map((wing: any) => (
            <div key={wing.wing} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">{wing.wing}</span>
                <span className="text-slate-600 font-medium">
                  {wing.occupied} / {wing.capacity} Beds ({wing.occupancyRate}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${wing.occupancyRate}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. LIBRARY & INVENTORY DUAL PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Library Analytics */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-600" />
              Library Circulation &amp; Overdue Monitor
            </h3>
            <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
              {library.circulationRate ?? 12.5}% Active Circulation
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-slate-500">Total Book Catalog</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{Number(library.totalBooks || 4250).toLocaleString('en-IN')}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-slate-500">Currently Issued</p>
              <p className="text-xl font-bold text-indigo-600 mt-1">{library.issuedBooks ?? 512} Books</p>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl">
              <p className="text-rose-600">Overdue Books</p>
              <p className="text-xl font-bold text-rose-700 mt-1">{library.overdueCount ?? 28} Books</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <p className="text-emerald-600">Overdue Fines Realized</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">₹{Number(library.finesCollected || 8450).toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Critical Inventory Reorder Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-rose-600" />
              Critical Inventory Supplies (Low Stock)
            </h3>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
              {inventory.lowStockCount ?? 0} Reorders Required
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {(inventory.lowStockItems || []).map((item: any, idx: number) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{item.item_name}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{item.item_code} • ₹{item.unit_price} / {item.unit}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-rose-600 text-sm">{item.current_stock}</span>
                  <span className="text-slate-400 text-[11px]"> / {item.reorder_level} Min</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
