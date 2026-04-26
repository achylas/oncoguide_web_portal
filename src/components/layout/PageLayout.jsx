import Navbar from './Navbar';

export default function PageLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#f4f6fb] dark:bg-[#0f1117] transition-colors duration-200">
      <Navbar />
      {/* Offset for sidebar on desktop, top bar on mobile */}
      <div className="md:pl-64 pt-14 md:pt-0">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
