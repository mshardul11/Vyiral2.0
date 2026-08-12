import { z } from "zod";

/**
 * Answers collected by the guided-questions wizard. Everything is free text: the
 * point of the wizard is that someone can describe a job in their own words and let
 * the model do the shaping. Sparse answers are expected and must not be padded out
 * with invention — see the generate prompt.
 */

export const IntakeRoleSchema = z.object({
  company: z.string(),
  role: z.string(),
  location: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  /** Free-form. "what did you actually do, and did anything change because of it?" */
  whatYouDid: z.string(),
});

export const IntakeAnswersSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  links: z.string().describe("Free text; one URL per line."),
  targetRole: z.string().describe("The kind of job being applied for."),
  yearsExperience: z.string(),
  roles: z.array(IntakeRoleSchema),
  education: z.string().describe("Free text; one qualification per line."),
  skills: z.string().describe("Free text; comma or newline separated."),
  projects: z.string().describe("Free text; optional."),
});

export type IntakeRole = z.infer<typeof IntakeRoleSchema>;
export type IntakeAnswers = z.infer<typeof IntakeAnswersSchema>;

export function emptyIntakeRole(): IntakeRole {
  return { company: "", role: "", location: "", startDate: "", endDate: "", whatYouDid: "" };
}

export function emptyIntake(): IntakeAnswers {
  return {
    name: "",
    email: "",
    phone: "",
    location: "",
    links: "",
    targetRole: "",
    yearsExperience: "",
    roles: [emptyIntakeRole()],
    education: "",
    skills: "",
    projects: "",
  };
}
