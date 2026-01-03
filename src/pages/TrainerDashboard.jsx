import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Users, User, Dumbbell, UtensilsCrossed, TrendingUp, Calendar, Award, MessageCircle, UserPlus, ChevronRight, Flame, Activity, BarChart as BarChartIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import SessionCalendar from "@/components/trainer/SessionCalendar";

export default function TrainerDashboard() {
  const { data: trainer } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['trainerAssignments', trainer?.id],
    queryFn: () => base44.entities.TrainerClientAssignment.filter({ trainer_id: trainer.id, is_active: true }),
    enabled: !!trainer?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['trainerClients', trainer?.id, assignments],
    queryFn: async () => {
      const clientIds = assignments.map(a => a.client_id);
      if (clientIds.length === 0) return [];
      const allUsers = await base44.entities.User.list();
      // Filter out admins from client lists, even if assigned
      return allUsers.filter(u => clientIds.includes(u.id) && u.role !== 'admin' && u.role !== 'trainer');
    },
    enabled: !!trainer?.id && assignments.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: allWorkoutPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['allWorkoutPlans', trainer?.id],
    queryFn: async () => {
      return await base44.entities.WorkoutPlan.filter({ created_by_trainer_id: trainer.id });
    },
    enabled: !!trainer?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: allNutritionPlans = [], isLoading: nutritionLoading } = useQuery({
    queryKey: ['allNutritionPlans', trainer?.id],
    queryFn: async () => {
      return await base44.entities.NutritionPlan.filter({ created_by_trainer_id: trainer.id });
    },
    enabled: !!trainer?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: allGoals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ['allGoals', trainer?.id],
    queryFn: async () => {
      return await base44.entities.FitnessGoal.filter({ created_by_trainer_id: trainer.id, is_active: true });
    },
    enabled: !!trainer?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: recentWorkoutLogs = [], isLoading: workoutLogsLoading } = useQuery({
    queryKey: ['recentWorkoutLogs', assignments],
    queryFn: () => base44.entities.WorkoutLog.list('-completed_date', 100),
    enabled: !!trainer?.id && assignments.length > 0,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: recentCalorieLogs = [], isLoading: calorieLogsLoading } = useQuery({
    queryKey: ['recentCalorieLogs', assignments],
    queryFn: () => base44.entities.CalorieLog.list('-created_date', 100),
    enabled: !!trainer?.id && assignments.length > 0,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Stats data is now used directly in the JSX

  const getClientWeeklyWorkouts = (clientId) => {
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);
    const workoutDates = new Set();
    recentWorkoutLogs.filter(log => 
      log.logged_by_client_id === clientId && 
      new Date(log.completed_date) >= thisWeekStart
    ).forEach(log => workoutDates.add(log.completed_date));
    return workoutDates.size;
  };

  // Calculate compliance metrics
  const calculateCompliance = () => {
    const clientIds = assignments.map(a => a.client_id);
    if (clientIds.length === 0) return { workout: 0, nutrition: 0, tracking: 0 };

    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let workoutCompliant = 0;
    let nutritionCompliant = 0;
    let trackingCompliant = 0;

    clientIds.forEach(clientId => {
      const client = clients.find(c => c.id === clientId);
      
      // Workout compliance: has logged at least 3 workouts in last 7 days
      const clientWorkouts = recentWorkoutLogs.filter(log => 
        log.logged_by_client_id === clientId &&
        new Date(log.completed_date) >= sevenDaysAgo
      );
      const uniqueWorkoutDays = new Set(clientWorkouts.map(w => w.completed_date)).size;
      if (uniqueWorkoutDays >= 3) workoutCompliant++;

      // Nutrition compliance: average calories within 1000 of target
      const calorieTarget = client?.daily_calorie_target || 2200;
      const clientCalorieLogs = recentCalorieLogs.filter(log =>
        log.logged_by_client_id === clientId &&
        new Date(log.date) >= sevenDaysAgo
      );
      
      const dailyCalories = {};
      clientCalorieLogs.forEach(log => {
        if (!dailyCalories[log.date]) dailyCalories[log.date] = 0;
        dailyCalories[log.date] += log.calories || 0;
      });
      
      const avgCalories = Object.keys(dailyCalories).length > 0
        ? Object.values(dailyCalories).reduce((sum, cal) => sum + cal, 0) / Object.keys(dailyCalories).length
        : 0;
      
      if (avgCalories > 0 && Math.abs(avgCalories - calorieTarget) <= 1000) {
        nutritionCompliant++;
      }

      // Tracking compliance: has logged something in last 7 days
      const hasRecentActivity = clientWorkouts.length > 0 || clientCalorieLogs.length > 0;
      if (hasRecentActivity) trackingCompliant++;
    });

    return {
      workout: clientIds.length > 0 ? Math.round((workoutCompliant / clientIds.length) * 100) : 0,
      nutrition: clientIds.length > 0 ? Math.round((nutritionCompliant / clientIds.length) * 100) : 0,
      tracking: clientIds.length > 0 ? Math.round((trackingCompliant / clientIds.length) * 100) : 0,
    };
  };

  // Identify clients requiring attention
  const getClientsRequiringAttention = () => {
    const clientIds = assignments.map(a => a.client_id);
    const attention = [];

    clientIds.forEach(clientId => {
      const client = clients.find(c => c.id === clientId);
      if (!client) return;

      const reasons = [];
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Check for missed workouts (no workout logs in last 7 days but has assigned plans)
      const clientPlans = allWorkoutPlans.filter(p => p.assigned_to_client_id === clientId);
      const recentWorkouts = recentWorkoutLogs.filter(log =>
        log.logged_by_client_id === clientId &&
        new Date(log.completed_date) >= sevenDaysAgo
      );
      
      if (clientPlans.length > 0 && recentWorkouts.length === 0) {
        reasons.push('No workouts logged in 7+ days');
      }

      // Check calorie adherence
      const calorieTarget = client.daily_calorie_target || 2200;
      const clientCalorieLogs = recentCalorieLogs.filter(log =>
        log.logged_by_client_id === clientId &&
        new Date(log.date) >= sevenDaysAgo
      );

      const dailyCalories = {};
      clientCalorieLogs.forEach(log => {
        if (!dailyCalories[log.date]) dailyCalories[log.date] = 0;
        dailyCalories[log.date] += log.calories || 0;
      });

      if (Object.keys(dailyCalories).length >= 7) {
        const avgCalories = Object.values(dailyCalories).reduce((sum, cal) => sum + cal, 0) / Object.keys(dailyCalories).length;
        if (Math.abs(avgCalories - calorieTarget) > 1000) {
          const diff = avgCalories - calorieTarget;
          reasons.push(`${diff > 0 ? 'Over' : 'Under'} by ${Math.abs(Math.round(diff))} cal/day`);
        }
      }

      // Check for no logging activity
      if (recentWorkouts.length === 0 && clientCalorieLogs.length === 0) {
        reasons.push('Not tracking at all');
      }

      if (reasons.length > 0) {
        attention.push({
          client,
          reasons
        });
      }
    });

    return attention;
  };

  const compliance = calculateCompliance();
  const clientsNeedingAttention = getClientsRequiringAttention();

  // Calculate individual client compliance scores for leaderboard
  const getClientComplianceScore = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return 0;

    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Workout compliance (50%): 3+ workouts = 100%
    const clientWorkouts = recentWorkoutLogs.filter(log => 
      log.logged_by_client_id === clientId &&
      new Date(log.completed_date) >= sevenDaysAgo
    );
    const uniqueWorkoutDays = new Set(clientWorkouts.map(w => w.completed_date)).size;
    const workoutScore = Math.min((uniqueWorkoutDays / 3) * 100, 100);

    // Nutrition compliance (30%): within 1000 cal of target = 100%
    const calorieTarget = client.daily_calorie_target || 2200;
    const clientCalorieLogs = recentCalorieLogs.filter(log =>
      log.logged_by_client_id === clientId &&
      new Date(log.date) >= sevenDaysAgo
    );
    
    const dailyCalories = {};
    clientCalorieLogs.forEach(log => {
      if (!dailyCalories[log.date]) dailyCalories[log.date] = 0;
      dailyCalories[log.date] += log.calories || 0;
    });
    
    const avgCalories = Object.keys(dailyCalories).length > 0
      ? Object.values(dailyCalories).reduce((sum, cal) => sum + cal, 0) / Object.keys(dailyCalories).length
      : 0;
    
    let nutritionScore = 0;
    if (avgCalories > 0) {
      const deviation = Math.abs(avgCalories - calorieTarget);
      nutritionScore = Math.max(0, 100 - (deviation / 1000) * 100);
    }

    // Logging consistency (20%): 7 days logged = 100%
    const totalLogsThisWeek = clientWorkouts.length + clientCalorieLogs.length;
    const loggingScore = Math.min((totalLogsThisWeek / 7) * 100, 100);

    return Math.round((workoutScore * 0.5) + (nutritionScore * 0.3) + (loggingScore * 0.2));
  };

  // Build leaderboard
  const clientLeaderboard = clients.map(client => ({
    client,
    score: getClientComplianceScore(client.id)
  })).sort((a, b) => b.score - a.score);

  // Overall trainer score (average of all clients)
  const overallTrainerScore = clientLeaderboard.length > 0
    ? Math.round(clientLeaderboard.reduce((sum, item) => sum + item.score, 0) / clientLeaderboard.length)
    : 0;

  // Combine and sort workout completions and meal logs
  const getRecentActivity = () => {
    const clientIds = assignments.map(a => a.client_id);
    
    // Group workout logs by client and date to count as single workout completion
    const workoutCompletions = {};
    recentWorkoutLogs.forEach(log => {
      if (clientIds.includes(log.logged_by_client_id)) {
        const key = `${log.logged_by_client_id}_${log.completed_date}`;
        if (!workoutCompletions[key]) {
          workoutCompletions[key] = {
            type: 'workout',
            clientId: log.logged_by_client_id,
            date: log.completed_date,
            exerciseCount: 1
          };
        } else {
          workoutCompletions[key].exerciseCount++;
        }
      }
    });

    // Get meal logs
    const mealLogs = recentCalorieLogs
      .filter(log => clientIds.includes(log.logged_by_client_id))
      .map(log => ({
        type: 'meal',
        clientId: log.logged_by_client_id,
        date: log.date,
        mealName: log.meal_name,
        calories: log.calories,
        created: log.created_date
      }));

    // Combine and sort by date
    const activities = [
      ...Object.values(workoutCompletions),
      ...mealLogs
    ].sort((a, b) => {
      const dateA = new Date(a.created || a.date);
      const dateB = new Date(b.created || b.date);
      return dateB - dateA;
    });

    return activities.slice(0, 10);
  };

  const isLoading = assignmentsLoading || plansLoading || nutritionLoading || goalsLoading || clientsLoading || workoutLogsLoading || calorieLogsLoading;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* Active Clients Card */}
      <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-5 h-5 text-[#0ea5e9]" />
            </div>
            <h3 className="font-semibold text-gray-900">Active Clients</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ACTIVE CLIENTS</span>
            <span className="text-5xl font-bold text-[#0ea5e9]">{assignments.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to={createPageUrl("TrainerAssignClients")}>
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-6 text-white shadow-md hover:shadow-lg transition-all cursor-pointer h-full">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-1">Assign New Clients</h4>
                  <p className="text-teal-100 text-sm">Take on new clients to train</p>
                </div>
              </div>
            </div>
          </Link>

          <Link to={createPageUrl("TrainerClients")}>
            <div className="bg-gradient-to-r from-blue-500 to-[#0ea5e9] rounded-xl p-6 text-white shadow-md hover:shadow-lg transition-all cursor-pointer h-full">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-1">Manage Clients</h4>
                  <p className="text-blue-100 text-sm">View and update client programs</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Compliance Leaderboard (Left - 5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <h3 className="text-lg font-bold text-gray-900">Compliance Leaderboard</h3>
          <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-0">
              {/* Overall Score */}
              <div className="p-6 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">YOUR OVERALL SCORE</p>
                  <p className="text-xs text-gray-500 mt-1">Average of all {clientLeaderboard.length} clients</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-sm ${
                  overallTrainerScore >= 80 ? 'bg-[#0ea5e9]' :
                  overallTrainerScore >= 50 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}>
                  {overallTrainerScore}
                </div>
              </div>

              {/* Client List */}
              <div className="max-h-[400px] overflow-y-auto">
                {assignments.length > 0 ? (
                  clientLeaderboard.map((item, index) => (
                    <Link key={item.client.id} to={`${createPageUrl('TrainerClientDetail')}?clientId=${item.client.id}`}>
                      <div className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                          #{index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 text-sm">{item.client.display_name || item.client.full_name || 'Client'}</p>
                          <p className="text-xs text-gray-500">{item.client.email}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          item.score >= 80 ? 'bg-[#0ea5e9] text-white' :
                          item.score >= 50 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {item.score}%
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    No active clients
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Clients Requiring Attention */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Clients Requiring Attention</h3>
            <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden">
              <CardContent className="p-0">
                {clientsNeedingAttention.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {clientsNeedingAttention.map(({ client, reasons }) => (
                      <Link key={client.id} to={`${createPageUrl('TrainerClientDetail')}?clientId=${client.id}`}>
                        <div className="p-6 hover:bg-red-50/30 transition-colors cursor-pointer flex items-center gap-4">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
                              {client.full_name?.charAt(0) || 'C'}
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900">{client.display_name || client.full_name}</h4>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {reasons.map((reason, idx) => (
                                <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  {reason}
                                </span>
                              ))}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                            View Profile
                          </Button>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center bg-blue-50/30">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <div className="w-8 h-8 text-[#0ea5e9]">🔔</div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">All clients on track!</h3>
                    <p className="text-gray-500">No clients need attention right now.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Compliance Analytics (Right - 7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <h3 className="text-lg font-bold text-gray-900">Compliance Analytics</h3>
          <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden h-full">
            <CardContent className="p-6">
              {assignments.length > 0 ? (
                <>
                  <div className="h-[250px] w-full mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { metric: 'Workouts', value: compliance.workout, color: '#e2e8f0', activeColor: '#9333ea' },
                        { metric: 'Nutrition', value: compliance.nutrition, color: '#e2e8f0', activeColor: '#14b8a6' },
                        { metric: 'Tracking', value: compliance.tracking, color: '#e2e8f0', activeColor: '#0ea5e9' }
                      ]} barSize={60}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <YAxis hide domain={[0, 100]} />
                        <XAxis dataKey="metric" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                        <Tooltip 
                          cursor={{fill: 'transparent'}}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {[
                              { color: '#9333ea' }, // Workouts - Purple
                              { color: '#14b8a6' }, // Nutrition - Teal
                              { color: '#0ea5e9' }  // Tracking - Blue
                          ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Dumbbell className="w-4 h-4 text-gray-500" />
                        <span className="text-xs font-bold text-gray-500 uppercase">Workouts</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{compliance.workout}%</p>
                      <p className="text-xs text-gray-500">3+ per week</p>
                    </div>
                    <div className="p-4 bg-teal-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <UtensilsCrossed className="w-4 h-4 text-teal-600" />
                        <span className="text-xs font-bold text-teal-600 uppercase">Nutrition</span>
                      </div>
                      <p className="text-2xl font-bold text-teal-600">{compliance.nutrition}%</p>
                      <p className="text-xs text-teal-600/80">Within target</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-blue-600 uppercase">Tracking</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{compliance.tracking}%</p>
                      <p className="text-xs text-blue-600/80">Daily logs</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 min-h-[300px]">
                  <BarChartIcon className="w-12 h-12 mb-2 opacity-20" />
                  <p>No data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Calendar Section */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Session Calendar</h3>
        <SessionCalendar trainerId={trainer?.id} clients={clients} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* My Clients */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">My Clients</h3>
            <Link to={createPageUrl("TrainerClients")} className="text-sm font-semibold text-[#0ea5e9] flex items-center">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {clients.slice(0, 5).map(client => (
                  <Link key={client.id} to={`${createPageUrl('TrainerClientDetail')}?clientId=${client.id}`}>
                    <div className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {client.profile_photo_url ? (
                          <img src={client.profile_photo_url} alt={client.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-sm">{client.display_name || client.full_name || 'Client'}</p>
                        <p className="text-xs text-gray-500">{client.email}</p>
                      </div>
                      <div className="bg-[#0ea5e9] text-white text-xs font-bold px-3 py-1 rounded-full">
                        {getClientComplianceScore(client.id)}%
                      </div>
                    </div>
                  </Link>
                ))}
                {clients.length === 0 && (
                  <div className="p-6 text-center text-gray-500 text-sm">No clients assigned yet</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Client Activity</h3>
          <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {getRecentActivity().length > 0 ? (
                  getRecentActivity().slice(0, 5).map((activity, idx) => {
                    const client = clients.find(c => c.id === activity.clientId);
                    return (
                      <div key={idx} className="p-4 flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {client?.profile_photo_url ? (
                            <img src={client.profile_photo_url} alt={client.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className="font-bold text-gray-900 text-sm">{client?.display_name || client?.full_name || 'Client'}</p>
                            <span className="text-xs text-gray-400">{format(new Date(activity.date), 'MMM d')}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-0.5">
                            {activity.type === 'workout' 
                              ? `Completed workout (${activity.exerciseCount} exercises)`
                              : `Logged ${activity.mealName} (${activity.calories} cal)`
                            }
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-gray-500 text-sm">No recent activity</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}