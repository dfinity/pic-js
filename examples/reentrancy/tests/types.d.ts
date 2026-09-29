import { PocketIcServer } from '@dfinity/pic';

declare global {
  declare var __PIC__: PocketIcServer;

  namespace NodeJS {
    interface ProcessEnv {
      PIC_URL: string;
    }
  }
}
