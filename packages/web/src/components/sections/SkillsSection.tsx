import { emptySkillGroup } from "@resume/shared";
import { Button, EmptyHint, Field, ItemCard, Section, TextInput } from "../ui";
import { CommaListInput } from "../CommaListInput";
import { moveItem, useResumeStore } from "../../state/resume";

/**
 * Skills are stored as `{ category, items[] }` but edited as a comma-separated
 * string — typing "Go, TypeScript, SQL" is faster than managing a list widget, and
 * the split/join round-trips cleanly.
 */
export function SkillsSection() {
  const skills = useResumeStore((state) => state.resume.skills);
  const edit = useResumeStore((state) => state.edit);
  const addSkillGroup = useResumeStore((state) => state.addSkillGroup);

  return (
    <Section
      title="Skills"
      description="Group related skills so a reader can scan them."
      action={
        <Button variant="ghost" onClick={() => addSkillGroup(emptySkillGroup())}>
          + Add group
        </Button>
      }
    >
      {skills.length === 0 ? <EmptyHint>No skills yet.</EmptyHint> : null}

      {skills.map((group, index) => (
        <ItemCard
          key={index}
          index={index}
          count={skills.length}
          title={group.category || "Untitled group"}
          onMove={(to) => edit((resume) => moveItem(resume.skills, index, to))}
          onRemove={() => edit((resume) => void resume.skills.splice(index, 1))}
        >
          <Field label="Category">
            <TextInput
              value={group.category}
              placeholder="Languages"
              onChange={(value) =>
                edit((resume) => {
                  const target = resume.skills[index];
                  if (target) target.category = value;
                })
              }
            />
          </Field>
          <Field label="Skills" hint="comma separated">
            <CommaListInput
              items={group.items}
              placeholder="Go, TypeScript, Python, SQL"
              onChange={(items) =>
                edit((resume) => {
                  const target = resume.skills[index];
                  if (target) target.items = items;
                })
              }
            />
          </Field>
        </ItemCard>
      ))}
    </Section>
  );
}
