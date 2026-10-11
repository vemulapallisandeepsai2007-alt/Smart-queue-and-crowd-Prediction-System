import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft, Home } from 'lucide-react';

/**
 * Reusable breadcrumbs and Back button bar in Light Violet / Lavender Theme
 * @param {Array} items - Array of { label: string, path?: string, active?: boolean }
 * @param {Function} onBack - Optional custom back handler, defaults to navigate(-1)
 */
const Breadcrumbs = ({ items = [], onBack }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="w-full bg-white/85 backdrop-blur-md border border-[#D5C3EE]/80 rounded-2xl p-3 sm:p-4 mb-6 flex flex-wrap items-center justify-between gap-3 shadow-xs">
      {/* Back Button */}
      <button
        onClick={handleBack}
        id="flow-back-btn"
        className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF7FD] text-slate-700 hover:text-slate-900 text-xs font-semibold border border-[#D5C3EE] shadow-xs transition-all group"
      >
        <ArrowLeft className="w-3.5 h-3.5 text-slate-500 group-hover:-translate-x-0.5 group-hover:text-[#8164AD] transition-transform" />
        <span>Back</span>
      </button>

      {/* Breadcrumb Path */}
      <nav className="flex items-center space-x-1.5 sm:space-x-2 text-xs overflow-x-auto py-1">
        <Link
          to="/"
          className="text-slate-500 hover:text-[#8164AD] transition-colors inline-flex items-center space-x-1 font-medium"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Home</span>
        </Link>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={index}>
              <ChevronRight className="w-3.5 h-3.5 text-[#B19BD6] shrink-0" />
              {isLast || !item.path ? (
                <span className="font-bold text-[#53377F] truncate max-w-[180px] sm:max-w-xs">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="text-slate-600 hover:text-[#8164AD] font-medium transition-colors truncate max-w-[140px] sm:max-w-[200px]"
                >
                  {item.label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
};

export default Breadcrumbs;
