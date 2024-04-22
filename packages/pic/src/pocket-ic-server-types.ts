/**
 * Options for starting a PocketIC server.
 */
export interface StartServerOptions {
  /**
   * Whether to pipe the runtimes's logs to the parent process's stdout.
   */
  showRuntimeLogs?: boolean;

  /**
   * Whether to pipe the canister logs to the parent process's stderr.
   */
  showCanisterLogs?: boolean;
}
