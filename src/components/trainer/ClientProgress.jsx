import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Calendar, Dumbbell, UtensilsCrossed, Camera, Flame, Award, Activity, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

export default function ClientProgress({ clientId }) {
  const [selectedMetricType, setSelectedMetricType] = useState("weight");

  const { data: workoutLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['clientWorkoutLogs', clientId],
    queryFn: () => base44.entities.WorkoutLog.filter({ logged_by_client_id: clientId }, '-completed_date'),
    initialData: [],
    enabled: !!clientId,
  });

  const { data: calorieLogs, isLoading: calorieLogsLoading } = useQuery({
    queryKey: ['clientCalorieLogs', clientId],
    queryFn: () => base44.entities.CalorieLog.filter({ logged_by_client_id: clientId }, '-date'),
    initialData: [],
    enabled: !!clientId,
  });

  const { data: progressPhotos, isLoading: photosLoading } = useQuery({
    queryKey: ['clientProgressPhotos', clientId],
    queryFn: () => base44.entities.ProgressPhoto.filter({ client_id: clientId }, '-date'),
    initialData: [],
    enabled: !!clientId,
  });

  const { data: progressMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['clientProgressMetrics', clientId],
    queryFn: () => base44.entities.ProgressMetric.filter({ client_id: clientId }, '-date'),
    initialData: [],
    enabled: !!clientId,
  });

  // Calculate dashboard metrics
  const calculateDashboardMetrics = () => {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    const sevenDaysAgo = subDays(today, 7);
    const thirtyDaysAgoStr = format(thirtyDaysAgo, 'yyyy-MM-dd');
    const sevenDaysAgoStr = format(sevenDaysAgo, 'yyyy-MM-dd');

    // Workout consistency (last 30 days)
    const recentWorkouts = workoutLogs.filter(log => 
      log.completed_date >= thirtyDaysAgoStr
    );
    const uniqueWorkoutDays = new Set(recentWorkouts.map(log => log.completed_date)).size;
    const workoutConsistency = Math.round((uniqueWorkoutDays / 30) * 100);

    // Current streak
    let currentStreak = 0;
    const sortedDates = [...new Set(workoutLogs.map(log => log.completed_date))].sort().reverse();
    
    let checkDate = new Date();
    checkDate.setHours(0,0,0,0);
    for (const dateStr of sortedDates) {
      const logDate = new Date(dateStr + "T00:00:00");
      const daysDiff = Math.floor((checkDate - logDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 1) {
        currentStreak++;
        checkDate = logDate;
      } else {
        break;
      }
    }

    // Nutrition adherence (days logged in last 7 days)
    const recentCalorieLogs = calorieLogs.filter(log => 
      log.date >= sevenDaysAgoStr
    );
    const uniqueCalorieDays = new Set(recentCalorieLogs.map(log => log.date)).size;
    const nutritionAdherence = Math.round((uniqueCalorieDays / 7) * 100);

    // Weight progress
    const weightMetrics = progressMetrics
      .filter(m => m.metric_type === 'weight')
      .sort((a, b) => a.date.localeCompare(b.date));
    
    const weightChange = weightMetrics.length >= 2 
      ? (weightMetrics[weightMetrics.length - 1].value - weightMetrics[0].value).toFixed(1)
      : 0;

    // Strength progress
    const strengthMetrics = progressMetrics.filter(m => 
      ['max_bench', 'max_squat', 'max_deadlift'].includes(m.metric_type)
    );
    
    const latestStrength = {};
    strengthMetrics.forEach(m => {
      if (!latestStrength[m.metric_type] || m.date > latestStrength[m.metric_type].date) {
        latestStrength[m.metric_type] = m;
      }
    });
    
    const totalStrength = Object.values(latestStrength).reduce((sum, m) => sum + m.value, 0);

    return {
      workoutConsistency,
      currentStreak,
      nutritionAdherence,
      weightChange,
      totalStrength,
      totalWorkouts: recentWorkouts.length,
    };
  };

  // Get weekly workout data for chart
  const getWeeklyWorkoutData = () => {
    const last8Weeks = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(new Date(), i * 7));
      const weekEnd = endOfWeek(weekStart);
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
      
      const workoutsInWeek = workoutLogs.filter(log => {
        return log.completed_date >= weekStartStr && log.completed_date <= weekEndStr;
      }).length;

      last8Weeks.push({
        week: format(weekStart, 'MMM d'),
        workouts: workoutsInWeek,
      });
    }
    return last8Weeks;
  };

  const getChartData = (metricType) => {
    return progressMetrics
      .filter(m => m.metric_type === metricType)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(m => ({
        date: format(new Date(m.date + "T00:00:00"), 'MMM d'),
        value: m.value
      }));
  };

  const metricTypes = [
    { value: "weight", label: "Weight" },
    { value: "body_fat", label: "Body Fat %" },
    { value: "muscle_mass", label: "Muscle Mass" },
    { value: "max_bench", label: "Max Bench" },
    { value: "max_squat", label: "Max Squat" },
    { value: "max_deadlift", label: "Max Deadlift" },
  ];

  const isLoading = logsLoading || calorieLogsLoading || metricsLoading || photosLoading;
  const dashboardMetrics = !isLoading ? calculateDashboardMetrics() : null;
  const weeklyWorkoutData = !isLoading ? getWeeklyWorkoutData() : [];

  return (
    <div className="space-y-4">
      <h3 className="font-black italic text-[#1a1a1a] text-lg">CLIENT PROGRESS OVERVIEW</h3>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-lg bg-gray-100" />)}
        </div>
      ) : (
        <>
          {/* Dashboard Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-gradient-to-br from-orange-500 to-red-500 border-none">
              <CardContent className="p-4">
                <Flame className="w-8 h-8 text-white/80 mb-2" />
                <p className="text-xs text-white/80 uppercase font-bold">Current Streak</p>
                <p className="text-3xl font-black italic text-white">{dashboardMetrics.currentStreak} days</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#0ea5e9] to-blue-600 border-none">
              <CardContent className="p-4">
                <Dumbbell className="w-8 h-8 text-white/80 mb-2" />
                <p className="text-xs text-white/80 uppercase font-bold">Workout Rate</p>
                <p className="text-3xl font-black italic text-white">{dashboardMetrics.workoutConsistency}%</p>
                <p className="text-xs text-white/70 mt-1">{dashboardMetrics.totalWorkouts} workouts (30d)</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 border-none">
              <CardContent className="p-4">
                <UtensilsCrossed className="w-8 h-8 text-white/80 mb-2" />
                <p className="text-xs text-white/80 uppercase font-bold">Nutrition</p>
                <p className="text-3xl font-black italic text-white">{dashboardMetrics.nutritionAdherence}%</p>
                <p className="text-xs text-white/70 mt-1">Logged this week</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-pink-500 border-none">
              <CardContent className="p-4">
                <Award className="w-8 h-8 text-white/80 mb-2" />
                <p className="text-xs text-white/80 uppercase font-bold">Strength Total</p>
                <p className="text-3xl font-black italic text-white">{dashboardMetrics.totalStrength} lbs</p>
                <p className="text-xs text-white/70 mt-1">Combined max lifts</p>
              </CardContent>
            </Card>
          </div>

          {/* Weight Change Card */}
          {Math.abs(dashboardMetrics.weightChange) > 0 && (
            <Card className={`border-2 ${
              dashboardMetrics.weightChange < 0 
                ? 'bg-green-50 border-green-500' 
                : 'bg-blue-50 border-blue-500'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {dashboardMetrics.weightChange < 0 ? (
                      <TrendingDown className="w-10 h-10 text-green-600" />
                    ) : (
                      <TrendingUp className="w-10 h-10 text-blue-600" />
                    )}
                    <div>
                      <p className="text-sm font-bold text-gray-600 uppercase">Weight Change</p>
                      <p className="text-2xl font-black italic text-[#1a1a1a]">
                        {dashboardMetrics.weightChange > 0 ? '+' : ''}{dashboardMetrics.weightChange} lbs
                      </p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full ${
                    dashboardMetrics.weightChange < 0 
                      ? 'bg-green-500' 
                      : 'bg-blue-500'
                  }`}>
                    <p className="text-white font-black italic">
                      {dashboardMetrics.weightChange < 0 ? 'Down' : 'Up'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weekly Workout Chart */}
          {weeklyWorkoutData.some(d => d.workouts > 0) && (
            <Card className="bg-white border-2 border-gray-200">
              <CardContent className="p-5">
                <h3 className="font-black italic text-[#1a1a1a] mb-4">WEEKLY WORKOUT CONSISTENCY</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyWorkoutData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="week" stroke="#6b7280" style={{ fontSize: '11px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '2px solid #0ea5e9',
                        borderRadius: '4px',
                        fontWeight: 'bold'
                      }}
                    />
                    <Bar dataKey="workouts" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Tabs for detailed views */}
      <Tabs defaultValue="metrics" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100">
          <TabsTrigger value="metrics" className="data-[state=active]:bg-[#0ea5e9] data-[state=active]:text-white font-bold italic text-xs">
            Metrics
          </TabsTrigger>
          <TabsTrigger value="photos" className="data-[state=active]:bg-[#0ea5e9] data-[state=active]:text-white font-bold italic text-xs">
            Photos
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-[#0ea5e9] data-[state=active]:text-white font-bold italic text-xs">
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4 mt-4">
          {/* Metric Type Selector */}
          <div className="flex gap-2 flex-wrap">
            {metricTypes.map(type => {
              const chartData = getChartData(type.value);
              if (chartData.length === 0) return null;
              
              return (
                <button
                  key={type.value}
                  onClick={() => setSelectedMetricType(type.value)}
                  className={`px-3 py-2 text-xs font-bold italic rounded-full transition-colors ${
                    selectedMetricType === type.value
                      ? 'bg-[#0ea5e9] text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {type.label}
                </button>
              );
            })}
          </div>

          {/* Selected Metric Chart */}
          {(() => {
            const chartData = getChartData(selectedMetricType);
            if (chartData.length === 0) {
              return (
                <Card className="bg-white border-2 border-gray-200">
                  <CardContent className="p-8 text-center">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 italic">No {metricTypes.find(t => t.value === selectedMetricType)?.label} data logged yet</p>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card className="bg-white border-2 border-gray-200">
                <CardContent className="p-5">
                  <h3 className="font-black italic text-[#1a1a1a] mb-4">
                    {metricTypes.find(t => t.value === selectedMetricType)?.label}
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '2px solid #0ea5e9',
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#0ea5e9" 
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorValue)"
                        dot={{ fill: '#0ea5e9', r: 5 }}
                        activeDot={{ r: 7 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="mt-3 text-center">
                    <p className="text-sm text-gray-600">
                      Current: <span className="font-black italic text-[#0ea5e9] text-lg">{chartData[chartData.length - 1]?.value}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* All Metrics Summary */}
          <Card className="bg-white border-2 border-gray-200">
            <CardContent className="p-5">
              <h4 className="font-black italic text-[#1a1a1a] mb-4">ALL TRACKED METRICS</h4>
              <div className="grid grid-cols-2 gap-3">
                {metricTypes.map(type => {
                  const metrics = progressMetrics
                    .filter(m => m.metric_type === type.value)
                    .sort((a, b) => b.date.localeCompare(a.date));
                  
                  if (metrics.length === 0) return null;

                  const latest = metrics[0];
                  return (
                    <div key={type.value} className="bg-gray-50 p-3 rounded border-l-4 border-[#0ea5e9]">
                      <p className="text-xs text-gray-500 uppercase font-bold">{type.label}</p>
                      <p className="text-2xl font-black italic text-[#1a1a1a]">{latest.value}</p>
                      <p className="text-xs text-gray-500">{latest.unit}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos" className="space-y-4 mt-4">
          <Card className="bg-white border-2 border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Camera className="w-5 h-5 text-[#0ea5e9]" />
                <h4 className="font-black italic text-[#1a1a1a]">PROGRESS PHOTOS</h4>
                <span className="ml-auto text-xs text-gray-500 font-bold">{progressPhotos.length} total</span>
              </div>
              {progressPhotos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {progressPhotos.map(photo => (
                    <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-[#0ea5e9] transition-colors">
                      <img 
                        src={photo.photo_url} 
                        alt="Progress" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1.5 text-center font-bold">
                        {format(new Date(photo.date + "T00:00:00"), 'MMM d, yyyy')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 italic">No progress photos uploaded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4 mt-4">
          {/* Recent Workouts */}
          <Card className="bg-white border-2 border-gray-200">
            <CardContent className="p-5">
              <h4 className="font-black italic text-[#1a1a1a] mb-4">RECENT WORKOUTS</h4>
              {workoutLogs.length > 0 ? (
                <div className="space-y-2">
                  {workoutLogs.slice(0, 15).map(log => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 border-l-4 border-[#0ea5e9]">
                      <div>
                        <p className="font-bold italic text-[#1a1a1a] text-sm">{log.exercise_name}</p>
                        {log.sets_completed && (
                          <p className="text-xs text-gray-500">{log.sets_completed} sets completed</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span className="font-semibold">{format(new Date(log.completed_date + "T00:00:00"), 'MMM d')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Dumbbell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 italic">No workout logs yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Nutrition Logs */}
          <Card className="bg-white border-2 border-gray-200">
            <CardContent className="p-5">
              <h4 className="font-black italic text-[#1a1a1a] mb-4">RECENT NUTRITION</h4>
              {calorieLogs.length > 0 ? (
                <div className="space-y-2">
                  {calorieLogs.slice(0, 15).map(log => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 border-l-4 border-orange-500">
                      <div>
                        <p className="font-bold italic text-[#1a1a1a] text-sm">{log.meal_name}</p>
                        <p className="text-xs text-gray-500">{log.meal_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-orange-600 text-lg">{log.calories}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span className="font-semibold">{format(new Date(log.date + "T00:00:00"), 'MMM d')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UtensilsCrossed className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 italic">No nutrition logs yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}