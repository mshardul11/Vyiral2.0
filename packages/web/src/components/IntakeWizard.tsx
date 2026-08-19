import { useState } from "react";
import { emptyIntake, emptyIntakeRole, type IntakeAnswers, type Resume } from "@resume/shared";
import { ApiCallError, generateResume } from "../api/client";
import { Modal } from "./Modal";
import { Button, Field, IconButton, Row, TextArea, TextInput } from "./ui";

/**
 * Guided questions for someone starting from nothing.
 *
 * Three short steps rather than one long form: the point is that describing a job
 * in your own words is easier than filling in resume fields, so the questions are
 * deliberately conversational and every one of them is optional. Sparse answers
 * produce a short resume — the prompt is explicit that gaps are not to be filled by
 * invention.
 */

const STEPS = ["About you", "Your roles", "Everything else"] as const;

export function IntakeWizard({
  hasExistingContent,
  onGenerated,
  onClose,
}: {
  hasExistingContent: boolean;
  onGenerated: (resume: Resume) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<IntakeAnswers>(emptyIntake);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof IntakeAnswers>(key: K, value: IntakeAnswers[K]) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  function setRole(index: number, patch: Partial<IntakeAnswers["roles"][number]>) {
    setAnswers((current) => ({
      ...current,
      roles: current.roles.map((role, i) => (i === index ? { ...role, ...patch } : role)),
    }));
  }

  async function run() {
    setBusy(true);
    setError(null);
    try {
      onGenerated(await generateResume(answers));
    } catch (caught) {
      setError(
        caught instanceof ApiCallError ? caught.message : "The resume could not be generated.",
      );
    } finally {
      setBusy(false);
    }
  }

  const last = step === STEPS.length - 1;

  return (
    <Modal
      wide
      title="Build a resume from a few questions"
      onClose={onClose}
      footer={
        <>
          <span className="modal__note">
            {hasExistingContent
              ? "This replaces what you have now. You can undo it afterwards."
              : `Step ${step + 1} of ${STEPS.length} — every question is optional.`}
          </span>
          <Button onClick={() => (step === 0 ? onClose() : setStep(step - 1))} disabled={busy}>
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          {last ? (
            <Button variant="primary" onClick={() => void run()} disabled={busy}>
              {busy ? "Writing…" : "Build my resume"}
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setStep(step + 1)}>
              Next
            </Button>
          )}
        </>
      }
    >
      <ol className="steps">
        {STEPS.map((label, index) => (
          <li key={label} className={index === step ? "steps__item steps__item--current" : "steps__item"}>
            {label}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <>
          <Row>
            <Field label="Your name">
              <TextInput value={answers.name} onChange={(v) => set("name", v)} placeholder="Priya Raghunathan" />
            </Field>
            <Field label="Email">
              <TextInput type="email" value={answers.email} onChange={(v) => set("email", v)} placeholder="you@example.com" />
            </Field>
          </Row>
          <Row>
            <Field label="Phone">
              <TextInput type="tel" value={answers.phone} onChange={(v) => set("phone", v)} placeholder="+1 (555) 010-0000" />
            </Field>
            <Field label="Location">
              <TextInput value={answers.location} onChange={(v) => set("location", v)} placeholder="Austin, TX" />
            </Field>
          </Row>
          <Row>
            <Field label="What kind of job are you going for?">
              <TextInput value={answers.targetRole} onChange={(v) => set("targetRole", v)} placeholder="Senior backend engineer" />
            </Field>
            <Field label="Years of experience">
              <TextInput value={answers.yearsExperience} onChange={(v) => set("yearsExperience", v)} placeholder="8" />
            </Field>
          </Row>
          <Field label="Links" hint="one per line">
            <TextArea rows={3} value={answers.links} onChange={(v) => set("links", v)} placeholder={"https://github.com/you\nhttps://linkedin.com/in/you"} />
          </Field>
        </>
      ) : null}

      {step === 1 ? (
        <>
          {answers.roles.map((role, index) => (
            <div className="item-card" key={index}>
              <div className="item-card__header">
                <span className="item-card__title">{role.role || role.company || `Role ${index + 1}`}</span>
                {answers.roles.length > 1 ? (
                  <IconButton
                    label="Remove role"
                    variant="danger"
                    onClick={() =>
                      setAnswers((current) => ({
                        ...current,
                        roles: current.roles.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    ×
                  </IconButton>
                ) : null}
              </div>
              <div className="item-card__body">
                <Row>
                  <Field label="Job title">
                    <TextInput value={role.role} onChange={(v) => setRole(index, { role: v })} placeholder="Senior Backend Engineer" />
                  </Field>
                  <Field label="Company">
                    <TextInput value={role.company} onChange={(v) => setRole(index, { company: v })} placeholder="Northwind Payments" />
                  </Field>
                </Row>
                <Row>
                  <Field label="Location">
                    <TextInput value={role.location} onChange={(v) => setRole(index, { location: v })} placeholder="Remote" />
                  </Field>
                  <Field label="Start">
                    <TextInput value={role.startDate} onChange={(v) => setRole(index, { startDate: v })} placeholder="Mar 2021" />
                  </Field>
                  <Field label="End" hint="or 'Present'">
                    <TextInput value={role.endDate} onChange={(v) => setRole(index, { endDate: v })} placeholder="Present" />
                  </Field>
                </Row>
                <Field
                  label="What did you actually do?"
                  hint="plain words are fine — anything that changed because of you"
                >
                  <TextArea
                    rows={5}
                    value={role.whatYouDid}
                    onChange={(v) => setRole(index, { whatYouDid: v })}
                    placeholder="I rewrote how we settle payments so month-end took 20 minutes instead of most of a day. Led four other engineers through it. Also set up the testing that caught a bunch of rounding bugs."
                  />
                </Field>
              </div>
            </div>
          ))}
          <Button
            variant="ghost"
            onClick={() =>
              setAnswers((current) => ({ ...current, roles: [...current.roles, emptyIntakeRole()] }))
            }
          >
            + Add another role
          </Button>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Field label="Education" hint="one qualification per line">
            <TextArea rows={3} value={answers.education} onChange={(v) => set("education", v)} placeholder="BSc Computer Science, University of Illinois, 2014–2018" />
          </Field>
          <Field label="Skills" hint="comma separated — grouping is done for you">
            <TextArea rows={3} value={answers.skills} onChange={(v) => set("skills", v)} placeholder="Go, TypeScript, PostgreSQL, Kafka, Kubernetes, Terraform" />
          </Field>
          <Field label="Projects" hint="optional">
            <TextArea rows={3} value={answers.projects} onChange={(v) => set("projects", v)} placeholder="ledgerfmt — an open-source formatter for ledger files, used by about 900 repos" />
          </Field>
        </>
      ) : null}

      {error ? (
        <p className="modal__error" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
