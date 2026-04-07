import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Search, TrendingUp, ChevronRight, Flame, Target, UtensilsCrossed, UserPlus, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, differenceInDays } from "date-fns";
import { getAvailableClients } from "@/functions/getAvailableClients";

export default function TrainerClients() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Use backend function to get clients (trainers can't list users directly)
  const { data: clientData, isLoading: clientDataLoading } = useQuery({
    queryKey: ['trainerClientsData', user?.id],
    queryFn: async () => {
      const response = await getAvailableClients();
      return response.data;
    },
    initialData: { clients: [], assignments: [] },
    enabled: !!user?.id,
  });

  // Filter assignments to only this trainer's active ones
  const assignments = (clientData.assignments || []).filter(a => a.trainer_id === user?.id && a.is_active);
  
  // Filter clients to only those assigned to this trainer
  const clientIds = assignments.map(a => a.client_id);
  const clients = (clientData.clients || []).filter(c => clientIds.includes(c.id));

  const { data: workoutLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['allWorkoutLogs', user?.id],
    queryFn: async () => {
      if (clientIds.length === 0) return [];
      const allLogs = await base44.entities.WorkoutLog.list('-completed_date', 1000);
      return allLogs.filter(log => clientIds.includes(log.logged_by_client_id));
    },
    initialData: [],
    enabled: !!user?.id && clientIds.length > 0,
  });

  const { data: calorieLogs, isLoading: calorieLogsLoading } = useQuery({
    queryKey: ['allCalorieLogs', user?.id],
    queryFn: async () => {
      if (clientIds.length === 0) return [];
      const allLogs = await base44.entities.CalorieLog.list('-date', 1000);
      return allLogs.filter(log => clientIds.includes(log.logged_by_client_id));
    },
    initialData: [],
    enabled: !!user?.id && clientIds.length > 0,
  });

  const { data: allGoals, isLoading: goalsLoading } = useQuery({
    queryKey: ['allClientGoals', user?.id],
    queryFn: async () => {
      if (clientIds.length === 0) return [];
      return await base44.entities.FitnessGoal.filter({ is_active: true });
    },
    initialData: [],
    enabled: !!user?.id && clientIds.length > 0,
  });

  const { data: allWorkoutPlans, isLoading: plansLoading } = useQuery({
    queryKey: ['allClientWorkoutPlans', user?.id],
    queryFn: async () => {
      return await base44.entities.WorkoutPlan.filter({ created_by_trainer_id: user.id });
    },
    initialData: [],
    enabled: !!user?.id,
  });

  const filteredClients = clients.filter(client => {
    const query = searchQuery.toLowerCase();
    return client.full_name?.toLowerCase().includes(query) || 
           client.email?.toLowerCase().includes(query);
  });

  const getClientStats = (clientId) => {
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);
    const weekStartStr = format(thisWeekStart, 'yyyy-MM-dd');
    
    const clientLogs = workoutLogs.filter(log => 
      log.logged_by_client_id === clientId && 
      log.completed_date >= weekStartStr
    );
    const activeGoals = allGoals.filter(g => g.assigned_to_client_id === clientId);
    const workoutPlans = allWorkoutPlans.filter(p => p.assigned_to_client_id === clientId);
    const assignment = assignments.find(a => a.client_id === clientId);
    
    // Calculate compliance score
    const client = clients.find(c => c.id === clientId);
    
    // Workout compliance (50%): 3+ workouts = 100%, scale down proportionally
    const uniqueWorkoutDays = new Set(clientLogs.map(log => log.completed_date)).size;
    const workoutScore = Math.min((uniqueWorkoutDays / 3) * 100, 100);
    
    // Nutrition compliance (30%): within 1000 cal of target = 100%
    const calorieTarget = client?.daily_calorie_target || 2200;
    const clientCalorieLogs = calorieLogs.filter(log =>
      log.logged_by_client_id === clientId &&
      log.date >= weekStartStr
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
      // 100% if within 1000 cal, scale down to 0% at 2000+ cal deviation
      nutritionScore = Math.max(0, 100 - (deviation / 1000) * 100);
    }
    
    // Logging consistency (20%): 7 days logged = 100%
    const totalLogsThisWeek = clientLogs.length + clientCalorieLogs.length;
    const loggingScore = Math.min((totalLogsThisWeek / 7) * 100, 100);
    
    // Overall compliance score (weighted)
    const complianceScore = Math.round(
      (workoutScore * 0.5) + (nutritionScore * 0.3) + (loggingScore * 0.2)
    );
    
    return {
      weeklyWorkouts: clientLogs.length,
      activeGoals: activeGoals.length,
      workoutPlans: workoutPlans.length,
      daysAssigned: assignment ? differenceInDays(new Date(), new Date(assignment.assigned_date)) : 0,
      complianceScore
    };
  };

  const isLoading = clientDataLoading || logsLoading || calorieLogsLoading || goalsLoading || plansLoading;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Clients</h1>
          <p className="text-sm text-gray-500 mt-1">{assignments.length} Active Clients</p>
        </div>
        <Link to={createPageUrl("TrainerAssignClients")}>
          <Button className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold shadow-sm rounded-lg">
            <UserPlus className="w-4 h-4 mr-2" />
            Assign Client
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white border-gray-200 focus:border-[#0ea5e9] h-12 rounded-xl text-base"
        />
      </div>

      {/* Clients List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl bg-gray-100" />)}
        </div>
      ) : filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredClients.map(client => {
            const stats = getClientStats(client.id);
            return (
              <Link key={client.id} to={createPageUrl('TrainerClientDetail')} state={{ clientId: client.id }}>
                <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all duration-200 rounded-xl overflow-hidden cursor-pointer group">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-5">
                      {/* Avatar */}
                      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:ring-4 group-hover:ring-blue-50 transition-all">
                        {client.profile_photo_url ? (
                          <img src={client.profile_photo_url} alt={client.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[#0ea5e9] font-bold text-xl">
                            {client.full_name?.charAt(0) || 'C'}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold text-gray-900 text-lg truncate pr-4">{client.full_name || 'Client'}</h3>
                          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                            stats.complianceScore >= 80 ? 'bg-green-100 text-green-700' :
                            stats.complianceScore >= 50 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {stats.complianceScore}% Score
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-500 mb-3 truncate">{client.email}</p>

                        {/* Quick Stats Row */}
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="font-medium">{stats.weeklyWorkouts} workouts/wk</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Target className="w-4 h-4 text-purple-500" />
                            <span className="font-medium">{stats.activeGoals} goals</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            <span className="font-medium">{stats.daysAssigned}d active</span>
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#0ea5e9] transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">
            {searchQuery ? "No Clients Found" : "No Clients Yet"}
          </h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            {searchQuery ? "Try adjusting your search terms" : "Start building your roster by assigning clients to your program."}
          </p>
          {!searchQuery && (
            <Link to={createPageUrl("TrainerAssignClients")}>
              <Button className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold shadow-sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Assign Your First Client
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}