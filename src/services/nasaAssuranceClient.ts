interface AssuranceClientConfig {
  baseUrl?: string;
  token?: string;
}

const stubRecords: Record<string, Record<string, unknown>> = {
  "REQ-001": {
    requirementId: "REQ-001",
    status: "verified",
    owner: "systems-assurance",
    evidence: ["test-report-17", "analysis-note-3"],
  },
  "REQ-002": {
    requirementId: "REQ-002",
    status: "pending",
    owner: "flight-software",
    evidence: [],
  },
};

export class NasaAssuranceClient {
  public constructor(private readonly config: AssuranceClientConfig) {}

  public async fetchRequirement(
    requirementId: string,
    options?: { includeEvidence?: boolean },
  ): Promise<Record<string, unknown>> {
    if (!this.config.baseUrl || !this.config.token) {
      const record = stubRecords[requirementId] ?? {
        requirementId,
        status: "unknown",
        owner: "unassigned",
        evidence: [],
      };

      if (!options?.includeEvidence) {
        return { ...record, evidence: undefined };
      }

      return record;
    }

    const url = new URL(`/requirements/${encodeURIComponent(requirementId)}`, this.config.baseUrl);
    if (options?.includeEvidence) {
      url.searchParams.set("includeEvidence", "true");
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Assurance lookup failed with status ${response.status}`);
    }

    return (await response.json()) as Record<string, unknown>;
  }
}