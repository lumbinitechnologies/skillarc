"""Curated, non-tenant product knowledge for guest Arca conversations."""

PUBLIC_FAQ = [
    {
        "topic": "What SkillArc is",
        "answer": (
            "SkillArc is an academic operating system for institutions. It brings "
            "students, faculty, administrators, programs, departments, schedules, "
            "assignments, attendance, and academic resources into one connected platform."
        ),
    },
    {
        "topic": "Arca AI",
        "answer": (
            "Arca is SkillArc's AI teaching and learning companion. Signed-in users can "
            "ask questions about their permitted course materials and academic context, "
            "such as subjects, schedules, assignments, attendance, and uploaded reference files."
        ),
    },
    {
        "topic": "Student experience",
        "answer": (
            "Students can use SkillArc to view their academic workspace, subjects, "
            "timetable, assignments, attendance information, and approved learning resources."
        ),
    },
    {
        "topic": "Faculty experience",
        "answer": (
            "Faculty can work with assigned subjects and sections, manage or review "
            "academic activities, use teaching resources, and ask Arca about permitted "
            "course and class information."
        ),
    },
    {
        "topic": "Institution administration",
        "answer": (
            "Institution and organization administrators get tools for managing academic "
            "structures, users, departments, programs, schedules, and institution-wide operations."
        ),
    },
    {
        "topic": "Multi-campus security",
        "answer": (
            "SkillArc is designed around role isolation, tenant-aware academic data, and "
            "multi-campus synchronization. Users see information allowed for their account "
            "and institution rather than a shared global academic dataset."
        ),
    },
    {
        "topic": "Getting started",
        "answer": (
            "Visitors can explore SkillArc's public pages and create or use an account from "
            "the sign-in or sign-up flow. After signing in, Arca can answer account-scoped "
            "academic questions."
        ),
    },
]


def faq_context() -> str:
    return "\n\n".join(
        f"[{item['topic']}]\n{item['answer']}" for item in PUBLIC_FAQ
    )
