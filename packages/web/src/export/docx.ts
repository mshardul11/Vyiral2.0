import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
  convertInchesToTwip,
} from "docx";
import type { Resume } from "@resume/shared";
import { downloadBlob, resumeFilename } from "./download";

/**
 * DOCX export.
 *
 * This is a second rendering of the same `Resume` object, so it is deliberately kept
 * structurally plain — headings, paragraphs, tab-aligned dates, bullet lists — which
 * keeps it from drifting away from the PDF and keeps Word's own parser happy. Some
 * recruiters and ATS pipelines still prefer DOCX over PDF, which is why both exist.
 */

const PAGE_MARGIN = convertInchesToTwip(0.55);
// Letter width (8.5") minus both margins: where the right-aligned date tab sits.
const CONTENT_WIDTH = convertInchesToTwip(8.5) - PAGE_MARGIN * 2;

const INK = "111827";
const MUTED = "4B5563";
const RULE = "D1D5DB";

/** docx sizes are half-points, so a 9.5pt body is 19. */
const size = {
  name: 44,
  headline: 22,
  sectionHeading: 20,
  body: 19,
  meta: 18,
} as const;

function filled(values: string[]): string[] {
  return values.filter((value) => value.trim().length > 0);
}

function dateRange(start: string, end: string): string {
  const from = start.trim();
  const to = end.trim();
  if (from && to) return `${from} — ${to}`;
  return from || to;
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 2 } },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: size.sectionHeading,
        color: INK,
        characterSpacing: 24,
      }),
    ],
  });
}

/** Entry title on the left, dates flush right against a tab stop. */
function entryHeading(title: string, dates: string): Paragraph {
  return new Paragraph({
    spacing: { before: 120, after: 0 },
    tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
    children: [
      new TextRun({ text: title, bold: true, size: size.body, color: INK }),
      ...(dates
        ? [new TextRun({ text: `\t${dates}`, size: size.meta, color: MUTED })]
        : []),
    ],
  });
}

function subtitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text, size: size.meta, color: MUTED })],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [new TextRun({ text, size: size.body, color: INK })],
  });
}

function contactParagraph(resume: Resume): Paragraph | null {
  const plain = [resume.basics.location, resume.basics.email, resume.basics.phone].filter(
    (value) => value.trim().length > 0,
  );
  const links = resume.basics.links.filter((link) => link.url.trim().length > 0);
  if (plain.length + links.length === 0) return null;

  const children: (TextRun | ExternalHyperlink)[] = [];
  const separator = () =>
    new TextRun({ text: "   |   ", size: size.meta, color: RULE });

  plain.forEach((value, index) => {
    if (index > 0) children.push(separator());
    children.push(new TextRun({ text: value, size: size.meta, color: MUTED }));
  });

  links.forEach((link, index) => {
    if (plain.length > 0 || index > 0) children.push(separator());
    children.push(
      new ExternalHyperlink({
        link: link.url,
        children: [
          new TextRun({
            text: link.label.trim() || link.url,
            size: size.meta,
            color: MUTED,
          }),
        ],
      }),
    );
  });

  return new Paragraph({ spacing: { before: 80, after: 40 }, children });
}

function buildParagraphs(resume: Resume): Paragraph[] {
  const paragraphs: Paragraph[] = [
    new Paragraph({
      spacing: { after: 0 },
      children: [
        new TextRun({
          text: resume.basics.name || "Your name",
          bold: true,
          size: size.name,
          color: INK,
        }),
      ],
    }),
  ];

  if (resume.basics.headline.trim()) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 0 },
        children: [
          new TextRun({ text: resume.basics.headline, size: size.headline, color: MUTED }),
        ],
      }),
    );
  }

  const contact = contactParagraph(resume);
  if (contact) paragraphs.push(contact);

  if (resume.summary.trim()) {
    paragraphs.push(sectionHeading("Summary"));
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: resume.summary, size: size.body, color: INK })],
      }),
    );
  }

  const experience = resume.experience.filter(
    (role) => role.company.trim() || role.role.trim() || filled(role.highlights).length > 0,
  );
  if (experience.length > 0) {
    paragraphs.push(sectionHeading("Experience"));
    for (const role of experience) {
      const title = [role.role.trim() || "Role", role.company.trim()]
        .filter(Boolean)
        .join(" · ");
      paragraphs.push(entryHeading(title, dateRange(role.startDate, role.endDate)));
      if (role.location.trim()) paragraphs.push(subtitle(role.location));
      for (const highlight of filled(role.highlights)) paragraphs.push(bullet(highlight));
    }
  }

  const projects = resume.projects.filter((project) => project.name.trim());
  if (projects.length > 0) {
    paragraphs.push(sectionHeading("Projects"));
    for (const project of projects) {
      paragraphs.push(entryHeading(project.name, project.url.trim()));
      if (project.description.trim()) paragraphs.push(subtitle(project.description));
      for (const highlight of filled(project.highlights)) paragraphs.push(bullet(highlight));
    }
  }

  const education = resume.education.filter(
    (item) => item.institution.trim() || item.degree.trim(),
  );
  if (education.length > 0) {
    paragraphs.push(sectionHeading("Education"));
    for (const item of education) {
      const title = [item.degree.trim() || "Qualification", item.institution.trim()]
        .filter(Boolean)
        .join(" · ");
      paragraphs.push(entryHeading(title, dateRange(item.startDate, item.endDate)));
      if (item.location.trim()) paragraphs.push(subtitle(item.location));
      for (const detail of filled(item.details)) paragraphs.push(bullet(detail));
    }
  }

  const skills = resume.skills.filter((group) => filled(group.items).length > 0);
  if (skills.length > 0) {
    paragraphs.push(sectionHeading("Skills"));
    for (const group of skills) {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            ...(group.category.trim()
              ? [
                  new TextRun({
                    text: `${group.category}:  `,
                    bold: true,
                    size: size.body,
                    color: INK,
                  }),
                ]
              : []),
            new TextRun({
              text: filled(group.items).join(" · "),
              size: size.body,
              color: INK,
            }),
          ],
        }),
      );
    }
  }

  return paragraphs;
}

/** Builds the docx document. Exported separately so tests can inspect it. */
export function buildDocx(resume: Resume): Document {
  return new Document({
    creator: resume.basics.name || "Resume Builder",
    title: resume.basics.name ? `${resume.basics.name} — Resume` : "Resume",
    styles: {
      default: {
        document: {
          run: { font: "Helvetica", size: size.body, color: INK },
          paragraph: { alignment: AlignmentType.LEFT },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: PAGE_MARGIN,
              bottom: PAGE_MARGIN,
              left: PAGE_MARGIN,
              right: PAGE_MARGIN,
            },
          },
        },
        children: buildParagraphs(resume),
      },
    ],
  });
}

export async function downloadDocx(resume: Resume): Promise<void> {
  const blob = await Packer.toBlob(buildDocx(resume));
  downloadBlob(blob, resumeFilename(resume.basics.name, "docx"));
}
