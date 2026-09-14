export interface RunError {
  name: string;
  message: string;
  traceback: string[];
}

export interface RunResponse {
  stdout: string[];
  stderr: string[];
  results: string[]; // results[].text for entries that have text
  error?: RunError;
  durationMs: number;
}
