## 0.12.0b0 (2025-04-01)

### Feat

- add support for certified time endpoint (#109)
- update dependencies (#106)
- upgrade to pocketic version 8.0.0 (#96)
- add support get controllers and get topology endpoints
- update dependencies

### Fix

- **pocket-ic-server.ts**: switch from --pid to --port-file for pic server

## 0.10.0 (2024-11-27)

### Feat

- add support for mocking https outcalls

## 0.10.0-b0 (2024-10-07)

### Feat

- upgrade to server v6
- upgrade pic server to v5

## 0.9.0 (2024-07-01)

## 0.9.0-b0 (2024-05-06)

### Feat

- upgrade to pic server v4

## 0.8.1 (2024-04-27)

## 0.8.1-b0 (2024-04-27)

### Fix

- pipe unwanted logs to /dev/null

## 0.8.0 (2024-04-27)

## 0.8.0-b1 (2024-04-22)

### Feat

- add http2 support

## 0.8.0-b0 (2024-04-21)

### Feat

- add logging support
- separate pic server management from instance management

## 0.7.0 (2024-03-17)

## 0.7.0-b0 (2024-03-17)

### Feat

- enable direct canister calls

## 0.6.1 (2024-03-15)

## 0.6.1-b1 (2024-03-15)

### Fix

- get pub key endpoint params encoded incorrectly
- unable to start picjs server on macos
- build docs only when release_latest is successful
- move docs build and deployment to release workflow

## 0.6.1-b0 (2024-03-07)

### Fix

- removed fetchRootKey in favor of getPubKey, which accepts a subnet Id

## 0.6.0 (2024-03-03)

### Feat

- add support for nns subnet init

## 0.5.0 (2024-02-24)

### Feat

- update agent-js and pocket-ic dependencies

## 0.4.0 (2024-02-19)

### Feat

- add canister stop and start methods

## 0.3.0 (2024-02-12)

## 0.3.0-b4 (2024-02-12)

### Fix

- canister settings encoding

## 0.3.0-b3 (2024-02-12)

### Fix

- propogate sender principal correctly when setting up canister

## 0.3.0-b2 (2024-02-12)

## 0.3.0-b1 (2024-02-12)

### Feat

- add update canister settings method
- upgrade to pocket-ic v3
- upgrade to pic server 2.0.1

## 0.3.0-b0 (2024-01-28)

### Feat

- accept ArrayBufferLike instead of Uint8Array to be more compatible with agent-js & co libraries
- throw a more helpful error is devs interact with a pic instance after tearing it down
- add ability to tick multiple times

### Fix

- updated dependencies on dfinity packages
- updated dependencies on dfinity packages

### Refactor

- use auto-generated idl for management canister

## 0.2.1 (2024-01-21)

## 0.2.1-b2 (2024-01-11)

### Feat

- update versions of @dfinity dependencies

## 0.2.1-b1 (2024-01-07)

### Fix

- update file permission for pocket-ic executable in case package manager has moved it

## 0.2.1-b0 (2023-12-14)

### Fix

- client refuses to start on MacOS ARM chips that are also running NodeJS on ARM architecture

## 0.2.0 (2023-11-06)

## 0.2.0-b3 (2023-11-06)

### Fix

- set processing time header on set_stable_memory header
- get stable memory function returning incorrect type

## 0.2.0-b2 (2023-11-03)

### Feat

- add functions to get and set stable memory

## 0.2.0-b1 (2023-11-02)

### Feat

- add canister code management functions

## 0.2.0-b0 (2023-11-02)

### Feat

- add deterministic and random identity generation functions
- add method to set identity on actor

## 0.1.0 (2023-11-02)

### Feat

- include pic binary in package using postinstall script
- initial commit
