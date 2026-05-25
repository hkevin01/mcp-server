interface JiraClientConfig {
  baseUrl?: string;
  token?: string;
}

interface JiraIssue {
  key: string;
  summary: string;
  status: string;
}

const stubIssues: JiraIssue[] = [
  { key: "MCP-101", summary: "Add transport abstraction", status: "In Progress" },
  { key: "MCP-102", summary: "Wire JSON schema validation", status: "Open" },
  { key: "MCP-103", summary: "Document plugin hook lifecycle", status: "Done" },
];

export class JiraClient {
  public constructor(private readonly config: JiraClientConfig) {}

  public async search(
    query: string,
    options?: { limit?: number; projectKey?: string },
  ): Promise<JiraIssue[]> {
    if (!this.config.baseUrl || !this.config.token) {
      return stubIssues
        .filter((issue) => {
          const haystack = `${issue.key} ${issue.summary}`.toLowerCase();
          const projectMatch = options?.projectKey ? issue.key.startsWith(options.projectKey) : true;
          return projectMatch && haystack.includes(query.toLowerCase());
        })
        .slice(0, options?.limit ?? 10);
    }

    const url = new URL("/rest/api/3/search/jql", this.config.baseUrl);
    url.searchParams.set("jql", query);
    url.searchParams.set("maxResults", String(options?.limit ?? 10));

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Jira search failed with status ${response.status}`);
    }

    const data = (await response.json()) as { issues?: Array<{ key: string; fields?: { summary?: string; status?: { name?: string } } }> };
    return (data.issues ?? []).map((issue) => ({
      key: issue.key,
      summary: issue.fields?.summary ?? "Untitled",
      status: issue.fields?.status?.name ?? "Unknown",
    }));
  }
}