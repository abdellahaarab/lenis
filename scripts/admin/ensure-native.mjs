// npm lockfiles created on Windows can omit sharp's Linux optional packages.
// Verify the runtime before publishing; Linux binaries are explicit optional dependencies.
try {
  await import('sharp');
} catch (error) {
  throw new Error('sharp runtime is missing. Install dependencies with npm ci --include=optional for the target platform before building.', {cause:error});
}
