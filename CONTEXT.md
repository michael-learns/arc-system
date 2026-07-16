# ARQ System

A learning management platform where organizations create and manage courses, assign Facilitators to guide Students, and track learning journeys and progress.

## Language

**Super Admin**:
A platform-level role stored in Convex (not in WorkOS) that can manage all Organizations and platform settings.
_Avoid_: Root user, global admin, owner

**Membership**:
A Convex record that stores a User's domain roles (Admin, Facilitator, Student) within an Organization. WorkOS is the source of truth for who belongs to which org; Membership only stores the domain role layer on top.
_Avoid_: Role, assignment, access

**Enrollment**:
The act of adding a Student to a Classroom. When an Org's enrollment policy is set to **Facilitator-open**, enrolling a Student in a Classroom automatically creates their org-level Membership as a Student. When set to **Org-controlled** (default), the Student must already be an org Member before a Facilitator can enroll them.
_Avoid_: Registration, signup, assignment

**Organization**:
A group or institution that owns courses, manages Facilitators, and enrolls Students.
_Avoid_: Tenant, company, school, church

**Facilitator**:
A person within an Organization who guides Students through courses — managing their own Classroom, inheriting or creating course content, and tracking Student progress.
_Avoid_: Teacher, discipler, instructor, mentor

**Course**:
A structured body of learning content owned by either an Organization or a Facilitator.
_Avoid_: Curriculum, program, module

**Topic**:
A named section within a Course, containing an ordered list of Slides.
_Avoid_: Module, chapter, section, unit

**Slide**:
The smallest unit of content within a Topic — a single piece of learning material (text, media, or Quiz).
_Avoid_: Lesson, card, page, item

**Quiz**:
An assessment embedded in a Slide, containing one or more questions. Supported question types: multiple choice (one correct), multi-select (multiple correct), true/false, and fill-in-the-blank (scored against an author-defined list of accepted answers, case-insensitive). All types are auto-scored.
_Avoid_: Test, assessment, exercise

**Fork**:
A Facilitator-owned copy of an Organization's Course. Frozen at fork time; can be selectively updated from its origin at the Topic level (merge) or replaced entirely (full replace).
_Avoid_: Copy, clone, version, branch

**Contribution**:
A Facilitator's submission of one of their Courses to an Organization for adoption. Upon Admin approval, the Organization receives an independent copy. The Facilitator retains their original. The org's copy persists regardless of the Facilitator's future membership status.
_Avoid_: Share, submit, publish, transfer

**Student**:
A person enrolled in an Organization or assigned to a Facilitator who participates in courses, tracks their own journey, and maintains a personal profile.
_Avoid_: Learner, member, participant

**Note**:
A Student's personal text annotation attached to a specific Slide. Visible only to the Student.
_Avoid_: Journal, reflection, comment, annotation

**Student Log**:
A timestamped log of qualitative entries written by a Facilitator about a specific Student. Private to the Facilitator — not visible to the Student. Scoped to the Facilitator–Student pair, not to any specific Classroom or Course.
_Avoid_: Observation, comment, private note, assessment note

**Classroom**:
A named cohort of Students managed by a Facilitator, assigned to a specific Course. A Facilitator can have multiple Classrooms; a Student can belong to multiple Classrooms across different Courses.
_Avoid_: Group, class, cohort, batch

## Relationships

- A **User** can hold a **Membership** in multiple **Organizations** with different domain roles in each
- WorkOS is the source of truth for authentication only; Convex stores app-specific profile data, Organizations, and domain roles
- A **User**'s identity in Convex is keyed by their WorkOS JWT `tokenIdentifier`
- An **Organization** in Convex is a first-class local domain object; its app settings (e.g. enrollmentPolicy) live in Convex
- An **Organization** owns zero or more **Courses**; a **Facilitator** also owns their own **Courses**
- A **Facilitator** can **Fork** an org **Course**; a Fork is frozen at fork time and syncs at the **Topic** level
- A **Facilitator** can submit a **Contribution** (their Course → an org); Admin approval creates an independent org copy
- A **Facilitator** manages one or more **Classrooms**, each scoped to one **Organization** and one **Course**
- A **Student** can be enrolled in multiple **Classrooms** across different **Courses**
- A **Course** contains ordered **Topics**; a **Topic** contains ordered **Slides**
- A **Slide** is either a content slide (rich text) or a **Quiz** (one or more auto-scored questions)
- A **Student**'s **Note** is attached to a specific **Slide** and is private to the Student
- A **Facilitator**'s **Student Log** entries are attached to a specific Student and are private to the Facilitator

## Flagged ambiguities

- "facilitator / teacher / discipler" — resolved: **Facilitator** is the canonical term for the teaching role.
