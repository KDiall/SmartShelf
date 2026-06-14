const BASE_URL = process.env.PUBLIC_BASE_URL || "https://message.geneline-x.net";
const NAMESPACE = process.env.GENELINE_X_NAMESPACE || "squench";

function messageAuthHeaders() {
  const key = process.env.GENELINE_X_API_KEY;
  if (!key) throw new Error("GENELINE_X_API_KEY is not set");
  return {
    "X-API-Key": key,
    Authorization: `Bearer ${key}`,
  };
}

export async function genelineFetch(path: string, init: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = new Headers(init.headers);
  const a = messageAuthHeaders();
  headers.set("X-API-Key", a["X-API-Key"]);
  headers.set("Authorization", a["Authorization"]);
  return fetch(url, { ...init, headers });
}

export async function enqueueIngestion(input: {
  files: Array<{
    url: string;
    filename: string;
    mime?: string;
    metadata?: Record<string, any>;
  }>;
  namespace: string;
}) {
  const res = await genelineFetch("/api/v1/files/ingest-urls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ingestion request failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<{
    jobs: Array<{ jobId: string; url: string }>;
  }>;
}

export async function getJob(jobId: string): Promise<Record<string, any>> {
  const res = await genelineFetch(`/api/v1/jobs/${jobId}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Job fetch failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  console.log(`[getJob] jobId=${jobId} response:`, JSON.stringify(data));
  return data;
}

export async function embeddingsSearch(input: {
  query: string;
  namespace: string;
  indexName?: string;
  topK?: number;
  filter?: Record<string, any>;
}) {
  const body = {
    query: input.query,
    namespace: input.namespace,
    topK: input.topK ?? 5,
    ...(input.indexName ? { indexName: input.indexName } : {}),
    ...(input.filter ? { filter: input.filter } : {}),
  };
  const res = await genelineFetch("/api/v1/embeddings/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Embeddings search failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<{
    matches: Array<{
      id: string;
      score: number;
      metadata?: Record<string, any>;
    }>;
  }>;
}

export async function deleteFile(input: {
  url?: string;
  fileId?: string;
  namespace?: string;
  indexName?: string;
}): Promise<boolean> {
  if (input.fileId) {
    const key = (messageAuthHeaders() as any)["X-API-Key"] as string;
    const path = `/api/v1/files/${encodeURIComponent(input.fileId)}?api_key=${encodeURIComponent(key)}`;
    const body = JSON.stringify({
      ...(input.namespace ? { namespace: input.namespace } : {}),
      ...(input.indexName ? { indexName: input.indexName } : {}),
    });
    const res = await genelineFetch(path, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Delete file by id failed: ${res.status} ${text}`);
    }
    const j = (await res.json().catch(() => ({}))) as any;
    return (
      j === true ||
      j?.ok === true ||
      j?.success === true ||
      j?.deleted === true ||
      j?.acknowledged === true ||
      j?.status === "success"
    );
  }

  if (input.url) {
    let lastSeg = input.url;
    try {
      const parsed = new URL(input.url);
      const parts = parsed.pathname.split("/").filter(Boolean);
      lastSeg = parts[parts.length - 1] || input.url;
    } catch {
      const parts = input.url.split("/").filter(Boolean);
      lastSeg = parts[parts.length - 1] || input.url;
    }
    lastSeg = lastSeg.split("?")[0].split("#")[0];
    const derivedFileId = lastSeg.replace(/\.[^./?#]+$/, "");

    const key = (messageAuthHeaders() as any)["X-API-Key"] as string;
    const path = `/api/v1/files/${encodeURIComponent(derivedFileId)}?api_key=${encodeURIComponent(key)}`;
    const body = JSON.stringify({
      ...(input.namespace ? { namespace: input.namespace } : {}),
      ...(input.indexName ? { indexName: input.indexName } : {}),
    });
    const res = await genelineFetch(path, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Delete file by url-derived id failed: ${res.status} ${text}`);
    }
    const j = (await res.json().catch(() => ({}))) as any;
    return (
      j === true ||
      j?.ok === true ||
      j?.success === true ||
      j?.deleted === true ||
      j?.acknowledged === true ||
      j?.status === "success"
    );
  }

  throw new Error("deleteFile requires url or fileId");
}

export { NAMESPACE };