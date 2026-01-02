import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, Edit, Shield, User, Award, UserPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import EmptyState from "../components/EmptyState";

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingUser, setEditingUser] = useState(null);

  const { data: allUsers, isLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }) => base44.entities.User.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      setEditingUser(null);
    },
    onError: (error) => {
      alert(`Failed to update user: ${error.message}`);
    }
  });

  const handleRoleChange = async (userId, newUserType) => {
    // Determine system role: Only 'admin' user_type gets 'admin' system role
    // 'trainer' and 'client' user_types get 'user' system role
    const systemRole = newUserType === 'admin' ? 'admin' : 'user';
    
    await updateUserMutation.mutateAsync({ 
      userId, 
      data: { 
        role: systemRole,
        user_type: newUserType 
      } 
    });
  };

  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const userType = user.user_type || (user.role === 'admin' ? 'admin' : 'client');
    const matchesRole = roleFilter === "all" || userType === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (userType) => {
    if (userType === 'admin') return Shield;
    if (userType === 'trainer') return Award;
    return User;
  };

  const getRoleColor = (userType) => {
    if (userType === 'admin') return "text-indigo-600 bg-indigo-50";
    if (userType === 'trainer') return "text-teal-600 bg-teal-50";
    return "text-sky-600 bg-sky-50";
  };

  const trainersCount = allUsers.filter(u => u.user_type === 'trainer').length;
  const adminsCount = allUsers.filter(u => u.role === 'admin' || u.user_type === 'admin').length;
  const newThisMonth = allUsers.filter(u => {
      const created = new Date(u.created_date);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="w-full max-w-[1600px] mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage users, roles, and permissions</p>
        </div>
        <Link to={createPageUrl("AdminInviteUser")}>
          <Button className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white shadow-sm rounded-lg font-bold">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden group">
            <CardContent className="p-6 relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Users className="w-16 h-16 text-[#0ea5e9]" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Users</span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-4xl font-black text-[#0ea5e9]">{allUsers.length}</span>
                        <span className="text-xs text-sky-600/70 font-bold bg-sky-50 px-2 py-0.5 rounded-full">ACTIVE</span>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden group">
            <CardContent className="p-6 relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Award className="w-16 h-16 text-teal-600" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Trainers & Admins</span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-4xl font-black text-teal-600">{trainersCount + adminsCount}</span>
                        <span className="text-xs text-teal-600/70 font-bold bg-teal-50 px-2 py-0.5 rounded-full">STAFF</span>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden group">
            <CardContent className="p-6 relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <UserPlus className="w-16 h-16 text-indigo-600" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">New This Month</span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-4xl font-black text-indigo-600">{newThisMonth}</span>
                        <span className="text-xs text-indigo-600/70 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">GROWTH</span>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Filters and List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-gray-200 focus:border-[#0ea5e9] rounded-xl h-11"
            />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white border-gray-200 rounded-xl h-11">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="trainer">Trainers</SelectItem>
                <SelectItem value="user">Clients</SelectItem>
            </SelectContent>
            </Select>
        </div>

        {/* Users Grid */}
        {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40 rounded-xl bg-gray-100" />)}
            </div>
        ) : filteredUsers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map(user => {
                const RoleIcon = getRoleIcon(user.role);
                const isEditing = editingUser?.id === user.id;
                const roleColor = getRoleColor(user.role);
                
                return (
                <Card key={user.id} className="bg-white border-none shadow-sm hover:shadow-md transition-all rounded-xl overflow-hidden group">
                    <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 border border-gray-100">
                            {user.profile_photo_url ? (
                            <img src={user.profile_photo_url} alt={user.full_name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                            <RoleIcon className={`w-6 h-6 ${roleColor.split(' ')[0]}`} />
                            )}
                        </div>
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full tracking-wide ${roleColor}`}>
                            {user.role || 'CLIENT'}
                        </span>
                    </div>

                    <div className="mb-4">
                        <h3 className="font-bold text-gray-900 truncate text-lg">{user.full_name || 'Unnamed User'}</h3>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                        <p className="text-xs text-gray-400 mt-1 font-mono">ID: {user.id.slice(0, 8)}</p>
                    </div>

                    <div className="pt-4 border-t border-gray-50">
                        {isEditing ? (
                            <div className="flex flex-col gap-2">
                            <Select
                                value={editingUser.role || 'user'}
                                onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}
                            >
                                <SelectTrigger className="w-full h-9 bg-gray-50 border-gray-200">
                                <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="trainer">Trainer</SelectItem>
                                <SelectItem value="user">Client</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                                <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingUser(null)}
                                className="flex-1 h-8 text-gray-500"
                                >
                                Cancel
                                </Button>
                                <Button
                                size="sm"
                                onClick={() => handleRoleChange(user.id, editingUser.role)}
                                disabled={updateUserMutation.isPending}
                                className="flex-1 h-8 bg-[#0ea5e9] hover:bg-[#0284c7] text-white"
                                >
                                Save
                                </Button>
                            </div>
                            </div>
                        ) : (
                            <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingUser(user)}
                            className="w-full h-9 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 justify-between group-hover:bg-[#0ea5e9]/5 group-hover:text-[#0ea5e9] transition-colors"
                            >
                                <span className="text-xs font-medium">Manage Role</span>
                                <Edit className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>
                    </CardContent>
                </Card>
                );
            })}
            </div>
        ) : (
            <EmptyState
            icon={Users}
            title="No Users Found"
            description={searchQuery ? "No users match your search criteria" : "No users in the system yet"}
            variant="info"
            />
        )}
      </div>
    </div>
  );
}