import type { Resume } from "@resume/shared";

/**
 * A complete, realistic resume used to exercise the template and the exporters
 * before any AI is wired in. Every section is populated so layout regressions show
 * up immediately.
 */
export const fixtureResume: Resume = {
  basics: {
    name: "Priya Raghunathan",
    headline: "Senior Backend Engineer",
    email: "priya.r@example.com",
    phone: "+1 (415) 555-0142",
    location: "San Francisco, CA",
    links: [
      { label: "GitHub", url: "https://github.com/example" },
      { label: "LinkedIn", url: "https://linkedin.com/in/example" },
    ],
  },
  summary:
    "Backend engineer with eight years building payment and ledger systems at scale. Specialises in correctness-critical services where a rounding error is an incident. Led the migration that moved a 400-endpoint monolith onto event-sourced services without a customer-visible outage.",
  experience: [
    {
      company: "Northwind Payments",
      role: "Senior Backend Engineer",
      location: "San Francisco, CA",
      startDate: "Mar 2021",
      endDate: "Present",
      highlights: [
        "Rebuilt the settlement ledger as an append-only event store, cutting month-end reconciliation from 9 hours to 20 minutes.",
        "Led a six-engineer migration off a 400-endpoint monolith, shipping incrementally with zero customer-visible downtime.",
        "Introduced property-based testing for money arithmetic, catching 14 rounding defects before release.",
        "Mentored four engineers through their first on-call rotations; two have since been promoted.",
      ],
    },
    {
      company: "Cobalt Systems",
      role: "Backend Engineer",
      location: "Remote",
      startDate: "Jun 2018",
      endDate: "Feb 2021",
      highlights: [
        "Designed the idempotency layer behind the public payments API, eliminating duplicate-charge reports entirely.",
        "Cut p99 latency on the authorisation path from 840ms to 190ms by replacing synchronous fraud checks with a scoring cache.",
        "Owned the PCI-DSS audit workstream for the card-storage service across two annual certifications.",
      ],
    },
  ],
  education: [
    {
      institution: "University of Illinois Urbana-Champaign",
      degree: "BSc Computer Science",
      location: "Urbana, IL",
      startDate: "2014",
      endDate: "2018",
      details: ["Graduated with honours", "Teaching assistant, Distributed Systems"],
    },
  ],
  skills: [
    { category: "Languages", items: ["Go", "TypeScript", "Python", "SQL"] },
    { category: "Infrastructure", items: ["PostgreSQL", "Kafka", "Kubernetes", "Terraform", "AWS"] },
    { category: "Practices", items: ["Event sourcing", "Property-based testing", "Incident response"] },
  ],
  projects: [
    {
      name: "ledgerfmt",
      description:
        "Open-source formatter and linter for double-entry ledger files, used by roughly 900 repositories.",
      url: "https://github.com/example/ledgerfmt",
      highlights: [
        "Grew to 900+ dependent repositories with no paid promotion.",
        "Contributed the incremental parser that made sub-100ms formatting possible on 50k-line files.",
      ],
    },
  ],
};
