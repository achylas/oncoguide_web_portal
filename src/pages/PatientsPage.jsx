import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllPatients } from '../services/patientService';
import PageLayout from '../components/layout/PageLayout';

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getAllPatients()
      .then(setPatients)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Patients</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">
            {loading ? 'Loading...' : `${patients.length} total records`}
          </p>
        </div>
        <Link to="/patients/add" className="btn-primary shadow-glow-rose">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Add Patient
        </Link>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search patients by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-10 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-300 dark:focus:ring-rose-700 focus:border-transparent shadow-card dark:shadow-dark-card placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-full text-xs transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Results count */}
      {search && !loading && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "<span className="font-semibold text-gray-700 dark:text-gray-300">{search}</span>"
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[1,2,3,4].map(j => <div key={j} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d={search
                  ? "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  : "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                }
              />
            </svg>
          </div>
          <p className="text-gray-800 dark:text-gray-200 font-bold text-lg">
            {search ? 'No patients found' : 'No patients yet'}
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            {search ? `No results for "${search}"` : 'Add your first patient to get started'}
          </p>
          {!search && (
            <Link to="/patients/add" className="btn-primary mt-5 inline-flex">
              Add First Patient
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => <PatientCard key={p.id} patient={p} />)}
        </div>
      )}
    </PageLayout>
  );
}

function PatientCard({ patient: p }) {
  const initials = p.name?.slice(0, 2).toUpperCase() ?? '??';
  const date = p.createdAt?.toDate
    ? p.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Recently added';

  return (
    <Link
      to={`/patients/${p.id}`}
      className="card p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 group block"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 dark:text-white truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors text-sm">
            {p.name}
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">{date}</p>
        </div>
        <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-800 group-hover:bg-rose-50 dark:group-hover:bg-rose-900/30 flex items-center justify-center transition-colors flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-rose-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Chip icon="🎂" label="Age"      value={p.age     ? `${p.age} yrs`   : '—'} />
        <Chip icon="⚖️"  label="BMI"     value={p.clinicalAssessment?.imc    ?? '—'} />
        <Chip icon="🏋️"  label="Weight"  value={p.weight  ? `${p.weight} kg` : '—'} />
        <Chip icon="🔬"  label="Biopsies" value={p.clinicalAssessment?.biopsies ?? '0'} />
      </div>
    </Link>
  );
}

function Chip({ icon, label, value }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 border border-gray-100 dark:border-gray-700">
      <p className="text-gray-400 dark:text-gray-500 text-xs mb-0.5">{label}</p>
      <p className="text-gray-800 dark:text-gray-200 text-sm font-semibold">{value}</p>
    </div>
  );
}
