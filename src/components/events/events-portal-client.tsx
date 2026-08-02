// src/components/events/events-portal-client.tsx
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Calendar as CalIcon, MapPin, User as UserIcon, Users, Search, Plus, Grid, List, CheckCircle2,
  ChevronLeft, ChevronRight, X, Clock, Tag, Brain, BookOpen
} from "lucide-react";
import { Card, Badge, Button, Input, Select, SectionHeader, EmptyState, Skeleton } from "@/components/placements-ui";

interface EventItem {
  id: string;
  name: string;
  department: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  location: string;
  description: string;
  capacity: number;
  filled: number;
  organizer: string;
  organizerRole?: string;
  tags: string[];
  registeredUsers: string[];
}

const DEPT_NAMES: Record<string, string> = {
  "computer-science": "Computer Science",
  "mathematics": "Mathematics",
  "physics": "Physics",
  "chemistry": "Chemistry",
  "biology": "Biology",
  "english": "English",
  "history": "History",
};

const DEPT_COLOR_HEX: Record<string, string> = {
  "computer-science": "#6C63FF", // Primary Indigo
  "mathematics": "#8B5CF6", // Secondary Purple
  "physics": "#FFB020", // Warning Gold
  "chemistry": "#F04438", // Error Red
  "biology": "#00C2A8", // Accent Mint
  "english": "#06b6d4",
  "history": "#ef4444",
};

export default function EventsPortalClient() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("student");
  const [institutionId, setInstitutionId] = useState<string | null>(null);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("all");
  const [timeline, setTimeline] = useState("all"); // all, upcoming, today, past
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // UI Toast Message
  const [toastMessage, setToastMessage] = useState("");

  // New Event Form Modal
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    department: "computer-science",
    date: "",
    time: "",
    location: "",
    organizer: "",
    organizerRole: "",
    capacity: "100",
    description: "",
    tags: "",
  });

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1)); // July 2026
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Fetch current user details from Supabase auth
  const [profileLoaded, setProfileLoaded] = useState<boolean>(false);

  useEffect(() => {
    async function getUserDetails() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("users")
            .select("role, institution_id")
            .eq("id", user.id)
            .single();
          if (data) {
            setUserRole(data.role || "student");
            setInstitutionId(data.institution_id || null);
          }
          setUserId(user.id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setProfileLoaded(true);
      }
    }
    getUserDetails();
  }, []);

  // Fetch Events from Supabase Database
  const fetchEvents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("events")
        .select(`
          id,
          title,
          description,
          event_date,
          venue,
          created_by,
          event_registrations (
            user_id
          )
        `);

      if (institutionId) {
        query = query.eq("institution_id", institutionId);
      }

      const { data, error } = await query.order("event_date", { ascending: true });

      if (error) throw error;

      const mapped: EventItem[] = (data || []).map((e: any) => {
        let descText = e.description || "";
        let deptName = "computer-science";
        let tagsList: string[] = ["Academic"];
        
        try {
          const json = JSON.parse(e.description);
          if (json && typeof json === "object" && "description" in json) {
            descText = json.description;
            deptName = json.department || "computer-science";
            tagsList = json.tags || [];
          }
        } catch {
          // Plain text fallback
        }

        let dateVal = "2026-07-01";
        let timeVal = "12:00";
        if (e.event_date) {
          const dt = new Date(e.event_date);
          dateVal = dt.toISOString().split("T")[0];
          timeVal = dt.toTimeString().slice(0, 5);
        }

        const registeredUsers = e.event_registrations?.map((r: any) => r.user_id) || [];

        return {
          id: e.id,
          name: e.title || "Untitled Event",
          department: deptName,
          date: dateVal,
          time: timeVal,
          location: e.venue || "Campus Hall",
          description: descText,
          capacity: 100,
          filled: registeredUsers.length,
          organizer: "Staff Coordinator",
          organizerRole: "Faculty",
          tags: tagsList,
          registeredUsers,
        };
      });

      setEvents(mapped);
    } catch (err) {
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileLoaded) {
      fetchEvents();
    }
  }, [profileLoaded]);

  const isCoordinator = ["super_admin", "org_admin", "institution_admin", "hod", "program_head", "faculty"].includes(userRole?.toLowerCase());

  // Timeline Helper
  const getTimelineStatus = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ev = new Date(dateStr);
    ev.setHours(0, 0, 0, 0);
    if (ev < today) return "past";
    if (ev.getTime() === today.getTime()) return "today";
    return "upcoming";
  };

  const filteredEvents = events.filter((e) => {
    const status = getTimelineStatus(e.date);
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.description.toLowerCase().includes(search.toLowerCase());
    const matchDept = dept === "all" ? true : e.department === dept;
    const matchTimeline =
      timeline === "all" ? true :
      timeline === "upcoming" ? status === "upcoming" || status === "today" :
      timeline === "today" ? status === "today" :
      status === "past";

    const matchCalendarDate = selectedDateStr ? e.date === selectedDateStr : true;

    return matchSearch && matchDept && matchTimeline && matchCalendarDate;
  });

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const handleRegister = async (id: string) => {
    if (!userId) {
      alert("You must be logged in to register.");
      return;
    }

    const match = events.find(e => e.id === id);
    if (!match) return;

    const isRegistered = match.registeredUsers.includes(userId);

    try {
      if (isRegistered) {
        const { error } = await supabase
          .from("event_registrations")
          .delete()
          .eq("event_id", id)
          .eq("user_id", userId);

        if (error) throw error;

        setEvents(prev => prev.map(e => e.id === id ? {
          ...e,
          filled: e.filled - 1,
          registeredUsers: e.registeredUsers.filter(x => x !== userId)
        } : e));
        triggerToast("Cancelled registration");
      } else {
        if (match.filled >= match.capacity) {
          alert("Event is full.");
          return;
        }

        const { error } = await supabase
          .from("event_registrations")
          .insert([{ event_id: id, user_id: userId }]);

        if (error) throw error;

        setEvents(prev => prev.map(e => e.id === id ? {
          ...e,
          filled: e.filled + 1,
          registeredUsers: [...e.registeredUsers, userId]
        } : e));
        triggerToast("Seat reserved successfully!");
      }
    } catch (err) {
      console.error("Registration error:", err);
      alert("Action failed. Please try again.");
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.date || !form.time || !userId) return;

    const descPayload = JSON.stringify({
      description: form.description,
      department: form.department,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()) : ["Event"]
    });

    const payload = {
      title: form.name,
      description: descPayload,
      event_date: `${form.date}T${form.time}:00`,
      venue: form.location || "Campus Hall",
      created_by: userId,
      institution_id: institutionId,
    };

    try {
      const { error } = await supabase
        .from("events")
        .insert([payload]);

      if (error) throw error;

      fetchEvents();
      setShowForm(false);
      setForm({
        name: "",
        department: "computer-science",
        date: "",
        time: "",
        location: "",
        organizer: "",
        organizerRole: "",
        capacity: "100",
        description: "",
        tags: "",
      });
      triggerToast("Event successfully scheduled");
    } catch (err) {
      console.error("Error creating event:", err);
      alert("Failed to create event in database.");
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(new Date(year, month, i));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <SectionHeader
        title="Department Events Portal"
        subtitle="Explore and schedule academic conferences, bootcamps, and lectures"
        action={
          isCoordinator && (
            <Button variant="primary" className="text-xs" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Schedule Event
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Listing */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white/80 border border-slate-100 rounded-3xl p-4 shadow-[0_2px_8px_rgba(15,23,42,0.01)] backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10 text-xs"
                placeholder="Search event title or keywords..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <Select className="text-xs w-44" value={dept} onChange={e => setDept(e.target.value)}>
                <option value="all">All Departments</option>
                {Object.entries(DEPT_NAMES).map(([slug, name]) => (
                  <option key={slug} value={slug}>{name}</option>
                ))}
              </Select>

              <Select className="text-xs w-40" value={timeline} onChange={e => setTimeline(e.target.value)}>
                <option value="all">All Dates</option>
                <option value="upcoming">Upcoming</option>
                <option value="today">Today</option>
                <option value="past">Past Events</option>
              </Select>

              {selectedDateStr && (
                <button
                  onClick={() => setSelectedDateStr(null)}
                  className="bg-[#6C63FF]/10 text-[#6C63FF] border border-[#6C63FF]/20 px-3 py-2 rounded-2xl text-[10px] font-bold hover:bg-[#6C63FF]/15 transition-all"
                >
                  Clear Date: {selectedDateStr} ✕
                </button>
              )}

              <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100/80">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-xl transition-all duration-200 ${viewMode === "grid" ? "bg-white text-[#6C63FF] shadow-sm font-bold" : "text-slate-400 hover:text-slate-650"}`}
                >
                  <Grid size={14} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-xl transition-all duration-200 ${viewMode === "list" ? "bg-white text-[#6C63FF] shadow-sm font-bold" : "text-slate-400 hover:text-slate-650"}`}
                >
                  <List size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            Showing <span className="font-['Space_Grotesk'] text-slate-800 text-sm font-bold">{filteredEvents.length}</span> Active Events
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : filteredEvents.length === 0 ? (
            <EmptyState message="No scheduled events match your criteria" icon={<CalIcon size={32} />} />
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((item) => {
                const status = getTimelineStatus(item.date);
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedEventId(item.id)}
                    className="group block relative bg-white rounded-3xl border border-slate-100 shadow-[0_2px_8px_rgba(15,23,42,0.02)] overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(108,99,255,0.06)] hover:border-indigo-100 flex flex-col justify-between"
                  >
                    <div
                      className="h-28 flex items-end p-4 relative"
                      style={{
                        background: `linear-gradient(135deg, ${DEPT_COLOR_HEX[item.department] || "#6C63FF"}ee, ${DEPT_COLOR_HEX[item.department] || "#6C63FF"}aa)`,
                      }}
                    >
                      <div className="absolute top-3 right-3 bg-white/95 text-slate-850 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border border-slate-100 shadow-sm">
                        {status === "today" ? "Today" : status === "past" ? "Closed" : "Upcoming"}
                      </div>
                      <Badge variant="neutral" className="bg-black/30 text-white border-none text-[10px] font-bold">
                        {DEPT_NAMES[item.department] || "General"}
                      </Badge>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-[#6C63FF] transition-colors duration-250 line-clamp-2">{item.name}</h4>
                        <div className="space-y-1.5 text-xs text-slate-500 font-semibold mt-3">
                          <p className="flex items-center gap-2"><CalIcon size={13} className="text-[#6C63FF]/70" /> {item.date}</p>
                          <p className="flex items-center gap-2"><Clock size={13} className="text-[#6C63FF]/70" /> {item.time}</p>
                          <p className="flex items-center gap-2"><MapPin size={13} className="text-[#6C63FF]/70" /> {item.location}</p>
                        </div>
                      </div>

                      <div className="border-t border-slate-50 pt-4 flex items-center justify-between text-xs text-slate-500 mt-auto">
                        <span className="font-bold text-slate-650 truncate max-w-[120px]">{item.organizer}</span>
                        <span className="font-['Space_Grotesk'] font-bold text-[#6C63FF] bg-[#6C63FF]/5 border border-[#6C63FF]/15 px-2 py-0.5 rounded-md">
                          {item.capacity - item.filled} seats left
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((item) => {
                const status = getTimelineStatus(item.date);
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedEventId(item.id)}
                    className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-[0_12px_30px_rgba(15,23,42,0.03)] hover:border-slate-200 transition-all duration-200"
                  >
                    <div
                      className="w-2 h-10 rounded-full shrink-0"
                      style={{ backgroundColor: DEPT_COLOR_HEX[item.department] || "#6C63FF" }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 text-sm truncate">{item.name}</h4>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">
                        {DEPT_NAMES[item.department] || "General"} · {item.date} at {item.time} · {item.location}
                      </p>
                    </div>
                    <Badge variant={status === "today" ? "warning" : status === "past" ? "neutral" : "success"}>
                      {status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Calendar */}
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-black tracking-wider text-slate-900 uppercase">{monthNames[month]} {year}</span>
              <div className="flex gap-1">
                <button onClick={prevMonth} className="p-1 hover:bg-slate-50 border border-slate-100/50 rounded-lg text-slate-550"><ChevronLeft size={14} /></button>
                <button onClick={nextMonth} className="p-1 hover:bg-slate-50 border border-slate-100/50 rounded-lg text-slate-550"><ChevronRight size={14} /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-400 mb-3 uppercase tracking-wider">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => <span key={d}>{d}</span>)}
            </div>

            <div className="grid grid-cols-7 gap-y-2 text-center text-xs">
              {calendarDays.map((day, index) => {
                if (!day) return <span key={`empty-${index}`} />;
                const dayNum = day.getDate();
                const yearStr = day.getFullYear();
                const monthStr = String(day.getMonth() + 1).padStart(2, "0");
                const dateStr = `${yearStr}-${monthStr}-${String(dayNum).padStart(2, "0")}`;

                const dayEvents = events.filter(e => e.date === dateStr);
                const hasEvents = dayEvents.length > 0;
                const isSelected = selectedDateStr === dateStr;

                return (
                  <button
                    key={`day-${index}`}
                    onClick={() => setSelectedDateStr(isSelected ? null : dateStr)}
                    className={`h-8 w-8 rounded-full flex flex-col items-center justify-center font-['Space_Grotesk'] font-bold mx-auto relative transition-all duration-200 ${
                      isSelected
                        ? "bg-[#6C63FF] text-white shadow-md shadow-indigo-100"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span>{dayNum}</span>
                    {hasEvents && !isSelected && (
                      <span className="absolute bottom-1 w-1 h-1 bg-[#6C63FF] rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="p-5 bg-slate-50/50 border-slate-100">
            <h4 className="font-black text-[10px] text-slate-400 mb-3 uppercase tracking-wider">Instructions</h4>
            <ul className="text-xs font-semibold text-slate-500 space-y-2 list-disc list-inside">
              <li>Click calendar days to filter by date.</li>
              <li>Select any event card to view details.</li>
              <li>Register online to reserve seats.</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Side Spotlight Drawer */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200" onClick={() => setSelectedEventId(null)}>
          <div
            className="w-full max-w-xl bg-white h-screen flex flex-col justify-between overflow-y-auto p-8 animate-in slide-in-from-right duration-350 shadow-2xl border-l border-slate-100"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <Badge variant="info" className="mb-2">
                    {DEPT_NAMES[selectedEvent.department] || "General"} Department
                  </Badge>
                  <h2 className="text-2xl font-black font-['Plus_Jakarta_Sans'] tracking-tight text-slate-900 leading-snug">{selectedEvent.name}</h2>
                </div>
                <button onClick={() => setSelectedEventId(null)} className="p-2 rounded-xl hover:bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-700 transition-all">
                  <X size={16} />
                </button>
              </div>

              <div
                className="h-44 w-full rounded-3xl mb-6 flex flex-col justify-end p-5 relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${DEPT_COLOR_HEX[selectedEvent.department] || "#6C63FF"}ee, ${DEPT_COLOR_HEX[selectedEvent.department] || "#6C63FF"}77)`,
                }}
              >
                <div className="text-white text-xs font-bold drop-shadow-sm flex items-center gap-1.5">
                  <MapPin size={14} /> {selectedEvent.location}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Details & Agenda</h4>
                  <p className="text-sm text-slate-600 leading-relaxed font-semibold">{selectedEvent.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 text-xs font-semibold text-slate-500">
                  <div>
                    <p className="text-slate-400 text-[10px] font-black uppercase mb-1">Date & Time</p>
                    <p className="text-slate-900 font-bold">{selectedEvent.date} · {selectedEvent.time}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] font-black uppercase mb-1">Coordinator</p>
                    <p className="text-slate-900 font-bold">{selectedEvent.organizer} ({selectedEvent.organizerRole || "Faculty"})</p>
                  </div>
                </div>

                <div className="space-y-2.5 border-t border-slate-100 pt-5">
                  <div className="flex justify-between text-xs font-bold text-slate-655">
                    <span>Seats Reservation</span>
                    <span className="font-['Space_Grotesk'] text-[#6C63FF]">{selectedEvent.filled} / {selectedEvent.capacity} filled</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6]" style={{ width: `${(selectedEvent.filled / selectedEvent.capacity) * 100}%` }} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {selectedEvent.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 text-[10px] font-bold border border-slate-150">
                      <Tag size={10} className="text-[#6C63FF]/70" /> {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {userId && (
              <div className="border-t border-slate-100 pt-5 mt-8 flex gap-3">
                <Button
                  variant={selectedEvent.registeredUsers.includes(userId) ? "secondary" : "primary"}
                  className="flex-1 w-full"
                  onClick={() => handleRegister(selectedEvent.id)}
                >
                  {selectedEvent.registeredUsers.includes(userId) ? (
                    <span className="flex items-center justify-center gap-1.5 text-emerald-600 font-black"><CheckCircle2 size={16} /> Registered</span>
                  ) : (
                    "Reserve My Seat"
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Scheduling Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-8 flex flex-col justify-between shadow-2xl border border-slate-100/60 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <CalIcon className="text-[#6C63FF]" size={18} />
                <h3 className="font-black text-slate-900 text-lg font-['Plus_Jakarta_Sans']">Schedule Department Event</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 border border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-slate-650 rounded-xl transition-all"><X size={15} /></button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Event Title *</label>
                <Input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Department</label>
                  <Select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}>
                    {Object.entries(DEPT_NAMES).map(([slug, name]) => (
                      <option key={slug} value={slug}>{name}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Seats Capacity</label>
                  <Input type="number" min="5" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Date *</label>
                  <Input type="date" required value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Time *</label>
                  <Input type="time" required value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Staff Coordinator</label>
                  <Input value={form.organizer} onChange={e => setForm(p => ({ ...p, organizer: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Designation</label>
                  <Input value={form.organizerRole} onChange={e => setForm(p => ({ ...p, organizerRole: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Location Venue</label>
                <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/10 transition-all"
                  rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 mt-6">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit">Publish Event</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border-l-4 border-[#6C63FF] text-white text-xs font-bold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-[60]">
          <CheckCircle2 size={14} className="text-[#6C63FF]" />
          {toastMessage}
        </div>
      )}
    </div>
  );
}
