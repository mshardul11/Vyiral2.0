import { Button, Field, IconButton, Row, Section, TextArea, TextInput } from "../ui";
import { moveItem, useResumeStore } from "../../state/resume";

export function BasicsSection() {
  const basics = useResumeStore((state) => state.resume.basics);
  const summary = useResumeStore((state) => state.resume.summary);
  const edit = useResumeStore((state) => state.edit);

  return (
    <>
      <Section title="Basics">
        <Row>
          <Field label="Full name">
            <TextInput
              value={basics.name}
              placeholder="Priya Raghunathan"
              onChange={(value) => edit((resume) => void (resume.basics.name = value))}
            />
          </Field>
          <Field label="Headline" hint="One line, e.g. your current title">
            <TextInput
              value={basics.headline}
              placeholder="Senior Backend Engineer"
              onChange={(value) => edit((resume) => void (resume.basics.headline = value))}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Email">
            <TextInput
              type="email"
              value={basics.email}
              placeholder="you@example.com"
              onChange={(value) => edit((resume) => void (resume.basics.email = value))}
            />
          </Field>
          <Field label="Phone">
            <TextInput
              type="tel"
              value={basics.phone}
              placeholder="+1 (555) 010-0000"
              onChange={(value) => edit((resume) => void (resume.basics.phone = value))}
            />
          </Field>
          <Field label="Location" hint="City and region">
            <TextInput
              value={basics.location}
              placeholder="Austin, TX"
              onChange={(value) => edit((resume) => void (resume.basics.location = value))}
            />
          </Field>
        </Row>

        <div className="link-list">
          <div className="link-list__header">
            <span className="field__label">Links</span>
            <Button
              variant="ghost"
              onClick={() =>
                edit((resume) => void resume.basics.links.push({ label: "", url: "" }))
              }
            >
              + Add link
            </Button>
          </div>
          {basics.links.map((link, index) => (
            <div className="link-row" key={index}>
              <TextInput
                value={link.label}
                placeholder="GitHub"
                onChange={(value) =>
                  edit((resume) => {
                    const target = resume.basics.links[index];
                    if (target) target.label = value;
                  })
                }
              />
              <TextInput
                type="url"
                value={link.url}
                placeholder="https://github.com/you"
                onChange={(value) =>
                  edit((resume) => {
                    const target = resume.basics.links[index];
                    if (target) target.url = value;
                  })
                }
              />
              <IconButton
                label="Move up"
                disabled={index === 0}
                onClick={() => edit((resume) => moveItem(resume.basics.links, index, index - 1))}
              >
                ↑
              </IconButton>
              <IconButton
                label="Move down"
                disabled={index === basics.links.length - 1}
                onClick={() => edit((resume) => moveItem(resume.basics.links, index, index + 1))}
              >
                ↓
              </IconButton>
              <IconButton
                label="Remove link"
                variant="danger"
                onClick={() => edit((resume) => void resume.basics.links.splice(index, 1))}
              >
                ×
              </IconButton>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Summary"
        description="Two or three sentences on what you do and what you're known for."
      >
        <TextArea
          value={summary}
          rows={5}
          placeholder="Backend engineer with eight years building payment systems…"
          onChange={(value) => edit((resume) => void (resume.summary = value))}
        />
      </Section>
    </>
  );
}
