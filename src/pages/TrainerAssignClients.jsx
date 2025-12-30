import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, UserMinus, Search, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getAvailableClients } from "@/functions/getAvailableClients";
import { assignClientToTrainer } from "@/functions/assignClientToTrainer";

export default function TrainerAssignClients() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: trainer } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Use backend function to get clients (trainers can't list users directly)
  const { data: clientData, isLoading: clientsLoading } = useQuery({
    queryKey: ['availableClients'],
    queryFn: async () => {
      const response = await getAvailableClients();
      return response.data;
    },
    initialData: { clients: [], assignments: [], trainerId: null },
  });

  const allUsers = clientData.clients || [];
  const allAssignments = clientData.assignments || [];
  const assignments = allAssignments.filter(a => a.trainer_id === trainer?.id);

  const assignClientMutation = useMutation({
    mutationFn: async (clientId) => {
      const response = await assignClientToTrainer({ clientId, action: 'assign' });
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availableClients'] });
      queryClient.invalidateQueries({ queryKey: ['allAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['trainerAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['allTrainerAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
  });

  const unassignClientMutation = useMutation({
    mutationFn: async ({ assignmentId, clientId }) => {
      const response = await assignClientToTrainer({ clientId, action: 'unassign' });
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availableClients'] });
      queryClient.invalidateQueries({ queryKey: ['allAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['trainerAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  // Clients are already filtered by the backend function
  const clients = allUsers;
  
  const filteredClients = clients.filter(client => {
    const query = searchQuery.toLowerCase();
    return client.full_name?.toLowerCase().includes(query) || 
           client.email?.toLowerCase().includes(query);
  });

  const isAssigned = (clientId) => {
    return assignments.find(a => a.client_id === clientId && a.is_active);
  };

  const isAssignedToOther = (clientId) => {
    return allAssignments.find(a => a.client_id === clientId && a.is_active && a.trainer_id !== trainer.id);
  };

  const handleAssign = async (clientId) => {
    await assignClientMutation.mutateAsync(clientId);
  };

  const handleUnassign = async (clientId) => {
    const assignment = assignments.find(a => a.client_id === clientId && a.is_active);
    if (assignment) {
      await unassignClientMutation.mutateAsync({ assignmentId: assignment.id, clientId });
    }
  };

  const isLoading = clientsLoading;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assign Clients</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your client roster and new assignments</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white border-gray-200 focus:border-[#0ea5e9] rounded-xl h-11"
        />
      </div>

      {/* Clients List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-24 rounded-xl bg-gray-100" />)}
        </div>
      ) : filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map(client => {
            const assignment = isAssigned(client.id);
            const assignedToOther = isAssignedToOther(client.id);
            return (
              <Card key={client.id} className={`bg-white border-none shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-all ${assignedToOther ? 'opacity-60' : ''}`}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-100">
                      {client.profile_photo_url ? (
                        <img src={client.profile_photo_url} alt={client.full_name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-[#0ea5e9]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-base truncate">
                        {client.full_name || 'User'}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">{client.email}</p>
                      {assignedToOther && (
                        <p className="text-xs text-red-500 font-medium mt-0.5">Assigned to other trainer</p>
                      )}
                    </div>

                    {assignment ? (
                      <Button
                        onClick={() => handleUnassign(client.id)}
                        disabled={unassignClientMutation.isPending}
                        variant="outline"
                        size="sm"
                        className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 h-9"
                      >
                        <UserMinus className="w-4 h-4" />
                        Unassign
                      </Button>
                    ) : assignedToOther ? (
                      <Button
                        disabled
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-gray-400 cursor-not-allowed h-9"
                      >
                        Assigned
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleAssign(client.id)}
                        disabled={assignClientMutation.isPending}
                        size="sm"
                        className="gap-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold shadow-sm h-9"
                      >
                        <UserPlus className="w-4 h-4" />
                        Assign
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-gray-400">
             <Search className="w-6 h-6" />
          </div>
          <p className="text-gray-500 font-medium">
            {searchQuery ? "No users found matching your search" : "No users available"}
          </p>
        </div>
      )}
    </div>
  );
}