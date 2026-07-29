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

  /**
   * Path to the PocketIC server binary.
   * Defaults to the `POCKET_IC_BIN` environment variable if set,
   * otherwise the binary downloaded by this package's install script.
   */
  binPath?: string;

  /**
   * Time to live of the server in seconds since the last completed operation,
   * after which the server shuts down gracefully.
   * Must be a non-negative integer.
   * If not provided, the server's default time to live is used.
   */
  ttl?: number;
}
