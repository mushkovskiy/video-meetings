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

async function resolveErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ErrorResponseBody;
    if (body.detail) {
      return body.detail;
    }
    if (body.message) {
      return body.message;
    }
  } catch {
    // Response body wasn't JSON — fall back to a generic message below.
  }

  return `Request failed with status ${response.status}`;
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
