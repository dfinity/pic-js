import { PocketIc, PocketIcServer } from '../src/index.js';
import { writePicUrl, deletePicUrl, readPicUrl } from './test-utils.js';


export async function setup() {
  console.log('Starting test setup...');
  
  // Clean up any existing state first
  await teardown();

  // Start a new server
  console.log('Starting PocketIc server...');
  const picServer = await PocketIcServer.start();
  const url = picServer.getUrl();
  console.log('Server started at:', url);
  
  // Write the URL to the temp file
  await writePicUrl(url);
  console.log('Setup complete, server URL written to temp file');
}

export async function teardown() {
  const url = await readPicUrl();
  if (!url) {
    return;
  }
 const client = await PocketIc.create(url);
  await client.tearDown();
  await deletePicUrl();
}; 
