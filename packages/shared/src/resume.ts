import { z } from "zod";

/**
 * The resume data model.
 *
 * This schema is handed directly to Claude as a structured-output format, so it
 * deliberately avoids value constraints (`.min()`, `.max()`, `.email()`, …).
 * Structured outputs do not support them: the SDK strips them from the schema it
 * sends and then validates the response against the full schema client-side, so a
 * constraint here turns a perfectly good model response into a parse failure
 * rather than a guardrail. Steer content with `.describe()` instead, and enforce
 * business rules (see `resumeReadiness`) as a separate check.
 *
 * Every field is required. "Unknown" is the empty string or the empty array, which
 * keeps the JSON schema unambiguous for the model and means the editor never has to
 * render an undefined branch.
 */

export const LinkSchema = z.object({
  label: z.string().describe("Display text, e.g. 'GitHub', 'LinkedIn', 'Portfolio'."),
  url: z.string().describe("Full URL including scheme."),
});

export const BasicsSchema = z.object({
  name: z.string().describe("The person's full name."),
  headline: z
    .string()
    .describe("One-line professional title, e.g. 'Senior Backend Engineer'. No tagline or slogan."),
  email: z.string(),
  phone: z.string(),
  location: z.string().describe("City and region, e.g. 'Austin, TX'. No street address."),
  links: z.array(LinkSchema),
});

export const ExperienceSchema = z.object({
  company: z.string(),
  role: z.string(),
  location: z.string().describe("City and region, or 'Remote'."),
  startDate: z.string().describe("Month and year, e.g. 'Mar 2022'."),
  endDate: z.string().describe("Month and year, or exactly 'Present' if this is the current role."),
  highlights: z
    .array(z.string())
    .describe(
      "Achievement bullets. Each opens with a strong past-tense verb and states a concrete outcome. One line each.",
    ),
});

export const EducationSchema = z.object({
  institution: z.string(),
  degree: z.string().describe("e.g. 'BSc Computer Science'. Include the field of study."),
  location: z.string(),
  startDate: z.string().describe("Month and year, or just the year."),
  endDate: z.string().describe("Month and year, just the year, or 'Present'."),
  details: z
    .array(z.string())
    .describe("Optional supporting lines: honours, relevant coursework, thesis. Often empty."),
});

export const SkillGroupSchema = z.object({
  category: z.string().describe("Grouping label, e.g. 'Languages', 'Infrastructure'."),
  items: z.array(z.string()).describe("Individual skills. Short noun phrases, not sentences."),
});

export const ProjectSchema = z.object({
  name: z.string(),
  description: z.string().describe("One or two sentences on what it is and what it achieved."),
  url: z.string().describe("Link to the project, or the empty string if there isn't one."),
  highlights: z.array(z.string()).describe("Optional achievement bullets. Often empty."),
});

export const ResumeSchema = z.object({
  basics: BasicsSchema,
  summary: z
    .string()
    .describe("Two to three sentences positioning the candidate. No first-person pronouns."),
  experience: z.array(ExperienceSchema).describe("Most recent role first."),
  education: z.array(EducationSchema).describe("Most recent qualification first."),
  skills: z.array(SkillGroupSchema),
  projects: z.array(ProjectSchema),
});

export type Link = z.infer<typeof LinkSchema>;
export type Basics = z.infer<typeof BasicsSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type SkillGroup = z.infer<typeof SkillGroupSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Resume = z.infer<typeof ResumeSchema>;

/** An entirely blank resume — the starting state for a new document. */
export function emptyResume(): Resume {
  return {
    basics: { name: "", headline: "", email: "", phone: "", location: "", links: [] },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    projects: [],
  };
}

export function emptyExperience(): Experience {
  return { company: "", role: "", location: "", startDate: "", endDate: "", highlights: [""] };
}

export function emptyEducation(): Education {
  return { institution: "", degree: "", location: "", startDate: "", endDate: "", details: [] };
}

export function emptySkillGroup(): SkillGroup {
  return { category: "", items: [] };
}

export function emptyProject(): Project {
  return { name: "", description: "", url: "", highlights: [] };
}

/**
 * Business rules that deliberately live outside `ResumeSchema` (see the note at the
 * top of this file). Used to gate export and to drive the editor's checklist.
 */
export function resumeReadiness(resume: Resume): string[] {
  const problems: string[] = [];
  if (!resume.basics.name.trim()) problems.push("Add your name.");
  if (!resume.basics.email.trim() && !resume.basics.phone.trim()) {
    problems.push("Add at least one way to contact you — an email or a phone number.");
  }
  if (resume.experience.length === 0 && resume.projects.length === 0) {
    problems.push("Add at least one role or project.");
  }
  const rolesWithoutHighlights = resume.experience.filter(
    (role) => role.highlights.every((line) => !line.trim()),
  );
  for (const role of rolesWithoutHighlights) {
    problems.push(`Add at least one bullet to ${role.role || role.company || "an unnamed role"}.`);
  }
  return problems;
}

/** True when the resume is still entirely untouched. Drives the empty-state UI. */
export function isBlankResume(resume: Resume): boolean {
  return (
    !resume.summary.trim() &&
    resume.experience.length === 0 &&
    resume.education.length === 0 &&
    resume.skills.length === 0 &&
    resume.projects.length === 0 &&
    Object.values(resume.basics).every((value) =>
      Array.isArray(value) ? value.length === 0 : !String(value).trim(),
    )
  );
}
