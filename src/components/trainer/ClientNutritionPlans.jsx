import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Flame, Calendar, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import NutritionPlanForm from "./NutritionPlanForm";
import { updateClientCalorieGoal } from "@/functions/updateClientCalorieGoal";

export default function ClientNutritionPlans({ clientId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editingCalorieGoal, setEditingCalorieGoal] = useState(false);
  const [calorieGoal, setCalorieGoal] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ id: clientId });
      return users[0] || null;
    },
    enabled: !!clientId,
  });

  const { data: nutritionPlans, isLoading } = useQuery({
    queryKey: ['clientNutritionPlans', clientId],
    queryFn: () => base44.entities.NutritionPlan.filter({ assigned_to_client_id: clientId }, 'order'),
    initialData: [],
    enabled: !!clientId,
  });

  const deletePlanMutation = useMutation({
    mutationFn: (planId) => base44.entities.NutritionPlan.delete(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientNutritionPlans'] });
    },
  });

  const updateCalorieGoalMutation = useMutation({
    mutationFn: (calorieTarget) => base44.entities.User.update(clientId, { daily_calorie_target: calorieTarget }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client'] });
      setEditingCalorieGoal(false);
      setCalorieGoal("");
    },
  });

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setShowForm(true);
  };

  const handleDelete = async (planId) => {
    if (confirm('Are you sure you want to delete this meal?')) {
      await deletePlanMutation.mutateAsync(planId);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingPlan(null);
  };

  const handleSaveCalorieGoal = async () => {
    const target = parseInt(calorieGoal);
    if (!target || target <= 0) {
      alert("Please enter a valid calorie goal");
      return;
    }
    await updateCalorieGoalMutation.mutateAsync(target);
  };

  const handleEditCalorieGoal = () => {
    setCalorieGoal(client?.daily_calorie_target?.toString() || "");
    setEditingCalorieGoal(true);
  };

  // The todayDate variable was in the outline but not used in the display logic.
  // If it was meant to filter the plans by date, the queryFn would need adjustment.
  // For now, based on the outline, we just slice the existing plans.
  // const todayDate = new Date().toISOString().split('T')[0];

  const totalCalories = nutritionPlans.reduce((sum, plan) => sum + (plan.calories || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-black italic text-[#1a1a1a] text-lg">NUTRITION PLAN</h3>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold italic glow-blue"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Meal
        </Button>
      </div>

      {/* Daily Calorie Goal */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              <span className="font-bold text-sm text-gray-700">Daily Calorie Goal</span>
            </div>
            {editingCalorieGoal ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={calorieGoal}
                  onChange={(e) => setCalorieGoal(e.target.value)}
                  placeholder="2200"
                  className="w-24 h-8 text-right"
                  min="0"
                />
                <Button
                  size="sm"
                  onClick={handleSaveCalorieGoal}
                  disabled={updateCalorieGoalMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white h-8"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingCalorieGoal(false)}
                  className="h-8"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black italic text-green-600">
                  {client?.daily_calorie_target || "Not Set"}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleEditCalorieGoal}
                  className="text-green-600 hover:text-green-700"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Today's Meal Prep Highlight */}
      <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300">
        <CardContent className="p-4">
          <h4 className="font-black italic text-orange-800 mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            TODAY'S MEAL PREP
          </h4>
          {nutritionPlans.length > 0 ? (
            <div className="space-y-2">
              {nutritionPlans.slice(0, 3).map(plan => (
                <div key={plan.id} className="bg-white p-3 rounded border-l-4 border-orange-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm text-gray-800">{plan.meal_name}</p>
                      {plan.meal_time && (
                        <p className="text-xs text-gray-500">{plan.meal_time}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 bg-orange-500 px-2 py-1 rounded-full">
                      <Flame className="w-3 h-3 text-white" />
                      <span className="text-xs font-bold text-white">{plan.calories}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600 italic">No meal plan created yet</p>
          )}
        </CardContent>
      </Card>

      {/* Total Calories Card */}
      {totalCalories > 0 && (
        <Card className="bg-gradient-to-r from-[#0ea5e9]/10 to-[#0284c7]/10 border border-[#0ea5e9]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#0ea5e9]" />
                <span className="text-sm text-gray-600 font-bold">Total Daily Calories</span>
              </div>
              <span className="text-2xl font-black italic text-[#0ea5e9]">{totalCalories}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <NutritionPlanForm
          clientId={clientId}
          trainerId={user?.id}
          existingPlan={editingPlan}
          onClose={handleFormClose}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-lg bg-gray-100" />)}
        </div>
      ) : nutritionPlans.length > 0 ? (
        <div className="space-y-3">
          {nutritionPlans.map(plan => (
            <Card key={plan.id} className="bg-white border-2 border-gray-200 hover:border-[#0ea5e9] transition-colors">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-black italic text-[#1a1a1a] text-lg">{plan.meal_name}</h4>
                      <div className="flex items-center gap-1 bg-[#0ea5e9] px-3 py-1 rounded-full">
                        <Flame className="w-4 h-4 text-white" />
                        <span className="text-sm font-black text-white italic">{plan.calories}</span>
                      </div>
                    </div>
                    {plan.meal_time && (
                      <p className="text-xs text-gray-500 font-semibold mb-2">{plan.meal_time}</p>
                    )}
                    <p className="text-sm text-gray-600 mb-3">{plan.description}</p>

                    <div className="flex gap-5 text-xs">
                      <div className="flex flex-col">
                        <span className="text-gray-500 font-bold uppercase">Protein</span>
                        <span className="font-black text-[#1a1a1a] italic text-lg">{plan.protein || 0}g</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 font-bold uppercase">Carbs</span>
                        <span className="font-black text-[#1a1a1a] italic text-lg">{plan.carbs || 0}g</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 font-bold uppercase">Fats</span>
                        <span className="font-black text-[#1a1a1a] italic text-lg">{plan.fats || 0}g</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(plan)}
                      className="text-gray-600 hover:text-[#0ea5e9]"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(plan.id)}
                      className="text-gray-600 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 italic">
          No meals added yet. Click "Add Meal" to create one.
        </div>
      )}
    </div>
  );
}