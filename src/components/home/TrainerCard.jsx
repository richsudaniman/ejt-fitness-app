import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { User } from "lucide-react";

export default function TrainerCard({ trainer, clientName }) {
  if (!trainer) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] border-0 shadow-lg rounded-3xl overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            {trainer.profile_photo_url ? (
              <img src={trainer.profile_photo_url} alt={trainer.full_name} className="w-16 h-16 rounded-full object-cover border-3 border-white shadow-lg" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center border-3 border-white shadow-lg">
                <User className="w-8 h-8 text-white" />
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-green-400 border-3 border-white rounded-full"></div>
          </div>
          <div className="flex-1">
            <p className="text-xs text-white/80 font-semibold uppercase tracking-wide">Your Personal Trainer</p>
            <h3 className="text-xl font-black italic text-white">{trainer.display_name || trainer.full_name}</h3>
            {trainer.specialties && (
              <p className="text-xs text-white/90 mt-1 font-medium">{trainer.specialties}</p>
            )}
          </div>
        </div>
        {clientName && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-sm text-white/90 font-semibold">
              🎯 This is <span className="text-white font-black">{clientName}'s</span> personalized fitness journey
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}