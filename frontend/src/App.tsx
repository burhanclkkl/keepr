import { useAuth } from './context/AuthContext';
import { LandingView } from './views/Landing/LandingView';
import { DashboardView } from './views/Dashboard/DashboardView';
import { SharedCollectionView } from './views/Shared/SharedCollectionView';
import { CollabInviteView } from './views/Shared/CollabInviteView';
import './App.css';

function App() {
  const { token, loading } = useAuth();

  // Simple client-side router path matching for shared/invite collections
  const path = window.location.pathname;
  if (path.startsWith('/shared/')) {
    const slug = path.split('/shared/')[1];
    return <SharedCollectionView slug={slug} />;
  }

  if (path.startsWith('/invite/')) {
    const inviteToken = path.split('/invite/')[1];
    return <CollabInviteView token={inviteToken} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#f8f9fa] dark:bg-[#0a0a0a] select-none">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-slate-200 dark:border-[#1c1c1e] border-t-accent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Keepr Yükleniyor</span>
        </div>
      </div>
    );
  }

  return token ? <DashboardView /> : <LandingView />;
}

export default App;
