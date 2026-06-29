import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Search, Filter, ShieldAlert, CheckCircle2, AlertTriangle, MessageSquareCode } from 'lucide-react';

// Create custom Tailwind CSS markers for OSM maps
const createCustomIcon = (color, isActive = false) => {
  return L.divIcon({
    html: `
      <div class="flex items-center justify-center w-6 h-6">
        ${isActive ? `<div class="absolute w-6 h-6 bg-[${color}] rounded-full animate-ping opacity-35" style="background-color: ${color}"></div>` : ''}
        <div class="w-4 h-4 rounded-full border-2 border-slate-950 shadow-md" style="background-color: ${color}"></div>
      </div>
    `,
    className: 'custom-leaflet-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -10],
  });
};

const MapComponent = ({ permits = [], complaints = [], roads = [] }) => {
  // Center of Map (Bhopal region coords matching seeds)
  const defaultCenter = [23.2599, 77.4126];
  const defaultZoom = 13;

  // Filter States
  const [deptFilter, setDeptFilter] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchRoad, setSearchRoad] = useState('');

  // Dropdown master lists derived from data
  const [wards, setWards] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    // Extract unique wards
    const allWards = new Set([
      ...permits.map((p) => p.ward),
      ...complaints.map((c) => c.ward),
      ...roads.map((r) => r.ward),
    ]);
    setWards(Array.from(allWards).filter(Boolean));

    // Extract unique departments
    const allDepts = {};
    permits.forEach((p) => {
      if (p.department) allDepts[p.department.code] = p.department.name;
    });
    complaints.forEach((c) => {
      if (c.department) allDepts[c.department.code] = c.department.name;
    });
    setDepartments(Object.entries(allDepts));
  }, [permits, complaints, roads]);

  // Apply filters
  const filteredPermits = permits.filter((permit) => {
    const matchDept = !deptFilter || permit.department?.code === deptFilter;
    const matchWard = !wardFilter || permit.ward === wardFilter;
    const matchStatus = !statusFilter || permit.status === statusFilter;
    const matchSearch = !searchRoad || permit.roadName.toLowerCase().includes(searchRoad.toLowerCase());
    return matchDept && matchWard && matchStatus && matchSearch;
  });

  const filteredComplaints = complaints.filter((comp) => {
    const matchDept = !deptFilter || comp.department?.code === deptFilter;
    const matchWard = !wardFilter || comp.ward === wardFilter;
    const matchStatus = !statusFilter || (statusFilter === 'Complaint' && comp.status !== 'Resolved'); // Blue complaints filter
    const matchSearch = !searchRoad || comp.description.toLowerCase().includes(searchRoad.toLowerCase());
    // Only show unresolved complaints on map by default unless explicitly looking for resolved complaints
    return matchDept && matchWard && matchSearch;
  });

  return (
    <div className="flex flex-col h-full bg-slate-900/40 rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
      {/* Filtering Header Toolbar */}
      <div className="p-4 bg-slate-900/80 border-b border-slate-800/80 grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
        {/* Search */}
        <div className="relative col-span-1 md:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search road or keywords..."
            className="w-full bg-slate-950 border border-slate-700/60 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 outline-none focus:border-gov-500 focus:ring-1 focus:ring-gov-500"
            value={searchRoad}
            onChange={(e) => setSearchRoad(e.target.value)}
          />
        </div>

        {/* Department Filter */}
        <div className="relative">
          <select
            className="w-full bg-slate-950 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-gov-500"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Ward Filter */}
        <div className="relative">
          <select
            className="w-full bg-slate-950 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-gov-500"
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
          >
            <option value="">All Wards</option>
            {wards.map((ward) => (
              <option key={ward} value={ward}>
                {ward}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            className="w-full bg-slate-950 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-gov-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active Excavations (Orange)</option>
            <option value="Pending">Pending Approvals (Yellow)</option>
            <option value="Conflict">Conflict Zones (Red)</option>
            <option value="Completed">Completed Works (Green)</option>
          </select>
        </div>
      </div>

      {/* Map Content */}
      <div className="flex-grow relative h-[500px] md:h-full min-h-[400px]">
        <MapContainer center={defaultCenter} zoom={defaultZoom} className="w-full h-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Render Road Segments */}
          {roads.map((road) => (
            <Polyline
              key={road._id}
              positions={road.geometry.coordinates.map(([lng, lat]) => [lat, lng])}
              color={road.status === 'Closed' ? '#ef4444' : '#10b981'}
              weight={5}
              opacity={0.8}
            >
              <Popup>
                <div className="text-xs p-1">
                  <h4 className="font-bold text-sm text-slate-200">{road.name}</h4>
                  <p className="opacity-80">Ward: {road.ward}</p>
                  <p className="mt-1 font-semibold text-slate-300">
                    Status: <span className={road.status === 'Closed' ? 'text-red-400' : 'text-emerald-400'}>{road.status}</span>
                  </p>
                  {road.closureReason && <p className="text-red-300 mt-1 italic">Reason: {road.closureReason}</p>}
                </div>
              </Popup>
            </Polyline>
          ))}

          {/* Render Permits */}
          {filteredPermits.map((permit) => {
            let statusColor = '#3b82f6'; // Blue
            let isPulse = false;

            if (permit.status === 'Active') {
              statusColor = '#f97316'; // Orange
              isPulse = true;
            } else if (permit.status === 'Conflict') {
              statusColor = '#ef4444'; // Red
              isPulse = true;
            } else if (permit.status === 'Completed') {
              statusColor = '#10b981'; // Green
            } else if (permit.status === 'Pending') {
              statusColor = '#eab308'; // Yellow
            }

            return (
              <React.Fragment key={permit._id}>
                {/* Visual conflict boundary circle */}
                <Circle
                  center={[permit.latitude, permit.longitude]}
                  radius={permit.radius}
                  pathOptions={{
                    color: statusColor,
                    fillColor: statusColor,
                    fillOpacity: 0.15,
                    weight: 1.5,
                  }}
                />

                <Marker
                  position={[permit.latitude, permit.longitude]}
                  icon={createCustomIcon(statusColor, isPulse)}
                >
                  <Popup>
                    <div className="w-64 p-1 text-slate-200">
                      <div className="flex items-center gap-1.5 border-b border-slate-700/60 pb-1.5 mb-2">
                        {permit.status === 'Conflict' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        {permit.status === 'Completed' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        <span className="font-bold text-sm text-slate-100">{permit.roadName}</span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-300">
                        <p><span className="font-semibold text-slate-400">Dept:</span> {permit.department?.name}</p>
                        <p><span className="font-semibold text-slate-400">Ward:</span> {permit.ward}</p>
                        <p><span className="font-semibold text-slate-400">Dates:</span> {new Date(permit.startDate).toLocaleDateString()} to {new Date(permit.endDate).toLocaleDateString()}</p>
                        <p><span className="font-semibold text-slate-400">Depth:</span> {permit.depth} meters</p>
                        <p><span className="font-semibold text-slate-400">Purpose:</span> {permit.purpose}</p>
                        
                        <div className="pt-2 flex justify-between items-center">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold"
                            style={{ backgroundColor: statusColor + '22', color: statusColor }}
                          >
                            {permit.status.toUpperCase()}
                          </span>
                          
                          {permit.status === 'Conflict' && (
                            <span className="text-[10px] font-bold text-red-400 flex items-center gap-0.5 animate-pulse">
                              <ShieldAlert className="h-3 w-3" /> Overlap Detected!
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}

          {/* Render Citizen Complaints (Blue markers) */}
          {filteredComplaints.map((complaint) => (
            <Marker
              key={complaint._id}
              position={[complaint.latitude, complaint.longitude]}
              icon={createCustomIcon('#3b82f6', complaint.priority === 'High')}
            >
              <Popup>
                <div className="w-64 p-1 text-slate-200">
                  <div className="flex items-center gap-1.5 border-b border-slate-700/60 pb-1.5 mb-2">
                    <MessageSquareCode className="h-4 w-4 text-blue-400" />
                    <span className="font-bold text-sm text-blue-400">Citizen Complaint</span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <p className="line-clamp-2 italic">"{complaint.description}"</p>
                    <p><span className="font-semibold text-slate-400">Type:</span> {complaint.complaintType}</p>
                    <p><span className="font-semibold text-slate-400">Ward:</span> {complaint.ward}</p>
                    <p><span className="font-semibold text-slate-400">Status:</span> <span className="text-blue-400 font-semibold">{complaint.status}</span></p>
                    <p><span className="font-semibold text-slate-400">Priority:</span> <span className={complaint.priority === 'High' ? 'text-red-400' : 'text-slate-300'}>{complaint.priority}</span></p>
                    
                    {complaint.photoUrl && (
                      <div className="mt-2 rounded overflow-hidden max-h-24">
                        <img src={complaint.photoUrl} alt="Complaint" className="w-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Legend Overlay overlay */}
        <div className="absolute bottom-4 left-4 z-[1000] p-3 bg-slate-950/90 backdrop-blur border border-slate-800 rounded-lg text-xs space-y-2 max-w-[200px] shadow-2xl">
          <h5 className="font-bold text-slate-300 border-b border-slate-800 pb-1 mb-1">GIS Map Legend</h5>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block border border-slate-900"></span>
            <span>Completed Works</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500 inline-block border border-slate-900 animate-pulse"></span>
            <span>Active Digging</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block border border-slate-900 animate-pulse"></span>
            <span>Conflict Detected</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block border border-slate-900"></span>
            <span>Pending Permits</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block border border-slate-900"></span>
            <span>Citizen Complaint</span>
          </div>
          <div className="flex items-center gap-2 border-t border-slate-800 pt-1.5 mt-1.5">
            <span className="w-4 h-1 bg-red-500 inline-block"></span>
            <span>Road Closed Segment</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 bg-emerald-500 inline-block"></span>
            <span>Road Open Segment</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapComponent;
