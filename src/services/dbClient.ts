interface SearchDocument {
  id: string;
  domain: string;
  title: string;
  snippet: string;
}

const defaultCorpus: SearchDocument[] = [
  {
    id: "ops-1",
    domain: "operations",
    title: "Mission launch checklist",
    snippet: "Pre-launch operations checklist, validation gates, and telemetry readiness.",
  },
  {
    id: "eng-1",
    domain: "engineering",
    title: "Fault containment procedure",
    snippet: "Service isolation and rollback process for mission-critical systems.",
  },
  {
    id: "qa-1",
    domain: "assurance",
    title: "Verification matrix",
    snippet: "Traceability between requirements, tests, and evidence artifacts.",
  },
];

export class DbClient {
  public async search(
    query: string,
    options?: { domain?: string; maxResults?: number },
  ): Promise<SearchDocument[]> {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = defaultCorpus.filter((document) => {
      if (options?.domain && document.domain !== options.domain) {
        return false;
      }

      const haystack = `${document.title} ${document.snippet}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });

    return filtered.slice(0, options?.maxResults ?? 5);
  }
}