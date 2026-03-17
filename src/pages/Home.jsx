import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import TrainerCard from "../components/home/TrainerCard";
import DailyProgressBar from "../components/home/DailyProgressBar";
import QuickStatsGrid from "../components/home/QuickStatsGrid";
import MotivationalMessage from "../components/home/MotivationalMessage";
import TodayWorkoutPreview from "../components/home/TodayWorkoutPreview";
import NutritionSummary from "../components/home/NutritionSummary";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Calendar, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { getMyTrainer } from "@/functions/getMyTrainer";

export default function Home() {
  const queryClient = useQueryClient();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const [selectedDay, setSelectedDay] = useState(today);

  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      return await base44.auth.me();
    },
    staleTime: 0, // CHANGED: Always consider data stale to allow refetch
    refetchOnMount: true, // ADDED: Refetch when component mounts
    refetchOnWindowFocus: true, // CHANGED: Refetch when window regains focus
    retry: 2,
  });

  // ADDED: Force invalidate all queries on mount to clear stale cache
  useEffect(() => {
    console.log('Home page mounted - invalidating all queries to force fresh data');
    queryClient.invalidateQueries();
  }, [queryClient]);

  // REMOVED: Auto-sync mechanism that was calling User.list() and TrainerClientAssignment.list()
  // which clients don't have permission to access. Trainer assignment is now handled by admin/trainer.

    // Fetch trainer details using backend function
  const { data: trainer, isLoading: trainerLoading } = useQuery({
    queryKey: ['myTrainer', user?.assigned_trainer_id],
    queryFn: async () => {
      if (!user?.assigned_trainer_id) return null;
      const { data } = await getMyTrainer();
      return data?.trainer || null;
    },
    enabled: !!user?.assigned_trainer_id,
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });

  const { data: workoutPlans, isLoading: workoutsLoading } = useQuery({
    queryKey: ['workoutPlans', user?.id],
    queryFn: async () => {
      return await base44.entities.WorkoutPlan.filter({ assigned_to_client_id: user.id }, 'order');
    },
    initialData: [],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: workoutLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['workoutLogs', user?.id],
    queryFn: async () => {
      return await base44.entities.WorkoutLog.filter({ logged_by_client_id: user.id }, '-completed_date');
    },
    initialData: [],
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: calorieLogs, isLoading: calorieLogsLoading } = useQuery({
    queryKey: ['calorieLogs', user?.id],
    queryFn: async () => {
      return await base44.entities.CalorieLog.filter({ logged_by_client_id: user.id }, '-created_date');
    },
    initialData: [],
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: motivations } = useQuery({
    queryKey: ['motivations', user?.id],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return await base44.entities.DailyMotivation.filter({
        sent_to_client_id: user.id,
        date: today,
        is_active: true
      });
    },
    initialData: [],
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: upcomingSessions } = useQuery({
    queryKey: ['upcomingSessions', user?.id],
    queryFn: async () => {
      const sessions = await base44.entities.ScheduledSession.filter({
        client_id: user.id,
        status: 'scheduled'
      });
      // Filter for future dates only and sort
      const now = new Date();
      return sessions
        .filter(s => new Date(s.start_time) > now)
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    },
    initialData: [],
    enabled: !!user?.id,
    refetchInterval: 60000 // Refresh every minute
  });

  const nextSession = upcomingSessions[0];

  // Don't fetch goals on home page - not critical
  const goals = [];

  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const todayWorkout = workoutPlans.find(plan => plan.day_of_week === today);

  // Calculate today's tasks
  const todayExercises = todayWorkout?.exercises?.length || 0;
  const todayCompletedExercises = workoutLogs.filter(log =>
    log.completed_date === todayDate && log.workout_plan_id === todayWorkout?.id
  ).length;
  const todayCaloriesLogged = calorieLogs.filter(log => log.date === todayDate).length > 0 ? 1 : 0;
  const totalTasks = todayExercises + 1;
  const completedTasks = todayCompletedExercises + todayCaloriesLogged;

  // Calculate stats
  const thisWeekLogs = workoutLogs.filter(log => {
    const logDate = new Date(log.completed_date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return logDate >= weekAgo;
  });

  const todayCalories = calorieLogs
    .filter(log => log.date === todayDate)
    .reduce((sum, log) => sum + (log.calories || 0), 0);

  const todayMacros = calorieLogs
    .filter(log => log.date === todayDate)
    .reduce((acc, log) => ({
      protein: acc.protein + (log.protein || 0),
      carbs: acc.carbs + (log.carbs || 0),
      fats: acc.fats + (log.fats || 0),
    }), { protein: 0, carbs: 0, fats: 0 });

  const stats = {
    protein: todayMacros.protein,
    proteinGoal: user?.daily_protein_target || 150,
    calories: todayCalories,
    calorieGoal: user?.daily_calorie_target || 2200,
    workoutsThisWeek: thisWeekLogs.length,
    currentStreak: 5,
  };

  const isLoading = userLoading || workoutsLoading || logsLoading;

  // Show error message if network fails
  if (userError) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-[#1a1a1a] mb-2">Connection Error</h2>
          <p className="text-gray-600 text-center mb-4 max-w-sm">
            Unable to connect to the server. Please check your internet connection and try again.
          </p>
          <Button 
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['currentUser'] });
              window.location.reload();
            }}
            className="bg-[#0ea5e9] text-white font-bold"
          >
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5 relative overscroll-contain touch-pan-y">
      {/* Trainer Card */}
      {trainerLoading ? (
        <Skeleton className="h-24 rounded-lg bg-gray-100" />
      ) : (
        <TrainerCard trainer={trainer} clientName={user?.display_name || user?.full_name} />
      )}

      {/* Next Session Card */}
      {nextSession && (
        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 border-none shadow-md text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Calendar className="w-24 h-24" />
          </div>
          <CardContent className="p-5 relative z-10">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Next Session</p>
                <h3 className="text-xl font-bold text-white mb-1">
                  {format(new Date(nextSession.start_time), 'EEEE, MMM do')}
                </h3>
                <div className="flex items-center gap-2 text-blue-50 text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  {format(new Date(nextSession.start_time), 'h:mm a')} ({nextSession.duration_minutes} min)
                </div>
                {nextSession.notes && (
                  <p className="mt-3 text-sm text-blue-50 bg-black/10 p-2 rounded-lg border border-white/10">
                    "{nextSession.notes}"
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Progress Bar */}
      {isLoading ? (
        <Skeleton className="h-32 rounded-lg bg-gray-100" />
      ) : (
        <DailyProgressBar completedTasks={completedTasks} totalTasks={totalTasks} />
      )}

      {/* Quick Stats Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-lg bg-gray-100" />)}
        </div>
      ) : (
        <QuickStatsGrid stats={stats} />
      )}

      {/* Motivational Message */}
      <MotivationalMessage message={motivations?.[0]?.message} />

      {/* Today's Workout */}
      {isLoading ? (
        <Skeleton className="h-64 rounded-lg bg-gray-100" />
      ) : (
        <TodayWorkoutPreview workout={todayWorkout} />
      )}

      {/* Nutrition Summary */}
      {calorieLogsLoading ? (
        <Skeleton className="h-56 rounded-lg bg-gray-100" />
      ) : (
        <NutritionSummary
          caloriesConsumed={todayCalories}
          calorieGoal={user?.daily_calorie_target || 2200}
          macros={todayMacros}
        />
      )}
    </div>
  );
}