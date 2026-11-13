import React, { useEffect } from 'react';
import L from 'leaflet';
import { CalendarPlus, ChevronRight, MapPin, Scissors } from 'lucide-react';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { formatDistance } from '@/lib/utils';
import type { BranchSearchResponse } from '@/types/booking';

interface BranchMapProps {
  userLocation: { lat: number; lng: number };
  radiusKm: number;
  areaSearch?: boolean;
  branches: BranchSearchResponse[];
  selectedBranchId: string | null;
  onSelectBranch: (branchId: string) => void;
}

const createUserIcon = () =>
  L.divIcon({
    className: 'barber-user-pin',
    html: `<div style="
      width: 18px; height: 18px;
      border-radius: 9999px;
      background: #0284c7;
      border: 3px solid #ffffff;
      box-shadow: 0 0 0 6px rgba(2, 132, 199, 0.35);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

const createBarberIcon = (isSelected: boolean) =>
  L.divIcon({
    className: 'barber-branch-pin',
    html: `<div style="
      display: flex; align-items: center; justify-content: center;
      width: ${isSelected ? 42 : 36}px; height: ${isSelected ? 42 : 36}px;
      border-radius: 14px;
      background: ${isSelected ? '#f59e0b' : '#18181b'};
      color: ${isSelected ? '#18181b' : '#f59e0b'};
      border: 2.5px solid #f59e0b;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, ${isSelected ? '0.5' : '0.35'});
      transform: ${isSelected ? 'scale(1.08)' : 'scale(1)'};
      transition: all 180ms cubic-bezier(0.4, 0, 0.2, 1);
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/>
        <circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>
      </svg>
    </div>`,
    iconSize: [isSelected ? 42 : 36, isSelected ? 42 : 36],
    iconAnchor: [isSelected ? 21 : 18, isSelected ? 21 : 18],
    popupAnchor: [0, -22],
  });

const MapViewportUpdater: React.FC<{ center: [number, number]; branches: BranchSearchResponse[]; areaSearch: boolean }> = ({ center, branches, areaSearch }) => {
  const map = useMap();

  useEffect(() => {
    if (areaSearch && branches.length > 1) {
      map.fitBounds(branches.map((branch) => [branch.latitude, branch.longitude]), { padding: [32, 32], maxZoom: 13 });
    } else {
      map.flyTo(center, map.getZoom(), { duration: 0.65 });
    }
  }, [center, map, branches, areaSearch]);

  return null;
};

export const BranchMap: React.FC<BranchMapProps> = ({
  userLocation,
  radiusKm,
  areaSearch = false,
  branches,
  selectedBranchId,
  onSelectBranch,
}) => {
  const navigate = useNavigate();

  const selectedBranch = branches.find((b) => b.branchId === selectedBranchId);
  const center: [number, number] = selectedBranch
    ? [selectedBranch.latitude, selectedBranch.longitude]
    : [userLocation.lat, userLocation.lng];

  // 100% Free OpenStreetMap Tile Layer - No API Key, No Rate Limits, No Watermarks
  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900 lg:h-[650px] transition-all">
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom
        className="h-full w-full z-10"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={tileUrl}
        />

        <MapViewportUpdater center={center} branches={branches} areaSearch={areaSearch} />

        {/* User location radius */}
        {!areaSearch && <Circle
          center={[userLocation.lat, userLocation.lng]}
          radius={radiusKm * 1000}
          pathOptions={{
            color: '#f59e0b',
            weight: 1.5,
            opacity: 0.45,
            fillColor: '#f59e0b',
            fillOpacity: 0.06,
          }}
        />}
        {!areaSearch && <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserIcon()}>
          <Popup>
            <div className="p-1 font-semibold text-xs text-slate-800">
              📍 Bulunduğunuz Konum
            </div>
          </Popup>
        </Marker>}

        {/* Salon branch pins */}
        {branches.map((branch) => {
          const isSelected = branch.branchId === selectedBranchId;
          return (
            <Marker
              key={branch.branchId}
              position={[branch.latitude, branch.longitude]}
              icon={createBarberIcon(isSelected)}
              eventHandlers={{
                click: () => onSelectBranch(branch.branchId),
              }}
            >
              <Popup>
                <div className="min-w-60 p-2 text-slate-900 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 uppercase tracking-wide">
                        <Scissors className="h-3 w-3" />
                        {branch.businessName}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        {branch.branchName}
                      </h4>
                    </div>
                  </div>

                  <p className="flex items-center gap-1 text-xs text-slate-600 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>{areaSearch ? `${branch.district}, ${branch.city}` : `${formatDistance(branch.distanceMeters)} uzaklıkta`}</span>
                  </p>

                  {branch.offeredServices.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {branch.offeredServices.slice(0, 3).map((srv) => (
                        <span
                          key={srv}
                          className="rounded-lg bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200/60"
                        >
                          {srv}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1 border-t border-slate-100">
                    <Button
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => navigate(`/book/${branch.branchId}`, { state: { branch } })}
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      Randevu Al
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs px-2.5"
                      onClick={() => navigate(`/branch/${branch.branchId}`, { state: { branch } })}
                      title="Salonu İncele"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
