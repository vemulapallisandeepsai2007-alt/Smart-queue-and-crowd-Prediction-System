import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Breadcrumbs from '../../components/Breadcrumbs';
import api from '../../services/api';
import {
  Hospital,
  Landmark,
  MapPin,
  Clock,
  Stethoscope,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Briefcase,
  Phone,
} from 'lucide-react';
import toast from 'react-hot-toast';

const PlaceDepartmentsPage = () => {
  const { placeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [place, setPlace] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlaceDetails = async () => {
      setLoading(true);
      try {
        // Forward query params (name, category, address, lat, lng) for OSM auto-create
        const queryStr = searchParams.toString();
        const url = `/places/${placeId}/departments${queryStr ? `?${queryStr}` : ''}`;
        const res = await api.get(url);

        if (res.data?.success) {
          setPlace(res.data.place);
          setDepartments(res.data.departments || []);
        }
      } catch (err) {
        console.error('Failed to fetch place departments:', err);
        toast.error('Could not load facility departments.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlaceDetails();
  }, [placeId, searchParams]);

  const category = place?.category || searchParams.get('category') || 'Hospital';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fcfaff] via-[#f4ecfb] to-[#e9ddf6] text-slate-800 flex flex-col selection:bg-[#B19BD6] selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Category', path: '/book' },
            { label: `Nearby ${category}s`, path: `/book/places?category=${category}` },
            { label: place?.name || 'Facility Departments' },
          ]}
          onBack={() => navigate(`/book/places?category=${category}`)}
        />

        {/* Facility Banner */}
        {loading ? (
          <div className="bg-white/80 rounded-3xl p-6 sm:p-8 border border-[#E6DAF6] animate-pulse space-y-4">
            <div className="w-1/3 h-7 bg-[#F3ECFB] rounded"></div>
            <div className="w-1/2 h-4 bg-[#F3ECFB] rounded"></div>
          </div>
        ) : place ? (
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-[#D5C3EE]/90 relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#B19BD6]/15 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center space-x-4">
                <div
                  className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 ${
                    place.category === 'Hospital'
                      ? 'bg-[#F3ECFB] border-[#D5C3EE] text-[#8164AD]'
                      : 'bg-[#F3ECFB] border-[#D5C3EE] text-[#6A4C97]'
                  }`}
                >
                  {place.category === 'Hospital' ? (
                    <Hospital className="w-7 h-7" />
                  ) : (
                    <Landmark className="w-7 h-7" />
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        place.category === 'Hospital'
                          ? 'bg-[#F3ECFB] text-[#6A4C97] border border-[#D5C3EE]'
                          : 'bg-[#F3ECFB] text-[#53377F] border border-[#D5C3EE]'
                      }`}
                    >
                      {place.category}
                    </span>
                    <span className="text-xs text-slate-500">City: {place.city || 'Guntur'}</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                    {place.name}
                  </h1>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {place.address}
                    </span>
                    {place.phone && (
                      <>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {place.phone}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE] text-xs font-semibold text-[#6A4C97] shrink-0">
                <span>{departments.length} Departments Available</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Step Intro */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#F3ECFB] border border-[#D5C3EE] text-[#6A4C97] text-xs font-semibold uppercase tracking-wider mb-1 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#8164AD]" />
              <span>Step 3 of 4: Select Service Department</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Available Departments & Professional Rosters
            </h2>
          </div>
        </div>

        {/* Department List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/70 rounded-2xl p-6 border border-[#E6DAF6] animate-pulse space-y-4">
                <div className="w-1/4 h-5 bg-[#F3ECFB] rounded"></div>
                <div className="w-1/2 h-4 bg-[#F3ECFB] rounded"></div>
              </div>
            ))}
          </div>
        ) : departments.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-10 border border-[#D5C3EE] text-center space-y-3 shadow-md">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">No active departments found</h3>
            <p className="text-xs text-slate-600">Please choose another facility from the nearby list.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {departments.map((dept) => (
              <div
                key={dept._id}
                className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 border border-[#D5C3EE]/90 hover:border-[#B19BD6] transition-all duration-300 flex flex-col justify-between group shadow-md shadow-[#53377F]/5 hover:shadow-xl hover:-translate-y-1"
              >
                <div className="space-y-4">
                  {/* Department Title & Timing Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#8164AD] transition-colors">
                        {dept.name}
                      </h3>
                      <div className="flex items-center space-x-3 text-xs text-slate-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Avg Service: {dept.avgServiceMinutes || 10} mins</span>
                        </span>
                        <span>&bull;</span>
                        <span>
                          Hours: {dept.opensAt || '09:00'} - {dept.closesAt || '17:00'}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#F3ECFB] text-[#8164AD] border border-[#D5C3EE] shrink-0">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Doctor Rosters (if Hospital) */}
                  {dept.doctors && dept.doctors.length > 0 ? (
                    <div className="pt-3 border-t border-[#E6DAF6] space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                        Assigned Specialists & Doctors
                      </span>
                      <div className="space-y-2">
                        {dept.doctors.map((doc, docIdx) => (
                          <div
                            key={docIdx}
                            className="p-3 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE]/80 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center space-x-2.5">
                              <div className="w-7 h-7 rounded-lg bg-[#8164AD] text-white flex items-center justify-center font-bold text-[10px]">
                                Dr
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{doc.name}</p>
                                <p className="text-[11px] text-slate-600">{doc.designation}</p>
                              </div>
                            </div>
                            <span className="text-[11px] font-mono text-[#6A4C97] px-2 py-0.5 rounded bg-white border border-[#D5C3EE]">
                              {doc.experienceYears} yrs exp
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-[#E6DAF6] text-xs text-slate-600 flex items-center space-x-2">
                      <Briefcase className="w-4 h-4 text-[#8164AD] shrink-0" />
                      <span>Dedicated Counter Desk & Digital Token Dispatch</span>
                    </div>
                  )}
                </div>

                {/* View Tokens Button */}
                <div className="mt-6 pt-4 border-t border-[#E6DAF6]">
                  <button
                    onClick={() =>
                      navigate(
                        `/book/departments/${dept._id}?placeName=${encodeURIComponent(
                          place?.name || ''
                        )}&deptName=${encodeURIComponent(dept.name)}`
                      )
                    }
                    className="w-full py-2.5 px-4 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center space-x-2"
                  >
                    <span>View 75 Live Tokens & ETA</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default PlaceDepartmentsPage;
