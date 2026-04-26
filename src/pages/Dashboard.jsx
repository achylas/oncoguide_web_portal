import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import PageLayout from '../components/layout/PageLayout';

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, gradient, change, loading }) {
  return (
    <div className="card p-5 hover:shadow-card-hover transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl ${gradient} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        {change !== undefined && !loading && (
          <span className="badge bg-emerald-50 text-emerald-600 text-xs">
            +{change} this week
          </span>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-8 w-20 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
          <p className="text-gray-500 text-sm mt-0.5 font-medium">{label}</p>
        </>
      )}
    </div>
  );
}

// ── Activity item ──────────────────────────────────────────────────────────────
function PatientRow({ patient }) {
  const initials = patient.name?.slice(0, 2).toUpperCase() ?? '??';
  const date = patient.createdAt?.toDate
    ? patient.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Recently';

  return (
    <Link
      to={`/patients/${patient.id}`}
      className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/80 transition-colors group"
    >
      <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate group-hover:text-rose-600 transition-colors">
          {patient.name}
        </p>
        <p className="text-gray-400 text-xs mt-0.5">
          Age {patient.age ?? '—'} · BMI {patient.clinicalAssessment?.imc ?? '—'}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-gray-400 text-xs">{date}</span>
        <svg className="w-4 h-4 text-gray-300 group-hover:text-rose-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats,          setStats]          = useState({ total: 0, thisWeek: 0, mammograms: 0, ultrasounds: 0 });
  const [recentPatients, setRecentPatients] = useState([]);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [pSnap, imgSnap] = await Promise.all([
          getDocs(collection(db, 'patients')),
          getDocs(collection(db, 'patient_images')),
        ]);

        const weekAgo  = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        const weekSnap = await getDocs(query(
          collection(db, 'patients'),
          where('createdAt', '>=', Timestamp.fromDate(weekAgo))
        ));

        const imgs    = imgSnap.docs.map(d => d.data());
        setStats({
          total:       pSnap.size,
          thisWeek:    weekSnap.size,
          mammograms:  imgs.filter(i => i.imageType === 'mammogram').length,
          ultrasounds: imgs.filter(i => i.imageType === 'ultrasound').length,
        });

        const rSnap = await getDocs(query(collection(db, 'patients'), orderBy('createdAt', 'desc'), limit(6)));
        setRecentPatients(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const statCards = [
    {
      label: 'Total Patients',
      value: stats.total,
      gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    },
    {
      label: 'Added This Week',
      value: stats.thisWeek,
      gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
      change: stats.thisWeek,
    },
    {
      label: 'Mammogram Images',
      value: stats.mammograms,
      gradient: 'bg-gradient-to-br from-rose-500 to-pink-600',
      icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>,
    },
    {
      label: 'Ultrasound Images',
      value: stats.ultrasounds,
      gradient: 'bg-gradient-to-br from-violet-500 to-purple-600',
      icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    },
  ];

  return (
    <PageLayout>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-gray-400 text-sm font-medium">{greeting},</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
            {profile?.name ?? 'Radiologist'} 👋
          </h1>
        </div>
        <Link to="/patients/add" className="btn-primary shadow-glow-rose">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Patient
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {statCards.map(s => <StatCard key={s.label} {...s} loading={loading} />)}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Recent patients */}
        <div className="xl:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-bold text-gray-900">Recent Patients</h2>
              <p className="text-gray-400 text-xs mt-0.5">Latest registered records</p>
            </div>
            <Link to="/patients" className="text-rose-500 text-sm font-semibold hover:text-rose-600 transition-colors flex items-center gap-1">
              View all
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-100 rounded w-1/3 animate-pulse" />
                    <div className="h-3 bg-gray-100 rounded w-1/4 animate-pulse" />
                  </div>
                  <div className="h-3 bg-gray-100 rounded w-12 animate-pulse" />
                </div>
              ))
            ) : recentPatients.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-gray-600 font-semibold">No patients yet</p>
                <p className="text-gray-400 text-sm mt-1">Add your first patient to get started</p>
                <Link to="/patients/add" className="btn-primary mt-4 text-sm">Add Patient</Link>
              </div>
            ) : (
              recentPatients.map(p => <PatientRow key={p.id} patient={p} />)
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Quick actions */}
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2.5">
              <Link
                to="/patients/add"
                className="flex items-center gap-3.5 p-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-violet-600 text-white hover:shadow-glow-rose hover:-translate-y-px transition-all duration-150"
              >
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm">Add New Patient</p>
                  <p className="text-white/70 text-xs">Register a patient record</p>
                </div>
              </Link>

              <Link
                to="/patients"
                className="flex items-center gap-3.5 p-3.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100"
              >
                <div className="w-8 h-8 bg-white rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-800">Browse Patients</p>
                  <p className="text-gray-400 text-xs">Search & filter records</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Info banner */}
          <div className="card p-5 bg-gradient-to-br from-rose-500 to-violet-600 border-0 text-white overflow-hidden relative">
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full" />
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-base mb-1">AI-Assisted Analysis</h3>
              <p className="text-white/75 text-xs leading-relaxed">
                Images you upload are available to the clinical team for AI-powered breast cancer screening.
              </p>
            </div>
          </div>

          {/* Summary */}
          {!loading && (
            <div className="card p-5">
              <h3 className="font-bold text-gray-900 text-sm mb-3">Image Summary</h3>
              <div className="space-y-3">
                <ProgressBar label="Mammograms" value={stats.mammograms} total={stats.mammograms + stats.ultrasounds} color="bg-rose-500" />
                <ProgressBar label="Ultrasounds" value={stats.ultrasounds} total={stats.mammograms + stats.ultrasounds} color="bg-violet-500" />
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

function ProgressBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="text-gray-400">{value} ({pct}%)</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
