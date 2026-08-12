import { emptyExperience } from "@resume/shared";
import { Button, EmptyHint, Field, ItemCard, Row, Section, TextInput } from "../ui";
import { BulletList } from "../BulletList";
import { moveItem, useResumeStore } from "../../state/resume";

export function ExperienceSection() {
  const experience = useResumeStore((state) => state.resume.experience);
  const edit = useResumeStore((state) => state.edit);
  const addExperience = useResumeStore((state) => state.addExperience);

  return (
    <Section
      title="Experience"
      description="Most recent role first."
      action={
        <Button variant="ghost" onClick={() => addExperience(emptyExperience())}>
          + Add role
        </Button>
      }
    >
      {experience.length === 0 ? (
        <EmptyHint>No roles yet. Add one, or import an existing resume.</EmptyHint>
      ) : null}

      {experience.map((role, index) => (
        <ItemCard
          key={index}
          index={index}
          count={experience.length}
          title={role.role || role.company || "Untitled role"}
          onMove={(to) => edit((resume) => moveItem(resume.experience, index, to))}
          onRemove={() => edit((resume) => void resume.experience.splice(index, 1))}
        >
          <Row>
            <Field label="Role">
              <TextInput
                value={role.role}
                placeholder="Senior Backend Engineer"
                onChange={(value) =>
                  edit((resume) => {
                    const target = resume.experience[index];
                    if (target) target.role = value;
                  })
                }
              />
            </Field>
            <Field label="Company">
              <TextInput
                value={role.company}
                placeholder="Northwind Payments"
                onChange={(value) =>
                  edit((resume) => {
                    const target = resume.experience[index];
                    if (target) target.company = value;
                  })
                }
              />
            </Field>
          </Row>
          <Row>
            <Field label="Location">
              <TextInput
                value={role.location}
                placeholder="Remote"
                onChange={(value) =>
                  edit((resume) => {
                    const target = resume.experience[index];
                    if (target) target.location = value;
                  })
                }
              />
            </Field>
            <Field label="Start">
              <TextInput
                value={role.startDate}
                placeholder="Mar 2021"
                onChange={(value) =>
                  edit((resume) => {
                    const target = resume.experience[index];
                    if (target) target.startDate = value;
                  })
                }
              />
            </Field>
            <Field label="End" hint="or 'Present'">
              <TextInput
                value={role.endDate}
                placeholder="Present"
                onChange={(value) =>
                  edit((resume) => {
                    const target = resume.experience[index];
                    if (target) target.endDate = value;
                  })
                }
              />
            </Field>
          </Row>

          <BulletList
            label="Achievements"
            values={role.highlights}
            placeholder="Rebuilt the settlement ledger, cutting reconciliation from 9 hours to 20 minutes."
            onChange={(bulletIndex, value) =>
              edit((resume) => {
                const target = resume.experience[index];
                if (target) target.highlights[bulletIndex] = value;
              })
            }
            onAdd={() =>
              edit((resume) => {
                resume.experience[index]?.highlights.push("");
              })
            }
            onRemove={(bulletIndex) =>
              edit((resume) => {
                resume.experience[index]?.highlights.splice(bulletIndex, 1);
              })
            }
            onMove={(bulletIndex, to) =>
              edit((resume) => {
                const target = resume.experience[index];
                if (target) moveItem(target.highlights, bulletIndex, to);
              })
            }
          />
        </ItemCard>
      ))}
    </Section>
  );
}
