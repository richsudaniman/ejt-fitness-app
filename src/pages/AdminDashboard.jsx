import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Award, Video, Dumbbell, TrendingUp, Activity, UserPlus, Megaphone, GraduationCap, ChevronRight, BarChart3, Settings, Shield } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function AdminDashboard() {
  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ['allVideos'],
    queryFn: () => base44.entities.ExerciseVideo.list('-created_date'),
    initialData: [],
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: workoutPlans, isLoading: plansLoading } = useQuery({
    queryKey: ['allWorkoutPlans'],
    queryFn: () => base44.entities.WorkoutPlan.list('-created_date'),
    initialData: [],
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: workoutLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['allWorkoutLogs'],
    queryFn: () => base44.entities.WorkoutLog.list('-completed_date', 100),
    initialData: [],
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['allAssignments'],
    queryFn: () => base44.entities.TrainerClientAssignment.filter({ is_active: true }),
    initialData: [],
    enabled: !usersLoading,
    staleTime: 0,
    refetchOnMount: true,
  });

  const trainers = allUsers.filter(u => u.role === 'trainer' || u.user_type === 'trainer');
  const admins = allUsers.filter(u => u.role === 'admin');
  const clients = allUsers.filter(u => u.role !== 'admin' && u.role !== 'trainer' && u.user_type !== 'trainer');

  // Calculate weekly activity with proper date handling (local time)
  const last7DaysDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const last7DaysStrings = last7DaysDates.map(d => format(d, 'yyyy-MM-dd'));
  
  const weeklyLogs = workoutLogs.filter(log => last7DaysStrings.includes(log.completed_date));

  // Calculate engagement rate
  const activeClients = new Set(weeklyLogs.map(log => log.logged_by_client_id)).size;
  const engagementRate = clients.length > 0 ? Math.round((activeClients / clients.length) * 100) : 0;

  // Prepare chart data for weekly activity
  const weeklyActivityData = last7DaysDates.map(d => {
    const dateStr = format(d, 'yyyy-MM-dd');
    const displayDate = format(d, 'EEE');
    const dayWorkouts = workoutLogs.filter(log => log.completed_date === dateStr).length;
    return {
      date: displayDate,
      workouts: dayWorkouts
    };
  });

  // Role distribution for Pie Chart
  const roleData = [
    { name: 'Clients', value: clients.length, color: '#0ea5e9' },
    { name: 'Trainers', value: trainers.length, color: '#2dd4bf' },
    { name: 'Admins', value: admins.length, color: '#6366f1' },
  ];

  const isLoading = usersLoading || videosLoading || plansLoading || logsLoading || assignmentsLoading;

  return (
    <div className="w-full max-w-[1600px] mx-auto px-6 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Platform overview and management</p>
        </div>
        <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-50 text-[#0ea5e9] text-xs font-bold rounded-full uppercase">
                {admins.length} Admin{admins.length !== 1 && 's'}
            </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users Card */}
        <Link to={createPageUrl("AdminUsers")}>
            <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer h-full group">
            <CardContent className="p-6 relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Users className="w-16 h-16 text-[#0ea5e9]" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Users</span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-4xl font-black text-[#0ea5e9]">{allUsers.length}</span>
                        <span className="text-xs text-gray-400 font-bold bg-blue-50 px-2 py-0.5 rounded-full">ALL TIME</span>
                    </div>
                </div>
            </CardContent>
            </Card>
        </Link>

        {/* Trainers Card */}
        <Link to={createPageUrl("AdminTrainers")}>
            <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer h-full group">
            <CardContent className="p-6 relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Award className="w-16 h-16 text-teal-600" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Active Trainers</span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-4xl font-black text-teal-600">{trainers.length}</span>
                        <span className="text-xs text-teal-600/70 font-bold bg-teal-50 px-2 py-0.5 rounded-full">PROS</span>
                    </div>
                </div>
            </CardContent>
            </Card>
        </Link>

        {/* Engagement Card */}
        <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden h-full group">
            <CardContent className="p-6 relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Activity className="w-16 h-16 text-indigo-600" />
            </div>
            <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Engagement</span>
                <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-black text-indigo-600">{engagementRate}%</span>
                    <span className="text-xs text-indigo-600/70 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">ACTIVE</span>
                </div>
            </div>
            </CardContent>
        </Card>

        {/* Content Card */}
        <Link to={createPageUrl("AdminVideos")}>
            <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer h-full group">
                <CardContent className="p-6 relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Video className="w-16 h-16 text-sky-600" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Video Library</span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-4xl font-black text-sky-600">{videos.length}</span>
                        <span className="text-xs text-sky-600/70 font-bold bg-sky-50 px-2 py-0.5 rounded-full">VIDEOS</span>
                    </div>
                </div>
                </CardContent>
            </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to={createPageUrl("AdminInviteUser")}>
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-6 text-white shadow-md hover:shadow-lg transition-all cursor-pointer h-full relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110">
                 <UserPlus className="w-24 h-24 text-white" />
              </div>
              <div className="flex items-start gap-4 relative z-10">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-1">Invite User</h4>
                  <p className="text-teal-50 text-xs font-medium">Add new users or trainers</p>
                </div>
              </div>
            </div>
          </Link>

          <Link to={createPageUrl("AdminAnnouncements")}>
            <div className="bg-gradient-to-r from-[#0ea5e9] to-blue-600 rounded-xl p-6 text-white shadow-md hover:shadow-lg transition-all cursor-pointer h-full relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110">
                 <Megaphone className="w-24 h-24 text-white" />
              </div>
              <div className="flex items-start gap-4 relative z-10">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Megaphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-1">Announce</h4>
                  <p className="text-blue-50 text-xs font-medium">Send platform alerts</p>
                </div>
              </div>
            </div>
          </Link>

          <Link to={createPageUrl("AdminClientAssignments")}>
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-md hover:shadow-lg transition-all cursor-pointer h-full relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110">
                 <Users className="w-24 h-24 text-white" />
              </div>
              <div className="flex items-start gap-4 relative z-10">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-1">Assignments</h4>
                  <p className="text-indigo-50 text-xs font-medium">Manage client-trainer pairs</p>
                </div>
              </div>
            </div>
          </Link>
          
           <Link to={createPageUrl("AdminEducationalContent")}>
            <div className="bg-gradient-to-r from-sky-500 to-sky-600 rounded-xl p-6 text-white shadow-md hover:shadow-lg transition-all cursor-pointer h-full relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110">
                 <GraduationCap className="w-24 h-24 text-white" />
              </div>
              <div className="flex items-start gap-4 relative z-10">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-1">Education</h4>
                  <p className="text-sky-50 text-xs font-medium">Manage learning materials</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area - 2 cols */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Weekly Activity Chart */}
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Weekly Workout Activity</h3>
                <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={weeklyActivityData} barSize={40}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="date" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fill: '#64748b', fontSize: 12}} 
                                        dy={10} 
                                    />
                                    <YAxis 
                                        hide 
                                        axisLine={false} 
                                        tickLine={false} 
                                    />
                                    <Tooltip 
                                        cursor={{fill: 'transparent'}}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="workouts" radius={[4, 4, 0, 0]}>
                                        {weeklyActivityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#0ea5e9' : '#2dd4bf'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Recent Platform Activity</h3>
                    <Link to={createPageUrl("AdminAnalytics")} className="text-sm font-semibold text-[#0ea5e9] flex items-center hover:underline">
                        View Analytics <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
                <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden">
                    <CardContent className="p-0">
                        {weeklyLogs.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                                {weeklyLogs.slice(0, 8).map((log, idx) => {
                                    const client = clients.find(c => c.id === log.logged_by_client_id);
                                    return (
                                        <div key={idx} className="p-4 flex gap-4 hover:bg-gray-50 transition-colors">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                <Dumbbell className="w-5 h-5 text-gray-500" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-bold text-gray-900 text-sm">
                                                        {client?.full_name || 'Unknown Client'}
                                                        <span className="font-normal text-gray-500"> completed </span>
                                                        {log.exercise_name}
                                                    </p>
                                                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                                        {format(new Date(log.completed_date), 'MMM d')}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {log.sets_completed} sets • {log.reps_completed} reps {log.weight_used ? `• ${log.weight_used}lbs` : ''}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                <Activity className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p>No recent activity reported</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>

        {/* Sidebar - 1 col */}
        <div className="space-y-6">
            {/* User Distribution Pie Chart */}
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">User Distribution</h3>
                <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-center">
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={roleData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {roleData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-4">
                            {roleData.map((item, index) => (
                                <div key={index} className="text-center p-2 bg-gray-50 rounded-lg">
                                    <div className="flex items-center justify-center gap-1.5 mb-1">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                                        <p className="text-[10px] font-semibold text-gray-600 uppercase">{item.name}</p>
                                    </div>
                                    <p className="text-lg font-bold text-gray-900">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Platform Health/Status with Metrics */}
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Platform Health</h3>
                <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden">
                    <CardContent className="p-5 space-y-4">
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-gray-700">Engagement Rate</span>
                                    <span className="text-[#0ea5e9] font-bold">{engagementRate}%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-[#0ea5e9] to-[#0284c7]"
                                        style={{ width: `${engagementRate}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-gray-700">Trainer Utilization</span>
                                    <span className="text-purple-600 font-bold">
                                        {trainers.length > 0 ? Math.round((assignments.length / (trainers.length * 10)) * 100) : 0}%
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-600"
                                        style={{ width: `${trainers.length > 0 ? Math.min((assignments.length / (trainers.length * 10)) * 100, 100) : 0}%` }}
                                    ></div>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Based on 10 client capacity</p>
                            </div>
                        </div>
                        
                        <div className="pt-4 border-t border-gray-100 space-y-3">
                             <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Database</span>
                                <span className="font-medium text-green-600 flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                                    Connected
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Storage</span>
                                <span className="font-medium text-gray-900">85% Free</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Links List */}
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Management</h3>
                <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden">
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-100">
                             <Link to={createPageUrl("AdminUsers")}>
                                <div className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-gray-100 rounded text-gray-500 group-hover:text-[#0ea5e9] group-hover:bg-blue-50 transition-colors">
                                            <Users className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">All Users</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#0ea5e9]" />
                                </div>
                            </Link>
                             <Link to={createPageUrl("AdminTrainers")}>
                                <div className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-gray-100 rounded text-gray-500 group-hover:text-purple-600 group-hover:bg-purple-50 transition-colors">
                                            <Shield className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">Trainer Access</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-600" />
                                </div>
                            </Link>
                             <Link to={createPageUrl("AdminAnalytics")}>
                                <div className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-gray-100 rounded text-gray-500 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                                            <BarChart3 className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">Detailed Reports</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-600" />
                                </div>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
}