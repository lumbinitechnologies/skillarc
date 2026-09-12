// src/components/events/events-portal-client.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Calendar as CalIcon, MapPin, User as UserIcon, Users, Search, Plus, Grid, List, CheckCircle2,
  ChevronLeft, ChevronRight, X, Clock, Tag, Brain, BookOpen, Flame, Camera, Image as ImageIcon,
  UploadCloud, Trash2, Download, Maximize2, Sparkles, Loader2, ZoomIn, Eye, AlertCircle,
  Ticket, Printer, Phone, Mail, FileText, Check
} from "lucide-react";
import { Card, Badge, Button, Input, Select, SectionHeader, EmptyState, Skeleton } from "@/components/placements-ui";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

export interface GalleryImage {
  url: string;
  caption?: string;
  uploaded_at?: string;
  uploaded_by?: string;
}

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
  image_url?: string | null;
  gallery_images?: GalleryImage[];
}

const PRESET_BANNERS = [
  { label: "Hackathon & Tech", url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80" },
  { label: "Conference & Stage", url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80" },
  { label: "Workshop & AI", url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80" },
  { label: "Cultural Fest", url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80" },
  { label: "Sports & Athletics", url: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80" },
  { label: "Guest Seminar", url: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80" },
  { label: "Robotics Expo", url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80" },
  { label: "Graduation Gala", url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80" },
];

const parseTime12To24 = (timeStr: string) => {
  if (!timeStr) return "12:00";
  const parts = timeStr.split(" ");
  if (parts.length < 2) return timeStr;
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

const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return new Date(dateStr);
  return new Date(y, m - 1, d);
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
  "computer-science": "#E57D37",
  "mathematics": "#3A6DAF",
  "physics": "#FFB020",
  "chemistry": "#F04438",
  "biology": "#00C2A8",
  "english": "#06b6d4",
  "history": "#ef4444",
};

export default function EventsPortalClient() {
  const pathname = usePathname() || "";
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("student");
  const [institutionId, setInstitutionId] = useState<string | null>(null);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("all");
  const [timelineTab, setTimelineTab] = useState<"active" | "completed">("active");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // UI Toast Message
  const [toastMessage, setToastMessage] = useState("");

  // New Event Form Modal
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
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
    image_url: "",
  });

  // Event Live Preview Modal State
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Gallery Upload Modal State
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [galleryUploadFiles, setGalleryUploadFiles] = useState<File[]>([]);
  const [galleryCaption, setGalleryCaption] = useState("");
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const galleryFileInputRef = useRef<HTMLInputElement | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);

  // Lightbox Image Viewer State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [deletingGalleryUrl, setDeletingGalleryUrl] = useState<string | null>(null);

  // Dynamic Departments from DB
  const [colgDepts, setColgDepts] = useState<{ id: string; name: string }[]>([]);

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

  // Calendar State - Automatically defaults to system current month
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Student Seat Reservation Form State
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservingEvent, setReservingEvent] = useState<EventItem | null>(null);
  const [reservationForm, setReservationForm] = useState({
    name: "",
    email: "",
    rollNo: "",
    phone: "",
    dept: "",
    specialNotes: "",
  });
  const [isSubmittingReservation, setIsSubmittingReservation] = useState(false);

  // Digital Ticket Pass Modal State
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [confirmedTicket, setConfirmedTicket] = useState<{
    ticketId: string;
    eventName: string;
    eventDate: string;
    eventTime: string;
    eventVenue: string;
    attendeeName: string;
    attendeeEmail: string;
    attendeeRollNo: string;
    attendeePhone: string;
    imageUrl?: string | null;
    department?: string;
  } | null>(null);

  // Fetch current user details from Supabase auth
  const [profileLoaded, setProfileLoaded] = useState<boolean>(false);

  useEffect(() => {
    async function getUserDetails() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          setUserEmail(user.email || "");
          const metadataName = (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.name || "";
          if (metadataName) setUserName(metadataName);

          const { data } = await supabase
            .from("users")
            .select("name, email, role, institution_id")
            .eq("id", user.id)
            .single();

          if (data) {
            setUserRole(data.role || "student");
            if (data.name) setUserName(data.name);
            if (data.email) setUserEmail(data.email);
            setInstitutionId(data.institution_id || null);
          }
        }
      } catch (err) {
        console.error("Error getting user profile:", err);
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

  // Robust Role Detection
  const isAdmin = ["super_admin", "org_admin", "institution_admin"].includes(userRole?.toLowerCase()) ||
    pathname.includes("/institution-admin") ||
    pathname.includes("/org-admin") ||
    pathname.includes("/super-admin");

  const isFaculty = ["faculty", "hod", "program_head"].includes(userRole?.toLowerCase()) ||
    pathname.includes("/faculty") ||
    pathname.includes("/hod") ||
    pathname.includes("/program-head");

  const isParent = userRole?.toLowerCase() === "parent" || pathname.includes("/parent");

  const isStudent = !isAdmin && !isFaculty && !isParent;

  const isCoordinator = isAdmin || isFaculty;
  const canReserveSeat = isStudent;

  const getDeptName = (deptId: string) => {
    const match = colgDepts.find(d => d.id === deptId);
    return match ? match.name : (DEPT_NAMES[deptId] || "General");
  };

  const getDeptColor = (deptId: string) => {
    if (DEPT_COLOR_HEX[deptId]) return DEPT_COLOR_HEX[deptId];
    const colors = ["#E57D37", "#3A6DAF", "#00C2A8", "#FFB020", "#F04438", "#06b6d4", "#EAAD62", "#3b82f6"];
    const idx = colgDepts.findIndex(d => d.id === deptId);
    return idx !== -1 ? colors[idx % colors.length] : "#E57D37";
  };

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

  // Fetch Events from Supabase Database with resilient fallbacks
  const fetchEvents = async () => {
    setLoading(true);
    try {
      let data: any[] | null = null;
      let primaryError: any = null;

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
            image_url,
            gallery_images,
            event_registrations (
              user_id
            )
          `);

        if (institutionId) {
          query = query.eq("institution_id", institutionId);
        }

        const res = await query.order("event_date", { ascending: true });
        if (res.error) {
          primaryError = res.error;
        } else {
          data = res.data;
        }
      } catch (err) {
        primaryError = err;
      }

      if (primaryError || !data) {
        try {
          let fbQuery = supabase
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
            fbQuery = fbQuery.eq("institution_id", institutionId);
          }

          const fbRes = await fbQuery.order("event_date", { ascending: true });
          if (!fbRes.error) {
            data = fbRes.data;
          } else {
            let bareQuery = supabase.from("events").select("id, title, description, event_date, venue, created_by");
            if (institutionId) {
              bareQuery = bareQuery.eq("institution_id", institutionId);
            }
            const bareRes = await bareQuery.order("event_date", { ascending: true });
            if (!bareRes.error) {
              data = bareRes.data;
            } else {
              const simpleRes = await supabase.from("events").select("*");
              if (!simpleRes.error) {
                data = simpleRes.data;
              } else {
                console.warn("Could not query events table:", simpleRes.error?.message || simpleRes.error);
                setEvents([]);
                return;
              }
            }
          }
        } catch (tierErr) {
          console.warn("Fallback query encountered error:", tierErr);
        }
      }

      const todayStr = new Date().toISOString().split("T")[0];

      const mapped: EventItem[] = (data || []).map((e: any) => {
        let descText = e.description || "";
        let deptName = "";
        let tagsList: string[] = ["Academic"];
        let staffName = "Staff Coordinator";
        let staffRole = "Faculty";
        let staffPhone = "";
        let studCoord = "";
        let studPhone = "";
        let coverImg = e.image_url || null;
        let galleryImgs: GalleryImage[] = Array.isArray(e.gallery_images) ? e.gallery_images : [];
        
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
            if (!coverImg && json.image_url) {
              coverImg = json.image_url;
            }
            if (galleryImgs.length === 0 && Array.isArray(json.gallery_images)) {
              galleryImgs = json.gallery_images;
            }
          }
        } catch {
          // Plain text fallback
        }

        galleryImgs = galleryImgs.map((g: any) => {
          if (typeof g === "string") {
            return { url: g, uploaded_at: new Date().toISOString() };
          }
          return g;
        });

        let dateVal = todayStr;
        let timeVal = "12:00 PM";
        const rawDate = e.event_date || e.start_time || e.date;
        if (rawDate) {
          const parts = rawDate.split("T");
          dateVal = parts[0] || todayStr;
          if (parts[1]) {
            const time24 = parts[1].slice(0, 5);
            timeVal = formatTime24To12(time24);
          }
        }

        const registeredUsers = Array.isArray(e.event_registrations)
          ? e.event_registrations.map((r: any) => r.user_id)
          : [];

        return {
          id: e.id,
          name: e.title || "Untitled Event",
          department: deptName,
          date: dateVal,
          time: timeVal,
          location: e.venue || e.location || "Campus Hall",
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
          image_url: coverImg,
          gallery_images: galleryImgs,
        };
      });

      setEvents(mapped);
    } catch (err: any) {
      console.error("Error fetching events:", err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileLoaded) {
      fetchEvents();
    }
  }, [profileLoaded]);

  // Timeline Helper (Date comparisons in local timezone)
  const getTimelineStatus = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ev = parseLocalDate(dateStr);
    ev.setHours(0, 0, 0, 0);
    if (ev.getTime() < today.getTime()) return "past";
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

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Open Seat Reservation Modal with Validation
  const handleOpenReservation = (eventItem: EventItem) => {
    const status = getTimelineStatus(eventItem.date);
    if (status === "past") {
      alert("This event has already ended. Seat reservations are closed.");
      return;
    }
    if (status === "today") {
      alert("This event is ongoing today. Online seat reservations are closed.");
      return;
    }
    if (eventItem.filled >= eventItem.capacity) {
      alert("This event is fully booked.");
      return;
    }

    setReservingEvent(eventItem);
    setReservationForm({
      name: userName || "",
      email: userEmail || "",
      rollNo: "",
      phone: "",
      dept: getDeptName(eventItem.department),
      specialNotes: "",
    });
    setShowReservationModal(true);
  };

  // Confirm Seat Reservation
  const handleConfirmReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservingEvent || !userId) {
      alert("You must be logged in as a student to reserve a seat.");
      return;
    }

    if (!reservationForm.name.trim()) {
      alert("Please enter your full name.");
      return;
    }
    if (!reservationForm.email.trim() || !reservationForm.email.includes("@")) {
      alert("Please enter a valid student email address.");
      return;
    }
    if (!reservationForm.rollNo.trim()) {
      alert("Please enter your Student ID / Roll Number.");
      return;
    }
    const cleanPhone = reservationForm.phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      alert("Please enter a valid 10-digit phone number.");
      return;
    }

    if (reservingEvent.filled >= reservingEvent.capacity) {
      alert("Sorry, seats just filled up for this event.");
      return;
    }

    setIsSubmittingReservation(true);
    try {
      const { error } = await supabase
        .from("event_registrations")
        .insert([{ 
          event_id: reservingEvent.id, 
          user_id: userId 
        }]);

      if (error) {
        console.warn("Direct insert error:", error);
      }

      const ticketId = `SKL-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Date.now().toString().slice(-4)}`;

      setEvents(prev => prev.map(e => e.id === reservingEvent.id ? {
        ...e,
        filled: e.filled + 1,
        registeredUsers: [...e.registeredUsers, userId]
      } : e));

      setConfirmedTicket({
        ticketId,
        eventName: reservingEvent.name,
        eventDate: reservingEvent.date,
        eventTime: reservingEvent.time,
        eventVenue: reservingEvent.location,
        attendeeName: reservationForm.name.trim(),
        attendeeEmail: reservationForm.email.trim(),
        attendeeRollNo: reservationForm.rollNo.trim().toUpperCase(),
        attendeePhone: reservationForm.phone.trim(),
        imageUrl: reservingEvent.image_url,
        department: reservingEvent.department,
      });

      setShowReservationModal(false);
      setShowTicketModal(true);
      triggerToast("Seat reserved successfully!");
    } catch (err: any) {
      console.error("Reservation error:", err);
      alert(err?.message || "Failed to confirm reservation.");
    } finally {
      setIsSubmittingReservation(false);
    }
  };

  // Cancel Seat Reservation
  const handleCancelReservation = async (eventId: string) => {
    if (!userId) return;
    if (!confirm("Are you sure you want to cancel your seat reservation for this event?")) return;

    try {
      const { error } = await supabase
        .from("event_registrations")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", userId);

      if (error) {
        console.warn("Delete registration error:", error);
      }

      setEvents(prev => prev.map(e => e.id === eventId ? {
        ...e,
        filled: Math.max(0, e.filled - 1),
        registeredUsers: e.registeredUsers.filter(x => x !== userId)
      } : e));

      triggerToast("Seat reservation cancelled");
    } catch (err) {
      console.error("Cancel reservation error:", err);
      alert("Failed to cancel registration.");
    }
  };

  // Upload Cover Image via File Picker
  const handleCoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit.");
      return;
    }

    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "cover");
      if (editingEventId) {
        formData.append("event_id", editingEventId);
      }

      const res = await fetch("/api/events/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload cover image");
      }

      setForm(prev => ({ ...prev, image_url: data.url }));
      triggerToast("Cover banner uploaded!");
    } catch (err: any) {
      console.error("Cover upload error:", err);
      alert(err.message || "Failed to upload image.");
    } finally {
      setUploadingCover(false);
    }
  };

  // Upload Gallery Images to Event
  const handleGalleryUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || galleryUploadFiles.length === 0) return;

    // Verify event is completed
    if (getTimelineStatus(selectedEvent.date) !== "past") {
      alert("Photos can only be uploaded to completed events.");
      return;
    }

    setUploadingGallery(true);
    try {
      for (const file of galleryUploadFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("event_id", selectedEvent.id);
        formData.append("type", "gallery");
        if (galleryCaption.trim()) {
          formData.append("caption", galleryCaption.trim());
        }

        const res = await fetch("/api/events/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to upload some gallery photos");
        }
      }

      triggerToast(`${galleryUploadFiles.length} photo${galleryUploadFiles.length > 1 ? "s" : ""} added to event gallery!`);
      setGalleryUploadFiles([]);
      setGalleryCaption("");
      setShowGalleryModal(false);
      fetchEvents();
    } catch (err: any) {
      console.error("Gallery upload error:", err);
      alert(err.message || "Error uploading photos.");
    } finally {
      setUploadingGallery(false);
    }
  };

  // Delete Gallery Image
  const handleDeleteGalleryImage = async (imgUrl: string) => {
    if (!selectedEvent) return;
    if (!confirm("Are you sure you want to remove this photo from the gallery?")) return;

    setDeletingGalleryUrl(imgUrl);
    try {
      const res = await fetch("/api/events/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: selectedEvent.id,
          image_url: imgUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete photo");
      }

      triggerToast("Photo removed from gallery");
      if (lightboxOpen) {
        setLightboxOpen(false);
      }
      fetchEvents();
    } catch (err: any) {
      console.error("Delete photo error:", err);
      alert(err.message || "Failed to delete photo.");
    } finally {
      setDeletingGalleryUrl(null);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.date || !form.time || !userId) return;

    const time24 = parseTime12To24(form.time);
    const eventDateStr = `${form.date}T${time24}:00`;
    const selectedDate = new Date(eventDateStr);
    const now = new Date();
    if (selectedDate < now && !isEditing) {
      alert("Event date and time cannot be in the past.");
      return;
    }

    const descPayload = JSON.stringify({
      description: form.description,
      department: form.department,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : ["Event"],
      organizer: form.organizer,
      organizerRole: form.organizerRole,
      staff_coord_phone: form.staff_coord_phone,
      student_coord: form.student_coord,
      student_coord_phone: form.student_coord_phone,
      image_url: form.image_url || null,
    });

    const payload: any = {
      title: form.name,
      description: descPayload,
      event_date: eventDateStr,
      venue: form.location || "Campus Hall",
      created_by: userId,
      institution_id: institutionId,
      image_url: form.image_url || null,
    };

    try {
      if (isEditing && editingEventId) {
        const { error } = await supabase
          .from("events")
          .update(payload)
          .eq("id", editingEventId);

        if (error) {
          delete payload.image_url;
          const { error: err2 } = await supabase
            .from("events")
            .update(payload)
            .eq("id", editingEventId);
          if (err2) throw err2;
        }
        triggerToast("Event successfully updated");
      } else {
        const { error } = await supabase
          .from("events")
          .insert([payload]);

        if (error) {
          delete payload.image_url;
          const { error: err2 } = await supabase
            .from("events")
            .insert([payload]);
          if (err2) throw err2;
        }
        triggerToast("Event successfully scheduled");
      }

      fetchEvents();
      setShowForm(false);
      setShowPreviewModal(false);
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
        image_url: "",
      });
    } catch (err) {
      console.error("Error saving event:", err);
      alert("Failed to save event in database.");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    setIsDeleting(true);
    try {
      await supabase
        .from("event_registrations")
        .delete()
        .eq("event_id", id);

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

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  const jumpToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setSelectedDateStr(todayStr);
    const status = getTimelineStatus(todayStr);
    if (status === "past") {
      setTimelineTab("completed");
    } else {
      setTimelineTab("active");
    }
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

  const currentGallery = selectedEvent?.gallery_images || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <SectionHeader
        title="Department Events & Gallery Portal"
        subtitle="Explore academic conferences, bootcamps, fests, and relive memories in photo galleries"
        action={
          isCoordinator && (
            <Button
              variant="primary"
              className="text-xs flex items-center gap-1.5 shadow-md shadow-amber-200"
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
                  image_url: "",
                });
                setIsEditing(false);
                setEditingEventId(null);
                setShowForm(true);
              }}
            >
              <Plus size={15} /> Schedule Event
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Listing */}
        <div className="lg:col-span-3 space-y-6">
          {/* Top Tab Switcher */}
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
                    ? "bg-white text-[#E57D37] shadow-sm font-black scale-[1.02]"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Flame size={14} className={timelineTab === "active" ? "text-amber-500 fill-amber-500" : "text-slate-400"} />
                <span>Upcoming & Live</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  timelineTab === "active" ? "bg-[#E57D37]/10 text-[#E57D37]" : "bg-slate-200/60 text-slate-500"
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
                <span>Completed & Gallery</span>
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
                placeholder={timelineTab === "active" ? "Search upcoming & live events..." : "Search completed events and photo galleries..."}
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
                  className="bg-[#E57D37]/10 text-[#E57D37] border border-[#E57D37]/20 px-3 py-2 rounded-2xl text-[10px] font-bold hover:bg-[#E57D37]/15 transition-all cursor-pointer"
                >
                  Date: {selectedDateStr} ✕
                </button>
              )}

              <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100/80">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${viewMode === "grid" ? "bg-white text-[#E57D37] shadow-sm font-bold" : "text-slate-400 hover:text-slate-650"}`}
                  title="Grid View"
                >
                  <Grid size={14} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${viewMode === "list" ? "bg-white text-[#E57D37] shadow-sm font-bold" : "text-slate-400 hover:text-slate-650"}`}
                  title="List View"
                >
                  <List size={14} />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-56 rounded-3xl" />)}
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
                const hasGallery = item.gallery_images && item.gallery_images.length > 0;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedEventId(item.id)}
                    className="group block relative bg-white rounded-3xl border border-slate-100 shadow-[0_2px_8px_rgba(15,23,42,0.02)] overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(229,125,55,0.08)] hover:border-amber-100 flex flex-col justify-between"
                  >
                    {/* Cover Banner */}
                    <div className="h-36 relative overflow-hidden flex flex-col justify-between p-4 bg-slate-900">
                      {item.image_url ? (
                        <>
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-black/30" />
                        </>
                      ) : (
                        <div
                          className="absolute inset-0 opacity-95"
                          style={{
                            background: `linear-gradient(135deg, ${getDeptColor(item.department)}ee, ${getDeptColor(item.department)}88)`,
                          }}
                        />
                      )}

                      <div className="relative z-10 flex items-center justify-between w-full">
                        <Badge variant="neutral" className="bg-black/50 text-white backdrop-blur-md border-none text-[10px] font-bold">
                          {getDeptName(item.department)}
                        </Badge>
                        <div className="bg-white/95 text-slate-850 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-white/20 shadow-sm backdrop-blur-md">
                          {status === "today" ? "🔥 Today" : status === "past" ? "Completed" : "Upcoming"}
                        </div>
                      </div>

                      <div className="relative z-10 flex items-center justify-between">
                        {hasGallery && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E57D37]/90 text-white backdrop-blur-md text-[10px] font-black shadow-sm">
                            <Camera size={12} /> {item.gallery_images?.length} Photos
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-[#E57D37] transition-colors duration-250 line-clamp-2">{item.name}</h4>
                        <div className="space-y-1.5 text-xs text-slate-500 font-semibold mt-3">
                          <p className="flex items-center gap-2"><CalIcon size={13} className="text-[#E57D37]/70" /> {item.date}</p>
                          <p className="flex items-center gap-2"><Clock size={13} className="text-[#E57D37]/70" /> {item.time}</p>
                          <p className="flex items-center gap-2"><MapPin size={13} className="text-[#E57D37]/70" /> {item.location}</p>
                        </div>
                      </div>

                      <div className="border-t border-slate-50 pt-4 flex items-center justify-between text-xs text-slate-500 mt-auto">
                        <span className="font-bold text-slate-650 truncate max-w-[120px]">{item.organizer}</span>
                        <span className="font-['Space_Grotesk'] font-bold text-[#E57D37] bg-[#E57D37]/5 border border-[#E57D37]/15 px-2 py-0.5 rounded-md">
                          {status === "past" ? `${item.filled} attended` : `${item.capacity - item.filled} seats left`}
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
                const hasGallery = item.gallery_images && item.gallery_images.length > 0;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedEventId(item.id)}
                    className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-[0_12px_30px_rgba(15,23,42,0.04)] hover:border-amber-100 transition-all duration-200"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-slate-100 shadow-sm"
                      />
                    ) : (
                      <div
                        className="w-2 h-10 rounded-full shrink-0"
                        style={{ backgroundColor: getDeptColor(item.department) }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800 text-sm truncate">{item.name}</h4>
                        {hasGallery && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-black shrink-0">
                            <Camera size={11} /> {item.gallery_images?.length}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">
                        {getDeptName(item.department)} · {item.date} at {item.time} · {item.location}
                      </p>
                    </div>
                    <Badge variant={status === "today" ? "warning" : status === "past" ? "neutral" : "success"}>
                      {status === "today" ? "Today" : status === "past" ? "Completed" : "Upcoming"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Calendar - Automatically opens to current system month */}
        <div className="space-y-6">
          <Card className="p-5 shadow-sm border-slate-100 rounded-3xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-xs font-black tracking-wider text-slate-900 uppercase">{monthNames[month]} {year}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={jumpToToday}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[#E57D37] border border-amber-200/60 rounded-xl text-[10px] font-black transition-colors cursor-pointer"
                  title="Jump to current month & today"
                >
                  Today
                </button>
                <button onClick={prevMonth} className="p-1.5 hover:bg-slate-50 border border-slate-100/80 rounded-xl text-slate-550 transition-colors cursor-pointer" title="Previous Month">
                  <ChevronLeft size={14} />
                </button>
                <button onClick={nextMonth} className="p-1.5 hover:bg-slate-50 border border-slate-100/80 rounded-xl text-slate-550 transition-colors cursor-pointer" title="Next Month">
                  <ChevronRight size={14} />
                </button>
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

                const now = new Date();
                const isToday = now.getFullYear() === yearStr && (now.getMonth() + 1) === (day.getMonth() + 1) && now.getDate() === dayNum;

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
                        ? "bg-[#E57D37] text-white shadow-md shadow-amber-100"
                        : isToday
                        ? "ring-2 ring-[#E57D37]/50 font-black text-[#E57D37] bg-amber-50/60"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span>{dayNum}</span>
                    {hasEvents && !isSelected && (
                      <span className="absolute bottom-1 w-1 h-1 bg-[#E57D37] rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/30 border-amber-100/60 rounded-3xl space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Sparkles size={15} className="text-[#E57D37]" />
              <span>Events & Photo Memories</span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Explore upcoming campus workshops and competitions. Completed events feature high-resolution photo galleries.
            </p>
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
                <button onClick={() => setSelectedEventId(null)} className="p-2 rounded-xl hover:bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              {/* Cover Banner in Drawer */}
              <div className="h-48 w-full rounded-3xl mb-6 relative overflow-hidden flex flex-col justify-end p-5 shadow-inner bg-slate-900">
                {selectedEvent.image_url ? (
                  <>
                    <img
                      src={selectedEvent.image_url}
                      alt={selectedEvent.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-black/20" />
                  </>
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${getDeptColor(selectedEvent.department)}ee, ${getDeptColor(selectedEvent.department)}77)`,
                    }}
                  />
                )}

                <div className="relative z-10 text-white text-xs font-bold drop-shadow-sm flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><MapPin size={14} /> {selectedEvent.location}</span>
                  <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                    {selectedEvent.date}
                  </span>
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
                    <span className="font-['Space_Grotesk'] text-[#E57D37]">{selectedEvent.filled} / {selectedEvent.capacity} filled</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#E57D37] to-[#EAAD62]" style={{ width: `${(selectedEvent.filled / selectedEvent.capacity) * 100}%` }} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {selectedEvent.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 text-[10px] font-bold border border-slate-150">
                      <Tag size={10} className="text-[#E57D37]/70" /> {tag}
                    </span>
                  ))}
                </div>

                {/* 🌟 EVENT PHOTO GALLERY SECTION 🌟 */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Camera size={15} className="text-[#E57D37]" />
                        <span>Event Memories & Photo Gallery</span>
                        {getTimelineStatus(selectedEvent.date) === "past" && (
                          <span className="bg-[#E57D37]/10 text-[#E57D37] text-[10px] px-2 py-0.5 rounded-full font-black">
                            {currentGallery.length}
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {getTimelineStatus(selectedEvent.date) === "past"
                          ? (currentGallery.length > 0 ? "Click any photo to view full-screen lightbox" : "Photos captured during this completed event")
                          : "Photo gallery will open once this event is completed"}
                      </p>
                    </div>

                    {/* Restrict Photo Upload to COMPLETED events only */}
                    {isCoordinator && getTimelineStatus(selectedEvent.date) === "past" && (
                      <Button
                        variant="secondary"
                        className="text-xs py-1.5 px-3 flex items-center gap-1.5 border-amber-200 text-amber-800 bg-amber-50/50 hover:bg-amber-100/60"
                        onClick={() => {
                          setGalleryUploadFiles([]);
                          setGalleryCaption("");
                          setShowGalleryModal(true);
                        }}
                      >
                        <Plus size={13} /> Add Photos
                      </Button>
                    )}
                  </div>

                  {getTimelineStatus(selectedEvent.date) !== "past" ? (
                    <div className="rounded-2xl bg-slate-50 border border-slate-200/70 p-5 text-center space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#E57D37] flex items-center justify-center mx-auto shadow-xs">
                        <Camera size={18} />
                      </div>
                      <p className="text-xs font-bold text-slate-700">Photo Gallery Locked</p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        Post-event photo albums and memories can only be uploaded after the event has completed.
                      </p>
                    </div>
                  ) : currentGallery.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-200 rounded-3xl p-6 text-center space-y-3 bg-slate-50/50">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#E57D37] flex items-center justify-center mx-auto shadow-sm">
                        <ImageIcon size={22} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">No event photos uploaded yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isCoordinator ? "Upload event pictures, awards, and memorable moments." : "Event coordinators will upload pictures soon."}
                        </p>
                      </div>
                      {isCoordinator && (
                        <Button
                          variant="primary"
                          className="text-xs py-1.5 px-3"
                          onClick={() => setShowGalleryModal(true)}
                        >
                          <Camera size={14} className="mr-1.5" /> Upload Event Photos
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {currentGallery.map((img, idx) => (
                        <div
                          key={img.url + idx}
                          onClick={() => {
                            setLightboxIndex(idx);
                            setLightboxOpen(true);
                          }}
                          className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          <img
                            src={img.url}
                            alt={img.caption || `Event photo ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2.5">
                            <div className="flex justify-end">
                              <span className="p-1 rounded-lg bg-black/40 text-white backdrop-blur-md">
                                <ZoomIn size={12} />
                              </span>
                            </div>
                            {img.caption && (
                              <p className="text-[10px] text-white font-semibold line-clamp-2 drop-shadow">
                                {img.caption}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions based on User Role */}
            <div className="border-t border-slate-100 pt-5 mt-8 flex flex-col gap-3">
              {/* 🎓 STUDENT ONLY: Seat Reservation Action */}
              {canReserveSeat && (
                <div>
                  {(() => {
                    const status = getTimelineStatus(selectedEvent.date);
                    const isRegistered = userId && selectedEvent.registeredUsers.includes(userId);
                    const isFull = selectedEvent.filled >= selectedEvent.capacity;

                    if (isRegistered) {
                      return (
                        <div className="space-y-2">
                          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-emerald-800">
                              <CheckCircle2 size={18} className="text-emerald-600" />
                              <div>
                                <p className="text-xs font-black">Your Seat is Reserved!</p>
                                <p className="text-[10px] text-emerald-600 font-semibold">Registration confirmed for this event</p>
                              </div>
                            </div>
                            <Button
                              variant="secondary"
                              className="text-xs py-1 px-2.5 border-emerald-200 text-emerald-800 bg-white hover:bg-emerald-100/50"
                              onClick={() => {
                                setConfirmedTicket({
                                  ticketId: `SKL-REG-${selectedEvent.id.slice(0, 6).toUpperCase()}`,
                                  eventName: selectedEvent.name,
                                  eventDate: selectedEvent.date,
                                  eventTime: selectedEvent.time,
                                  eventVenue: selectedEvent.location,
                                  attendeeName: userName || "Student Attendee",
                                  attendeeEmail: userEmail || "",
                                  attendeeRollNo: "CONFIRMED",
                                  attendeePhone: "",
                                  imageUrl: selectedEvent.image_url,
                                  department: selectedEvent.department,
                                });
                                setShowTicketModal(true);
                              }}
                            >
                              <Ticket size={13} className="mr-1" /> View Pass
                            </Button>
                          </div>

                          {status === "upcoming" && (
                            <button
                              type="button"
                              onClick={() => handleCancelReservation(selectedEvent.id)}
                              className="w-full text-center text-xs font-bold text-red-500 hover:text-red-700 py-1.5 transition-colors cursor-pointer"
                            >
                              Cancel My Reservation
                            </button>
                          )}
                        </div>
                      );
                    }

                    if (status === "past") {
                      return (
                        <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-center">
                          <p className="text-xs font-bold text-slate-500">Event Completed · Registrations Closed</p>
                        </div>
                      );
                    }

                    if (status === "today") {
                      return (
                        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                          <p className="text-xs font-bold text-amber-800">🔥 Event in Progress · Online Registrations Closed</p>
                        </div>
                      );
                    }

                    if (isFull) {
                      return (
                        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-center">
                          <p className="text-xs font-bold text-red-700">Capacity Full · Sold Out</p>
                        </div>
                      );
                    }

                    return (
                      <Button
                        variant="primary"
                        className="w-full py-3 text-sm font-black flex items-center justify-center gap-2 shadow-md shadow-amber-200"
                        onClick={() => handleOpenReservation(selectedEvent)}
                      >
                        <Ticket size={16} /> Reserve My Seat ({selectedEvent.capacity - selectedEvent.filled} left)
                      </Button>
                    );
                  })()}
                </div>
              )}

              {/* 🛠️ ADMIN & FACULTY COORDINATORS: Manage & Edit Tools (NO Reserve Seat) */}
              {isCoordinator && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                    <span>Event Management</span>
                    <span className="font-['Space_Grotesk'] font-bold text-slate-900">
                      {selectedEvent.filled} / {selectedEvent.capacity} Reserved
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1 text-slate-700 border-slate-200 hover:bg-slate-50 text-xs font-bold"
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
                          image_url: selectedEvent.image_url || "",
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
                      className="flex-1 text-white bg-red-600 hover:bg-red-500 border-none text-xs font-bold"
                      onClick={() => {
                        setDeletingEventId(selectedEvent.id);
                        setDeleteConfirmOpen(true);
                      }}
                    >
                      Delete Event
                    </Button>
                  </div>
                </div>
              )}

              {/* 👨‍👩‍👧 PARENT: View Only Notice (NO Reserve Seat) */}
              {isParent && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                  <p className="text-xs font-semibold text-slate-600">
                    Parent Portal: Viewing schedule, venue, and coordinators for student events.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 📝 STUDENT SEAT RESERVATION MODAL */}
      {showReservationModal && reservingEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={() => setShowReservationModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#E57D37] flex items-center justify-center shadow-sm">
                  <Ticket size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-['Plus_Jakarta_Sans']">Reserve Your Seat</h3>
                  <p className="text-xs text-slate-500 font-semibold">{reservingEvent.name}</p>
                </div>
              </div>
              <button onClick={() => setShowReservationModal(false)} className="p-1.5 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmReservation} className="p-6 space-y-4">
              <div className="p-3.5 bg-amber-50/50 border border-amber-200/50 rounded-2xl flex items-center justify-between text-xs font-bold text-amber-900">
                <div className="flex items-center gap-2">
                  <CalIcon size={14} className="text-[#E57D37]" />
                  <span>{reservingEvent.date} · {reservingEvent.time}</span>
                </div>
                <span className="font-['Space_Grotesk'] text-[#E57D37] bg-white px-2.5 py-0.5 rounded-lg shadow-xs">
                  {reservingEvent.capacity - reservingEvent.filled} seats left
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Student Full Name *</label>
                <Input
                  required
                  placeholder="e.g. John Doe"
                  value={reservationForm.name}
                  onChange={e => setReservationForm(p => ({ ...p, name: e.target.value }))}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Student Email *</label>
                  <Input
                    type="email"
                    required
                    placeholder="student@university.edu"
                    value={reservationForm.email}
                    onChange={e => setReservationForm(p => ({ ...p, email: e.target.value }))}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Roll No / Student ID *</label>
                  <Input
                    required
                    placeholder="e.g. 21CS1042"
                    value={reservationForm.rollNo}
                    onChange={e => setReservationForm(p => ({ ...p, rollNo: e.target.value }))}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Contact Phone Number *</label>
                  <Input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={reservationForm.phone}
                    onChange={e => setReservationForm(p => ({ ...p, phone: e.target.value }))}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Department / Branch</label>
                  <Input
                    placeholder="e.g. Computer Science"
                    value={reservationForm.dept}
                    onChange={e => setReservationForm(p => ({ ...p, dept: e.target.value }))}
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Special Dietary / Accessibility Requirements (Optional)</label>
                <Input
                  placeholder="e.g. Wheelchair access, dietary preferences..."
                  value={reservationForm.specialNotes}
                  onChange={e => setReservationForm(p => ({ ...p, specialNotes: e.target.value }))}
                  className="text-xs"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={() => setShowReservationModal(false)} disabled={isSubmittingReservation}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingReservation} className="flex items-center gap-1.5">
                  {isSubmittingReservation ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} /> Confirm Reservation
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🎟️ DIGITAL EVENT PASS / TICKET MODAL */}
      {showTicketModal && confirmedTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4" onClick={() => setShowTicketModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="h-44 relative overflow-hidden flex flex-col justify-between p-5 text-white bg-slate-900">
              {confirmedTicket.imageUrl ? (
                <>
                  <img
                    src={confirmedTicket.imageUrl}
                    alt={confirmedTicket.eventName}
                    className="absolute inset-0 w-full h-full object-cover opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/60 to-black/40" />
                </>
              ) : (
                <div
                  className="absolute inset-0 opacity-95"
                  style={{
                    background: `linear-gradient(135deg, ${getDeptColor(confirmedTicket.department || "")}ee, ${getDeptColor(confirmedTicket.department || "")}88)`,
                  }}
                />
              )}

              <div className="relative z-10 flex items-center justify-between w-full">
                <Badge variant="neutral" className="bg-black/50 text-white backdrop-blur-md border-none text-[10px] font-bold">
                  {getDeptName(confirmedTicket.department || "")}
                </Badge>
                <button
                  onClick={() => setShowTicketModal(false)}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors cursor-pointer backdrop-blur-md"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="relative z-10 flex flex-col items-center justify-center text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-wider mb-1.5">
                  <Ticket size={12} /> Event Entry Pass
                </div>
                <h3 className="text-lg font-black font-['Plus_Jakarta_Sans'] leading-snug drop-shadow-md text-white">{confirmedTicket.eventName}</h3>
                <p className="text-white/90 text-xs font-bold font-['Space_Grotesk'] tracking-widest mt-0.5 drop-shadow">{confirmedTicket.ticketId}</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Date & Time</p>
                  <p className="font-bold text-slate-900">{confirmedTicket.eventDate}</p>
                  <p className="text-slate-600 font-semibold">{confirmedTicket.eventTime}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Venue</p>
                  <p className="font-bold text-slate-900 leading-snug">{confirmedTicket.eventVenue}</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Attendee</span>
                  <span className="font-bold text-slate-900">{confirmedTicket.attendeeName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Roll No / ID</span>
                  <span className="font-['Space_Grotesk'] font-bold text-slate-900">{confirmedTicket.attendeeRollNo}</span>
                </div>
                {confirmedTicket.attendeeEmail && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Email</span>
                    <span className="font-semibold text-slate-600">{confirmedTicket.attendeeEmail}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center gap-2 text-emerald-800 text-xs font-black">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Seat Confirmed & Verified</span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="secondary"
                  className="flex-1 text-xs"
                  onClick={() => window.print()}
                >
                  <Printer size={14} className="mr-1.5" /> Print / Save Pass
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 text-xs"
                  onClick={() => setShowTicketModal(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📸 GALLERY PHOTO UPLOAD MODAL */}
      {showGalleryModal && selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[75] flex items-center justify-center p-4" onClick={() => setShowGalleryModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 text-[#E57D37] flex items-center justify-center">
                  <Camera size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Add Photos to Event Gallery</h3>
                  <p className="text-xs text-slate-500 font-medium">{selectedEvent.name}</p>
                </div>
              </div>
              <button onClick={() => setShowGalleryModal(false)} className="p-1.5 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleGalleryUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Select Photos (Max 10MB each)</label>
                <input
                  ref={galleryFileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={e => {
                    const files = Array.from(e.target.files || []);
                    setGalleryUploadFiles(files);
                  }}
                />

                <div
                  onClick={() => galleryFileInputRef.current?.click()}
                  className="border-2 border-dashed border-amber-200 bg-amber-50/30 hover:bg-amber-50/60 rounded-2xl p-6 text-center cursor-pointer transition-colors space-y-2"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white text-[#E57D37] shadow-sm flex items-center justify-center mx-auto">
                    <UploadCloud size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Click or browse to choose photos</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, WebP, GIF accepted</p>
                  </div>
                </div>

                {galleryUploadFiles.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {galleryUploadFiles.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold">
                        <ImageIcon size={12} className="text-[#E57D37]" />
                        <span className="truncate max-w-[140px]">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setGalleryUploadFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-slate-400 hover:text-red-500 ml-1"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Album Caption / Notes (Optional)</label>
                <Input
                  placeholder="e.g. Winners felicitated at the annual tech symposium"
                  value={galleryCaption}
                  onChange={e => setGalleryCaption(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={() => setShowGalleryModal(false)} disabled={uploadingGallery}>
                  Cancel
                </Button>
                <Button type="submit" disabled={galleryUploadFiles.length === 0 || uploadingGallery} className="flex items-center gap-1.5">
                  {uploadingGallery ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Uploading ({galleryUploadFiles.length})...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={14} /> Upload {galleryUploadFiles.length > 0 ? `(${galleryUploadFiles.length})` : ""}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔍 LIGHTBOX FULLSCREEN IMAGE VIEWER */}
      {lightboxOpen && selectedEvent && currentGallery.length > 0 && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[90] flex flex-col justify-between p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between text-white z-10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold font-['Space_Grotesk']">
                {lightboxIndex + 1} / {currentGallery.length}
              </span>
              <span className="text-sm font-bold text-slate-200 truncate max-w-sm hidden sm:inline">
                {selectedEvent.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={currentGallery[lightboxIndex]?.url}
                target="_blank"
                rel="noreferrer"
                download
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Open/Download Original Image"
              >
                <Download size={16} />
              </a>

              {isCoordinator && (
                <button
                  type="button"
                  onClick={() => handleDeleteGalleryImage(currentGallery[lightboxIndex]?.url)}
                  disabled={deletingGalleryUrl === currentGallery[lightboxIndex]?.url}
                  className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-200 transition-colors cursor-pointer"
                  title="Delete Image"
                >
                  <Trash2 size={16} />
                </button>
              )}

              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Main Photo Center */}
          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            {currentGallery.length > 1 && (
              <button
                type="button"
                onClick={() => setLightboxIndex(prev => (prev > 0 ? prev - 1 : currentGallery.length - 1))}
                className="absolute left-2 sm:left-6 p-3 rounded-full bg-black/60 hover:bg-white/20 text-white backdrop-blur-md transition-all z-20 cursor-pointer"
              >
                <ChevronLeft size={22} />
              </button>
            )}

            <img
              src={currentGallery[lightboxIndex]?.url}
              alt={currentGallery[lightboxIndex]?.caption || `Photo ${lightboxIndex + 1}`}
              className="max-h-[75vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
            />

            {currentGallery.length > 1 && (
              <button
                type="button"
                onClick={() => setLightboxIndex(prev => (prev < currentGallery.length - 1 ? prev + 1 : 0))}
                className="absolute right-2 sm:right-6 p-3 rounded-full bg-black/60 hover:bg-white/20 text-white backdrop-blur-md transition-all z-20 cursor-pointer"
              >
                <ChevronRight size={22} />
              </button>
            )}
          </div>

          {/* Bottom Caption */}
          <div className="text-center text-white z-10 max-w-xl mx-auto" onClick={e => e.stopPropagation()}>
            {currentGallery[lightboxIndex]?.caption && (
              <p className="text-sm font-semibold bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl text-slate-100">
                {currentGallery[lightboxIndex]?.caption}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 👁️ PREVIEW EVENT MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4" onClick={() => setShowPreviewModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#E57D37] flex items-center justify-center shadow-sm">
                  <Eye size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 font-['Plus_Jakarta_Sans']">Event Live Preview</h3>
                    <Badge variant="warning" className="text-[10px] font-black">Draft Preview</Badge>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold">Review your event poster and details before publishing</p>
                </div>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Poster Banner */}
              <div className="h-48 w-full rounded-3xl relative overflow-hidden flex flex-col justify-between p-5 shadow-md bg-slate-900">
                {form.image_url ? (
                  <>
                    <img src={form.image_url} alt="Cover preview" className="absolute inset-0 w-full h-full object-cover opacity-90" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-black/20" />
                  </>
                ) : (
                  <div
                    className="absolute inset-0 opacity-95"
                    style={{
                      background: `linear-gradient(135deg, ${getDeptColor(form.department)}ee, ${getDeptColor(form.department)}88)`,
                    }}
                  />
                )}

                <div className="relative z-10 flex items-center justify-between w-full">
                  <Badge variant="neutral" className="bg-black/50 text-white backdrop-blur-md border-none text-[10px] font-bold">
                    {getDeptName(form.department)}
                  </Badge>
                  <div className="bg-white/95 text-slate-850 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-white/20 shadow-sm backdrop-blur-md">
                    Upcoming
                  </div>
                </div>

                <div className="relative z-10 text-white text-xs font-bold drop-shadow-sm flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><MapPin size={14} /> {form.location || "Campus Venue"}</span>
                  <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                    {form.date || "Date Pending"} · {form.time}
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <h2 className="text-xl font-black font-['Plus_Jakarta_Sans'] text-slate-900 leading-snug">
                  {form.name || "Untitled Event Title"}
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  {form.description || "No description provided yet."}
                </p>
              </div>

              {/* Meta Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-5 text-xs">
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase mb-1">Seats Capacity</p>
                  <p className="text-slate-900 font-bold font-['Space_Grotesk']">{form.capacity || 100} Total Seats</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase mb-1">Staff Coordinator</p>
                  <p className="text-slate-900 font-bold">{form.organizer || "Staff Coordinator"}</p>
                  {form.staff_coord_phone && <p className="text-slate-500 text-[10px]">📞 {form.staff_coord_phone}</p>}
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase mb-1">Student Coordinator</p>
                  <p className="text-slate-900 font-bold">{form.student_coord || "None Assigned"}</p>
                  {form.student_coord_phone && <p className="text-slate-500 text-[10px]">📞 {form.student_coord_phone}</p>}
                </div>
              </div>

              {/* Tags */}
              {form.tags && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                  {form.tags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 text-[10px] font-bold border border-slate-150">
                      <Tag size={10} className="text-[#E57D37]/70" /> {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Preview Actions */}
            <div className="p-6 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
              <Button variant="secondary" onClick={() => setShowPreviewModal(false)} className="text-xs">
                ← Back to Edit Form
              </Button>
              <Button
                variant="primary"
                onClick={(e) => {
                  setShowPreviewModal(false);
                  handleCreateEvent(e);
                }}
                className="text-xs flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} /> Looks Good, {isEditing ? "Save Changes" : "Publish Event"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Form Scheduling & Editing Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-8 flex flex-col justify-between shadow-2xl border border-slate-100/60 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <CalIcon className="text-[#E57D37]" size={18} />
                <h3 className="font-black text-slate-900 text-lg font-['Plus_Jakarta_Sans']">
                  {isEditing ? "Edit Department Event" : "Schedule Department Event"}
                </h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 border border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-slate-650 rounded-xl transition-all cursor-pointer"><X size={15} /></button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Event Title *</label>
                <Input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>

              {/* Cover Image Uploader & Presets */}
              <div className="space-y-2 p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Event Cover Poster / Banner Image
                </label>

                {form.image_url ? (
                  <div className="relative rounded-2xl overflow-hidden h-32 border border-slate-200 group">
                    <img src={form.image_url} alt="Cover preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => coverFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 shadow-sm cursor-pointer"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(p => ({ ...p, image_url: "" }))}
                        className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-500 shadow-sm cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      ref={coverFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleCoverFileUpload}
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={uploadingCover}
                        onClick={() => coverFileInputRef.current?.click()}
                        className="flex-1 py-3 px-4 rounded-xl border border-dashed border-amber-300 bg-white hover:bg-amber-50/40 text-xs font-bold text-amber-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        {uploadingCover ? (
                          <>
                            <Loader2 size={14} className="animate-spin" /> Uploading Cover...
                          </>
                        ) : (
                          <>
                            <UploadCloud size={15} /> Upload Custom Poster
                          </>
                        )}
                      </button>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Or Choose Quick Preset Banner:</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {PRESET_BANNERS.map(b => (
                          <button
                            key={b.url}
                            type="button"
                            onClick={() => setForm(p => ({ ...p, image_url: b.url }))}
                            className="relative h-12 rounded-xl overflow-hidden border border-slate-200 hover:border-[#E57D37] hover:scale-105 transition-all text-left cursor-pointer"
                            title={b.label}
                          >
                            <img src={b.url} alt={b.label} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-end p-1">
                              <span className="text-[8px] font-black text-white leading-none truncate">{b.label}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
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
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Tags (comma separated)</label>
                <Input placeholder="Tech, Hackathon, Coding, Web3" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Description & Agenda</label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#E57D37] focus:ring-2 focus:ring-[#E57D37]/10 transition-all"
                  rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (!form.name.trim()) {
                      alert("Please enter an event title before previewing.");
                      return;
                    }
                    setShowPreviewModal(true);
                  }}
                  className="flex items-center gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs cursor-pointer"
                >
                  <Eye size={14} /> Preview Event
                </Button>

                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => setShowForm(false)} className="text-xs cursor-pointer">
                    Cancel
                  </Button>
                  <Button type="submit" className="text-xs font-bold cursor-pointer">
                    {isEditing ? "Save Changes" : "Publish Event"}
                  </Button>
                </div>
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
                  className={`transition-colors duration-150 cursor-pointer ${
                    pickerMode === "hours" ? "text-[#E57D37]" : "text-slate-400 hover:text-slate-650"
                  }`}
                >
                  {String(selectedHour).padStart(2, "0")}
                </button>
                <span className="text-slate-300">:</span>
                <button
                  type="button"
                  onClick={() => setPickerMode("minutes")}
                  className={`transition-colors duration-150 cursor-pointer ${
                    pickerMode === "minutes" ? "text-[#E57D37]" : "text-slate-400 hover:text-slate-650"
                  }`}
                >
                  {String(selectedMinute).padStart(2, "0")}
                </button>
                <span className="text-sm font-bold text-slate-400 ml-1 uppercase">{selectedTimeAmPm}</span>
              </div>
            </div>

            {/* Clock Dial Face */}
            <div className="w-[200px] h-[200px] bg-slate-50 border border-slate-100 rounded-full relative mx-auto my-2 shadow-inner">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#E57D37] z-20" />

              {(() => {
                const rotationAngle = pickerMode === "hours" 
                  ? selectedHour * 30 
                  : (selectedMinute / 5) * 30;
                return (
                  <div 
                    className="absolute bottom-1/2 left-1/2 w-[2px] bg-[#E57D37]/70 origin-bottom z-10 pointer-events-none transition-transform duration-200"
                    style={{
                      height: "76px",
                      marginLeft: "-1px",
                      transform: `rotate(${rotationAngle}deg)`
                    }}
                  />
                );
              })()}

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
                    className={`absolute w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-black tracking-tighter transition-all duration-150 z-20 cursor-pointer ${
                      isSelected 
                        ? "bg-[#E57D37] text-white font-black scale-110 shadow-md shadow-amber-150" 
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
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  selectedTimeAmPm === "AM" 
                    ? "bg-[#E57D37] text-white shadow-md shadow-amber-100" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => setSelectedTimeAmPm("PM")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  selectedTimeAmPm === "PM" 
                    ? "bg-[#E57D37] text-white shadow-md shadow-amber-100" 
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
                className="flex-1 py-2.5 text-xs font-bold rounded-2xl bg-[#E57D37] text-white hover:opacity-95 transition-all shadow-md shadow-amber-100 cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed top-6 right-6 z-[95] animate-in fade-in slide-in-from-top-4 duration-300">
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
