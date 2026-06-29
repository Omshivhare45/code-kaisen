import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from 'socket.io-client';

// Fix Leaflet marker icons issue in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons
const complaintIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const escalatedIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const API_URL = 'http://localhost:5000/api';

export default function App() {
  // Authentication State
  const [token, setToken] = useState<string | null>(localStorage.getItem('setu_token'));
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('setu_user') || 'null'));
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  
  // Auth Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // App Navigation & Tab State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'permits' | 'complaints'>('dashboard');
  const [selectedPermitId, setSelectedPermitId] = useState<string | null>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  // Data States
  const [stats, setStats] = useState<any>(null);
  const [gisData, setGisData] = useState<any>(null);
  const [permitsList, setPermitsList] = useState<any[]>([]);
  const [complaintsList, setComplaintsList] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Selected Detail States
  const [permitDetail, setPermitDetail] = useState<any>(null);
  const [complaintDetail, setComplaintDetail] = useState<any>(null);

  // Form States
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawType, setDrawType] = useState<'LineString' | 'Polygon'>('LineString');
  const [drawnCoords, setDrawnCoords] = useState<[number, number][]>([]); // [lat, lon]
  const [roadName, setRoadName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [depth, setDepth] = useState('1.5');
  const [restorationPlan, setRestorationPlan] = useState('');

  // Citizen Complaint Form
  const [isPinningComplaint, setIsPinningComplaint] = useState(false);
  const [complaintPin, setComplaintPin] = useState<[number, number] | null>(null); // [lat, lon]
  const [cType, setCType] = useState('Pothole');
  const [cDesc, setCDesc] = useState('');
  const [cRoad, setCRoad] = useState('');
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');

  // Coordination Meeting Form
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingParticipants, setMeetingParticipants] = useState('');

  // Complaint Action Form
  const [actionNotes, setActionNotes] = useState('');
  const [cFeedback, setCFeedback] = useState('');
  const [cRating, setCRating] = useState('5');

  // UI Feedback States
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Map Refs
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const tempDrawLayerRef = useRef<L.Layer | null>(null);

  // Helper to trigger alert toasts
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Socket.IO Setup
  useEffect(() => {
    if (!token) return;
    const socket = io('http://localhost:5000');

    socket.on('connect', () => {
      console.log('Connected to real-time notification server.');
      socket.emit('join_permits');
      socket.emit('join_complaints');
      if (user?.department) {
        socket.emit('join_department', user.department);
      }
    });

    socket.on('permit_created', (data: any) => {
      addToast(`New permit ${data.permitNumber} submitted by ${data.department?.name || 'department'}.`, 'info');
      refreshData();
    });

    socket.on('permit_updated', (data: any) => {
      addToast(`Permit ${data.permitNumber} status updated to ${data.status}.`, 'info');
      refreshData();
      if (selectedPermitId === data._id) {
        fetchPermitDetail(data._id);
      }
    });

    socket.on('complaint_created', (data: any) => {
      addToast(`New complaint ${data.ticketNumber} registered: ${data.complaintType} on ${data.roadName}.`, 'info');
      refreshData();
    });

    socket.on('complaint_updated', (data: any) => {
      addToast(`Complaint ${data.ticketNumber} updated to ${data.status}.`, 'info');
      refreshData();
      if (selectedComplaintId === data._id) {
        fetchComplaintDetail(data._id);
      }
    });

    socket.on('notification_received', (data: any) => {
      addToast(`Escalation Alert: ${data.title}`, 'error');
      fetchNotifications();
    });

    return () => {
      socket.disconnect();
    };
  }, [token, selectedPermitId, selectedComplaintId]);

  // Fetch Data on Load
  useEffect(() => {
    if (token) {
      refreshData();
      fetchDepartments();
      fetchNotifications();
    }
  }, [token]);

  // Initialize Map
  useEffect(() => {
    if (!token) return;

    // Create Map if it doesn't exist
    if (!mapRef.current) {
      const map = L.map('leaflet-map').setView([23.235, 77.425], 13); // Bhopal MP Nagar center

      // Dark Mode Tile Layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      mapRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);

      // Handle map clicks for coordinate drawing/pinning
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;

        if (isDrawing) {
          setDrawnCoords((prev) => [...prev, [lat, lng]]);
        } else if (isPinningComplaint) {
          setComplaintPin([lat, lng]);
          setIsPinningComplaint(false);
          addToast(`Location pinned: [${lng.toFixed(5)}, ${lat.toFixed(5)}]`, 'success');
        }
      });
    }

    return () => {
      // Clean up map on logout
      if (!token && mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [token, isDrawing, isPinningComplaint]);

  // Render GIS data layers on Map
  useEffect(() => {
    if (!gisData || !mapRef.current || !layerGroupRef.current) return;

    // Clear previous layers
    layerGroupRef.current.clearLayers();

    // 1. Draw Wards (Polygon Layer)
    if (gisData.wards && gisData.wards.features) {
      L.geoJSON(gisData.wards, {
        style: {
          color: '#374151',
          weight: 1.5,
          fillColor: '#1F2937',
          fillOpacity: 0.15,
        },
        onEachFeature: (feature, layer) => {
          layer.bindTooltip(feature.properties.name, { sticky: true });
        }
      }).addTo(layerGroupRef.current);
    }

    // 2. Draw Roads (LineString Layer)
    if (gisData.roads && gisData.roads.features) {
      L.geoJSON(gisData.roads, {
        style: {
          color: '#4B5563',
          weight: 3,
        },
        onEachFeature: (feature, layer) => {
          layer.bindPopup(`<strong>Road:</strong> ${feature.properties.name}<br/><strong>Type:</strong> ${feature.properties.roadType}<br/><strong>Last Resurfaced:</strong> ${feature.properties.lastResurfacedAt ? new Date(feature.properties.lastResurfacedAt).toDateString() : 'N/A'}`);
        }
      }).addTo(layerGroupRef.current);
    }

    // 3. Draw Active Permits (LineStrings/Polygons)
    if (gisData.permits && gisData.permits.features) {
      L.geoJSON(gisData.permits, {
        style: (feature: any) => {
          // If conflict exists and is high risk, make it red glow. Otherwise use department color.
          const isHighConflict = feature.properties.riskLevel === 'High' && feature.properties.status !== 'Completed';
          return {
            color: isHighConflict ? '#EF4444' : feature.properties.departmentColor || '#3B82F6',
            weight: 5,
            dashArray: feature.properties.status === 'Draft' ? '5, 5' : undefined,
            opacity: 0.8,
          };
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          const popupContent = `
            <div style="font-family: sans-serif; font-size: 13px;">
              <h4 style="margin: 0 0 6px 0; color: white;">Permit: ${props.permitNumber}</h4>
              <strong>Dept:</strong> ${props.departmentName}<br/>
              <strong>Road:</strong> ${props.roadName}<br/>
              <strong>Dates:</strong> ${new Date(props.startDate).toLocaleDateString()} to ${new Date(props.endDate).toLocaleDateString()}<br/>
              <strong>Status:</strong> <span class="badge badge-${props.status.toLowerCase().replace(' ', '')}">${props.status}</span><br/>
              <strong>Risk Score:</strong> ${props.conflictScore} (${props.riskLevel})<br/>
              <button onclick="window.selectPermit('${feature.id}')" style="margin-top: 8px; width: 100%; border: none; background: #3B82F6; color: white; border-radius: 4px; padding: 4px; cursor: pointer;">View Details</button>
            </div>
          `;
          layer.bindPopup(popupContent);
        }
      }).addTo(layerGroupRef.current);
    }

    // 4. Draw Citizen Complaints (Points)
    if (gisData.complaints && gisData.complaints.features) {
      L.geoJSON(gisData.complaints, {
        pointToLayer: (feature, latlng) => {
          const isEscalated = feature.properties.isEscalated;
          return L.marker(latlng, { icon: isEscalated ? escalatedIcon : complaintIcon });
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          const popupContent = `
            <div style="font-family: sans-serif; font-size: 13px;">
              <h4 style="margin: 0 0 6px 0; color: white;">Ticket: ${props.ticketNumber}</h4>
              <strong>Type:</strong> ${props.complaintType}<br/>
              <strong>Road:</strong> ${props.roadName}<br/>
              <strong>Status:</strong> ${props.status}<br/>
              <strong>Escalated:</strong> ${props.isEscalated ? '<span style="color:#EF4444; font-weight:bold;">YES (SLA Breach)</span>' : 'No'}<br/>
              <button onclick="window.selectComplaint('${feature.id}')" style="margin-top: 8px; width: 100%; border: none; background: #EAB308; color: black; border-radius: 4px; padding: 4px; cursor: pointer; font-weight:500;">Manage Ticket</button>
            </div>
          `;
          layer.bindPopup(popupContent);
        }
      }).addTo(layerGroupRef.current);
    }

    // Bind window functions so leaflet click buttons trigger React state
    (window as any).selectPermit = (id: string) => {
      setSelectedPermitId(id);
      setActiveTab('permits');
    };
    (window as any).selectComplaint = (id: string) => {
      setSelectedComplaintId(id);
      setActiveTab('complaints');
    };

  }, [gisData]);

  // Handle active drawing overlay
  useEffect(() => {
    if (!mapRef.current) return;

    if (tempDrawLayerRef.current) {
      mapRef.current.removeLayer(tempDrawLayerRef.current);
      tempDrawLayerRef.current = null;
    }

    if (drawnCoords.length > 0) {
      if (drawType === 'LineString') {
        tempDrawLayerRef.current = L.polyline(drawnCoords, { color: '#F59E0B', weight: 4, dashArray: '5, 10' }).addTo(mapRef.current);
      } else {
        tempDrawLayerRef.current = L.polygon(drawnCoords, { color: '#F59E0B', weight: 4, dashArray: '5, 10', fillOpacity: 0.2 }).addTo(mapRef.current);
      }
    }
  }, [drawnCoords, drawType]);

  const refreshData = () => {
    fetchStats();
    fetchGIS();
    fetchPermits();
    fetchComplaints();
  };

  // API Call Helpers
  const makeRequest = async (endpoint: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'API Request failed');
    }
    return data;
  };

  const fetchStats = async () => {
    try {
      const data = await makeRequest('/dashboard/stats');
      setStats(data);
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const fetchGIS = async () => {
    try {
      const data = await makeRequest('/dashboard/gis');
      setGisData(data);
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const fetchPermits = async () => {
    try {
      const data = await makeRequest('/permits');
      setPermitsList(data);
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const fetchComplaints = async () => {
    try {
      const data = await makeRequest('/complaints');
      setComplaintsList(data);
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await makeRequest('/departments');
      setDepartments(data);
      console.log('Departments loaded:', data.length, departments.length);
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await makeRequest('/notifications');
      setNotifications(data);
    } catch (e: any) {
      console.error(e);
    }
  };

  const fetchPermitDetail = async (id: string) => {
    try {
      const data = await makeRequest(`/permits/${id}`);
      setPermitDetail(data);
      
      // Center map on centroid
      if (data.permit?.centroid && mapRef.current) {
        const [lon, lat] = data.permit.centroid.coordinates;
        mapRef.current.setView([lat, lon], 14);
      }
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const fetchComplaintDetail = async (id: string) => {
    try {
      const data = await makeRequest(`/complaints/${id}`);
      setComplaintDetail(data);
      
      // Center map on location
      if (data.complaint && mapRef.current) {
        mapRef.current.setView([data.complaint.latitude, data.complaint.longitude], 15);
      }
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  // Auth Operations
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('setu_token', data.token);
      localStorage.setItem('setu_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      addToast(`Welcome back, ${data.user.firstName}!`, 'success');
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await makeRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, firstName, lastName }),
      });
      addToast('Account created successfully. You can log in now!', 'success');
      setAuthView('login');
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('setu_token');
    localStorage.removeItem('setu_user');
    setToken(null);
    setUser(null);
    setStats(null);
    setGisData(null);
    setSelectedPermitId(null);
    setSelectedComplaintId(null);
  };

  // Permit operations
  const handleCreatePermit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (drawnCoords.length < (drawType === 'LineString' ? 2 : 3)) {
      addToast(`Please draw the location coordinates on the map first. (Minimum ${drawType === 'LineString' ? '2' : '3'} points)`, 'error');
      return;
    }

    try {
      // Reformat drawn coords to GeoJSON coordinates (from lat,lon array to lon,lat array)
      const geoCoords = drawnCoords.map((c) => [c[1], c[0]]);
      if (drawType === 'Polygon') {
        // Ensure polygon closes
        if (geoCoords[0][0] !== geoCoords[geoCoords.length - 1][0] || geoCoords[0][1] !== geoCoords[geoCoords.length - 1][1]) {
          geoCoords.push([...geoCoords[0]]);
        }
      }

      const payload = {
        roadName,
        geometry: {
          type: drawType,
          coordinates: drawType === 'Polygon' ? [geoCoords] : geoCoords,
        },
        purpose,
        startDate,
        endDate,
        depth: parseFloat(depth),
        restorationPlan,
        status: 'Submitted', // Directly submit to trigger conflict checking
      };

      const newPermit = await makeRequest('/permits', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      addToast(`Permit ${newPermit.permitNumber} created and submitted.`, 'success');
      
      // Reset form
      setRoadName('');
      setPurpose('');
      setStartDate('');
      setEndDate('');
      setDrawnCoords([]);
      setIsDrawing(false);
      
      refreshData();
      setSelectedPermitId(newPermit._id);
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const handleUpdatePermitStatus = async (id: string, newStatus: string) => {
    try {
      await makeRequest(`/permits/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      addToast(`Permit status updated to ${newStatus}.`, 'success');
      fetchPermitDetail(id);
      refreshData();
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPermitId || !meetingDate || !meetingNotes) return;
    try {
      // Parse participants string into array
      const parts = meetingParticipants.split(',').map((p) => {
        const fields = p.trim().split(':');
        return {
          name: fields[0] || 'Representative',
          department: fields[1] || 'Guest Department',
          email: fields[2] || 'contact@government.in',
        };
      });

      await makeRequest(`/permits/${selectedPermitId}/meetings`, {
        method: 'POST',
        body: JSON.stringify({
          meetingDate,
          notes: meetingNotes,
          participants: parts,
        }),
      });

      addToast('Joint coordination meeting scheduled successfully.', 'success');
      setMeetingDate('');
      setMeetingNotes('');
      setMeetingParticipants('');
      fetchPermitDetail(selectedPermitId);
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  // Complaint operations
  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintPin) {
      addToast('Please click on the map to pin the complaint location.', 'error');
      return;
    }
    try {
      const payload = {
        reporterName: cName || undefined,
        reporterEmail: cEmail || undefined,
        reporterPhone: cPhone || undefined,
        complaintType: cType,
        description: cDesc,
        roadName: cRoad,
        latitude: complaintPin[0],
        longitude: complaintPin[1],
      };

      const newC = await makeRequest('/complaints', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      addToast(`Ticket ${newC.ticketNumber} registered successfully!`, 'success');
      
      // Reset Form
      setCDesc('');
      setCRoad('');
      setComplaintPin(null);
      
      refreshData();
      setSelectedComplaintId(newC._id);
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const handleUpdateComplaintStatus = async (id: string, newStatus: string) => {
    try {
      await makeRequest(`/complaints/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, notes: actionNotes }),
      });
      addToast(`Ticket status updated to ${newStatus}.`, 'success');
      setActionNotes('');
      fetchComplaintDetail(id);
      refreshData();
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const handleComplaintFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaintId) return;
    try {
      await makeRequest(`/complaints/${selectedComplaintId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({
          rating: parseInt(cRating),
          feedback: cFeedback,
        }),
      });
      addToast('Feedback submitted successfully.', 'success');
      setCFeedback('');
      fetchComplaintDetail(selectedComplaintId);
      refreshData();
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const handleNotificationRead = async (id: string) => {
    try {
      await makeRequest(`/notifications/${id}/read`, {
        method: 'PATCH',
      });
      fetchNotifications();
    } catch (e: any) {
      console.error(e);
    }
  };

  // Quick Sign-in helpers
  const handleQuickSignIn = async (emailAddr: string) => {
    try {
      const data = await makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: emailAddr, password: 'password123' }),
      });
      localStorage.setItem('setu_token', data.token);
      localStorage.setItem('setu_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      addToast(`Logged in as ${data.user.firstName} (${data.user.role})`, 'success');
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  // Secondary item selectors
  const handleSelectPermit = (id: string) => {
    setSelectedPermitId(id);
    setPermitDetail(null);
    fetchPermitDetail(id);
  };

  const handleSelectComplaint = (id: string) => {
    setSelectedComplaintId(id);
    setComplaintDetail(null);
    fetchComplaintDetail(id);
  };

  // Render Login view
  if (!token) {
    return (
      <div className="auth-wrapper" style={{ flexDirection: 'column', padding: 0 }}>
        {/* Top Accessibility Bar */}
        <div className="gov-top-bar" style={{ width: '100%' }}>
          <div className="gov-top-links">
            <span style={{ color: '#FF9933', fontWeight: 600 }}>GOVERNMENT OF MADHYA PRADESH</span>
            <span>|</span>
            <span>Bhopal Municipal Corporation</span>
          </div>
          <div className="gov-accessibility-controls">
            <span>Screen Reader Access</span>
            <span>|</span>
            <button className="accessibility-btn" onClick={() => addToast('Text size set to Default', 'info')}>A</button>
            <button className="accessibility-btn" onClick={() => addToast('Text size increased', 'info')}>A+</button>
            <span>|</span>
            <button className="accessibility-btn" onClick={() => addToast('High contrast mode enabled', 'info')}>Contrast</button>
          </div>
        </div>

        {/* Tricolour Line */}
        <div className="gov-tricolour-stripe"></div>

        {/* Main Banner */}
        <div className="gov-header-banner" style={{ width: '100%' }}>
          <div className="gov-brand">
            <svg className="gov-emblem-svg" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="60" r="45" fill="none" stroke="#FF9933" strokeWidth="2.5" />
              <circle cx="50" cy="60" r="40" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="3,3" />
              <circle cx="50" cy="60" r="35" fill="none" stroke="#128807" strokeWidth="1.5" />
              <path d="M 45 40 L 55 40 L 57 52 L 43 52 Z" fill="#FBBF24" />
              <path d="M 40 52 L 60 52 L 58 75 L 42 75 Z" fill="#D97706" />
              <rect x="47" y="75" width="6" height="15" fill="#D97706" />
              <circle cx="50" cy="82" r="5" fill="none" stroke="#000080" strokeWidth="1.5" />
              <path d="M 50 77 L 50 87 M 45 82 L 55 82 M 46.5 78.5 L 53.5 85.5 M 46.5 85.5 L 53.5 78.5" stroke="#000080" strokeWidth="0.8" />
              <text x="50" y="105" textAnchor="middle" fill="#FFFFFF" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif">सत्यमेव जयते</text>
            </svg>
            <div className="gov-titles">
              <span className="gov-title-main">SETU Coordination Portal</span>
              <span className="gov-title-sub">Bhopal Road Digging & Grievances</span>
              <span className="gov-title-dept">Integrated Coordination Geoportal of Bhopal Municipal Corporation (BMC)</span>
            </div>
          </div>
          <div className="gov-sso-badge">
            <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#4ADE80', borderRadius: '50%' }}></span>
            BMC Secure Sign-On
          </div>
        </div>

        {/* Central Sign In Area */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', padding: '2rem 1rem' }}>
          <div className="auth-card glass-panel" style={{ borderTop: '4px solid #FF9933' }}>
            <div className="auth-header">
              <h2 className="auth-title" style={{ fontSize: '1.4rem' }}>
                {authView === 'login' ? 'SSO Portal Sign-In' : 'Register Citizen Account'}
              </h2>
              <p className="auth-subtitle" style={{ fontSize: '0.8rem' }}>
                {authView === 'login' 
                  ? 'Access secure portal for Nodal Admins, PWD Engineers, and Citizens' 
                  : 'Register to file public road digging and patch complaints'}
              </p>
            </div>

            <form onSubmit={authView === 'login' ? handleLogin : handleRegister}>
              {authView === 'register' && (
                <>
                  <div className="form-group" style={{ padding: 0 }}>
                    <label className="form-label">First Name</label>
                    <input className="form-input" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ padding: 0 }}>
                    <label className="form-label">Last Name</label>
                    <input className="form-input" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                </>
              )}

              <div className="form-group" style={{ padding: 0 }}>
                <label className="form-label">Official Email / ID</label>
                <input className="form-input" type="email" placeholder="email@gov.in or citizen@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="form-group" style={{ padding: 0 }}>
                <label className="form-label">SSO Passcode</label>
                <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', background: 'linear-gradient(to right, #FF9933, #128807)' }}>
                {authView === 'login' ? 'Secure Log In' : 'Register Citizen'}
              </button>
            </form>

            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
              {authView === 'login' ? (
                <p>
                  Are you a citizen?{' '}
                  <a href="#" style={{ color: '#FF9933', fontWeight: 500 }} onClick={() => setAuthView('register')}>
                    Register here
                  </a>
                </p>
              ) : (
                <p>
                  Already have a government account?{' '}
                  <a href="#" style={{ color: '#FF9933', fontWeight: 500 }} onClick={() => setAuthView('login')}>
                    Sign In
                  </a>
                </p>
              )}
            </div>

            {authView === 'login' && (
              <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.5rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SSO Fast Track Credentials:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button onClick={() => handleQuickSignIn('nodal@setu.gov.in')} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem' }}>
                    Nodal Admin
                  </button>
                  <button onClick={() => handleQuickSignIn('pwd.eng@setu.gov.in')} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem' }}>
                    PWD Engineer
                  </button>
                  <button onClick={() => handleQuickSignIn('discom.eng@setu.gov.in')} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem' }}>
                    Discom Eng
                  </button>
                  <button onClick={() => handleQuickSignIn('citizen@gmail.com')} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem' }}>
                    Citizen User
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Official Gov Footer */}
        <footer className="gov-footer" style={{ width: '100%' }}>
          <div className="gov-footer-links">
            <a href="#" onClick={(e) => { e.preventDefault(); addToast('Website Policy details are simulated', 'info'); }}>Website Policies</a>
            <a href="#" onClick={(e) => { e.preventDefault(); addToast('Sitemap is simulated', 'info'); }}>Sitemap</a>
            <a href="#" onClick={(e) => { e.preventDefault(); addToast('Help details are simulated', 'info'); }}>Help</a>
            <a href="#" onClick={(e) => { e.preventDefault(); addToast('Contact Us info: coordination-bmc@mp.gov.in', 'info'); }}>Contact Us</a>
          </div>
          <p style={{ margin: '0.5rem 0 0 0' }}>
            Site owned, updated, and maintained by Bhopal Municipal Corporation (BMC), Government of Madhya Pradesh.
          </p>
          <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)' }}>
            Content management and technical infrastructure managed by National Informatics Centre (NIC). Version 2.0.4.
          </p>
        </footer>

        {/* Toasts overlay */}
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              {t.message}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render Dashboard main view
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top Accessibility Bar */}
      <div className="gov-top-bar">
        <div className="gov-top-links">
          <span style={{ color: '#FF9933', fontWeight: 600 }}>GOVERNMENT OF MADHYA PRADESH</span>
          <span>|</span>
          <span>Bhopal Municipal Corporation</span>
        </div>
        <div className="gov-accessibility-controls">
          <span>Screen Reader Access</span>
          <span>|</span>
          <button className="accessibility-btn" onClick={() => addToast('Text size set to Default', 'info')}>A</button>
          <button className="accessibility-btn" onClick={() => addToast('Text size increased', 'info')}>A+</button>
          <span>|</span>
          <button className="accessibility-btn" onClick={() => addToast('High contrast mode enabled', 'info')}>Contrast</button>
        </div>
      </div>

      {/* Tricolour Line */}
      <div className="gov-tricolour-stripe"></div>

      {/* Official Header Banner */}
      <header className="gov-header-banner" style={{ padding: '0.85rem 2rem' }}>
        <div className="gov-brand">
          <svg className="gov-emblem-svg" style={{ width: '40px', height: '52px' }} viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="60" r="45" fill="none" stroke="#FF9933" strokeWidth="2.5" />
            <circle cx="50" cy="60" r="40" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="3,3" />
            <circle cx="50" cy="60" r="35" fill="none" stroke="#128807" strokeWidth="1.5" />
            <path d="M 45 40 L 55 40 L 57 52 L 43 52 Z" fill="#FBBF24" />
            <path d="M 40 52 L 60 52 L 58 75 L 42 75 Z" fill="#D97706" />
            <rect x="47" y="75" width="6" height="15" fill="#D97706" />
            <circle cx="50" cy="82" r="5" fill="none" stroke="#000080" strokeWidth="1.5" />
            <path d="M 50 77 L 50 87 M 45 82 L 55 82 M 46.5 78.5 L 53.5 85.5 M 46.5 85.5 L 53.5 78.5" stroke="#000080" strokeWidth="0.8" />
            <text x="50" y="105" textAnchor="middle" fill="#FFFFFF" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif">सत्यमेव जयते</text>
          </svg>
          <div className="gov-titles">
            <span className="gov-title-main" style={{ fontSize: '1.1rem' }}>SETU Coordination Portal</span>
            <span className="gov-title-sub" style={{ fontSize: '0.75rem' }}>Bhopal Road Digging & Grievances</span>
          </div>
        </div>

        <div className="nav-links">
          <button className="btn btn-secondary" style={{ position: 'relative', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setShowNotifications(!showNotifications)}>
            Alerts
            {notifications.filter((n) => !n.isRead).length > 0 && (
              <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#EF4444', color: 'white', borderRadius: '9999px', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                {notifications.filter((n) => !n.isRead).length}
              </span>
            )}
          </button>
          
          <div className="nav-user" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}>
            ID: {user?.firstName} {user?.lastName} ({user?.role})
          </div>

          <button className="btn btn-danger" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main UI body */}
      <main className="app-container">
        {/* Notifications Dropdown Slideout */}
        {showNotifications && (
          <div style={{ position: 'absolute', top: '10px', right: '100px', width: '360px', maxHeight: '480px', overflowY: 'auto', background: '#111827', border: '1px solid var(--border-color)', borderRadius: '12px', zIndex: 1100, padding: '1rem', boxShadow: 'var(--shadow-lg)' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Notifications
              <button style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => setShowNotifications(false)}>Close</button>
            </h4>
            {notifications.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No new notifications.</p>
            ) : (
              notifications.map((n) => (
                <div key={n._id} style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: n.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.05)', borderRadius: '6px', marginBottom: '0.25rem', position: 'relative' }}>
                  <h5 style={{ margin: '0 0 0.25rem 0', color: 'white', fontSize: '0.85rem' }}>{n.title}</h5>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{n.message}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleString()}</span>
                    {!n.isRead && (
                      <button onClick={() => handleNotificationRead(n._id)} style={{ border: 'none', background: '#3B82F620', color: '#60A5FA', borderRadius: '4px', padding: '2px 6px', fontSize: '0.7rem', cursor: 'pointer' }}>Mark read</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Sidebar panels */}
        <section className="sidebar">
          <div className="tabs">
            <div className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setSelectedPermitId(null); setSelectedComplaintId(null); }}>
              Dashboard
            </div>
            <div className={`tab ${activeTab === 'permits' ? 'active' : ''}`} onClick={() => setActiveTab('permits')}>
              Dig Permits
            </div>
            <div className={`tab ${activeTab === 'complaints' ? 'active' : ''}`} onClick={() => setActiveTab('complaints')}>
              Complaints
            </div>
          </div>

          {/* TAB 1: SUMMARY DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {/* Notice Board Widget */}
              <div className="gov-notice-board">
                <div className="notice-board-title">
                  <span>📢 Public Announcements & Alerts</span>
                </div>
                <div className="notice-board-scroller">
                  <div className="notice-item">
                    <span className="notice-date">29 Jun:</span>
                    Priority water supply line maintenance scheduled in Ward 2 (Arera Colony). PWD coordinate schedules.
                  </div>
                  <div className="notice-item">
                    <span className="notice-date">28 Jun:</span>
                    Metro track excavation on Link Road 1 delayed by 3 days. Conflict score reassessed.
                  </div>
                  <div className="notice-item">
                    <span className="notice-date">27 Jun:</span>
                    Nodal directive: Clear all trenches within 24 hours of pipeline laying or face SLA penalty.
                  </div>
                </div>
              </div>
              <div className="section-title">
                <span>Active Bhopal Statistics</span>
                <button onClick={refreshData} style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: '0.8rem' }}>Refresh</button>
              </div>

              {stats && (
                <div className="dashboard-grid">
                  <div className="stat-card">
                    <div className="stat-value">{stats.permits.submitted + stats.permits.underReview + stats.permits.approved}</div>
                    <div className="stat-label">Active Permits</div>
                  </div>
                  <div className="stat-card" style={{ borderLeft: '3px solid #EF4444' }}>
                    <div className="stat-value" style={{ color: '#EF4444' }}>{stats.conflicts.highRisk}</div>
                    <div className="stat-label">High Risk Overlaps</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.complaints.received + stats.complaints.assigned + stats.complaints.inProgress}</div>
                    <div className="stat-label">Open Complaints</div>
                  </div>
                  <div className="stat-card" style={{ borderLeft: '3px solid #EAB308' }}>
                    <div className="stat-value" style={{ color: '#EAB308' }}>{stats.complaints.activeBreached}</div>
                    <div className="stat-label">SLA Breached</div>
                  </div>
                </div>
              )}

              {/* Instructions Panel */}
              <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', margin: '1rem', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#60A5FA', fontSize: '0.9rem' }}>Spatial Operations Guide</h4>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <li><strong>Pin locations:</strong> In "Dig Permits" or "Complaints" tab, activate drawing mode and click directly on the Bhopal Map.</li>
                  <li><strong>Auto Ward routing:</strong> The system automatically performs geometric calculations to find which municipal ward the coordinates belong to.</li>
                  <li><strong>Real-time coordination:</strong> Conflicting digging schedules trigger red visual warnings and prompt Joint Meeting coordination schedules.</li>
                </ul>
              </div>

              {/* Quick status lists */}
              <div style={{ padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'white' }}>Escalated Citizen Complaints</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {complaintsList.filter(c => c.isEscalated).slice(0, 4).map(c => (
                    <div key={c._id} onClick={() => { setSelectedComplaintId(c._id); setActiveTab('complaints'); }} style={{ padding: '0.5rem 0.75rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'white' }}>{c.ticketNumber} ({c.complaintType})</span>
                      <span style={{ fontSize: '0.75rem', background: '#EF4444', color: 'white', padding: '1px 5px', borderRadius: '3px' }}>BREACH</span>
                    </div>
                  ))}
                  {complaintsList.filter(c => c.isEscalated).length === 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No current SLA breached complaints.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EXCAVATION PERMITS */}
          {activeTab === 'permits' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {selectedPermitId === null ? (
                <>
                  <div className="section-title">
                    <span>Excavation Dig Permits</span>
                    {user?.role !== 'Citizen' && (
                      <button onClick={() => { setSelectedPermitId('new'); setDrawnCoords([]); }} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                        + Add Dig
                      </button>
                    )}
                  </div>

                  {/* Permits list */}
                  <div className="list-container">
                    {permitsList.length === 0 ? (
                      <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No permits recorded.</p>
                    ) : (
                      permitsList.map((p) => (
                        <div key={p._id} className="list-item" onClick={() => handleSelectPermit(p._id)}>
                          <div className="item-header">
                            <span className="item-title">{p.permitNumber}</span>
                            <span className={`badge badge-${p.status.toLowerCase().replace(' ', '')}`}>{p.status}</span>
                          </div>
                          <div className="item-details">
                            <div className="item-row">
                              <span>Road:</span>
                              <span style={{ color: 'white' }}>{p.roadName}</span>
                            </div>
                            <div className="item-row">
                              <span>Ward:</span>
                              <span>{p.ward}</span>
                            </div>
                            <div className="item-row">
                              <span>Dept:</span>
                              <span style={{ color: p.department?.color }}>{p.department?.name || 'N/A'}</span>
                            </div>
                            <div className="item-row" style={{ marginTop: '0.25rem' }}>
                              <span>Conflicts:</span>
                              <span className={`badge badge-${p.riskLevel.toLowerCase()}`} style={{ fontSize: '0.7rem', padding: '1px 4px' }}>{p.riskLevel} (Score: {p.conflictScore})</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : selectedPermitId === 'new' ? (
                // Permit Submission Form
                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Propose Excavation Dig</h3>
                    <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem' }} onClick={() => setSelectedPermitId(null)}>Cancel</button>
                  </div>

                  <form onSubmit={handleCreatePermit}>
                    <div className="form-group" style={{ padding: 0 }}>
                      <label className="form-label">Road / Location Name</label>
                      <input className="form-input" type="text" value={roadName} onChange={(e) => setRoadName(e.target.value)} placeholder="e.g. Link Road 1, MP Nagar" required />
                    </div>

                    <div className="form-group" style={{ padding: 0 }}>
                      <label className="form-label">Dig Geometry Type</label>
                      <select className="form-input" value={drawType} onChange={(e) => { setDrawType(e.target.value as any); setDrawnCoords([]); }}>
                        <option value="LineString">LineString (Linear Trench)</option>
                        <option value="Polygon">Polygon (Area Digging)</option>
                      </select>
                    </div>

                    {/* Coordinate Drawing Status */}
                    <div style={{ margin: '1rem 0', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Points Drawn: {drawnCoords.length}</span>
                        <button type="button" className={`btn ${isDrawing ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }} onClick={() => setIsDrawing(!isDrawing)}>
                          {isDrawing ? 'Stop Drawing' : 'Start Map Clicks'}
                        </button>
                      </div>
                      {isDrawing && (
                        <p className="drawing-indicator" style={{ margin: 0 }}>
                          Click on the Map to place path points sequentially.
                        </p>
                      )}
                      {drawnCoords.length > 0 && (
                        <button type="button" className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', width: '100%', marginTop: '0.5rem' }} onClick={() => setDrawnCoords([])}>
                          Clear Draw Coordinates
                        </button>
                      )}
                    </div>

                    <div className="form-group" style={{ padding: 0 }}>
                      <label className="form-label">Excavation Purpose</label>
                      <input className="form-input" type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Laying telecom fiber cables" required />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div className="form-group" style={{ padding: 0 }}>
                        <label className="form-label">Start Date</label>
                        <input className="form-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                      </div>
                      <div className="form-group" style={{ padding: 0 }}>
                        <label className="form-label">End Date</label>
                        <input className="form-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                      </div>
                    </div>

                    <div className="form-group" style={{ padding: 0 }}>
                      <label className="form-label">Excavation Depth (meters)</label>
                      <input className="form-input" type="number" step="0.1" value={depth} onChange={(e) => setDepth(e.target.value)} required />
                    </div>

                    <div className="form-group" style={{ padding: 0 }}>
                      <label className="form-label">Restoration & Safety Plan</label>
                      <textarea className="form-input" rows={2} value={restorationPlan} onChange={(e) => setRestorationPlan(e.target.value)} placeholder="Explain road filling, compaction, safety signage..." required />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                      Submit Permit for Audit
                    </button>
                  </form>
                </div>
              ) : (
                // Permit Details panel
                <div className="detail-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem' }} onClick={() => setSelectedPermitId(null)}>&larr; Back</button>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>Permit details</span>
                  </div>

                  {permitDetail ? (
                    <>
                      <div className="detail-header">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>{permitDetail.permit.permitNumber}</h3>
                          <span className={`badge badge-${permitDetail.permit.status.toLowerCase().replace(' ', '')}`}>{permitDetail.permit.status}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: permitDetail.permit.department?.color }}>
                          Department: {permitDetail.permit.department?.name || 'N/A'}
                        </p>
                      </div>

                      <div className="detail-section">
                        <div className="detail-section-title">Dig Specifications</div>
                        <div className="item-details">
                          <div className="item-row"><span>Road Location:</span><span style={{ color: 'white' }}>{permitDetail.permit.roadName}</span></div>
                          <div className="item-row"><span>Municipal Ward:</span><span style={{ color: 'white' }}>{permitDetail.permit.ward}</span></div>
                          <div className="item-row"><span>Purpose:</span><span style={{ color: 'white' }}>{permitDetail.permit.purpose}</span></div>
                          <div className="item-row"><span>Timeline:</span><span style={{ color: 'white' }}>{new Date(permitDetail.permit.startDate).toLocaleDateString()} to {new Date(permitDetail.permit.endDate).toLocaleDateString()}</span></div>
                          <div className="item-row"><span>Excavation Depth:</span><span style={{ color: 'white' }}>{permitDetail.permit.depth} meters</span></div>
                          <div className="item-row"><span>Restoration:</span><span style={{ color: 'white' }}>{permitDetail.permit.restorationPlan}</span></div>
                        </div>
                      </div>

                      {/* Admin Approval Operations */}
                      {(user.role === 'Super Admin' || user.role === 'Nodal Officer' || (user.role === 'Department Admin' && user.department === permitDetail.permit.department?._id)) && (
                        <div className="detail-section" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                          <div className="detail-section-title">Administrative Actions</div>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                            {permitDetail.permit.status === 'Submitted' && (
                              <button onClick={() => handleUpdatePermitStatus(permitDetail.permit._id, 'Under Review')} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
                                Review Permit
                              </button>
                            )}
                            {(permitDetail.permit.status === 'Submitted' || permitDetail.permit.status === 'Under Review') && (
                              <>
                                <button onClick={() => handleUpdatePermitStatus(permitDetail.permit._id, 'Approved')} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', background: '#10B981' }}>
                                  Approve
                                </button>
                                <button onClick={() => handleUpdatePermitStatus(permitDetail.permit._id, 'Rejected')} className="btn btn-danger" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
                                  Reject
                                </button>
                              </>
                            )}
                            {permitDetail.permit.status === 'Approved' && (
                              <button onClick={() => handleUpdatePermitStatus(permitDetail.permit._id, 'Completed')} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
                                Mark Completed
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Conflicts Section */}
                      <div className="detail-section">
                        <div className="detail-section-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Schedule conflicts ({permitDetail.permit.riskLevel})</span>
                          <span style={{ color: permitDetail.permit.conflictScore > 0 ? '#EF4444' : '#10B981', fontWeight: 600 }}>Score: {permitDetail.permit.conflictScore}</span>
                        </div>
                        
                        {permitDetail.conflicts && permitDetail.conflicts.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {permitDetail.conflicts.map((c: any) => (
                              <div key={c._id} style={{ padding: '0.75rem', borderLeft: '4px solid #EF4444', background: 'rgba(239, 68, 68, 0.03)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white', marginBottom: '0.2rem' }}>{c.conflictType}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.description}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0' }}>No active spatial or schedule conflicts detected.</p>
                        )}
                        <div style={{ fontSize: '0.8rem', padding: '0.5rem', background: '#3B82F610', borderRadius: '4px', marginTop: '0.5rem', color: '#60A5FA', border: '1px solid #3B82F620' }}>
                          <strong>Recommendation:</strong> {permitDetail.permit.recommendations}
                        </div>
                      </div>

                      {/* Joint Meetings Scheduling */}
                      <div className="detail-section">
                        <div className="detail-section-title">Joint Coordination Meetings</div>
                        {permitDetail.meetings && permitDetail.meetings.length > 0 ? (
                          permitDetail.meetings.map((m: any) => (
                            <div key={m._id} className="meeting-card">
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'white', marginBottom: '0.25rem' }}>
                                <span>Coordination Meeting</span>
                                <span style={{ color: '#60A5FA' }}>{new Date(m.meetingDate).toLocaleString()}</span>
                              </div>
                              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.notes}</p>
                              {m.participants?.length > 0 && (
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.25rem' }}>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Attendees: </span>
                                  <span style={{ fontSize: '0.7rem', color: 'white' }}>{m.participants.map((p: any) => `${p.name} (${p.department})`).join(', ')}</span>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0' }}>No coordination meetings scheduled yet.</p>
                        )}

                        {/* Schedule Meeting Form */}
                        {user.role !== 'Citizen' && (
                          <form onSubmit={handleScheduleMeeting} style={{ marginTop: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.75rem' }}>
                            <div className="form-group" style={{ padding: 0, marginBottom: '0.5rem' }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>Meeting Date & Time</label>
                              <input className="form-input" style={{ fontSize: '0.8rem', padding: '0.4rem' }} type="datetime-local" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} required />
                            </div>
                            <div className="form-group" style={{ padding: 0, marginBottom: '0.5rem' }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>Meeting Agenda / Notes</label>
                              <input className="form-input" style={{ fontSize: '0.8rem', padding: '0.4rem' }} type="text" placeholder="e.g. Discuss schedule shifting by 2 weeks" value={meetingNotes} onChange={(e) => setMeetingNotes(e.target.value)} required />
                            </div>
                            <div className="form-group" style={{ padding: 0, marginBottom: '0.5rem' }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>Participants (name:dept:email, split by comma)</label>
                              <input className="form-input" style={{ fontSize: '0.8rem', padding: '0.4rem' }} type="text" placeholder="Alok:PWD:alok@setu.gov.in" value={meetingParticipants} onChange={(e) => setMeetingParticipants(e.target.value)} />
                            </div>
                            <button type="submit" className="btn btn-secondary" style={{ width: '100%', fontSize: '0.75rem', padding: '0.4rem' }}>
                              Schedule coordination
                            </button>
                          </form>
                        )}
                      </div>
                    </>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>Loading permit details...</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CITIZEN COMPLAINTS */}
          {activeTab === 'complaints' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {selectedComplaintId === null ? (
                <>
                  <div className="section-title">
                    <span>Citizen Complaints</span>
                    <button onClick={() => { setSelectedComplaintId('new'); setComplaintPin(null); }} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                      + File Ticket
                    </button>
                  </div>

                  <div className="list-container">
                    {complaintsList.length === 0 ? (
                      <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No complaints filed.</p>
                    ) : (
                      complaintsList.map((c) => (
                        <div key={c._id} className="list-item" onClick={() => handleSelectComplaint(c._id)}>
                          <div className="item-header">
                            <span className="item-title">{c.ticketNumber}</span>
                            <span className={`badge badge-${c.status.toLowerCase().replace(' ', '')}`}>{c.status}</span>
                          </div>
                          <div className="item-details">
                            <div className="item-row">
                              <span>Type:</span>
                              <span style={{ color: 'white' }}>{c.complaintType}</span>
                            </div>
                            <div className="item-row">
                              <span>Road:</span>
                              <span style={{ color: 'white' }}>{c.roadName}</span>
                            </div>
                            <div className="item-row">
                              <span>Assigned:</span>
                              <span>{c.assignedDepartment?.name || 'Unassigned'}</span>
                            </div>
                            {c.isEscalated && (
                              <div style={{ marginTop: '0.25rem', color: '#EF4444', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span style={{ width: '6px', height: '6px', background: '#EF4444', borderRadius: '9999px', display: 'inline-block' }}></span>
                                SLA deadline breached (Escalated)
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : selectedComplaintId === 'new' ? (
                // File Ticket Form
                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>File Road Quality Ticket</h3>
                    <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem' }} onClick={() => setSelectedComplaintId(null)}>Cancel</button>
                  </div>

                  <form onSubmit={handleCreateComplaint}>
                    <div className="form-group" style={{ padding: 0 }}>
                      <label className="form-label">Road Name</label>
                      <input className="form-input" type="text" value={cRoad} onChange={(e) => setCRoad(e.target.value)} placeholder="e.g. Hoshangabad Road" required />
                    </div>

                    <div className="form-group" style={{ padding: 0 }}>
                      <label className="form-label">Complaint Type</label>
                      <select className="form-input" value={cType} onChange={(e) => setCType(e.target.value)}>
                        <option value="Pothole">Pothole (48h SLA)</option>
                        <option value="Road damage">Road damage (48h SLA)</option>
                        <option value="Blockage">Water Pipe Blockage (48h SLA)</option>
                        <option value="Unsafe trench">Unsafe trench (24h SLA)</option>
                        <option value="Illegal digging">Illegal digging (24h SLA)</option>
                        <option value="Dust">Heavy Dust / Pollution (168h SLA)</option>
                      </select>
                    </div>

                    {/* Pin Point Selector */}
                    <div style={{ margin: '1.25rem 0', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                          {complaintPin ? `Pinned Coordinates: [${complaintPin[1].toFixed(5)}, ${complaintPin[0].toFixed(5)}]` : 'Location Pin: Not Set'}
                        </span>
                        <button type="button" className={`btn ${isPinningComplaint ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }} onClick={() => setIsPinningComplaint(!isPinningComplaint)}>
                          {isPinningComplaint ? 'Click map now' : 'Pin on Map'}
                        </button>
                      </div>
                      {isPinningComplaint && (
                        <p className="drawing-indicator" style={{ margin: '0.5rem 0 0 0', borderColor: '#EAB308', color: '#EAB308', background: 'rgba(234,179,8,0.05)' }}>
                          Click the map location to select the incident spot.
                        </p>
                      )}
                    </div>

                    <div className="form-group" style={{ padding: 0 }}>
                      <label className="form-label">Detailed Description</label>
                      <textarea className="form-input" rows={3} value={cDesc} onChange={(e) => setCDesc(e.target.value)} placeholder="Provide landmarks or details about unsafe excavation or pothole depth..." required />
                    </div>

                    <h4 style={{ margin: '1rem 0 0.5rem 0', fontSize: '0.85rem', color: 'white' }}>Reporter Contacts (Optional)</h4>
                    <div className="form-group" style={{ padding: 0, marginBottom: '0.75rem' }}>
                      <label className="form-label">Name</label>
                      <input className="form-input" type="text" value={cName} onChange={(e) => setCName(e.target.value)} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div className="form-group" style={{ padding: 0 }}>
                        <label className="form-label">Email</label>
                        <input className="form-input" type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} />
                      </div>
                      <div className="form-group" style={{ padding: 0 }}>
                        <label className="form-label">Phone</label>
                        <input className="form-input" type="text" value={cPhone} onChange={(e) => setCPhone(e.target.value)} />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                      File Incident Ticket
                    </button>
                  </form>
                </div>
              ) : (
                // Complaint detail panel
                <div className="detail-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem' }} onClick={() => setSelectedComplaintId(null)}>&larr; Back</button>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>Ticket details</span>
                  </div>

                  {complaintDetail ? (
                    <>
                      <div className="detail-header">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>{complaintDetail.complaint.ticketNumber}</h3>
                          <span className={`badge badge-${complaintDetail.complaint.status.toLowerCase().replace(' ', '')}`}>{complaintDetail.complaint.status}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#60A5FA' }}>
                          Assigned Dept: {complaintDetail.complaint.assignedDepartment?.name || 'Unassigned'}
                        </p>
                      </div>

                      <div className="detail-section">
                        <div className="detail-section-title">Incident Details</div>
                        <div className="item-details">
                          <div className="item-row"><span>Type:</span><span style={{ color: 'white' }}>{complaintDetail.complaint.complaintType}</span></div>
                          <div className="item-row"><span>Location:</span><span style={{ color: 'white' }}>{complaintDetail.complaint.roadName}</span></div>
                          <div className="item-row"><span>Description:</span><span style={{ color: 'white' }}>{complaintDetail.complaint.description}</span></div>
                          <div className="item-row"><span>SLA Deadline:</span><span style={{ color: complaintDetail.complaint.isEscalated ? '#EF4444' : 'white' }}>{new Date(complaintDetail.complaint.slaDeadline).toLocaleString()}</span></div>
                          {complaintDetail.complaint.isEscalated && (
                            <div className="item-row"><span style={{ color: '#EF4444', fontWeight: 600 }}>Breached:</span><span style={{ color: '#EF4444', fontWeight: 600 }}>Yes (Escalated to Admins)</span></div>
                          )}
                        </div>
                      </div>

                      {/* Department Actions to Manage Status */}
                      {user.role !== 'Citizen' && (
                        <div className="detail-section" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                          <div className="detail-section-title">Manage Ticket Status</div>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
                            {complaintDetail.complaint.status === 'Received' && (
                              <button onClick={() => handleUpdateComplaintStatus(complaintDetail.complaint._id, 'Assigned')} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}>
                                Acknowledge & Assign
                              </button>
                            )}
                            {(complaintDetail.complaint.status === 'Received' || complaintDetail.complaint.status === 'Assigned') && (
                              <button onClick={() => handleUpdateComplaintStatus(complaintDetail.complaint._id, 'In Progress')} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}>
                                Start Remediation
                              </button>
                            )}
                            {complaintDetail.complaint.status === 'In Progress' && (
                              <button onClick={() => handleUpdateComplaintStatus(complaintDetail.complaint._id, 'Resolved')} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', background: '#10B981' }}>
                                Mark Resolved
                              </button>
                            )}
                          </div>
                          <div className="form-group" style={{ padding: 0, margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Action / Audit notes</label>
                            <input className="form-input" style={{ fontSize: '0.8rem', padding: '0.4rem' }} type="text" placeholder="State work done or reasons for transition..." value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} />
                          </div>
                        </div>
                      )}

                      {/* Citizen Feedback Rating once Resolved */}
                      {complaintDetail.complaint.status === 'Resolved' && (
                        <div className="detail-section" style={{ background: 'rgba(234,179,8,0.05)', padding: '0.75rem', border: '1px dashed #EAB308', borderRadius: '8px' }}>
                          <div className="detail-section-title" style={{ color: '#EAB308' }}>Submit Citizen Feedback</div>
                          <form onSubmit={handleComplaintFeedback} style={{ marginTop: '0.5rem' }}>
                            <div className="form-group" style={{ padding: 0, marginBottom: '0.5rem' }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>Satisfied Rating (1 to 5)</label>
                              <select className="form-input" style={{ fontSize: '0.8rem', padding: '0.4rem' }} value={cRating} onChange={(e) => setCRating(e.target.value)}>
                                <option value="5">5 Stars (Excellent service)</option>
                                <option value="4">4 Stars (Good work)</option>
                                <option value="3">3 Stars (Average)</option>
                                <option value="2">2 Stars (Poor repair)</option>
                                <option value="1">1 Star (Terrible compaction)</option>
                              </select>
                            </div>
                            <div className="form-group" style={{ padding: 0, marginBottom: '0.5rem' }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>Comments</label>
                              <input className="form-input" style={{ fontSize: '0.8rem', padding: '0.4rem' }} type="text" value={cFeedback} onChange={(e) => setCFeedback(e.target.value)} placeholder="Provide road restoration comments..." />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '0.75rem', padding: '0.4rem', background: '#EAB308', color: 'black', fontWeight: 600 }}>
                              Submit & Close Ticket
                            </button>
                          </form>
                        </div>
                      )}

                      {/* Audit Log Timeline */}
                      <div className="detail-section">
                        <div className="detail-section-title">Audit Timeline Logs</div>
                        <div style={{ marginTop: '0.75rem', paddingLeft: '0.5rem' }}>
                          {complaintDetail.history?.map((h: any, idx: number) => (
                            <div key={h._id} className="timeline-event">
                              <div className="timeline-marker"></div>
                              {idx < complaintDetail.history.length - 1 && <div className="timeline-line"></div>}
                              <div className="timeline-content">
                                <div style={{ fontWeight: 600, color: 'white' }}>
                                  {h.fromStatus ? `Status: ${h.fromStatus} &rarr; ${h.toStatus}` : `Ticket Created`}
                                </div>
                                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{h.notes}</p>
                                <div className="timeline-time">
                                  {new Date(h.createdAt).toLocaleString()} {h.changedBy ? `by ${h.changedBy.firstName} ${h.changedBy.lastName}` : ''}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>Loading complaint details...</p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Leaflet Map container */}
        <section className="map-container">
          <div id="leaflet-map"></div>

          {/* Floating Map Legend */}
          <div className="map-floating-panel">
            <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>Map Legend</h4>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#3B82F6' }}></span>
              <span>PWD Digging Permit</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#8B5CF6' }}></span>
              <span>Telecom Digging Permit</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#EF4444' }}></span>
              <span>High Risk Dig / Conflict</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#EAB308' }}></span>
              <span>Citizen Complaint Pin</span>
            </div>
            <div className="legend-item" style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Tip: Click the map to get coordinates.
            </div>
          </div>
        </section>
      </main>

      {/* Official Gov Footer */}
      <footer className="gov-footer">
        <div className="gov-footer-links">
          <a href="#" onClick={(e) => { e.preventDefault(); addToast('Website Policy details are simulated', 'info'); }}>Website Policies</a>
          <a href="#" onClick={(e) => { e.preventDefault(); addToast('Sitemap is simulated', 'info'); }}>Sitemap</a>
          <a href="#" onClick={(e) => { e.preventDefault(); addToast('Help details are simulated', 'info'); }}>Help</a>
          <a href="#" onClick={(e) => { e.preventDefault(); addToast('Contact Us info: coordination-bmc@mp.gov.in', 'info'); }}>Contact Us</a>
        </div>
        <p style={{ margin: '0.5rem 0 0 0' }}>
          Site owned, updated, and maintained by Bhopal Municipal Corporation (BMC), Government of Madhya Pradesh.
        </p>
        <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)' }}>
          Content management and technical infrastructure managed by National Informatics Centre (NIC). Version 2.0.4.
        </p>
      </footer>

      {/* Toast Alert overlay */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span style={{ fontSize: '1.1rem' }}>
              {t.type === 'success' ? '✓' : t.type === 'error' ? '⚠' : 'ℹ'}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
