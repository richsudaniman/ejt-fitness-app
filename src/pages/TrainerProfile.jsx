import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { User, Save, Loader2, Camera } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function TrainerProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    specialties: "",
    phone: "",
    profile_photo_url: ""
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        bio: user.bio || "",
        specialties: user.specialties || "",
        phone: user.phone || "",
        profile_photo_url: user.profile_photo_url || ""
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      // Use backend function to update profile to ensure permissions (especially for full_name)
      const response = await base44.functions.invoke('updateUserProfile', data);
      return response.data;
    },
    onSuccess: (updatedUser) => {
      // Update cache immediately
      queryClient.setQueryData(['currentUser'], updatedUser);
      
      // Invalidate queries to ensure freshness everywhere
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['allUsers'] }); // For admin/lists
      queryClient.invalidateQueries({ queryKey: ['myTrainer'] }); // For client view preview
      
      toast({
        title: "Profile Updated",
        description: "Your trainer profile has been updated successfully.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update profile: " + error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#0ea5e9]" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Trainer Profile</h1>
      
      <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-gray-50 border-b border-gray-100">
          <CardTitle className="text-lg font-bold text-gray-900">Edit Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Profile Photo Preview */}
            <div className="flex flex-col items-center sm:flex-row gap-6 mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-sm">
                  {formData.profile_photo_url ? (
                    <img src={formData.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>
              </div>
              <div className="flex-1 w-full">
                <Label htmlFor="profile_photo_url" className="text-sm font-semibold text-gray-700 mb-1.5 block">Profile Photo URL</Label>
                <div className="relative">
                  <Camera className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    id="profile_photo_url"
                    name="profile_photo_url"
                    value={formData.profile_photo_url} 
                    onChange={handleChange}
                    placeholder="https://example.com/photo.jpg"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Enter a direct URL to an image file.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-sm font-semibold text-gray-700">Full Name</Label>
                <Input 
                  id="full_name"
                  name="full_name"
                  value={formData.full_name} 
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">Phone Number</Label>
                <Input 
                  id="phone"
                  name="phone"
                  value={formData.phone} 
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialties" className="text-sm font-semibold text-gray-700">Specialties</Label>
              <Input 
                id="specialties"
                name="specialties"
                value={formData.specialties} 
                onChange={handleChange}
                placeholder="Weight Loss, Strength Training, HIIT..."
              />
              <p className="text-xs text-gray-500">Comma separated list of your areas of expertise.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-sm font-semibold text-gray-700">Bio</Label>
              <Textarea 
                id="bio"
                name="bio"
                value={formData.bio} 
                onChange={handleChange}
                placeholder="Tell clients a bit about yourself and your training philosophy..."
                className="h-32"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button 
                type="submit" 
                className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold min-w-[120px]"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}