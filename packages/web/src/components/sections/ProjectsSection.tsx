import { emptyProject } from "@resume/shared";
import { Button, EmptyHint, Field, ItemCard, Row, Section, TextArea, TextInput } from "../ui";
import { BulletList } from "../BulletList";
import { moveItem, useResumeStore } from "../../state/resume";

export function ProjectsSection() {
  const projects = useResumeStore((state) => state.resume.projects);
  const edit = useResumeStore((state) => state.edit);
  const addProject = useResumeStore((state) => state.addProject);

  return (
    <Section
      title="Projects"
      description="Optional. Useful when your side work says more than your job title."
      action={
        <Button variant="ghost" onClick={() => addProject(emptyProject())}>
          + Add project
        </Button>
      }
    >
      {projects.length === 0 ? <EmptyHint>No projects yet.</EmptyHint> : null}

      {projects.map((project, index) => (
        <ItemCard
          key={index}
          index={index}
          count={projects.length}
          title={project.name || "Untitled project"}
          onMove={(to) => edit((resume) => moveItem(resume.projects, index, to))}
          onRemove={() => edit((resume) => void resume.projects.splice(index, 1))}
        >
          <Row>
            <Field label="Name">
              <TextInput
                value={project.name}
                placeholder="ledgerfmt"
                onChange={(value) =>
                  edit((resume) => {
                    const target = resume.projects[index];
                    if (target) target.name = value;
                  })
                }
              />
            </Field>
            <Field label="Link" hint="optional">
              <TextInput
                type="url"
                value={project.url}
                placeholder="https://github.com/you/project"
                onChange={(value) =>
                  edit((resume) => {
                    const target = resume.projects[index];
                    if (target) target.url = value;
                  })
                }
              />
            </Field>
          </Row>

          <Field label="Description">
            <TextArea
              value={project.description}
              rows={2}
              placeholder="Open-source formatter for double-entry ledger files."
              onChange={(value) =>
                edit((resume) => {
                  const target = resume.projects[index];
                  if (target) target.description = value;
                })
              }
            />
          </Field>

          <BulletList
            label="Highlights"
            values={project.highlights}
            placeholder="Grew to 900+ dependent repositories with no paid promotion."
            onChange={(bulletIndex, value) =>
              edit((resume) => {
                const target = resume.projects[index];
                if (target) target.highlights[bulletIndex] = value;
              })
            }
            onAdd={() =>
              edit((resume) => {
                resume.projects[index]?.highlights.push("");
              })
            }
            onRemove={(bulletIndex) =>
              edit((resume) => {
                resume.projects[index]?.highlights.splice(bulletIndex, 1);
              })
            }
            onMove={(bulletIndex, to) =>
              edit((resume) => {
                const target = resume.projects[index];
                if (target) moveItem(target.highlights, bulletIndex, to);
              })
            }
          />
        </ItemCard>
      ))}
    </Section>
  );
}
