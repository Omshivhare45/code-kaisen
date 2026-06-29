import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Navigation, Upload, AlertCircle, Camera, Check } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { toast } from 'react-toastify';

// Custom Marker Icon for GPS pickers
const mapPickerIcon = L.divIcon({
  html: '<div class="w-5 h-5 rounded-full bg-blue-500 border-2 border-slate-950 shadow-lg ring-4 ring-blue-500/35"></div>',
  className: 'map-picker-icon',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const ReportComplaint = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState([23.2599, 77.4126]); // Default Bhopal coordinates
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      latitude: 23.2599,
      longitude: 77.4126,
      priority: 'Medium',
    },
  });

  // Map Event Listener Component to capture clicks on Leaflet map
  const MapClickEvents = () => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        const roundedLat = parseFloat(lat.toFixed(6));
        const roundedLng = parseFloat(lng.toFixed(6));
        
        setCoords([lat, lng]);
        setValue('latitude', roundedLat);
        setValue('longitude', roundedLng);
        toast.info(`Coordinates set to: ${roundedLat}, ${roundedLng}`);
      },
    });
    return null;
  };

  // Browser Geolocation capture API
  const handleGPSCapture = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    toast.info('Retrieving GPS Coordinates...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const roundedLat = parseFloat(latitude.toFixed(6));
        const roundedLng = parseFloat(longitude.toFixed(6));
        
        setCoords([latitude, longitude]);
        setValue('latitude', roundedLat);
        setValue('longitude', roundedLng);
        toast.success('GPS coordinates retrieved successfully!');
      },
      (error) => {
        toast.error('Unable to retrieve GPS. Click on the map manually.');
      }
    );
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('description', data.description);
      formData.append('latitude', data.latitude);
      formData.append('longitude', data.longitude);
      formData.append('ward', data.ward);
      formData.append('complaintType', data.complaintType);
      formData.append('priority', data.priority);
      
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const res = await axios.post('/api/complaints', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        toast.success('Complaint submitted and assigned successfully!');
        navigate('/tracking');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit complaint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Report Utility Complaint</h2>
        <p className="text-xs text-slate-400 mt-1">Submit issues like unauthorized digging, leaks, open trenches, or road damage</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Form Details */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-850">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Type & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Complaint Type</label>
                <select
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-gov-500"
                  {...register('complaintType', { required: 'Please specify issue type' })}
                >
                  <option value="">Select Type</option>
                  <option value="Road Digging">Unauthorized Road Digging</option>
                  <option value="Pothole">Potholes / Broken Surface</option>
                  <option value="Water Leakage">Water Main Leakage</option>
                  <option value="Cable Damage">Exposed/Cut Cables</option>
                  <option value="Open Trench">Unfilled Open Trench</option>
                  <option value="Other">Other Issues</option>
                </select>
                {errors.complaintType && <span className="text-[10px] text-rose-400">{errors.complaintType.message}</span>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Ward Number</label>
                <select
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-gov-500"
                  {...register('ward', { required: 'Please specify ward location' })}
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

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Detailed Description</label>
              <textarea
                rows={3}
                placeholder="Include landmark or severity details..."
                className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-gov-500"
                {...register('description', { required: 'Description is required' })}
              />
              {errors.description && <span className="text-[10px] text-rose-400">{errors.description.message}</span>}
            </div>

            {/* Coordinates Lat / Lng */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            {/* Coordinates trigger GPS button */}
            <button
              type="button"
              onClick={handleGPSCapture}
              className="flex items-center justify-center gap-1.5 w-full py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-xl text-xs transition"
            >
              <Navigation className="h-3.5 w-3.5 text-gov-400" />
              Pin My Current GPS Coordinates
            </button>

            {/* Photo Uploader */}
            <div className="space-y-2 border-t border-slate-850 pt-4">
              <label className="text-xs font-semibold text-slate-400">Attach Damage Photo</label>
              
              <div className="flex items-center gap-4">
                <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-gov-500 rounded-xl p-4 cursor-pointer transition bg-slate-900/40">
                  <Camera className="h-6 w-6 text-slate-500 mb-1.5" />
                  <span className="text-[10px] text-slate-400 font-semibold">Upload JPG, PNG, WEBP</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>

                {photoPreview && (
                  <div className="w-24 h-24 rounded-xl border border-slate-700 overflow-hidden relative group">
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
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
                  Submit Official Complaint
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Map Coordinates Picker */}
        <div className="flex flex-col glass-panel rounded-2xl border border-slate-850 overflow-hidden min-h-[400px]">
          <div className="p-4 bg-slate-900/60 border-b border-slate-850">
            <h3 className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-gov-400" />
              Coordinate Map Selector
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              Click anywhere on the map segment below to drop a pinpoint location.
            </p>
          </div>
          
          <div className="flex-1 h-full min-h-[300px] relative">
            <MapContainer center={coords} zoom={13} className="w-full h-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickEvents />
              <Marker position={coords} icon={mapPickerIcon} />
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportComplaint;
