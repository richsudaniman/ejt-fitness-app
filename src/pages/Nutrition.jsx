import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MealPlanCard from "../components/nutrition/MealPlanCard";
import CalorieTracker from "../components/nutrition/CalorieTracker";
import FoodPhotoAnalyzer from "../components/nutrition/FoodPhotoAnalyzer";
import NutritionAnalytics from "../components/nutrition/NutritionAnalytics";
import DailyCheckIn from "../components/nutrition/DailyCheckIn";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "../components/EmptyState";
import { UtensilsCrossed } from "lucide-react";
import { format } from "date-fns";

export default function Nutrition() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      console.log('CLIENT USER ID IN NUTRITION PAGE:', userData?.id);
      console.log('CLIENT USER EMAIL:', userData?.email);
      return userData;
    },
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: meals = [], isLoading: mealsLoading } = useQuery({
    queryKey: ['meals', user?.id],
    queryFn: async () => {
      console.log('FILTERING NUTRITION PLANS FOR CLIENT ID:', user.id);
      const plans = await base44.entities.NutritionPlan.filter({ assigned_to_client_id: user.id }, 'order');
      console.log('FOUND NUTRITION PLANS:', plans.length, plans);
      return plans;
    },
    enabled: !!user?.id,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: calorieLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['calorieLogs', user?.id],
    queryFn: async () => {
      const logs = await base44.entities.CalorieLog.filter({ logged_by_client_id: user.id }, '-date', 500);
      // Double check filter on client side to ensure data privacy
      return logs.filter(log => log.logged_by_client_id === user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const todayDate = format(new Date(), 'yyyy-MM-dd');

  const { data: dailyStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['dailyNutritionStatus', user?.id, todayDate],
    queryFn: async () => {
      const statuses = await base44.entities.DailyNutritionStatus.filter({ 
        client_id: user.id,
        date: todayDate
      });
      return statuses[0] || null;
    },
    enabled: !!user?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status) => {
      if (dailyStatus) {
        return base44.entities.DailyNutritionStatus.update(dailyStatus.id, { status });
      } else {
        return base44.entities.DailyNutritionStatus.create({
          client_id: user.id,
          date: todayDate,
          status,
          is_manual: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyNutritionStatus'] });
      // Also invalidate analytics/progress if needed
    },
  });

  const addLogMutation = useMutation({
    mutationFn: (logData) => base44.entities.CalorieLog.create({
      ...logData,
      logged_by_client_id: user.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calorieLogs'] });
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: (logId) => base44.entities.CalorieLog.delete(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calorieLogs'] });
    },
  });

  const isLoading = mealsLoading || logsLoading;

  return (
    <div className="p-5 space-y-5 relative overscroll-contain touch-pan-y">
      <div className="absolute top-5 left-5 w-16 h-16 border-2 border-gray-200" style={{clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)'}}></div>
      
      {isLoading ? (
        <>
          <Skeleton className="h-96 rounded-lg bg-gray-100" />
          <Skeleton className="h-96 rounded-lg bg-gray-100" />
        </>
      ) : (
        <>
          {meals.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="No Meal Plan Yet"
              description="Your trainer hasn't created a nutrition plan for you yet. Check back soon!"
              variant="info"
            />
          ) : (
            <MealPlanCard meals={meals} />
          )}
          
          <DailyCheckIn 
            currentStatus={dailyStatus?.status}
            onStatusUpdate={(status) => updateStatusMutation.mutate(status)}
            isLoading={updateStatusMutation.isPending || statusLoading}
          />

          <FoodPhotoAnalyzer 
            onFoodAnalyzed={(data) => addLogMutation.mutate(data)}
          />
          
          <NutritionAnalytics 
            logs={calorieLogs}
            dailyTarget={user?.daily_calorie_target || 2200}
          />
          
          <CalorieTracker
            logs={calorieLogs}
            onAddLog={(data) => addLogMutation.mutate(data)}
            onDeleteLog={(id) => deleteLogMutation.mutate(id)}
            dailyTarget={user?.daily_calorie_target || 2200}
          />
        </>
      )}
    </div>
  );
}