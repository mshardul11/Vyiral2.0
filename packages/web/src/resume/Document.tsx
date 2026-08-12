import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  Link,
} from "@react-pdf/renderer";
import type { Resume } from "@resume/shared";
import { theme } from "./theme";

/**
 * The single rendering of a resume.
 *
 * The editor shows this exact document through <PDFViewer>, and the download
 * button emits this exact document — so what the user sees is literally the PDF,
 * and there is no second HTML template to keep in sync. Text stays real vector
 * text, which means it is selectable and readable by ATS parsers.
 *
 * Note that react-pdf implements a flexbox subset, not full CSS: no grid, no
 * floats, limited selectors. Layout here stays deliberately simple as a result.
 */

const styles = StyleSheet.create({
  page: {
    paddingTop: theme.spacing.page,
    paddingBottom: theme.spacing.page,
    paddingHorizontal: theme.spacing.page,
    fontFamily: theme.fontFamily,
    fontSize: theme.size.body,
    color: theme.color.ink,
    lineHeight: theme.lineHeight,
  },

  name: {
    fontFamily: theme.fontFamilyBold,
    fontSize: theme.size.name,
    letterSpacing: -0.4,
  },
  headline: {
    fontSize: theme.size.headline,
    color: theme.color.muted,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },
  contactItem: {
    fontSize: theme.size.meta,
    color: theme.color.muted,
    marginRight: 8,
  },
  contactSeparator: {
    fontSize: theme.size.meta,
    color: theme.color.faint,
    marginRight: 8,
  },
  link: {
    color: theme.color.muted,
    textDecoration: "none",
  },

  section: {
    marginTop: theme.spacing.section,
  },
  sectionHeading: {
    fontFamily: theme.fontFamilyBold,
    fontSize: theme.size.sectionHeading,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: theme.color.accent,
    paddingBottom: 3,
    borderBottomWidth: 0.75,
    borderBottomColor: theme.color.rule,
    marginBottom: 6,
  },

  entry: {
    marginBottom: theme.spacing.entry,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  entryTitle: {
    fontFamily: theme.fontFamilyBold,
    fontSize: theme.size.body,
    flexShrink: 1,
    paddingRight: 12,
  },
  entryDates: {
    fontSize: theme.size.meta,
    color: theme.color.muted,
    flexShrink: 0,
  },
  entrySubtitle: {
    fontSize: theme.size.meta,
    color: theme.color.muted,
    marginTop: 1,
  },

  bulletRow: {
    flexDirection: "row",
    marginTop: 3,
  },
  bulletGlyph: {
    width: 10,
    color: theme.color.muted,
  },
  bulletText: {
    flex: 1,
  },

  skillRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  skillCategory: {
    fontFamily: theme.fontFamilyBold,
    width: 110,
    flexShrink: 0,
  },
  skillItems: {
    flex: 1,
  },

  summary: {
    marginTop: 2,
  },
});

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bulletRow} wrap={false}>
      <Text style={styles.bulletGlyph}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      {children}
    </View>
  );
}

/** Joins contact details with a separator, skipping the ones that are empty. */
function ContactLine({ resume }: { resume: Resume }) {
  const plain = [resume.basics.location, resume.basics.email, resume.basics.phone].filter(
    (value) => value.trim().length > 0,
  );
  const links = resume.basics.links.filter((link) => link.url.trim().length > 0);
  const total = plain.length + links.length;
  if (total === 0) return null;

  let index = 0;
  const nodes: React.ReactNode[] = [];

  for (const value of plain) {
    if (index > 0) {
      nodes.push(
        <Text key={`sep-${index}`} style={styles.contactSeparator}>
          |
        </Text>,
      );
    }
    nodes.push(
      <Text key={`plain-${index}`} style={styles.contactItem}>
        {value}
      </Text>,
    );
    index += 1;
  }

  for (const link of links) {
    if (index > 0) {
      nodes.push(
        <Text key={`sep-${index}`} style={styles.contactSeparator}>
          |
        </Text>,
      );
    }
    nodes.push(
      <Link key={`link-${index}`} src={link.url} style={[styles.contactItem, styles.link]}>
        {link.label.trim() || link.url}
      </Link>,
    );
    index += 1;
  }

  return <View style={styles.contactRow}>{nodes}</View>;
}

function dateRange(start: string, end: string): string {
  const from = start.trim();
  const to = end.trim();
  if (from && to) return `${from} — ${to}`;
  return from || to;
}

/** Filters out the blank strings the editor leaves behind on empty inputs. */
function filled(values: string[]): string[] {
  return values.filter((value) => value.trim().length > 0);
}

export function ResumeDocument({ resume }: { resume: Resume }) {
  const experience = resume.experience.filter(
    (role) => role.company.trim() || role.role.trim() || filled(role.highlights).length > 0,
  );
  const education = resume.education.filter(
    (item) => item.institution.trim() || item.degree.trim(),
  );
  const skills = resume.skills.filter((group) => filled(group.items).length > 0);
  const projects = resume.projects.filter((project) => project.name.trim());

  return (
    <Document
      title={resume.basics.name ? `${resume.basics.name} — Resume` : "Resume"}
      author={resume.basics.name || undefined}
    >
      <Page size="LETTER" style={styles.page}>
        <View>
          <Text style={styles.name}>{resume.basics.name || "Your name"}</Text>
          {resume.basics.headline.trim() ? (
            <Text style={styles.headline}>{resume.basics.headline}</Text>
          ) : null}
          <ContactLine resume={resume} />
        </View>

        {resume.summary.trim() ? (
          <Section heading="Summary">
            <Text style={styles.summary}>{resume.summary}</Text>
          </Section>
        ) : null}

        {experience.length > 0 ? (
          <Section heading="Experience">
            {experience.map((role, index) => (
              <View key={index} style={styles.entry} wrap={false}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>
                    {role.role.trim() || "Role"}
                    {role.company.trim() ? ` · ${role.company}` : ""}
                  </Text>
                  <Text style={styles.entryDates}>{dateRange(role.startDate, role.endDate)}</Text>
                </View>
                {role.location.trim() ? (
                  <Text style={styles.entrySubtitle}>{role.location}</Text>
                ) : null}
                {filled(role.highlights).map((highlight, bulletIndex) => (
                  <Bullet key={bulletIndex}>{highlight}</Bullet>
                ))}
              </View>
            ))}
          </Section>
        ) : null}

        {projects.length > 0 ? (
          <Section heading="Projects">
            {projects.map((project, index) => (
              <View key={index} style={styles.entry} wrap={false}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{project.name}</Text>
                  {project.url.trim() ? (
                    <Link src={project.url} style={[styles.entryDates, styles.link]}>
                      {project.url.replace(/^https?:\/\//, "")}
                    </Link>
                  ) : null}
                </View>
                {project.description.trim() ? (
                  <Text style={styles.entrySubtitle}>{project.description}</Text>
                ) : null}
                {filled(project.highlights).map((highlight, bulletIndex) => (
                  <Bullet key={bulletIndex}>{highlight}</Bullet>
                ))}
              </View>
            ))}
          </Section>
        ) : null}

        {education.length > 0 ? (
          <Section heading="Education">
            {education.map((item, index) => (
              <View key={index} style={styles.entry} wrap={false}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>
                    {item.degree.trim() || "Qualification"}
                    {item.institution.trim() ? ` · ${item.institution}` : ""}
                  </Text>
                  <Text style={styles.entryDates}>{dateRange(item.startDate, item.endDate)}</Text>
                </View>
                {item.location.trim() ? (
                  <Text style={styles.entrySubtitle}>{item.location}</Text>
                ) : null}
                {filled(item.details).map((detail, detailIndex) => (
                  <Bullet key={detailIndex}>{detail}</Bullet>
                ))}
              </View>
            ))}
          </Section>
        ) : null}

        {skills.length > 0 ? (
          <Section heading="Skills">
            {skills.map((group, index) => (
              <View key={index} style={styles.skillRow} wrap={false}>
                {group.category.trim() ? (
                  <Text style={styles.skillCategory}>{group.category}</Text>
                ) : null}
                <Text style={styles.skillItems}>{filled(group.items).join(" · ")}</Text>
              </View>
            ))}
          </Section>
        ) : null}
      </Page>
    </Document>
  );
}
