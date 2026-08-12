import { emptyEducation } from "@resume/shared";
import { Button, EmptyHint, Field, ItemCard, Row, Section, TextInput } from "../ui";
import { BulletList } from "../BulletList";
import { moveItem, useResumeStore } from "../../state/resume";

export function EducationSection() {
  const education = useResumeStore((state) => state.resume.education);
  const edit = useResumeStore((state) => state.edit);
  const addEducation = useResumeStore((state) => state.addEducation);

  return (
    <Section
      title="Education"
      action={
        <Button variant="ghost" onClick={() => addEducation(emptyEducation())}>
          + Add qualification
        </Button>
      }
    >
      {education.length === 0 ? <EmptyHint>No qualifications yet.</EmptyHint> : null}

      {education.map((item, index) => (
        <ItemCard
          key={index}
          index={index}
          count={education.length}
          title={item.degree || item.institution || "Untitled qualification"}
          onMove={(to) => edit((resume) => moveItem(resume.education, index, to))}
          onRemove={() => edit((resume) => void resume.education.splice(index, 1))}
        >
          <Row>
            <Field label="Degree" hint="include the field of study">
              <TextInput
                value={item.degree}
                placeholder="BSc Computer Science"
                onChange={(value) =>
                  edit((resume) => {
                    const target = resume.education[index];
                    if (target) target.degree = value;
                  })
                }
              />
            </Field>
            <Field label="Institution">
              <TextInput
                value={item.institution}
                placeholder="University of Illinois"
                onChange={(value) =>
                  edit((resume) => {
                    const target = resume.education[index];
                    if (target) target.institution = value;
                  })
                }
              />
            </Field>
          </Row>
          <Row>
            <Field label="Location">
              <TextInput
                value={item.location}
                placeholder="Urbana, IL"
                onChange={(value) =>
                  edit((resume) => {
                    const target = resume.education[index];
                    if (target) target.location = value;
                  })
                }
              />
            </Field>
            <Field label="Start">
              <TextInput
                value={item.startDate}
                placeholder="2014"
                onChange={(value) =>
                  edit((resume) => {
                    const target = resume.education[index];
                    if (target) target.startDate = value;
                  })
                }
              />
            </Field>
            <Field label="End">
              <TextInput
                value={item.endDate}
                placeholder="2018"
                onChange={(value) =>
                  edit((resume) => {
                    const target = resume.education[index];
                    if (target) target.endDate = value;
                  })
                }
              />
            </Field>
          </Row>

          <BulletList
            label="Details"
            addLabel="+ Add detail"
            values={item.details}
            placeholder="Graduated with honours"
            onChange={(detailIndex, value) =>
              edit((resume) => {
                const target = resume.education[index];
                if (target) target.details[detailIndex] = value;
              })
            }
            onAdd={() =>
              edit((resume) => {
                resume.education[index]?.details.push("");
              })
            }
            onRemove={(detailIndex) =>
              edit((resume) => {
                resume.education[index]?.details.splice(detailIndex, 1);
              })
            }
            onMove={(detailIndex, to) =>
              edit((resume) => {
                const target = resume.education[index];
                if (target) moveItem(target.details, detailIndex, to);
              })
            }
          />
        </ItemCard>
      ))}
    </Section>
  );
}
