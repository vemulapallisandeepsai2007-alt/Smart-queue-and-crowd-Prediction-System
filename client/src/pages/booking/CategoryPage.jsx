import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Breadcrumbs from '../../components/Breadcrumbs';
import { Hospital, Landmark, ArrowRight, Sparkles } from 'lucide-react';

const CategoryPage = () => {
  const navigate = useNavigate();

  const handleSelectCategory = (category) => {
    navigate(`/book/places?category=${category}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fcfaff] via-[#f4ecfb] to-[#e9ddf6] text-slate-800 flex flex-col selection:bg-[#B19BD6] selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col justify-center">
        {/* Breadcrumbs */}
        <Breadcrumbs items={[{ label: 'Select Facility Category' }]} />

        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#F3ECFB] border border-[#D5C3EE] text-[#6A4C97] text-xs font-semibold uppercase tracking-wider shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#8164AD]" />
            <span>Step 1 of 4: Facility Type</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Where would you like to reserve a token?
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Choose between medical consultations at hospitals or counter services at bank branches across Guntur.
          </p>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
          {/* Hospital Card */}
          <div
            onClick={() => handleSelectCategory('Hospital')}
            id="category-hospital-card"
            className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-[#D5C3EE]/90 hover:border-[#B19BD6] transition-all duration-300 cursor-pointer group shadow-lg shadow-[#53377F]/5 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className="space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-[#F3ECFB] border border-[#D5C3EE] flex items-center justify-center text-[#8164AD] group-hover:scale-110 transition-transform">
                <Hospital className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs uppercase font-bold text-[#8164AD] tracking-wider">
                  Healthcare Services
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">Hospitals & Clinics</h2>
                <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                  Book outpatient consultation tokens, view doctor rosters, OPD schedules, and skip hospital waiting room crowds.
                </p>
              </div>

              <div className="space-y-2 pt-2 text-xs text-slate-700">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8164AD]"></span>
                  <span>Cardiology, General Medicine, Pediatrics, Orthopedics & more</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8164AD]"></span>
                  <span>Real-time doctor consultation countdown & wait estimates</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E6DAF6] flex items-center justify-between text-[#8164AD] font-semibold text-sm group-hover:text-[#6A4C97]">
              <span>Find Nearby Hospitals</span>
              <div className="p-2 rounded-xl bg-[#FAF7FD] group-hover:bg-[#F3ECFB] group-hover:translate-x-1 transition-all">
                <ArrowRight className="w-4 h-4 text-[#8164AD]" />
              </div>
            </div>
          </div>

          {/* Bank Card */}
          <div
            onClick={() => handleSelectCategory('Bank')}
            id="category-bank-card"
            className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-[#D5C3EE]/90 hover:border-[#B19BD6] transition-all duration-300 cursor-pointer group shadow-lg shadow-[#53377F]/5 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className="space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-[#F3ECFB] border border-[#D5C3EE] flex items-center justify-center text-[#6A4C97] group-hover:scale-110 transition-transform">
                <Landmark className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs uppercase font-bold text-[#6A4C97] tracking-wider">
                  Financial Services
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">Banks & Financial Branches</h2>
                <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                  Reserve tokens for cash deposits, account opening, KYC verification, loan desks, and foreign exchange counters.
                </p>
              </div>

              <div className="space-y-2 pt-2 text-xs text-slate-700">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6A4C97]"></span>
                  <span>SBI, HDFC, ICICI and local Guntur banking branches</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6A4C97]"></span>
                  <span>Instant counter calling alerts with zero standing queues</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E6DAF6] flex items-center justify-between text-[#6A4C97] font-semibold text-sm group-hover:text-[#53377F]">
              <span>Find Nearby Banks</span>
              <div className="p-2 rounded-xl bg-[#FAF7FD] group-hover:bg-[#F3ECFB] group-hover:translate-x-1 transition-all">
                <ArrowRight className="w-4 h-4 text-[#6A4C97]" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CategoryPage;
