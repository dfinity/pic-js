/**
 * Options for starting a PocketIC server.
 */
export interface StartServerOptions {
  /**
   * Whether to pipe the server's stdout to the parent process's stdout.
   */
  pipeStdout?: boolean;

  /**
   * Whether to pipe the server's stderr to the parent process's stderr.
   */
  pipeStderr?: boolean;
}
