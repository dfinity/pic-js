import { PocketIcServer } from '@dfinity/pic';

declare global {
  var __PIC__: PocketIcServer;

  namespace NodeJS {
    interface ProcessEnv {
      PIC_URL: string;
    }
  }
} 