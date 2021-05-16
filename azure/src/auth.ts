import process from "process";
import * as id from "@azure/identity";

export type AzureAuthOptions = Partial<{
  envVarOptions: {
    varName: string;
    varValue: string;
  };
  managedIdentityID: string;
}>;

export const getEnvOrManagedIDAuth = (opts?: AzureAuthOptions) =>
  process.env[opts?.envVarOptions?.varName ?? "NODE_ENV"] ===
  (opts?.envVarOptions?.varValue ?? "DEV")
    ? new id.EnvironmentCredential()
    : opts?.managedIdentityID
    ? new id.ManagedIdentityCredential(opts.managedIdentityID)
    : new id.ManagedIdentityCredential();
