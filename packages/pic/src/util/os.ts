export function is64Bit(): boolean {
  return process.arch === 'x64';
}

export function isLinux(): boolean {
  return process.platform === 'linux';
}

export function isDarwin(): boolean {
  return process.platform === 'darwin';
}

export function isArm(): boolean {
  return process.arch === 'arm64';
}
