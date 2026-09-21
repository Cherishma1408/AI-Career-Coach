import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export async function parseApiResponse<T = any>(
  res: Response
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  const text = await res.text().catch(() => "");
  let json: any = null;

  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // Body is not valid JSON (e.g. plain text or HTML 500 error from server)
    }
  }

  if (res.ok) {
    return { ok: true, data: (json !== null ? json : text) as T };
  }

  const errorMessage =
    json?.error ||
    json?.message ||
    (text && text.length < 300
      ? text
      : `Server request failed with status code ${res.status}. Please check server logs.`);

  return { ok: false, error: errorMessage, status: res.status };
}
