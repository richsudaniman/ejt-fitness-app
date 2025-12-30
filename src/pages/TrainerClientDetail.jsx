import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, ArrowLeft, Dumbbell, UtensilsCrossed, Target, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getAvailableClients } from "@/functions/getAvailableClients";
import ClientWorkoutPlans from "../components/trainer/ClientWorkoutPlans";
import ClientNutritionPlans from "../components/trainer/ClientNutritionPlans";
import ClientGoals from "../components/trainer/ClientGoals";
import ClientProgress from "../components/trainer/ClientProgress";
import ClientNotes from "../components/trainer/ClientNotes";
import ClientMessages from "../components/trainer/ClientMessages"; // New import

export default function TrainerClientDetail() {
  const [searchParams] = useSearchParams();
  const { state } = useLocation();
  const clientId = state?.clientId || searchParams.get('clientId');

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.find(u => u.id === clientId) || null;
    },
    enabled: !!clientId,
  });

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (!clientId) {
    return (
      <div className="p-6">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 font-semibold">No client ID provided</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 overscroll-contain touch-pan-y">
      <div className="absolute top-5 right-5 w-16 h-16 border-2 border-gray-200" style={{clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'}}></div>

      <Link to={createPageUrl("TrainerClients")}>
        <Button variant="ghost" className="gap-2 text-gray-600 hover:text-[#0ea5e9]">
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </Button>
      </Link>

      {clientLoading ? (
        <Skeleton className="h-32 rounded-lg bg-gray-100" />
      ) : client ? (
        <Card className="bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] border-none glow-blue">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/40">
                {client.profile_photo_url ? (
                  <img src={client.profile_photo_url} alt={client.full_name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-white" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black italic text-white">{client.full_name || 'Client'}</h2>
                <p className="text-sm text-white/80">{client.email}</p>
                {client.phone && (
                  <p className="text-xs text-white/70 mt-1">{client.phone}</p>
                )}
              </div>
            </div>

            {client.bio && (
              <p className="text-sm text-white/90 mt-4 italic">{client.bio}</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6 text-center">
            <p className="text-yellow-700 font-semibold">Client not found in database</p>
            <p className="text-sm text-yellow-600 mt-2">Client ID: {clientId}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="workouts" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 bg-gray-100"> {/* Changed grid-cols-5 to grid-cols-6 */}
          <TabsTrigger value="workouts" className="data-[state=active]:bg-[#0ea5e9] data-[state=active]:text-white font-bold italic text-xs">
            <Dumbbell className="w-4 h-4 mr-1" />
            Workouts
          </TabsTrigger>
          <TabsTrigger value="nutrition" className="data-[state=active]:bg-[#0ea5e9] data-[state=active]:text-white font-bold italic text-xs">
            <UtensilsCrossed className="w-4 h-4 mr-1" />
            Nutrition
          </TabsTrigger>
          <TabsTrigger value="goals" className="data-[state=active]:bg-[#0ea5e9] data-[state=active]:text-white font-bold italic text-xs">
            <Target className="w-4 h-4 mr-1" />
            Goals
          </TabsTrigger>
          <TabsTrigger value="progress" className="data-[state=active]:bg-[#0ea5e9] data-[state=active]:text-white font-bold italic text-xs">
            Progress
          </TabsTrigger>
          <TabsTrigger value="messages" className="data-[state=active]:bg-[#0ea5e9] data-[state=active]:text-white font-bold italic text-xs"> {/* New TabsTrigger for Messages */}
            Messages
          </TabsTrigger>
          <TabsTrigger value="notes" className="data-[state=active]:bg-[#0ea5e9] data-[state=active]:text-white font-bold italic text-xs">
            <FileText className="w-4 h-4 mr-1" />
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workouts" className="mt-4">
          <ClientWorkoutPlans clientId={clientId} />
        </TabsContent>

        <TabsContent value="nutrition" className="mt-4">
          <ClientNutritionPlans clientId={clientId} />
        </TabsContent>

        <TabsContent value="goals" className="mt-4">
          <ClientGoals clientId={clientId} />
        </TabsContent>

        <TabsContent value="progress" className="mt-4">
          <ClientProgress clientId={clientId} />
        </TabsContent>

        <TabsContent value="messages" className="mt-4"> {/* New TabsContent for Messages */}
          {userLoading ? (
            <Skeleton className="h-96 rounded-lg bg-gray-100" />
          ) : (
            <ClientMessages clientId={clientId} trainerId={user?.id} />
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          {userLoading ? (
            <Skeleton className="h-40 rounded-lg bg-gray-100" />
          ) : (
            <ClientNotes clientId={clientId} trainerId={user?.id} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}