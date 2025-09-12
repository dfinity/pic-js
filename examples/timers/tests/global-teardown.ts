module.exports = async function (): Promise<void> {
  await global.__PIC__.stop();
};

