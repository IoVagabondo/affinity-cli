export const parseJsonArg = <T>(input: string, flagName: string): T => {
  try {
    return JSON.parse(input) as T;
  } catch (error) {
    const baseError = (error as Error).message;
    const preview = input.length > 50 ? input.slice(0, 50) + '...' : input;

    throw new Error(
      `Invalid JSON for ${flagName}: ${baseError}\n` +
        `  Input: ${preview}\n` +
        `  Tip: Ensure proper JSON format, e.g., '{"key":"value"}' with double quotes`
    );
  }
};
