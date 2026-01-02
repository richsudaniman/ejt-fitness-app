import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Dumbbell, UtensilsCrossed, TrendingUp, GraduationCap, Users, Video, UserPlus, Award, MessageCircle, Menu, X, LogOut, Settings, UserCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import AuthGuard from "@/components/AuthGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        return null;
      }
    },
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Redirect users to their appropriate home page on initial load
  React.useEffect(() => {
    if (!user || hasRedirected) return;
    
    const currentPath = location.pathname;
    const isGenericHome = currentPath === '/' || currentPath === '/Home' || currentPath === createPageUrl('Home');
    const isAdminPage = currentPath.includes('Admin');
    const isTrainerPage = currentPath.includes('Trainer');
    
    // Determine user's role - admin takes priority
    const isAdmin = user.role === 'admin';
    const isTrainer = !isAdmin && (user.user_type === 'trainer' || user.role === 'trainer');
    const isClient = !isAdmin && !isTrainer;
    
    // Redirect based on role
    if (isAdmin) {
      // Admins go to Admin Dashboard if on generic home or trainer pages
      if (isGenericHome || isTrainerPage) {
        navigate(createPageUrl('AdminDashboard'), { replace: true });
        setHasRedirected(true);
      }
    } else if (isTrainer) {
      // Trainers go to Trainer Dashboard if on generic home or admin pages
      if (isGenericHome || isAdminPage) {
        navigate(createPageUrl('TrainerDashboard'), { replace: true });
        setHasRedirected(true);
      }
    } else if (isClient) {
      // Clients go to Home if they somehow land on admin or trainer pages
      if (isAdminPage || isTrainerPage) {
        navigate(createPageUrl('Home'), { replace: true });
        setHasRedirected(true);
      }
    }
  }, [user, location.pathname, hasRedirected, navigate]);

  // Get unread message count for badge
  const { data: unreadCount } = useQuery({
    queryKey: ['unreadMessages', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const messages = await base44.entities.ChatMessage.filter({ 
        receiver_id: user.id, 
        is_read: false 
      });
      return messages.length;
    },
    initialData: 0,
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refresh every minute
  });

  // Determine view mode based on current page AND user role
  const getViewMode = () => {
    if (!user) return 'client';
    
    // Admins ALWAYS see admin view, regardless of page
    if (user.role === 'admin') return 'admin';

    // Check current page name to determine context
    if (currentPageName?.startsWith('Trainer')) {
      return 'trainer';
    }
    if (currentPageName?.startsWith('Admin')) {
      return 'admin';
    }
    
    // For generic pages like Home, check the user's actual role FIRST
    if (user.user_type === 'trainer' || user.role === 'trainer') return 'trainer';
    
    // Only regular clients see client pages
    return 'client';
  };

  const viewMode = getViewMode();
  const isTrainerView = viewMode === 'trainer';
  const isAdminView = viewMode === 'admin';
  const isClientView = viewMode === 'client';
  const isManagementView = isAdminView || isTrainerView;

  // Client navigation
  const clientNavItems = [
    { name: "Home", path: createPageUrl("Home"), icon: Home },
    { name: "Workout", path: createPageUrl("Workout"), icon: Dumbbell },
    { name: "Nutrition", path: createPageUrl("Nutrition"), icon: UtensilsCrossed },
    { name: "Progress", path: createPageUrl("Progress"), icon: TrendingUp },
    { name: "Learn", path: createPageUrl("Learn"), icon: GraduationCap },
  ];

  // Trainer navigation
  const trainerNavItems = [
    { name: "Dashboard", path: createPageUrl("TrainerDashboard"), icon: Home },
    { name: "Clients", path: createPageUrl("TrainerClients"), icon: Users },
    { name: "Videos", path: createPageUrl("TrainerVideos"), icon: Video },
    { name: "Profile", path: createPageUrl("TrainerProfile"), icon: Settings },
  ];

  // Admin navigation
  const adminNavItems = [
    { name: "Dashboard", path: createPageUrl("AdminDashboard"), icon: Home },
    { name: "Users", path: createPageUrl("AdminUsers"), icon: Users },
    { name: "Trainers", path: createPageUrl("AdminTrainers"), icon: Award },
    { name: "Assignments", path: createPageUrl("AdminClientAssignments"), icon: UserCheck },
    { name: "Videos", path: createPageUrl("AdminVideos"), icon: Video },
  ];

  const navItems = isAdminView ? adminNavItems : (isTrainerView ? trainerNavItems : clientNavItems);

  const isNavItemActive = (navPath) => {
    return location.pathname === navPath;
  };

  const getHomePath = () => {
    // Use user role to determine home path, not current view
    if (user?.role === 'admin') return createPageUrl("AdminDashboard");
    if (user?.user_type === 'trainer' || user?.role === 'trainer') return createPageUrl("TrainerDashboard");
    return createPageUrl("Home");
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  // CLIENT LAYOUT (Mobile-first, Bottom Nav)
  if (isClientView) {
    return (
      <ErrorBoundary>
        <AuthGuard>
          <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-48 relative overflow-x-hidden safe-area-inset">
            <style>{`
              :root {
                --primary-white: #ffffff;
                --accent-blue: #0ea5e9;
                --text-dark: #1a1a1a;
                --card-light: #f8fafc;
                --border-gray: #e2e8f0;
              }
              .safe-area-inset {
                padding-top: env(safe-area-inset-top);
                padding-bottom: env(safe-area-inset-bottom);
              }
              * {
                -webkit-tap-highlight-color: transparent;
                -webkit-touch-callout: none;
              }
              html {
                -webkit-overflow-scrolling: touch;
                scroll-behavior: smooth;
              }
              body {
                overscroll-behavior-y: contain;
              }
            `}</style>

            {/* Header */}
            <header className="bg-white/80 backdrop-blur-xl px-6 py-4 sticky top-0 z-50 border-b border-gray-100">
              <div className="max-w-md mx-auto">
                <div className="flex items-center justify-between">
                  <Link to={getHomePath()}>
                    <div className="flex items-center gap-4 cursor-pointer">
                      <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ec491d7ea69205b631f4de/af90f763e_Gemini_Generated_Image_mwaxnhmwaxnhmwax.png" 
                        alt="EJT Fitness" 
                        className="w-16 h-16 object-contain" 
                      />
                      <div>
                        <h1 className="text-2xl font-black italic text-[#1a1a1a] tracking-tight">
                          EJT FITNESS
                        </h1>
                        <p className="text-[10px] font-bold text-[#0ea5e9] uppercase tracking-wider whitespace-nowrap">Elevate • Journey • Transform</p>
                      </div>
                    </div>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-400">
                    <LogOut className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-md mx-auto">
              {children}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl z-50 border-t border-gray-100" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <div className="flex justify-around items-center px-2 py-3 max-w-md mx-auto">
                {navItems.map((item) => {
                  const isActive = isNavItemActive(item.path);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className="flex flex-col items-center gap-1 transition-all duration-200 relative py-2 px-4"
                    >
                      {isActive && (
                        <div className="absolute inset-0 bg-[#0ea5e9]/5 rounded-xl"></div>
                      )}
                      <div className="relative">
                        <Icon className={`w-6 h-6 transition-colors ${isActive ? "text-[#0ea5e9]" : "text-gray-400"}`} />
                        {item.badge > 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-[8px] font-bold">{item.badge > 9 ? '9+' : item.badge}</span>
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] font-medium ${isActive ? "text-[#0ea5e9]" : "text-gray-400"}`}>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        </AuthGuard>
      </ErrorBoundary>
    );
  }

  // MANAGEMENT LAYOUT (Admin & Trainer - Desktop Sidebar / Mobile Drawer)
  return (
    <ErrorBoundary>
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
          <style>{`
            :root {
              --primary-white: #ffffff;
              --accent-blue: #0ea5e9;
              --text-dark: #1a1a1a;
            }
          `}</style>

          {/* Desktop Sidebar */}
          <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-gray-200 h-screen sticky top-0">
            <div className="p-6 border-b border-gray-100">
              <Link to={getHomePath()} className="flex items-center gap-4">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ec491d7ea69205b631f4de/af90f763e_Gemini_Generated_Image_mwaxnhmwaxnhmwax.png" 
                  alt="EJT Fitness" 
                  className="w-16 h-16 object-contain" 
                />
                <div>
                  <h1 className="text-2xl font-black italic text-[#1a1a1a] tracking-tight leading-none mb-1">EJT FITNESS</h1>
                  <p className="text-[9px] font-bold text-[#0ea5e9] uppercase tracking-wider mb-1 whitespace-nowrap">Elevate • Journey • Transform</p>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{isAdminView ? 'Admin Portal' : 'Trainer Portal'}</p>
                </div>
              </Link>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = isNavItemActive(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      isActive 
                        ? "bg-[#0ea5e9]/10 text-[#0ea5e9] font-semibold" 
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-[#0ea5e9]" : "text-gray-400 group-hover:text-gray-600"}`} />
                    <span>{item.name}</span>
                    {item.badge > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center gap-3 px-3 py-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs border border-gray-200">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{user?.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50 border-gray-200"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </aside>

          {/* Mobile Header */}
          <div className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu className="w-6 h-6 text-gray-700" />
              </Button>
              <Link to={getHomePath()} className="flex items-center gap-3">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ec491d7ea69205b631f4de/af90f763e_Gemini_Generated_Image_mwaxnhmwaxnhmwax.png" 
                  alt="EJT Fitness" 
                  className="w-12 h-12 object-contain" 
                />
                <div>
                  <span className="font-black italic text-gray-900 text-lg block leading-none">EJT FITNESS</span>
                  <span className="text-[8px] font-bold text-[#0ea5e9] uppercase tracking-wider block whitespace-nowrap">Elevate • Journey • Transform</span>
                </div>
              </Link>
            </div>
            <div className="w-8"></div> {/* Spacer for balance */}
          </div>

          {/* Mobile Menu Overlay */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
              <div className="fixed inset-y-0 left-0 w-[320px] bg-white shadow-xl flex flex-col animate-in slide-in-from-left duration-300">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <Link to={getHomePath()} className="flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                    <img 
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ec491d7ea69205b631f4de/af90f763e_Gemini_Generated_Image_mwaxnhmwaxnhmwax.png" 
                      alt="EJT Fitness" 
                      className="w-14 h-14 object-contain" 
                    />
                    <div>
                      <h2 className="text-xl font-black italic text-gray-900 leading-none mb-1">EJT FITNESS</h2>
                      <p className="text-[9px] font-bold text-[#0ea5e9] uppercase tracking-wider mb-1 whitespace-nowrap">Elevate • Journey • Transform</p>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{isAdminView ? 'Admin Portal' : 'Trainer Portal'}</p>
                    </div>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                    <X className="w-5 h-5 text-gray-400" />
                  </Button>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                  {navItems.map((item) => {
                    const isActive = isNavItemActive(item.path);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                          isActive 
                            ? "bg-[#0ea5e9]/10 text-[#0ea5e9] font-bold" 
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? "text-[#0ea5e9]" : "text-gray-400"}`} />
                        <span>{item.name}</span>
                        {item.badge > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {item.badge > 9 ? '9+' : item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                  <div className="flex items-center gap-3 px-2 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm border border-gray-200">
                      {user?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{user?.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full justify-center text-red-600 border-red-100 hover:bg-red-50"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 overflow-y-auto">
            {children}
          </main>
        </div>
      </AuthGuard>
    </ErrorBoundary>
  );
}