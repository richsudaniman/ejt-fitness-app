import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, UserPlus, RefreshCw, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AdminClientAssignments() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTrainer, setFilterTrainer] = useState("all");
  const [selectedClient, setSelectedClient] = useState(null);
  const [newTrainerId, setNewTrainerId] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);

  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['allAssignments'],
    queryFn: () => base44.entities.TrainerClientAssignment.list('-created_date'),
    initialData: [],
  });

  const trainers = allUsers.filter(u => u.user_type === 'trainer');
  const clients = allUsers.filter(u => u.user_type !== 'trainer' && u.role !== 'admin' && u.role !== 'trainer');

  const assignClientMutation = useMutation({
    mutationFn: async ({ clientId, trainerId }) => {
      // First, deactivate any existing assignments for this client
      const existingAssignments = assignments.filter(a => a.client_id === clientId && a.is_active);
      for (const assignment of existingAssignments) {
        await base44.entities.TrainerClientAssignment.update(assignment.id, { is_active: false });
      }

      // Update the User entity with the trainer ID
      await base44.entities.User.update(clientId, {
        assigned_trainer_id: trainerId
      });

      // Create new assignment
      return base44.entities.TrainerClientAssignment.create({
        trainer_id: trainerId,
        client_id: clientId,
        assigned_date: new Date().toISOString().split('T')[0],
        is_active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      setShowAssignModal(false);
      setSelectedClient(null);
      setNewTrainerId("");
    },
  });

  const reassignClientMutation = useMutation({
    mutationFn: async ({ clientId, oldTrainerId, newTrainerId }) => {
      // Deactivate old assignment
      const oldAssignment = assignments.find(a => 
        a.client_id === clientId && 
        a.trainer_id === oldTrainerId && 
        a.is_active
      );
      if (oldAssignment) {
        await base44.entities.TrainerClientAssignment.update(oldAssignment.id, { is_active: false });
      }

      // Update the User entity with the new trainer ID
      await base44.entities.User.update(clientId, {
        assigned_trainer_id: newTrainerId
      });

      // Create new assignment
      const newAssignment = await base44.entities.TrainerClientAssignment.create({
        trainer_id: newTrainerId,
        client_id: clientId,
        assigned_date: new Date().toISOString().split('T')[0],
        is_active: true
      });
      
      // Send email notifications
      try {
        const clientList = await base44.entities.User.filter({ id: clientId });
        const trainerList = await base44.entities.User.filter({ id: newTrainerId });
        const client = clientList[0];
        const trainer = trainerList[0];
        
        if (trainer?.email && client?.full_name) {
          await base44.integrations.Core.SendEmail({
            from_name: 'EJT Fitness',
            to: trainer.email,
            subject: `New Client Assigned: ${client.full_name}`,
            body: `Hi ${trainer.full_name || 'Trainer'},

A new client has been assigned to you:

Client Name: ${client.full_name}
Client Email: ${client.email}

Please log in to the trainer portal to start creating their workout and nutrition plans.

Best regards,
EJT Fitness Team`
          });
        }
        
        if (client?.email && trainer?.full_name) {
          await base44.integrations.Core.SendEmail({
            from_name: 'EJT Fitness',
            to: client.email,
            subject: `Your New Trainer: ${trainer.full_name}`,
            body: `Hi ${client.full_name},

You've been assigned a new trainer:

Trainer Name: ${trainer.full_name}
Trainer Email: ${trainer.email}

Your trainer will be creating customized workout and nutrition plans for you. Stay tuned!

Best regards,
EJT Fitness Team`
          });
        }
      } catch (emailError) {
        console.error('Error sending notification emails:', emailError);
      }
      
      return newAssignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allAssignments'] });
      setShowAssignModal(false);
      setSelectedClient(null);
      setNewTrainerId("");
    },
  });

  const getClientTrainer = (clientId) => {
    const assignment = assignments.find(a => a.client_id === clientId && a.is_active);
    if (!assignment) return null;
    return trainers.find(t => t.id === assignment.trainer_id);
  };

  const getTrainerClientCount = (trainerId) => {
    return assignments.filter(a => a.trainer_id === trainerId && a.is_active).length;
  };

  const unassignedClients = clients.filter(client => !getClientTrainer(client.id));

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterTrainer === "all") return true;
    if (filterTrainer === "unassigned") return !getClientTrainer(client.id);
    
    const trainer = getClientTrainer(client.id);
    return trainer?.id === filterTrainer;
  });

  const handleAssignClick = (client) => {
    setSelectedClient(client);
    const currentTrainer = getClientTrainer(client.id);
    setNewTrainerId(currentTrainer?.id || "");
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async () => {
    if (!selectedClient || !newTrainerId) return;

    const currentTrainer = getClientTrainer(selectedClient.id);
    
    if (currentTrainer) {
      // Reassign
      await reassignClientMutation.mutateAsync({
        clientId: selectedClient.id,
        oldTrainerId: currentTrainer.id,
        newTrainerId: newTrainerId
      });
    } else {
      // New assignment
      await assignClientMutation.mutateAsync({
        clientId: selectedClient.id,
        trainerId: newTrainerId
      });
    }
  };

  const isLoading = usersLoading || assignmentsLoading;
  const isPending = assignClientMutation.isPending || reassignClientMutation.isPending;

  return (
    <div className="w-full max-w-[1600px] mx-auto px-6 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("AdminDashboard")}>
             <Button variant="ghost" size="icon" className="mr-2">
                <ArrowLeft className="w-5 h-5 text-gray-500" />
             </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Client Assignments</h1>
            <p className="text-sm text-gray-500 mt-1">Manage relationships between trainers and clients</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-6">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Total Clients</p>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-black text-[#1a1a1a]">{clients.length}</p>
              <div className="mb-1 px-2 py-0.5 rounded-full bg-blue-50 text-[#0ea5e9] text-xs font-bold">
                Active
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-6">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Active Trainers</p>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-black text-[#1a1a1a]">{trainers.length}</p>
              <div className="mb-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 text-xs font-bold">
                Staff
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-red-500 border-none shadow-md rounded-xl overflow-hidden text-white">
          <CardContent className="p-6">
            <p className="text-xs text-white/80 uppercase font-bold tracking-wider mb-2">Needs Assignment</p>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-black">{unassignedClients.length}</p>
              <div className="mb-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold">
                Action Required
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search clients by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 border-transparent focus:bg-white h-11"
              />
            </div>
            <Select value={filterTrainer} onValueChange={setFilterTrainer}>
              <SelectTrigger className="w-full sm:w-56 bg-gray-50 border-transparent focus:bg-white h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trainers</SelectItem>
                <SelectItem value="unassigned">Show Unassigned Only</SelectItem>
                {trainers.map(trainer => (
                  <SelectItem key={trainer.id} value={trainer.id}>
                    {trainer.full_name || trainer.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client List */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl bg-gray-100" />)}
            </div>
          ) : filteredClients.length > 0 ? (
            <div className="space-y-3">
              {filteredClients.map(client => {
                const trainer = getClientTrainer(client.id);
                
                return (
                  <Card key={client.id} className="bg-white border-none shadow-sm hover:shadow-md transition-all rounded-xl overflow-hidden group">
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                            {client.profile_photo_url ? (
                              <img src={client.profile_photo_url} alt={client.full_name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <span className="text-gray-500 font-bold text-lg">
                                {client.full_name?.charAt(0) || 'C'}
                              </span>
                            )}
                          </div>

                          <div>
                            <h3 className="font-bold text-[#1a1a1a] text-lg leading-tight">{client.full_name || 'Client'}</h3>
                            <p className="text-sm text-gray-500 mb-1">{client.email}</p>
                            
                            {trainer ? (
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-gray-400">Trainer:</span>
                                <div className="flex items-center gap-1 font-semibold text-[#0ea5e9] bg-blue-50 px-2 py-0.5 rounded-full">
                                  {trainer.full_name || trainer.email}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-orange-100 text-orange-700 rounded-full">
                                <AlertCircle className="w-3 h-3" />
                                Unassigned
                              </span>
                            )}
                          </div>
                        </div>

                        <Button
                          onClick={() => handleAssignClick(client)}
                          variant={trainer ? "outline" : "default"}
                          className={trainer 
                            ? "border-gray-200 text-gray-600 hover:text-[#0ea5e9] hover:border-[#0ea5e9]" 
                            : "bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold"}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          {trainer ? 'Reassign' : 'Assign Trainer'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-gray-300">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">No Clients Found</h3>
              <p className="text-gray-500">
                {searchQuery ? "Try adjusting your search filters" : "Add users to the platform to get started"}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar - Trainer Workload */}
        <div className="space-y-6">
          <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden sticky top-6">
            <CardContent className="p-6">
              <h3 className="font-bold text-[#1a1a1a] text-lg mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-400" />
                Trainer Capacity
              </h3>
              
              <div className="space-y-6">
                {trainers.map(trainer => {
                  const clientCount = getTrainerClientCount(trainer.id);
                  const capacity = 20; // Default capacity
                  const percentage = (clientCount / capacity) * 100;
                  
                  // Color logic
                  let colorClass = 'bg-[#0ea5e9]';
                  let textClass = 'text-[#0ea5e9]';
                  let bgClass = 'bg-blue-50';
                  
                  if (percentage >= 80) {
                    colorClass = 'bg-red-500';
                    textClass = 'text-red-600';
                    bgClass = 'bg-red-50';
                  } else if (percentage >= 50) {
                    colorClass = 'bg-yellow-500';
                    textClass = 'text-yellow-600';
                    bgClass = 'bg-yellow-50';
                  }
                  
                  return (
                    <div key={trainer.id} className="group">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                            {trainer.full_name?.charAt(0) || 'T'}
                          </div>
                          <p className="font-semibold text-sm text-gray-900 group-hover:text-[#0ea5e9] transition-colors cursor-default">
                            {trainer.full_name || 'Trainer'}
                          </p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bgClass} ${textClass}`}>
                          {clientCount}/{capacity}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ease-out ${colorClass}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}

                {trainers.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4 italic">No trainers active</p>
                )}
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-100">
                <Link to={createPageUrl("AdminInviteUser")}>
                  <Button variant="outline" className="w-full text-[#0ea5e9] hover:text-[#0ea5e9] hover:bg-blue-50 border-blue-100">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite New Trainer
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && selectedClient && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="bg-white max-w-md w-full border-none shadow-2xl rounded-2xl">
            <CardContent className="p-6">
              <h3 className="font-black italic text-[#1a1a1a] text-xl mb-1">
                {getClientTrainer(selectedClient.id) ? 'REASSIGN CLIENT' : 'ASSIGN CLIENT'}
              </h3>
              <p className="text-gray-500 text-sm mb-6">Select a trainer for this client</p>

              <div className="bg-gray-50 p-4 rounded-xl mb-6 flex items-center gap-3 border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-gray-400 border border-gray-200 shadow-sm">
                  {selectedClient.full_name?.charAt(0) || 'C'}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{selectedClient.full_name || 'Client'}</p>
                  <p className="text-xs text-gray-500">{selectedClient.email}</p>
                </div>
              </div>

              {getClientTrainer(selectedClient.id) && (
                <div className="mb-6 p-3 bg-yellow-50 border border-yellow-100 rounded-lg flex items-center gap-2 text-sm text-yellow-800">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Currently assigned to <strong>{getClientTrainer(selectedClient.id).full_name}</strong></span>
                </div>
              )}

              <div className="mb-6">
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Available Trainers</label>
                <Select value={newTrainerId} onValueChange={setNewTrainerId}>
                  <SelectTrigger className="bg-white border-gray-200 h-11">
                    <SelectValue placeholder="Choose a trainer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {trainers.map(trainer => {
                      const clientCount = getTrainerClientCount(trainer.id);
                      return (
                        <SelectItem key={trainer.id} value={trainer.id}>
                          <div className="flex items-center justify-between w-full min-w-[200px]">
                            <span>{trainer.full_name || trainer.email}</span>
                            <span className="text-xs text-gray-400 ml-2">({clientCount} clients)</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedClient(null);
                    setNewTrainerId("");
                  }}
                  className="flex-1 h-11 border-gray-200"
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignSubmit}
                  disabled={!newTrainerId || isPending}
                  className="flex-1 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold h-11"
                >
                  {isPending ? 'Processing...' : 'Confirm Assignment'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}