import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Hospital,
  Landmark,
  Plus,
  Edit2,
  Trash2,
  Stethoscope,
  Clock,
  MapPin,
  Phone,
  Search,
  Loader2,
  X,
  Check,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const FacilitiesManagementTab = () => {
  const [activeSubTab, setActiveSubTab] = useState('places'); // 'places' | 'departments'

  // Places state
  const [places, setPlaces] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [placeModalOpen, setPlaceModalOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState(null);
  const [placeForm, setPlaceForm] = useState({
    name: '',
    category: 'Hospital',
    address: '',
    city: 'Guntur',
    phone: '',
    lng: '80.4365',
    lat: '16.3067',
  });

  // Departments state
  const [departments, setDepartments] = useState([]);
  const [deptsLoading, setDeptsLoading] = useState(true);
  const [selectedPlaceFilter, setSelectedPlaceFilter] = useState('all');
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({
    placeId: '',
    name: '',
    avgServiceMinutes: 10,
    opensAt: '09:00',
    closesAt: '17:00',
  });

  // Doctors modal state
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [currentDeptForDoctors, setCurrentDeptForDoctors] = useState(null);
  const [doctorForm, setDoctorForm] = useState({
    name: '',
    designation: '',
    experienceYears: 5,
  });

  // Fetch Places
  const fetchPlaces = useCallback(async () => {
    setPlacesLoading(true);
    try {
      const res = await api.get('/admin/places');
      if (res.data?.success) {
        setPlaces(res.data.places || []);
      }
    } catch (err) {
      console.error('Error fetching places:', err);
      toast.error('Failed to load places.');
    } finally {
      setPlacesLoading(false);
    }
  }, []);

  // Fetch Departments
  const fetchDepartments = useCallback(async () => {
    setDeptsLoading(true);
    try {
      const endpoint =
        selectedPlaceFilter === 'all'
          ? '/admin/departments'
          : `/admin/departments?placeId=${selectedPlaceFilter}`;
      const res = await api.get(endpoint);
      if (res.data?.success) {
        setDepartments(res.data.departments || []);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
      toast.error('Failed to load departments.');
    } finally {
      setDeptsLoading(false);
    }
  }, [selectedPlaceFilter]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Open Place Modal (Add / Edit)
  const handleOpenPlaceModal = (place = null) => {
    if (place) {
      setEditingPlace(place);
      setPlaceForm({
        name: place.name,
        category: place.category,
        address: place.address,
        city: place.city || 'Guntur',
        phone: place.phone || '',
        lng: String(place.location?.coordinates?.[0] || '80.4365'),
        lat: String(place.location?.coordinates?.[1] || '16.3067'),
      });
    } else {
      setEditingPlace(null);
      setPlaceForm({
        name: '',
        category: 'Hospital',
        address: '',
        city: 'Guntur',
        phone: '',
        lng: '80.4365',
        lat: '16.3067',
      });
    }
    setPlaceModalOpen(true);
  };

  // Submit Place (Create or Update)
  const handleSavePlace = async (e) => {
    e.preventDefault();
    if (!placeForm.name.trim() || !placeForm.address.trim()) {
      toast.error('Name and address are required');
      return;
    }

    try {
      const payload = {
        name: placeForm.name.trim(),
        category: placeForm.category,
        address: placeForm.address.trim(),
        city: placeForm.city.trim(),
        phone: placeForm.phone.trim(),
        coordinates: [Number(placeForm.lng) || 80.4365, Number(placeForm.lat) || 16.3067],
      };

      if (editingPlace) {
        const res = await api.put(`/admin/places/${editingPlace._id}`, payload);
        if (res.data?.success) {
          toast.success('Facility updated successfully!');
          setPlaceModalOpen(false);
          fetchPlaces();
        }
      } else {
        const res = await api.post('/admin/places', payload);
        if (res.data?.success) {
          toast.success('Facility added successfully!');
          setPlaceModalOpen(false);
          fetchPlaces();
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save facility.');
    }
  };

  // Delete Place
  const handleDeletePlace = async (placeId, placeName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${placeName}"? This will also remove its associated departments and tokens.`
      )
    ) {
      return;
    }

    try {
      const res = await api.delete(`/admin/places/${placeId}`);
      if (res.data?.success) {
        toast.success(res.data.message || 'Facility deleted successfully.');
        fetchPlaces();
        fetchDepartments();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete facility.');
    }
  };

  // Open Department Modal
  const handleOpenDeptModal = (dept = null) => {
    if (dept) {
      setEditingDept(dept);
      setDeptForm({
        placeId: dept.place?._id || dept.place,
        name: dept.name,
        avgServiceMinutes: dept.avgServiceMinutes || 10,
        opensAt: dept.opensAt || '09:00',
        closesAt: dept.closesAt || '17:00',
      });
    } else {
      setEditingDept(null);
      setDeptForm({
        placeId: places[0]?._id || '',
        name: '',
        avgServiceMinutes: 10,
        opensAt: '09:00',
        closesAt: '17:00',
      });
    }
    setDeptModalOpen(true);
  };

  // Save Department
  const handleSaveDept = async (e) => {
    e.preventDefault();
    if (!deptForm.name.trim()) {
      toast.error('Department name is required');
      return;
    }

    try {
      if (editingDept) {
        const res = await api.put(`/admin/departments/${editingDept._id}`, {
          name: deptForm.name.trim(),
          avgServiceMinutes: Number(deptForm.avgServiceMinutes) || 10,
          opensAt: deptForm.opensAt,
          closesAt: deptForm.closesAt,
        });
        if (res.data?.success) {
          toast.success('Department updated successfully!');
          setDeptModalOpen(false);
          fetchDepartments();
        }
      } else {
        const res = await api.post('/admin/departments', {
          placeId: deptForm.placeId,
          name: deptForm.name.trim(),
          avgServiceMinutes: Number(deptForm.avgServiceMinutes) || 10,
          opensAt: deptForm.opensAt,
          closesAt: deptForm.closesAt,
        });
        if (res.data?.success) {
          toast.success('Department created successfully!');
          setDeptModalOpen(false);
          fetchDepartments();
          fetchPlaces();
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save department.');
    }
  };

  // Delete Department
  const handleDeleteDept = async (deptId, deptName) => {
    if (!window.confirm(`Are you sure you want to delete department "${deptName}"?`)) return;

    try {
      const res = await api.delete(`/admin/departments/${deptId}`);
      if (res.data?.success) {
        toast.success(res.data.message || 'Department removed successfully.');
        fetchDepartments();
        fetchPlaces();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete department.');
    }
  };

  // Manage Doctors
  const handleOpenDoctorsModal = (dept) => {
    setCurrentDeptForDoctors(dept);
    setDoctorForm({ name: '', designation: '', experienceYears: 5 });
    setDoctorModalOpen(true);
  };

  // Add Doctor
  const handleAddDoctor = async (e) => {
    e.preventDefault();
    if (!doctorForm.name.trim() || !doctorForm.designation.trim()) {
      toast.error('Doctor name and designation are required');
      return;
    }

    try {
      const res = await api.post(
        `/admin/departments/${currentDeptForDoctors._id}/doctors`,
        {
          name: doctorForm.name.trim(),
          designation: doctorForm.designation.trim(),
          experienceYears: Number(doctorForm.experienceYears) || 1,
        }
      );

      if (res.data?.success) {
        toast.success('Doctor added to roster!');
        setCurrentDeptForDoctors({
          ...currentDeptForDoctors,
          doctors: res.data.doctors,
        });
        setDoctorForm({ name: '', designation: '', experienceYears: 5 });
        fetchDepartments();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to add doctor.');
    }
  };

  // Delete Doctor
  const handleDeleteDoctor = async (docId) => {
    try {
      const res = await api.delete(
        `/admin/departments/${currentDeptForDoctors._id}/doctors/${docId}`
      );
      if (res.data?.success) {
        toast.success('Doctor removed from department roster.');
        setCurrentDeptForDoctors({
          ...currentDeptForDoctors,
          doctors: res.data.doctors,
        });
        fetchDepartments();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to remove doctor.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Sub-navigation tabs */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSubTab('places')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'places'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Facilities (Hospitals & Banks)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('departments')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'departments'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Departments & Doctors</span>
          </button>
        </div>

        {activeSubTab === 'places' ? (
          <button
            onClick={() => handleOpenPlaceModal()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Add Facility</span>
          </button>
        ) : (
          <button
            onClick={() => handleOpenDeptModal()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
          </button>
        )}
      </div>

      {/* SUB-TAB 1: PLACES */}
      {activeSubTab === 'places' && (
        <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Facility Directory</h3>
              <p className="text-xs text-slate-400">
                Manage registered Hospitals and Bank branches.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total: {places.length} facilities
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="uppercase tracking-wider text-[11px] bg-slate-900/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Facility Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Address / City</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Departments</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {places.map((place) => (
                  <tr key={place._id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      {place.category === 'Hospital' ? (
                        <Hospital className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : (
                        <Landmark className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      <span>{place.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          place.category === 'Hospital'
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        }`}
                      >
                        {place.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      <div>{place.address}</div>
                      <div className="text-[10px] text-slate-500">{place.city}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {place.phone || 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-bold text-indigo-300 font-mono">
                      {place.departmentCount ?? 0} counters
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleOpenPlaceModal(place)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                        title="Edit facility"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePlace(place._id, place.name)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-all"
                        title="Delete facility"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DEPARTMENTS & DOCTORS */}
      {activeSubTab === 'departments' && (
        <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Department & Doctor Rosters</h3>
              <p className="text-xs text-slate-400">
                Configure counters, consulting hours, and physician schedules.
              </p>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400">Filter Facility:</span>
              <select
                value={selectedPlaceFilter}
                onChange={(e) => setSelectedPlaceFilter(e.target.value)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Facilities</option>
                {places.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="uppercase tracking-wider text-[11px] bg-slate-900/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Department / Counter</th>
                  <th className="py-3 px-4">Facility</th>
                  <th className="py-3 px-4">Hours</th>
                  <th className="py-3 px-4">Avg Service</th>
                  <th className="py-3 px-4">Doctors / Staff Roster</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {departments.map((dept) => (
                  <tr key={dept._id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{dept.name}</td>
                    <td className="py-3 px-4 text-slate-300">{dept.place?.name}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {dept.opensAt} - {dept.closesAt}
                    </td>
                    <td className="py-3 px-4 text-sky-400 font-mono font-semibold">
                      ~{dept.avgServiceMinutes} mins
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleOpenDoctorsModal(dept)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>{dept.doctors?.length || 0} Doctors</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleOpenDeptModal(dept)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                        title="Edit department"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDept(dept._id, dept.name)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-all"
                        title="Delete department"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Place Modal (Add / Edit) */}
      {placeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSavePlace}
            className="glass-card max-w-lg w-full p-6 rounded-2xl border border-indigo-500/40 shadow-2xl space-y-4 animate-fadeIn"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">
                {editingPlace ? 'Edit Facility' : 'Add New Facility'}
              </h3>
              <button
                type="button"
                onClick={() => setPlaceModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Facility Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Multi-Speciality Clinic"
                  value={placeForm.name}
                  onChange={(e) => setPlaceForm({ ...placeForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Category</label>
                  <select
                    value={placeForm.category}
                    onChange={(e) => setPlaceForm({ ...placeForm, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Hospital">Hospital</option>
                    <option value="Bank">Bank</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={placeForm.city}
                    onChange={(e) => setPlaceForm({ ...placeForm, city: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Address</label>
                <input
                  type="text"
                  required
                  placeholder="Street, Landmark, Area"
                  value={placeForm.address}
                  onChange={(e) => setPlaceForm({ ...placeForm, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 863..."
                    value={placeForm.phone}
                    onChange={(e) => setPlaceForm({ ...placeForm, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={placeForm.lng}
                    onChange={(e) => setPlaceForm({ ...placeForm, lng: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={placeForm.lat}
                    onChange={(e) => setPlaceForm({ ...placeForm, lat: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPlaceModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                {editingPlace ? 'Update Facility' : 'Save Facility'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Department Modal (Add / Edit) */}
      {deptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveDept}
            className="glass-card max-w-lg w-full p-6 rounded-2xl border border-indigo-500/40 shadow-2xl space-y-4 animate-fadeIn"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">
                {editingDept ? 'Edit Department' : 'Add New Department'}
              </h3>
              <button
                type="button"
                onClick={() => setDeptModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {!editingDept && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Facility</label>
                  <select
                    value={deptForm.placeId}
                    onChange={(e) => setDeptForm({ ...deptForm, placeId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {places.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.category})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cardiology, Cash Deposit, Loan Desk"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Avg Service (mins)</label>
                  <input
                    type="number"
                    min="1"
                    value={deptForm.avgServiceMinutes}
                    onChange={(e) => setDeptForm({ ...deptForm, avgServiceMinutes: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Opens At</label>
                  <input
                    type="time"
                    value={deptForm.opensAt}
                    onChange={(e) => setDeptForm({ ...deptForm, opensAt: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Closes At</label>
                  <input
                    type="time"
                    value={deptForm.closesAt}
                    onChange={(e) => setDeptForm({ ...deptForm, closesAt: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeptModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                {editingDept ? 'Update Department' : 'Save Department'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Doctors Roster Modal */}
      {doctorModalOpen && currentDeptForDoctors && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-xl w-full p-6 rounded-2xl border border-indigo-500/40 shadow-2xl space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-indigo-400" />
                  <span>Doctors Roster: {currentDeptForDoctors.name}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {currentDeptForDoctors.place?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDoctorModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Doctors list */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {(currentDeptForDoctors.doctors || []).map((doc) => (
                <div
                  key={doc._id}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-white">{doc.name}</h5>
                    <p className="text-[11px] text-slate-400">
                      {doc.designation} &bull; {doc.experienceYears} yrs experience
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteDoctor(doc._id)}
                    className="p-1 rounded-lg hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-all"
                    title="Remove doctor"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {(!currentDeptForDoctors.doctors || currentDeptForDoctors.doctors.length === 0) && (
                <p className="text-center py-6 text-xs text-slate-500">
                  No doctors registered for this department. Add one below.
                </p>
              )}
            </div>

            {/* Add Doctor Form */}
            <form onSubmit={handleAddDoctor} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-indigo-300 block">Add New Doctor to Department</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Doctor Name (e.g. Dr. Rao)"
                  value={doctorForm.name}
                  onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  required
                  placeholder="Designation (e.g. Senior Consultant)"
                  value={doctorForm.designation}
                  onChange={(e) => setDoctorForm({ ...doctorForm, designation: e.target.value })}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Exp (yrs)"
                    value={doctorForm.experienceYears}
                    onChange={(e) => setDoctorForm({ ...doctorForm, experienceYears: e.target.value })}
                    className="w-20 p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                  >
                    Add
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacilitiesManagementTab;
