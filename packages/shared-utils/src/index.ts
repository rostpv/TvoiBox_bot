export function maskConnectionString(connectionString: string): string {
  return connectionString.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
}
