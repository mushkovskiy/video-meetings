export class ApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type ErrorResponseBody = {
  message?: string;
  // ValidateDtoMiddleware puts the actual constraint messages here and
  // leaves `message` as the generic "Validation error".
  detail?: string;
};

function extractErrorMessage(rawBody: string, status: number): string {
  try {
    const body = JSON.parse(rawBody) as ErrorResponseBody;
    if (body.detail) {
      return body.detail;
    }
    if (body.message) {
      return body.message;
    }
  } catch {
    // Response body wasn't JSON — fall back to a generic message below.
  }

  return `Request failed with status ${status}`;
}

async function resolveErrorMessage(response: Response): Promise<string> {
  return extractErrorMessage(await response.text(), response.status);
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(await resolveErrorMessage(response), response.status);
  }

  return response.json() as Promise<T>;
}

export type RegisterPayload = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
};

export type RegisteredUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoggedInUser = {
  email: string;
  token: string;
};

export function registerUser(payload: RegisterPayload): Promise<RegisteredUser> {
  return request<RegisteredUser>('/users/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload: LoginPayload): Promise<LoggedInUser> {
  return request<LoggedInUser>('/users/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type Meeting = {
  id: string;
  title: string;
  description?: string;
  scheduledAt: string;
};

export function getMeetings(token: string): Promise<Meeting[]> {
  return request<Meeting[]>('/meetings', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getMeeting(token: string, meetingId: string): Promise<Meeting> {
  return request<Meeting>(`/meetings/${meetingId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export type RecordingStatus = 'processing' | 'done' | 'failed';

export type Recording = {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  status: RecordingStatus;
  uploadedAt: string;
  transcript?: string;
  failureReason?: string;
};

// A meeting without a recording is a normal state, not an error: 404 -> null.
export async function getRecording(token: string, meetingId: string): Promise<Recording | null> {
  try {
    return await request<Recording>(`/meetings/${meetingId}/recording`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      // The backend also answers 404 for a missing *meeting*; the page loads
      // the meeting separately and surfaces that case itself.
      return null;
    }
    throw error;
  }
}

// XMLHttpRequest instead of fetch: fetch can't report upload progress.
export function uploadRecording(
  token: string,
  meetingId: string,
  file: File,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<Recording> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/meetings/${meetingId}/recording`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as Recording);
        return;
      }
      reject(new ApiError(extractErrorMessage(xhr.responseText, xhr.status), xhr.status));
    };
    xhr.onerror = () => reject(new ApiError('Не удалось связаться с сервером.', 0));
    xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort(), { once: true });

    const body = new FormData();
    body.append('file', file);
    // No Content-Type header: the browser sets multipart/form-data with the boundary.
    xhr.send(body);
  });
}
