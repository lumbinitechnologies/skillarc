-- Migration 037: Add phone column to users table for faculty (and all users) phone numbers
-- Run this in your Supabase SQL editor

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone TEXT;
