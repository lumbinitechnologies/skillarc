// src/components/events/events-portal-client.tsx
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Calendar as CalIcon, MapPin, User as UserIcon, Users, Search, Plus, Grid, List, CheckCircle2,
  ChevronLeft, ChevronRight, X, Clock, Tag, Brain, BookOpen, Flame
} from "lucide-react";
import { Card, Badge, Button, Input, Select, SectionHeader, EmptyState, Skeleton } from "@/components/placements-ui";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface EventItem {
  id: string;
  name: string;
  department: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (12-hour display version)
  location: string;
  description: string;
  capacity: number;
  filled: number;
  organizer: string;
  organizerRole?: string;
  staff_coord_phone?: string;
  student_coord?: string;
  student_coord_phone?: string;
  tags: string[];
  registeredUsers: string[];
}

const TIME_OPTIONS = [
  "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
  "05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM",
  "08:00 PM"
];

const parseTime12To24 = (timeStr: string) => {
  if (!timeStr) return "12:00";
  const parts = timeStr.split(" ");
  if (parts.length < 2) return timeStr; // fallback if already 24h
  const [time, modifier] = parts;
  let [hours, minutes] = time.split(":");
  if (hours === "12") {
    hours = "00";
  }
  if (modifier === "PM") {
    hours = String(parseInt(hours, 10) + 12);
  }
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
};

const formatTime24To12 = (time24: string) => {
  if (!time24) return "12:00 PM";
  const parts = time24.split(":");
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1] || "00";
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${String(displayHours).padStart(2, "0")}:${minutes} ${ampm}`;
};

const CLOCK_HOURS = Array.from({ length: 12 }, (_, idx) => {
  const h = idx + 1;
  const angle = (h * 30 - 90) * (Math.PI / 180);
  const r = 76;
  const x = 100 + r * Math.cos(angle) - 12;
  const y = 100 + r * Math.sin(angle) - 12;
  return { val: h, label: String(h), x, y, angle: h * 30 };
});

const CLOCK_MINUTES = Array.from({ length: 12 }, (_, idx) => {
  const m = idx * 5;
  const angle = (idx * 30 - 90) * (Math.PI / 180);
  const r = 76;
  const x = 100 + r * Math.cos(angle) - 12;
  const y = 100 + r * Math.sin(angle) - 12;
  return { val: m, label: String(m).padStart(2, "0"), x, y, angle: idx * 30 };
});

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
  "computer-science": "#6C63FF",
  "mathematics": "#8B5CF6",
  "physics": "#FFB020",
  "chemistry": "#F04438",
  "biology": "#00C2A8",
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
  const [timelineTab, setTimelineTab] = useState<"active" | "completed">("active"); // default to active (upcoming & live)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // UI Toast Message
  const [toastMessage, setToastMessage] = useState("");

  // New Event Form Modal
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    department: "",
    date: "",
    time: "09:00 AM",
    location: "",
    organizer: "",
    organizerRole: "",
    staff_coord_phone: "",
    student_coord: "",
    student_coord_phone: "",
    capacity: "100",
    description: "",
    tags: "",
  });

  // Dynamic Departments from DB
  const [colgDepts, setColgDepts] = useState<{ id: string; name: string }[]>([]);

  const getDeptName = (deptId: string) => {
    const match = colgDepts.find(d => d.id === deptId);
    return match ? match.name : (DEPT_NAMES[deptId] || "General");
  };

  const getDeptColor = (deptId: string) => {
    if (DEPT_COLOR_HEX[deptId]) return DEPT_COLOR_HEX[deptId];
    const colors = ["#6C63FF", "#8B5CF6", "#00C2A8", "#FFB020", "#F04438", "#06b6d4", "#ec4899", "#3b82f6"];
    const idx = colgDepts.findIndex(d => d.id === deptId);
    return idx !== -1 ? colors[idx % colors.length] : "#6C63FF";
  };

  // Delete Confirmation States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Custom Clock Time Picker States
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"hours" | "minutes">("hours");
  const [selectedHour, setSelectedHour] = useState<number>(9);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [selectedTimeAmPm, setSelectedTimeAmPm] = useState<"AM" | "PM">("AM");

  const openClockPicker = () => {
    const parts = form.time.split(" ");
    if (parts.length >= 2) {
      const [hPart, mPart] = parts[0].split(":");
      setSelectedHour(parseInt(hPart, 10));
      setSelectedMinute(parseInt(mPart, 10));
      setSelectedTimeAmPm(parts[1] as "AM" | "PM");
    } else {
      setSelectedHour(9);
      setSelectedMinute(0);
      setSelectedTimeAmPm("AM");
    }
    setPickerMode("hours");
    setShowTimePicker(true);
  };

  const handleSelectClockVal = (val: number) => {
    if (pickerMode === "hours") {
      setSelectedHour(val);
      setPickerMode("minutes");
    } else {
      setSelectedMinute(val);
    }
  };

  const saveClockPickerTime = () => {
    const hh = String(selectedHour).padStart(2, "0");
    const mm = String(selectedMinute).padStart(2, "0");
    const formatted = `${hh}:${mm} ${selectedTimeAmPm}`;
    setForm(p => ({ ...p, time: formatted }));
    setShowTimePicker(false);
  };

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

  useEffect(() => {
    async function fetchCollegeDepts() {
      if (!institutionId) return;
      try {
        const { data, error } = await supabase
          .from("departments")
          .select("id, name")
          .eq("institution_id", institutionId)
          .order("name", { ascending: true });
        if (data) {
          setColgDepts(data);
          if (data.length > 0) {
            setForm(p => ({ ...p, department: data[0].id }));
          }
        }
      } catch (err) {
        console.error("Error fetching departments:", err);
      }
    }
    fetchCollegeDepts();
  }, [institutionId]);

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
        let deptName = "";
        let tagsList: string[] = ["Academic"];
        let staffName = "Staff Coordinator";
        let staffRole = "Faculty";
        let staffPhone = "";
        let studCoord = "";
        let studPhone = "";
        
        try {
          const json = JSON.parse(e.description);
          if (json && typeof json === "object" && "description" in json) {
            descText = json.description;
            deptName = json.department || "";
            tagsList = json.tags || [];
            staffName = json.organizer || "Staff Coordinator";
            staffRole = json.organizerRole || "Faculty";
            staffPhone = json.staff_coord_phone || "";
            studCoord = json.student_coord || "";
            studPhone = json.student_coord_phone || "";
          }
        } catch {
          // Plain text fallback
        }

        let dateVal = "2026-07-01";
        let timeVal = "12:00 PM";
        if (e.event_date) {
          const parts = e.event_date.split("T");
          dateVal = parts[0] || "2026-07-01";
          if (parts[1]) {
            const time24 = parts[1].slice(0, 5);
            timeVal = formatTime24To12(time24);
          }
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
          organizer: staffName,
          organizerRole: staffRole,
          staff_coord_phone: staffPhone,
          student_coord: studCoord,
          student_coord_phone: studPhone,
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

  const isCoordinator = ["super_admin", "org_admin", "institution_admin", "hod", "program_head"].includes(userRole?.toLowerCase());

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

  const activeCount = events.filter(e => {
    const s = getTimelineStatus(e.date);
    return s === "upcoming" || s === "today";
  }).length;

  const completedCount = events.filter(e => {
    const s = getTimelineStatus(e.date);
    return s === "past";
  }).length;

  const filteredEvents = events.filter((e) => {
    const status = getTimelineStatus(e.date);
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.description.toLowerCase().includes(search.toLowerCase());
    const matchDept = dept === "all" ? true : e.department === dept;
    const matchTab = timelineTab === "active"
      ? (status === "upcoming" || status === "today")
      : (status === "past");

    const matchCalendarDate = selectedDateStr ? e.date === selectedDateStr : true;

    return matchSearch && matchDept && matchTab && matchCalendarDate;
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

    // Check if the event date is set in the past
    const time24 = parseTime12To24(form.time);
    const eventDateStr = `${form.date}T${time24}:00`;
    const selectedDate = new Date(eventDateStr);
    const now = new Date();
    if (selectedDate < now) {
      alert("Event date and time cannot be in the past.");
      return;
    }

    const descPayload = JSON.stringify({
      description: form.description,
      department: form.department,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()) : ["Event"],
      organizer: form.organizer,
      organizerRole: form.organizerRole,
      staff_coord_phone: form.staff_coord_phone,
      student_coord: form.student_coord,
      student_coord_phone: form.student_coord_phone,
    });

    const payload = {
      title: form.name,
      description: descPayload,
      event_date: eventDateStr,
      venue: form.location || "Campus Hall",
      created_by: userId,
      institution_id: institutionId,
    };

    try {
      if (isEditing && editingEventId) {
        const { error } = await supabase
          .from("events")
          .update(payload)
          .eq("id", editingEventId);

        if (error) throw error;
        triggerToast("Event successfully updated");
      } else {
        const { error } = await supabase
          .from("events")
          .insert([payload]);

        if (error) throw error;
        triggerToast("Event successfully scheduled");
      }

      fetchEvents();
      setShowForm(false);
      setIsEditing(false);
      setEditingEventId(null);
      setForm({
        name: "",
        department: colgDepts[0]?.id || "",
        date: "",
        time: "09:00 AM",
        location: "",
        organizer: "",
        organizerRole: "",
        staff_coord_phone: "",
        student_coord: "",
        student_coord_phone: "",
        capacity: "100",
        description: "",
        tags: "",
      });
    } catch (err) {
      console.error("Error saving event:", err);
      alert("Failed to save event in database.");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    setIsDeleting(true);
    try {
      // First, delete registrations
      await supabase
        .from("event_registrations")
        .delete()
        .eq("event_id", id);

      // Next, delete the event
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id);

      if (error) throw error;

      triggerToast("Event deleted successfully");
      setSelectedEventId(null);
      fetchEvents();
      setDeleteConfirmOpen(false);
      setDeletingEventId(null);
    } catch (err) {
      console.error("Error deleting event:", err);
      alert("Failed to delete event.");
    } finally {
      setIsDeleting(false);
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
            <Button
              variant="primary"
              className="text-xs"
              onClick={() => {
                setForm({
                  name: "",
                  department: colgDepts[0]?.id || "",
                  date: "",
                  time: "09:00 AM",
                  location: "",
                  organizer: "",
                  organizerRole: "",
                  staff_coord_phone: "",
                  student_coord: "",
                  student_coord_phone: "",
                  capacity: "100",
                  description: "",
                  tags: "",
                });
                setIsEditing(false);
                setEditingEventId(null);
                setShowForm(true);
              }}
            >
              <Plus size={14} /> Schedule Event
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Listing */}
        <div className="lg:col-span-3 space-y-6">
          {/* Top Tab Switcher: Upcoming & Live vs Completed */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="inline-flex p-1 bg-slate-100/80 border border-slate-200/60 rounded-2xl gap-1.5 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setTimelineTab("active");
                  setSelectedDateStr(null);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  timelineTab === "active"
                    ? "bg-white text-[#6C63FF] shadow-sm font-black scale-[1.02]"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Flame size={14} className={timelineTab === "active" ? "text-amber-500 fill-amber-500" : "text-slate-400"} />
                <span>Upcoming & Live</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  timelineTab === "active" ? "bg-[#6C63FF]/10 text-[#6C63FF]" : "bg-slate-200/60 text-slate-500"
                }`}>
                  {activeCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTimelineTab("completed");
                  setSelectedDateStr(null);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  timelineTab === "completed"
                    ? "bg-white text-slate-900 shadow-sm font-black scale-[1.02]"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <CheckCircle2 size={14} className={timelineTab === "completed" ? "text-emerald-500" : "text-slate-400"} />
                <span>Completed Events</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  timelineTab === "completed" ? "bg-slate-900 text-white" : "bg-slate-200/60 text-slate-500"
                }`}>
                  {completedCount}
                </span>
              </button>
            </div>

            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-2 self-start sm:self-center">
              Showing <span className="font-['Space_Grotesk'] text-slate-900 text-sm font-bold">{filteredEvents.length}</span> {timelineTab === "active" ? "Active Events" : "Completed Events"}
            </div>
          </div>

          <div className="bg-white/80 border border-slate-100 rounded-3xl p-4 shadow-[0_2px_8px_rgba(15,23,42,0.01)] backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10 text-xs"
                placeholder={timelineTab === "active" ? "Search upcoming & live events..." : "Search completed events..."}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <Select className="text-xs w-48" value={dept} onChange={e => setDept(e.target.value)}>
                <option value="all">All Departments</option>
                {colgDepts.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>

              {selectedDateStr && (
                <button
                  onClick={() => setSelectedDateStr(null)}
                  className="bg-[#6C63FF]/10 text-[#6C63FF] border border-[#6C63FF]/20 px-3 py-2 rounded-2xl text-[10px] font-bold hover:bg-[#6C63FF]/15 transition-all cursor-pointer"
                >
                  Date: {selectedDateStr} ✕
                </button>
              )}

              <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100/80">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${viewMode === "grid" ? "bg-white text-[#6C63FF] shadow-sm font-bold" : "text-slate-400 hover:text-slate-650"}`}
                >
                  <Grid size={14} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${viewMode === "list" ? "bg-white text-[#6C63FF] shadow-sm font-bold" : "text-slate-400 hover:text-slate-650"}`}
                >
                  <List size={14} />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : filteredEvents.length === 0 ? (
            <EmptyState 
              message={timelineTab === "active" ? "No upcoming or ongoing events found" : "No completed events found"} 
              icon={<CalIcon size={32} />} 
            />
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
                        background: `linear-gradient(135deg, ${getDeptColor(item.department)}ee, ${getDeptColor(item.department)}aa)`,
                      }}
                    >
                      <div className="absolute top-3 right-3 bg-white/95 text-slate-850 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border border-slate-100 shadow-sm">
                        {status === "today" ? "Today" : status === "past" ? "Closed" : "Upcoming"}
                      </div>
                      <Badge variant="neutral" className="bg-black/30 text-white border-none text-[10px] font-bold">
                        {getDeptName(item.department)}
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
                      style={{ backgroundColor: getDeptColor(item.department) }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 text-sm truncate">{item.name}</h4>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">
                        {getDeptName(item.department)} · {item.date} at {item.time} · {item.location}
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
                    onClick={() => {
                      if (isSelected) {
                        setSelectedDateStr(null);
                      } else {
                        setSelectedDateStr(dateStr);
                        const dateStatus = getTimelineStatus(dateStr);
                        if (dateStatus === "past") {
                          setTimelineTab("completed");
                        } else {
                          setTimelineTab("active");
                        }
                      }
                    }}
                    className={`h-8 w-8 rounded-full flex flex-col items-center justify-center font-['Space_Grotesk'] font-bold mx-auto relative transition-all duration-200 cursor-pointer ${
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
                    {getDeptName(selectedEvent.department)} Department
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
                  background: `linear-gradient(135deg, ${getDeptColor(selectedEvent.department)}ee, ${getDeptColor(selectedEvent.department)}77)`,
                }}
              >
                <div className="text-white text-xs font-bold drop-shadow-sm flex items-center gap-1.5">
                  <MapPin size={14} /> {selectedEvent.location}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Details & Agenda</h4>
                  <p className="text-sm text-slate-650 leading-relaxed font-semibold">{selectedEvent.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 text-xs font-semibold text-slate-500">
                  <div>
                    <p className="text-slate-400 text-[10px] font-black uppercase mb-1">Date & Time</p>
                    <p className="text-slate-900 font-bold">{selectedEvent.date} · {selectedEvent.time}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] font-black uppercase mb-1">Location Venue</p>
                    <p className="text-slate-900 font-bold">{selectedEvent.location}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 text-xs font-semibold text-slate-500">
                  <div>
                    <p className="text-slate-400 text-[10px] font-black uppercase mb-1">Staff Coordinator</p>
                    <p className="text-slate-900 font-bold">{selectedEvent.organizer}</p>
                    <p className="text-slate-550 text-[10px] font-semibold">{selectedEvent.organizerRole || "Faculty"}</p>
                    {selectedEvent.staff_coord_phone && (
                      <p className="text-slate-550 text-[10px] mt-0.5 font-bold">📞 {selectedEvent.staff_coord_phone}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] font-black uppercase mb-1">Student Coordinator</p>
                    {selectedEvent.student_coord ? (
                      <>
                        <p className="text-slate-900 font-bold">{selectedEvent.student_coord}</p>
                        {selectedEvent.student_coord_phone && (
                          <p className="text-slate-550 text-[10px] mt-0.5 font-bold">📞 {selectedEvent.student_coord_phone}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-slate-400 italic text-[11px] mt-0.5">None Assigned</p>
                    )}
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
              <div className="border-t border-slate-100 pt-5 mt-8 flex flex-col gap-3">
                <div className="flex gap-3">
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

                {isCoordinator && (
                  <div className="flex gap-2 w-full mt-1 border-t border-slate-100/60 pt-3">
                    <Button
                      variant="secondary"
                      className="flex-1 text-slate-700 border-slate-200 hover:bg-slate-50"
                      onClick={() => {
                        setForm({
                          name: selectedEvent.name,
                          department: selectedEvent.department,
                          date: selectedEvent.date,
                          time: selectedEvent.time,
                          location: selectedEvent.location,
                          organizer: selectedEvent.organizer,
                          organizerRole: selectedEvent.organizerRole || "",
                          staff_coord_phone: selectedEvent.staff_coord_phone || "",
                          student_coord: selectedEvent.student_coord || "",
                          student_coord_phone: selectedEvent.student_coord_phone || "",
                          capacity: String(selectedEvent.capacity),
                          description: selectedEvent.description,
                          tags: selectedEvent.tags.join(", "),
                        });
                        setIsEditing(true);
                        setEditingEventId(selectedEvent.id);
                        setShowForm(true);
                      }}
                    >
                      Edit Event
                    </Button>
                    <Button
                      type="button"
                      className="flex-1 text-white bg-red-600 hover:bg-red-500 border-none"
                      onClick={() => {
                        setDeletingEventId(selectedEvent.id);
                        setDeleteConfirmOpen(true);
                      }}
                    >
                      Delete Event
                    </Button>
                  </div>
                )}
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
                <h3 className="font-black text-slate-900 text-lg font-['Plus_Jakarta_Sans']">
                  {isEditing ? "Edit Department Event" : "Schedule Department Event"}
                </h3>
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
                    {colgDepts.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
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
                  <Input 
                    type="date" 
                    required 
                    min={new Date().toISOString().split("T")[0]}
                    value={form.date} 
                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))} 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Time *</label>
                  <div className="relative">
                    <Input 
                      required 
                      readOnly 
                      value={form.time} 
                      onClick={openClockPicker} 
                      className="cursor-pointer font-bold text-slate-900 bg-white pr-10"
                    />
                    <Clock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Staff Contact Number</label>
                  <Input value={form.staff_coord_phone} onChange={e => setForm(p => ({ ...p, staff_coord_phone: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Student Coordinator</label>
                  <Input value={form.student_coord} onChange={e => setForm(p => ({ ...p, student_coord: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Student Contact Number</label>
                  <Input value={form.student_coord_phone} onChange={e => setForm(p => ({ ...p, student_coord_phone: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Location Venue</label>
                  <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
                </div>
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
                <Button type="submit">{isEditing ? "Save Changes" : "Publish Event"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={() => deletingEventId && handleDeleteEvent(deletingEventId)}
        title="Delete Event"
        description="Are you sure you want to delete this event? This action cannot be undone and will remove all registration records."
        loading={isDeleting}
      />

      {showTimePicker && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setShowTimePicker(false)}>
          <div 
            className="bg-white border border-slate-100 text-slate-900 rounded-[32px] p-6 shadow-2xl space-y-5 w-[290px] animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header: Displays selected time */}
            <div className="text-center space-y-1">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Time</h4>
              <div className="flex items-baseline justify-center gap-1.5 font-['Space_Grotesk'] text-3xl font-black">
                <button
                  type="button"
                  onClick={() => setPickerMode("hours")}
                  className={`transition-colors duration-150 ${
                    pickerMode === "hours" ? "text-[#6C63FF]" : "text-slate-400 hover:text-slate-650"
                  }`}
                >
                  {String(selectedHour).padStart(2, "0")}
                </button>
                <span className="text-slate-300">:</span>
                <button
                  type="button"
                  onClick={() => setPickerMode("minutes")}
                  className={`transition-colors duration-150 ${
                    pickerMode === "minutes" ? "text-[#6C63FF]" : "text-slate-400 hover:text-slate-650"
                  }`}
                >
                  {String(selectedMinute).padStart(2, "0")}
                </button>
                <span className="text-sm font-bold text-slate-400 ml-1 uppercase">{selectedTimeAmPm}</span>
              </div>
            </div>

            {/* Clock Dial Face */}
            <div className="w-[200px] h-[200px] bg-slate-50 border border-slate-100 rounded-full relative mx-auto my-2 shadow-inner">
              {/* Center pivot dot */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#6C63FF] z-20" />

              {/* Hand pointer line */}
              {(() => {
                const rotationAngle = pickerMode === "hours" 
                  ? selectedHour * 30 
                  : (selectedMinute / 5) * 30;
                return (
                  <div 
                    className="absolute bottom-1/2 left-1/2 w-[2px] bg-[#6C63FF]/70 origin-bottom z-10 pointer-events-none transition-transform duration-200"
                    style={{
                      height: "76px",
                      marginLeft: "-1px",
                      transform: `rotate(${rotationAngle}deg)`
                    }}
                  />
                );
              })()}

              {/* Render Numbers */}
              {(pickerMode === "hours" ? CLOCK_HOURS : CLOCK_MINUTES).map(item => {
                const isSelected = pickerMode === "hours" 
                  ? selectedHour === item.val 
                  : selectedMinute === item.val;
                return (
                  <button
                    key={item.val}
                    type="button"
                    style={{ left: `${item.x}px`, top: `${item.y}px` }}
                    onClick={() => handleSelectClockVal(item.val)}
                    className={`absolute w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-black tracking-tighter transition-all duration-150 z-20 ${
                      isSelected 
                        ? "bg-[#6C63FF] text-white font-black scale-110 shadow-md shadow-indigo-150" 
                        : "text-slate-500 hover:bg-slate-200/60 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* AM/PM toggle */}
            <div className="flex bg-slate-50 rounded-2xl p-1 border border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedTimeAmPm("AM")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  selectedTimeAmPm === "AM" 
                    ? "bg-[#6C63FF] text-white shadow-md shadow-indigo-100" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => setSelectedTimeAmPm("PM")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  selectedTimeAmPm === "PM" 
                    ? "bg-[#6C63FF] text-white shadow-md shadow-indigo-100" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                PM
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowTimePicker(false)}
                className="flex-1 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-850 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveClockPickerTime}
                className="flex-1 py-2.5 text-xs font-bold rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white hover:opacity-95 transition-all shadow-md shadow-indigo-100 cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed top-6 right-6 z-[60] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-50/95 border border-emerald-200 text-emerald-900 text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 backdrop-blur-md">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={14} />
            </div>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
