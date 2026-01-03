import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Award, Search, Users, ChevronDown, ChevronUp, Plus, Edit, X, UserX, UserCheck, UserPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AdminTrainers() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTrainer, setExpandedTrainer] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    bio: "",
    specialties: "",
    profile_photo_url: "",
  });

  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['allAssignments'],
    queryFn: () => base44.entities.TrainerClientAssignment.filter({ is_active: true }),
    initialData: [],
  });

  const updateTrainerMutation = useMutation({
    mutationFn: ({ userId, data }) => base44.entities.User.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      setEditingTrainer(null);
      resetForm();
    },
  });

  const toggleTrainerStatusMutation = useMutation({
    mutationFn: ({ userId, newUserType }) => {
      // Sync role with user_type for consistency
      const newRole = newUserType === 'trainer' ? 'trainer' : 'user';
      return base44.entities.User.update(userId, { 
        user_type: newUserType,
        role: newRole 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
  });

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      bio: "",
      specialties: "",
      profile_photo_url: "",
    });
  };

  const handleSubmit = async () => {
    if (editingTrainer) {
      await updateTrainerMutation.mutateAsync({
        userId: editingTrainer.id,
        data: { ...formData, user_type: 'trainer', role: 'user' }
      });
    }
  };

  const handleEdit = (trainer) => {
    setEditingTrainer(trainer);
    setFormData({
      full_name: trainer.full_name || "",
      email: trainer.email || "",
      phone: trainer.phone || "",
      bio: trainer.bio || "",
      specialties: trainer.specialties || "",
      profile_photo_url: trainer.profile_photo_url || "",
    });
    setShowCreateForm(true);
  };

  const handleDeactivate = async (trainerId) => {
    if (confirm('Deactivate this trainer? Their clients will remain but the trainer will lose access.')) {
      await toggleTrainerStatusMutation.mutateAsync({ userId: trainerId, newUserType: 'client' });
    }
  };

  const handleActivate = async (userId) => {
    if (confirm('Activate this user as a trainer?')) {
      await toggleTrainerStatusMutation.mutateAsync({ userId: userId, newUserType: 'trainer' });
    }
  };

  const trainers = allUsers.filter(u => u.user_type === 'trainer');
  const regularUsers = allUsers.filter(u => u.user_type !== 'trainer' && u.role !== 'admin');
  
  const filteredTrainers = trainers.filter(trainer =>
    trainer.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trainer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTrainerClients = (trainerId) => {
    const trainerAssignments = assignments.filter(a => a.trainer_id === trainerId);
    const clientIds = trainerAssignments.map(a => a.client_id);
    return allUsers.filter(u => clientIds.includes(u.id));
  };

  const isLoading = usersLoading || assignmentsLoading;

  return (
    <div className="w-full max-w-[1600px] mx-auto px-6 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trainer Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage fitness professionals and their assignments</p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl("AdminInviteUser")}>
            <Button className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white shadow-sm rounded-lg font-bold">
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Trainer
            </Button>
          </Link>
          <Button
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              if (showCreateForm) {
                setEditingTrainer(null);
                resetForm();
              }
            }}
            variant="outline"
            className="font-bold border-gray-200"
          >
            <Edit className="w-4 h-4 mr-2" />
            {showCreateForm ? 'Cancel' : 'Edit Existing'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Trainers */}
        <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden group">
            <CardContent className="p-6 relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Award className="w-16 h-16 text-teal-600" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Trainers</span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-4xl font-black text-teal-600">{trainers.length}</span>
                        <span className="text-xs text-teal-600/70 font-bold bg-teal-50 px-2 py-0.5 rounded-full">ACTIVE PROS</span>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Total Clients */}
        <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden group">
            <CardContent className="p-6 relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Users className="w-16 h-16 text-indigo-600" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Clients</span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-4xl font-black text-indigo-600">{assignments.length}</span>
                        <span className="text-xs text-indigo-600/70 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">ASSIGNED</span>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Avg per Trainer */}
        <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden group">
            <CardContent className="p-6 relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <UserCheck className="w-16 h-16 text-purple-600" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Avg Clients / Trainer</span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-4xl font-black text-purple-600">
                          {trainers.length > 0 ? Math.round(assignments.length / trainers.length) : 0}
                        </span>
                        <span className="text-xs text-purple-600/70 font-bold bg-purple-50 px-2 py-0.5 rounded-full">RATIO</span>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Edit Trainer Form */}
      {showCreateForm && (
        <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden mb-6">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-900 text-lg">Edit Trainer Details</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingTrainer(null);
                  resetForm();
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-[#0ea5e9] rounded-r-lg">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> To create a new trainer, use the "Invite Trainer" button above. Use this form to edit existing trainer details.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Full Name *</label>
                <Input
                  placeholder="John Doe"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="bg-white border-gray-200"
                  disabled={!editingTrainer}
                />
                </div>

                <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Profile Photo URL</label>
                <Input
                  placeholder="https://..."
                  value={formData.profile_photo_url}
                  onChange={(e) => setFormData({ ...formData, profile_photo_url: e.target.value })}
                  className="bg-white border-gray-200"
                />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Email *</label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-white border-gray-200"
                    disabled={true}
                  />
                  {!editingTrainer && (
                    <p className="text-xs text-gray-400 mt-1">Select a trainer to edit their details.</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Phone</label>
                  <Input
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-white border-gray-200"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Bio / About</label>
                  <Textarea
                    placeholder="Tell clients about this trainer's experience and expertise..."
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="bg-white border-gray-200 h-32 resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Specialties</label>
                  <Input
                    placeholder="e.g., Strength Training, Weight Loss, Nutrition"
                    value={formData.specialties}
                    onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                    className="bg-white border-gray-200"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={updateTrainerMutation.isPending || !editingTrainer}
                className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold px-8"
              >
                {updateTrainerMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search trainers by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-gray-200 focus:border-[#0ea5e9] rounded-xl h-11"
            />
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl bg-gray-100" />)}
            </div>
          ) : filteredTrainers.length > 0 ? (
            <div className="space-y-4">
              {filteredTrainers.map(trainer => {
                const clients = getTrainerClients(trainer.id);
                const isExpanded = expandedTrainer === trainer.id;
                
                return (
                  <Card key={trainer.id} className="bg-white border-none shadow-sm hover:shadow-md transition-all rounded-xl overflow-hidden group">
                    <CardContent className="p-0">
                      <div 
                        className="p-5 flex items-start gap-4 cursor-pointer"
                        onClick={() => setExpandedTrainer(isExpanded ? null : trainer.id)}
                      >
                        <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 border border-purple-100 group-hover:border-purple-200 transition-colors">
                          {trainer.profile_photo_url ? (
                            <img src={trainer.profile_photo_url} alt={trainer.full_name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <Award className="w-7 h-7 text-purple-600" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg truncate">{trainer.full_name || 'Trainer'}</h3>
                                <p className="text-sm text-gray-500 truncate">{trainer.email}</p>
                            </div>
                             {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-full">
                              <Users className="w-3.5 h-3.5 text-[#0ea5e9]" />
                              <span className="text-xs font-bold text-gray-700">{clients.length} clients</span>
                            </div>
                            {trainer.specialties && (
                              <span className="text-xs text-gray-500 italic truncate max-w-[200px]">{trainer.specialties}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-gray-50/50 border-t border-gray-100 p-5 space-y-5">
                          {/* Trainer Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {trainer.bio && (
                                <div>
                                <h4 className="font-bold text-gray-900 text-xs uppercase mb-2">About</h4>
                                <p className="text-sm text-gray-600 leading-relaxed">{trainer.bio}</p>
                                </div>
                            )}
                             {trainer.phone && (
                                <div>
                                <h4 className="font-bold text-gray-900 text-xs uppercase mb-1">Contact</h4>
                                <p className="text-sm text-gray-600">{trainer.phone}</p>
                                </div>
                            )}
                          </div>

                          {/* Assigned Clients */}
                          <div>
                            <h4 className="font-bold text-gray-900 text-xs uppercase mb-3">Assigned Clients ({clients.length})</h4>
                            {clients.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {clients.map(client => (
                                    <div key={client.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                        {client.profile_photo_url ? (
                                            <img src={client.profile_photo_url} alt={client.full_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-gray-500 font-bold text-xs">{client.full_name?.charAt(0) || 'C'}</span>
                                        )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-gray-900 truncate">{client.full_name || 'Client'}</p>
                                            <p className="text-[10px] text-gray-500 truncate">{client.email}</p>
                                        </div>
                                    </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic">No clients assigned yet</p>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-3 pt-2 border-t border-gray-100">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(trainer);
                              }}
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-2 bg-white hover:bg-gray-50"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Edit Details
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeactivate(trainer.id);
                              }}
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 bg-white"
                              disabled={toggleTrainerStatusMutation.isPending}
                            >
                              <UserX className="w-3.5 h-3.5" />
                              Deactivate
                            </Button>
                          </div>
                        </div>
                      )}
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
                <p className="text-gray-500 font-medium">No trainers found</p>
            </div>
          )}
        </div>

        {/* Right Column: Promote Users */}
        <div className="space-y-6">
            <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden sticky top-8">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4">
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        <UserCheck className="w-5 h-5" />
                        Promote to Trainer
                    </h3>
                    <p className="text-purple-100 text-xs mt-1">Grant trainer access to existing users</p>
                </div>
                <CardContent className="p-0 max-h-[calc(100vh-350px)] overflow-y-auto">
                    {regularUsers.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                        {regularUsers.map(user => (
                            <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors group">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">
                                            {user.full_name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-gray-900">{user.full_name || 'User'}</p>
                                            <p className="text-xs text-gray-500 truncate max-w-[120px]">{user.email}</p>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => handleActivate(user.id)}
                                    size="sm"
                                    disabled={toggleTrainerStatusMutation.isPending}
                                    className="w-full bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800 font-bold text-xs h-8"
                                >
                                    Make Trainer
                                </Button>
                            </div>
                        ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            No eligible users found
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
      <div className="h-24"></div>
    </div>
  );
}