import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Search, Play, Clock, X, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "../components/EmptyState";
import { Button } from "@/components/ui/button";

export default function Learn() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedVideo, setSelectedVideo] = useState(null);

  const { data: videos, isLoading, error } = useQuery({
    queryKey: ['allVideos'],
    queryFn: async () => {
      const allVideos = await base44.entities.ExerciseVideo.list('-created_date');
      // Filter out placeholder videos that don't have real video URLs
      return allVideos.filter(v => v.video_url && v.video_url !== 'placeholder' && v.video_url.startsWith('http'));
    },
    initialData: [],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // Debug log
  console.log('Videos loaded:', videos?.length, 'Error:', error);

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || video.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-5 space-y-5 relative overscroll-contain touch-pan-y">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-gradient-to-br from-[#0ea5e9] to-[#06b6d4] rounded-2xl flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Learn & Grow</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-gray-200 rounded-xl"
          />
        </div>
        <div className="relative sm:w-48">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 z-10" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full bg-white border-gray-200 rounded-xl pl-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="chest">Chest</SelectItem>
              <SelectItem value="back">Back</SelectItem>
              <SelectItem value="legs">Legs</SelectItem>
              <SelectItem value="shoulders">Shoulders</SelectItem>
              <SelectItem value="arms">Arms</SelectItem>
              <SelectItem value="core">Core</SelectItem>
              <SelectItem value="cardio">Cardio</SelectItem>
              <SelectItem value="mobility">Mobility</SelectItem>
              <SelectItem value="tutorial">Tutorial</SelectItem>
              <SelectItem value="education">Education</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Videos Grid */}
      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-lg bg-gray-100" />)}
        </div>
      ) : filteredVideos.length > 0 ? (
        <div className="grid gap-3">
          {filteredVideos.map(video => (
            <Card 
              key={video.id} 
              className="bg-white border-2 border-gray-100 hover:border-[#0ea5e9] shadow-sm rounded-2xl transition-all cursor-pointer overflow-hidden group"
              onClick={() => setSelectedVideo(video)}
            >
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row gap-0 sm:gap-4">
                  <div className="w-full sm:w-40 h-48 sm:h-auto bg-gray-100 flex-shrink-0 relative overflow-hidden">
                    {video.video_url ? (
                      <video 
                        src={video.video_url} 
                        className="w-full h-full object-cover"
                        preload="metadata"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <Play className="w-10 h-10 text-[#0ea5e9]/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Play className="w-5 h-5 text-white fill-current" />
                      </div>
                    </div>
                    {/* Duration Badge overlay */}
                    {video.duration_minutes > 0 && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3 text-white" />
                        <span className="text-[10px] font-bold text-white">{video.duration_minutes} min</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 p-4 flex flex-col justify-center">
                    <div className="flex items-start justify-between gap-2 mb-2">
                       <span className="px-2 py-1 text-[10px] font-black italic bg-[#0ea5e9]/10 text-[#0ea5e9] rounded uppercase tracking-wider">
                        {video.category}
                      </span>
                      {video.difficulty_level && (
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {video.difficulty_level}
                        </span>
                      )}
                    </div>

                    <h3 className="font-black italic text-[#1a1a1a] text-lg mb-2 leading-tight">{video.title}</h3>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{video.description}</p>
                    
                    <div className="mt-auto pt-2 flex items-center text-[#0ea5e9] text-xs font-bold uppercase tracking-wider group-hover:underline">
                      Watch Video
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={GraduationCap}
          title={searchQuery ? "No Videos Found" : "No Videos Yet"}
          description={searchQuery ? "Try adjusting your search or filters" : "Check back soon for exercise videos and educational content from your trainers!"}
          variant="info"
        />
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
           <div className="h-full flex flex-col bg-white sm:max-w-4xl sm:mx-auto sm:h-auto sm:my-10 sm:rounded-2xl overflow-hidden relative">
             {/* Close Button */}
             <button 
                onClick={() => setSelectedVideo(null)}
                className="absolute top-4 right-4 z-20 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>

             {/* Video Container */}
            <div className="w-full bg-black relative aspect-video flex-shrink-0">
              <video 
                src={selectedVideo.video_url} 
                controls 
                autoPlay
                playsInline
                className="w-full h-full"
              >
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-white">
               <div className="flex items-center gap-3 mb-4">
                 <span className="px-3 py-1 text-xs font-black italic bg-[#0ea5e9] text-white rounded uppercase tracking-wider shadow-sm shadow-blue-200">
                    {selectedVideo.category}
                  </span>
                  {selectedVideo.difficulty_level && (
                    <span className="px-3 py-1 text-xs font-bold bg-gray-100 text-gray-500 rounded uppercase tracking-wider">
                      {selectedVideo.difficulty_level}
                    </span>
                  )}
                  {selectedVideo.duration_minutes > 0 && (
                    <div className="flex items-center gap-1 text-xs font-bold text-gray-400">
                      <Clock className="w-3 h-3" />
                      {selectedVideo.duration_minutes} min
                    </div>
                  )}
               </div>

              <h2 className="text-2xl font-black italic text-[#1a1a1a] mb-4 leading-tight">{selectedVideo.title}</h2>
              
              {selectedVideo.description && (
                <div className="prose prose-sm max-w-none text-gray-600">
                  <p className="whitespace-pre-wrap leading-relaxed">{selectedVideo.description}</p>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                <Button
                  onClick={() => setSelectedVideo(null)}
                  variant="outline"
                  className="font-bold border-gray-200 text-gray-600 hover:text-gray-900"
                >
                  Close
                </Button>
              </div>
            </div>
           </div>
        </div>
      )}
    </div>
  );
}