export const parseJsonArg = <T>(input: string, flagName: string): T => {
  try {
    return JSON.parse(input) as T;
  } catch (error) {
    throw new Error(`Invalid JSON for ${flagName}: ${(error as Error).message}`);
  }
};
