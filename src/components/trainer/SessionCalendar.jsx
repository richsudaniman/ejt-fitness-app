import React, { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus, Trash2, Check, User, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function SessionCalendar({ trainerId, clients = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    clientId: "",
    time: "10:00",
    duration: "60",
    notes: ""
  });
  const [editingSessionId, setEditingSessionId] = useState(null);
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['trainerSessions', trainerId, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      // Fetch sessions for the current month view (plus buffer)
      // Since filter doesn't support complex date ranges easily, we'll filter client-side or fetch generally
      // For now, let's fetch all future/recent sessions for this trainer
      const allSessions = await base44.entities.ScheduledSession.filter({ trainer_id: trainerId });
      return allSessions;
    },
    enabled: !!trainerId
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data) => {
      const startDateTime = new Date(selectedDate);
      const [hours, minutes] = data.time.split(':').map(Number);
      startDateTime.setHours(hours, minutes, 0, 0);

      return await base44.entities.ScheduledSession.create({
        trainer_id: trainerId,
        client_id: data.clientId,
        start_time: startDateTime.toISOString(),
        duration_minutes: parseInt(data.duration),
        status: 'scheduled',
        notes: data.notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerSessions'] });
      setShowScheduleForm(false);
      setSessionForm({ clientId: "", time: "10:00", duration: "60", notes: "" });
    }
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId) => {
      return await base44.entities.ScheduledSession.delete(sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerSessions'] });
    }
  });

  const updateSessionMutation = useMutation({
    mutationFn: async (data) => {
      const startDateTime = new Date(selectedDate);
      const [hours, minutes] = data.time.split(':').map(Number);
      startDateTime.setHours(hours, minutes, 0, 0);

      return await base44.entities.ScheduledSession.update(editingSessionId, {
        client_id: data.clientId,
        start_time: startDateTime.toISOString(),
        duration_minutes: parseInt(data.duration),
        notes: data.notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerSessions'] });
      setShowScheduleForm(false);
      setEditingSessionId(null);
      setSessionForm({ clientId: "", time: "10:00", duration: "60", notes: "" });
    }
  });

  const handleEditClick = (session) => {
    setSelectedDate(new Date(session.start_time));
    setSessionForm({
      clientId: session.client_id,
      time: format(new Date(session.start_time), 'HH:mm'),
      duration: session.duration_minutes.toString(),
      notes: session.notes || ""
    });
    setEditingSessionId(session.id);
    setShowScheduleForm(true);
  };

  const handleCancel = () => {
    setShowScheduleForm(false);
    setEditingSessionId(null);
    setSessionForm({ clientId: "", time: "10:00", duration: "60", notes: "" });
  };

  const handleSubmit = () => {
    if (editingSessionId) {
      updateSessionMutation.mutate(sessionForm);
    } else {
      createSessionMutation.mutate(sessionForm);
    }
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const onDateClick = (day) => {
    setSelectedDate(day);
    setEditingSessionId(null);
    setSessionForm({ clientId: "", time: "10:00", duration: "60", notes: "" });
    setShowScheduleForm(true);
  };

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-[#0ea5e9]" />
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const dateFormat = "EEE";
    const days = [];
    let startDate = startOfWeek(currentMonth);

    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="text-xs font-bold text-gray-400 uppercase text-center py-2" key={i}>
          {format(addDays(startDate, i), dateFormat)}
        </div>
      );
    }
    return <div className="grid grid-cols-7 mb-2">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        
        // Find sessions for this day
        const daySessions = sessions.filter(s => isSameDay(new Date(s.start_time), day));
        const isSelected = isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, monthStart);

        days.push(
          <div
            className={`
              min-h-[80px] p-2 border border-gray-100 relative group cursor-pointer transition-all
              ${!isCurrentMonth ? "bg-gray-50 text-gray-300" : "bg-white"}
              ${isSelected ? "ring-2 ring-[#0ea5e9] z-10" : "hover:bg-gray-50"}
            `}
            key={day}
            onClick={() => onDateClick(cloneDay)}
          >
            <span className={`text-xs font-bold ${!isCurrentMonth ? "text-gray-300" : "text-gray-700"}`}>
              {formattedDate}
            </span>
            
            <div className="mt-1 space-y-1">
              {daySessions.slice(0, 3).map((session, idx) => {
                const client = clients.find(c => c.id === session.client_id);
                return (
                  <div key={idx} className="text-[10px] bg-blue-50 text-blue-700 px-1 py-0.5 rounded truncate font-medium border border-blue-100">
                    {format(new Date(session.start_time), 'h:mm a')} {client ? client.full_name.split(' ')[0] : 'Client'}
                  </div>
                );
              })}
              {daySessions.length > 3 && (
                <div className="text-[10px] text-gray-400 font-medium pl-1">
                  +{daySessions.length - 3} more
                </div>
              )}
            </div>
            
            {isCurrentMonth && (
               <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-3 h-3 text-[#0ea5e9]" />
               </div>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="border border-gray-100 rounded-lg overflow-hidden">{rows}</div>;
  };

  // Get sessions for selected date
  const selectedDateSessions = sessions.filter(s => isSameDay(new Date(s.start_time), selectedDate))
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            {renderHeader()}
            {renderDays()}
            {renderCells()}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1 space-y-6">
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#0ea5e9]" />
              Schedule for {format(selectedDate, 'MMM do')}
            </h3>

            {showScheduleForm ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Client</label>
                  <Select 
                    value={sessionForm.clientId} 
                    onValueChange={(val) => setSessionForm({...sessionForm, clientId: val})}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>{client.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Time</label>
                    <Input 
                      type="time" 
                      value={sessionForm.time}
                      onChange={(e) => setSessionForm({...sessionForm, time: e.target.value})}
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Duration (min)</label>
                    <Select 
                      value={sessionForm.duration} 
                      onValueChange={(val) => setSessionForm({...sessionForm, duration: val})}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="45">45 min</SelectItem>
                        <SelectItem value="60">60 min</SelectItem>
                        <SelectItem value="90">90 min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                   <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Notes</label>
                   <Textarea 
                      placeholder="Session focus..."
                      value={sessionForm.notes}
                      onChange={(e) => setSessionForm({...sessionForm, notes: e.target.value})}
                      className="bg-white h-20 resize-none"
                   />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold"
                    disabled={!sessionForm.clientId || createSessionMutation.isPending || (typeof updateSessionMutation !== 'undefined' && updateSessionMutation.isPending)}
                    onClick={handleSubmit}
                  >
                    {(createSessionMutation.isPending || (typeof updateSessionMutation !== 'undefined' && updateSessionMutation.isPending)) ? 'Saving...' : editingSessionId ? 'Update' : 'Schedule'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                onClick={() => setShowScheduleForm(true)}
                className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold mb-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Session
              </Button>
            )}

            <div className="space-y-3 mt-6">
              {selectedDateSessions.length > 0 ? (
                selectedDateSessions.map(session => {
                  const client = clients.find(c => c.id === session.client_id);
                  return (
                    <div key={session.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-start gap-3 group">
                      <div className="mt-1 w-2 h-2 rounded-full bg-[#0ea5e9]"></div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-sm">
                          {format(new Date(session.start_time), 'h:mm a')} - {client?.full_name || 'Client'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {session.duration_minutes} min • {session.notes || 'No notes'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditClick(session)}
                          className="text-gray-400 hover:text-[#0ea5e9]"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteSessionMutation.mutate(session.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No sessions scheduled</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}