/**
 * GistHub Gist API Models
 * Strictly aligned with FastAPI Backend schemas (app/schemas/gist.py).
 */

export interface Gist {
  id: number;
  title: string;
  content: string;
  owner_id: number;
}

export type GistRead = Gist;

export interface GistCreatePayload {
  title: string;
  content: string;
}

export interface GistUpdatePayload {
  title?: string | null;
  content?: string | null;
}

export interface GistShareCreatePayload {
  recipient_id: number;
}

export interface GistShareRead {
  id: number;
  gist_id: number;
  recipient_id: number;
}
