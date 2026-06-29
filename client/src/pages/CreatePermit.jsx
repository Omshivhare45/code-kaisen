import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Navigation, Calendar, Layers, ShieldCheck, ShieldAlert, Check } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import { toast } from 'react-toastify';
import ConflictCard from '../components/ConflictCard';

const mapPickerIcon = L.divIcon({
  html: '<div class="w-5 h-5 rounded-full bg-orange-500 border-2 border-slate-950 shadow-lg ring-4 ring-orange-500/35"></div>',
  className: 'map-picker-icon',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const CreatePermit = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState([23.2599, 77.4126]);
  const [searchRadius, setSearchRadius] = useState(50);
  const [detectedConflictPermit, setDetectedConflictPermit] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      latitude: 23.2599,
      longitude: 77.4126,
      radius: 50,
      depth: 1.0,
    },
  });

  const watchRadius = watch('radius');

  const MapClickEvents = () => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        const roundedLat = parseFloat(lat.toFixed(6));
        const roundedLng = parseFloat(lng.toFixed(6));
        
        setCoords([lat, lng]);
        setValue('latitude', roundedLat);
        setValue('longitude', roundedLng);
      },
    });
    return null;
  };

  const handleGPSCapture = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const roundedLat = parseFloat(latitude.toFixed(6));
        const roundedLng = parseFloat(longitude.toFixed(6));
        
        setCoords([latitude, longitude]);
        setValue('latitude', roundedLat);
        setValue('longitude', roundedLng);
        toast.success('Coordinates anchored.');
      },
      () => {
        toast.error('Unable to retrieve location. Use map click.');
      }
    );
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setDetectedConflictPermit(null);
    try {
      const res = await axios.post('/api/permits', data);
      if (res.data.success) {
        const createdPermit = res.data.data;
        if (createdPermit.status === 'Conflict') {
          setDetectedConflictPermit(createdPermit);
          toast.warning('Permit created with overlapping conflicts detected!');
        } else {
          toast.success('Permit request submitted successfully.');
          navigate('/');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to request permit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Create Dig Permit Request</h2>
        <p className="text-xs text-slate-400 mt-1">Submit excavation coordinates, schedules, and restoration plans for coordination approval</p>
      </div>

      {detectedConflictPermit && (
        <ConflictCard
          permit={detectedConflictPermit}
          onUpdate={(updated) => setDetectedConflictPermit(updated)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form panel */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-850">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Road Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Road / Segment Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ring Road Link"
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-gov-500"
                  {...register('roadName', { required: 'Road segment name is required' })}
                />
                {errors.roadName && <span className="text-[10px] text-rose-400">{errors.roadName.message}</span>}
              </div>

              {/* Ward */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Ward Zone</label>
                <select
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-gov-500"
                  {...register('ward', { required: 'Ward is required' })}
                >
                  <option value="">Select Ward</option>
                  <option value="Ward 12 (TT Nagar)">Ward 12 (TT Nagar)</option>
                  <option value="Ward 45 (MP Nagar)">Ward 45 (MP Nagar)</option>
                  <option value="Ward 52 (Habibganj)">Ward 52 (Habibganj)</option>
                  <option value="Ward 80 (Kolar)">Ward 80 (Kolar)</option>
                </select>
                {errors.ward && <span className="text-[10px] text-rose-400">{errors.ward.message}</span>}
              </div>
            </div>

            {/* Latitude, Longitude, Radius */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                  {...register('latitude', { required: true })}
                  readOnly
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                  {...register('longitude', { required: true })}
                  readOnly
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Radius (Meters)</label>
                <input
                  type="number"
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-gov-500"
                  {...register('radius', {
                    required: true,
                    valueAsNumber: true,
                    onChange: (e) => setSearchRadius(Number(e.target.value) || 50),
                  })}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleGPSCapture}
              className="flex items-center justify-center gap-1.5 w-full py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-xl text-xs transition"
            >
              <Navigation className="h-3.5 w-3.5 text-gov-400" />
              Fetch GPS Anchor Coordinates
            </button>

            {/* Dates Start/End */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 font-medium">Excavation Start Date</label>
                <input
                  type="date"
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-gov-500"
                  {...register('startDate', { required: 'Start date is required' })}
                />
                {errors.startDate && <span className="text-[10px] text-rose-400">{errors.startDate.message}</span>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 font-medium">Excavation End Date</label>
                <input
                  type="date"
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-gov-500"
                  {...register('endDate', { required: 'End date is required' })}
                />
                {errors.endDate && <span className="text-[10px] text-rose-400">{errors.endDate.message}</span>}
              </div>
            </div>

            {/* Depth, restoration plan, purpose */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="col-span-1 space-y-1">
                <label className="text-xs font-semibold text-slate-400">Depth (Meters)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-gov-500"
                  {...register('depth', { required: 'Depth is required', valueAsNumber: true })}
                />
                {errors.depth && <span className="text-[10px] text-rose-400">{errors.depth.message}</span>}
              </div>

              <div className="col-span-1 sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-400">Purpose of Excavation</label>
                <input
                  type="text"
                  placeholder="e.g. laying 11kV grid line"
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-gov-500"
                  {...register('purpose', { required: 'Purpose is required' })}
                />
                {errors.purpose && <span className="text-[10px] text-rose-400">{errors.purpose.message}</span>}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Road Restoration & Refilling Plan</label>
              <textarea
                rows={2}
                placeholder="e.g. trench sand-refill and cement concrete top paving"
                className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-gov-500"
                {...register('restorationPlan', { required: 'Restoration plan is required' })}
              />
              {errors.restorationPlan && <span className="text-[10px] text-rose-400">{errors.restorationPlan.message}</span>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gov-600 hover:bg-gov-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-gov-950/20"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Submit Permit Request
                </>
              )}
            </button>
          </form>
        </div>

        {/* Picker Map panel */}
        <div className="flex flex-col glass-panel rounded-2xl border border-slate-850 overflow-hidden min-h-[400px]">
          <div className="p-4 bg-slate-900/60 border-b border-slate-850">
            <h3 className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-gov-400" />
              Boundary Buffer Estimator
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              Click to reposition the anchor point. The yellow boundary represents the conflict-detection search radius.
            </p>
          </div>
          
          <div className="flex-grow h-full min-h-[300px] relative">
            <MapContainer center={coords} zoom={14} className="w-full h-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickEvents />
              <Marker position={coords} icon={mapPickerIcon} />
              <Circle
                center={coords}
                radius={watchRadius || 50}
                pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.1 }}
              />
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePermit;
