-- -------------------------------------------------------------
-- SUBJECT ANNOUNCEMENTS & REPLIES
-- -------------------------------------------------------------

CREATE TABLE public.subject_announcements (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  subject_id     uuid,
  faculty_id     uuid,
  institution_id uuid,
  title          text NOT NULL,
  content        text NOT NULL,
  section_ids    uuid[],
  created_at     timestamp DEFAULT now(),
  updated_at     timestamp DEFAULT now(),
  CONSTRAINT subject_announcements_pkey PRIMARY KEY (id),
  CONSTRAINT subject_announcements_subject_id_fkey
    FOREIGN KEY (subject_id) REFERENCES public.subjects(id),
  CONSTRAINT subject_announcements_faculty_id_fkey
    FOREIGN KEY (faculty_id) REFERENCES public.users(id),
  CONSTRAINT subject_announcements_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id)
);

CREATE TABLE public.announcement_replies (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  announcement_id uuid,
  student_id      uuid,
  content         text NOT NULL,
  created_at      timestamp DEFAULT now(),
  CONSTRAINT announcement_replies_pkey PRIMARY KEY (id),
  CONSTRAINT announcement_replies_announcement_id_fkey
    FOREIGN KEY (announcement_id) REFERENCES public.subject_announcements(id),
  CONSTRAINT announcement_replies_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.users(id)
);
