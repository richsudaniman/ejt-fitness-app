import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import WeeklySchedule from "../components/workout/WeeklySchedule";
import ExerciseChecklist from "../components/workout/ExerciseChecklist";
import CustomWorkoutLogger from "../components/workout/CustomWorkoutLogger";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "../components/EmptyState";
import { Dumbbell } from "lucide-react";
import { format } from "date-fns";

export default function Workout() {
  const queryClient = useQueryClient();
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const [selectedDay, setSelectedDay] = useState(today);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      console.log('CLIENT USER ID IN WORKOUT PAGE:', userData?.id);
      console.log('CLIENT USER EMAIL:', userData?.email);
      return userData;
    },
    staleTime: 30 * 60 * 1000,
    cacheTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  const { data: workoutPlans, isLoading: plansLoading } = useQuery({
    queryKey: ['workoutPlans', user?.id],
    queryFn: async () => {
      console.log('FILTERING WORKOUT PLANS FOR CLIENT ID:', user.id);
      const plans = await base44.entities.WorkoutPlan.filter({ assigned_to_client_id: user.id }, 'order');
      console.log('FOUND WORKOUT PLANS:', plans.length, plans);
      return plans.sort((a, b) => {
        const orderA = daysOfWeek.indexOf(a.day_of_week);
        const orderB = daysOfWeek.indexOf(b.day_of_week);
        return orderA - orderB;
      });
    },
    initialData: [],
    enabled: !!user?.id,
    staleTime: 15 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: workoutLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['workoutLogs', user?.id],
    queryFn: () => base44.entities.WorkoutLog.filter({ logged_by_client_id: user.id }, '-completed_date'),
    initialData: [],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const logExerciseMutation = useMutation({
    mutationFn: (exerciseData) => base44.entities.WorkoutLog.create(exerciseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutLogs'] });
    },
  });

  const selectedWorkout = workoutPlans.find(plan => plan.day_of_week === selectedDay);
  
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const completedDays = new Set(
    workoutLogs
      .filter(log => log.completed_date === todayDate)
      .map(log => {
        const plan = workoutPlans.find(p => p.id === log.workout_plan_id);
        return plan?.day_of_week;
      })
      .filter(Boolean)
  );

  const handleExerciseComplete = async (exerciseName, weightUsed) => {
    if (!user?.id || !selectedWorkout) return;
    const exercise = selectedWorkout.exercises.find(e => e.name === exerciseName);
    
    await logExerciseMutation.mutateAsync({
      logged_by_client_id: user.id,
      workout_plan_id: selectedWorkout.id,
      exercise_name: exerciseName,
      completed_date: todayDate,
      sets_completed: exercise?.sets || 0,
      reps_completed: exercise?.reps || 0,
      weight_used: parseFloat(weightUsed) || 0
    });
  };

  const handleCustomLog = async (data) => {
    if (!user?.id) return;
    await logExerciseMutation.mutateAsync({
      logged_by_client_id: user.id,
      completed_date: todayDate,
      ...data
    });
  };

  const isLoading = plansLoading || logsLoading;

  return (
    <div className="p-5 space-y-5 relative overscroll-contain touch-pan-y">
      
      {isLoading ? (
        <>
          <Skeleton className="h-32 rounded-lg bg-gray-100" />
          <Skeleton className="h-96 rounded-lg bg-gray-100" />
        </>
      ) : workoutPlans.length === 0 ? (
        <>
          <EmptyState
            icon={Dumbbell}
            title="No Workout Plan Yet"
            description="Your trainer hasn't assigned you a workout plan yet. Check back soon or reach out to your trainer!"
            variant="info"
          />
          <CustomWorkoutLogger 
            onLogExercise={handleCustomLog} 
            todaysLogs={workoutLogs.filter(log => log.completed_date === todayDate)} 
          />
        </>
      ) : (
        <>
          <WeeklySchedule
            workoutPlans={workoutPlans}
            selectedDay={selectedDay}
            onDaySelect={setSelectedDay}
            completedDays={Array.from(completedDays)}
          />

          {selectedWorkout ? (
            <ExerciseChecklist
              exercises={selectedWorkout.exercises || []}
              workoutType={selectedWorkout.workout_type}
              onExerciseComplete={handleExerciseComplete}
              completedLogs={workoutLogs.filter(log => 
                log.workout_plan_id === selectedWorkout.id && 
                log.completed_date === todayDate
              )}
            />
          ) : (
            <EmptyState
              icon={Dumbbell}
              title="Rest Day"
              description={`No workout scheduled for ${selectedDay}. Take this time to recover and come back stronger!`}
              variant="success"
            />
          )}

          {/* Only show custom logger if selected day is today */}
          {selectedDay === today && (
            <CustomWorkoutLogger 
              onLogExercise={handleCustomLog} 
              todaysLogs={workoutLogs.filter(log => log.completed_date === todayDate)} 
            />
          )}
        </>
      )}
    </div>
  );
}