import { IDL } from '@dfinity/candid';

const UpdateElectedReplicaVersionsPayload = IDL.Record({
  release_package_urls: IDL.Vec(IDL.Text),
  replica_versions_to_unelect: IDL.Vec(IDL.Text),
  replica_version_to_elect: IDL.Opt(IDL.Text),
  guest_launch_measurement_sha256_hex: IDL.Opt(IDL.Text),
  release_package_sha256_hex: IDL.Opt(IDL.Text),
});

export interface UpdateElectedReplicaVersionsPayload {
  release_package_urls: Array<string>;
  replica_versions_to_unelect: Array<string>;
  replica_version_to_elect: [] | [string];
  guest_launch_measurement_sha256_hex: [] | [string];
  release_package_sha256_hex: [] | [string];
}

export function encodeUpdateElectedReplicaVersionsPayload(
  arg: UpdateElectedReplicaVersionsPayload,
): ArrayBuffer {
  return IDL.encode([UpdateElectedReplicaVersionsPayload], [arg]);
}

export function optional<T>(type: T | null | undefined): [] | [T] {
  return type === undefined || type === null ? [] : [type];
}
