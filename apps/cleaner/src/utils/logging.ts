export function narrate(
  message: string,
  detail?: Record<string, unknown>,
): string {
  if (!detail || Object.keys(detail).length === 0) {
    return message;
  }

  try {
    return `${message} | ${JSON.stringify(detail)}`;
  } catch {
    return `${message} | ${String(detail)}`;
  }
}

