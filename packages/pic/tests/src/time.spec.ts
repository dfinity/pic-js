import { addTime, addYears, dateToNanos, TestFixture } from './util';

describe('time', () => {
  let fixture: TestFixture;

  beforeEach(async () => {
    fixture = await TestFixture.create();
  });

  afterEach(async () => {
    await fixture.tearDown();
  });

  it('should set time', async () => {
    const dateToSet = addYears(new Date());
    const timeToSet = dateToNanos(dateToSet);

    const initialTime = await fixture.actor.get_time();

    await fixture.pic.setTime(dateToSet);
    const timeBeforeTick = await fixture.actor.get_time();

    await fixture.pic.tick();
    const finalTime = await fixture.actor.get_time();

    expect(initialTime).toBeLessThan(timeToSet);
    expect(timeBeforeTick).toBeLessThan(timeToSet);
    expect(finalTime).toEqual(timeToSet);
  });

  it('should set certified time', async () => {
    const dateToSet = addYears(new Date());
    const timeToSet = dateToNanos(dateToSet);

    const initialTime = await fixture.actor.get_time();

    await fixture.pic.setCertifiedTime(dateToSet);
    const finalTime = await fixture.actor.get_time();

    expect(initialTime).toBeLessThan(timeToSet);
    expect(finalTime).toEqual(timeToSet);
  });

  it('should reset time', async () => {
    const dateToSet = addYears(new Date());
    const timeToSet = dateToNanos(dateToSet);

    const initialTime = await fixture.actor.get_time();

    jest.useFakeTimers().setSystemTime(dateToSet);
    await fixture.pic.resetTime();
    const timeBeforeTick = await fixture.actor.get_time();

    await fixture.pic.tick();
    const finalTime = await fixture.actor.get_time();

    expect(initialTime).toBeLessThan(timeToSet);
    expect(timeBeforeTick).toBeLessThan(timeToSet);
    expect(finalTime).toEqual(timeToSet);

    jest.useRealTimers();
  });

  it('should reset certified time', async () => {
    const dateToSet = addYears(new Date());
    const timeToSet = dateToNanos(dateToSet);

    const initialTime = await fixture.actor.get_time();

    jest.useFakeTimers().setSystemTime(dateToSet);
    await fixture.pic.resetCertifiedTime();
    const finalTime = await fixture.actor.get_time();

    expect(initialTime).toBeLessThan(timeToSet);
    expect(finalTime).toEqual(timeToSet);

    jest.useRealTimers();
  });

  it('should advance time', async () => {
    const currentDate = new Date();

    const timeToAdvance = 1_000;
    const expectedDate = addTime(currentDate, timeToAdvance);
    const expectedTime = dateToNanos(expectedDate);

    jest.useFakeTimers().setSystemTime(currentDate);
    await fixture.pic.resetTime();
    const initialTime = await fixture.actor.get_time();

    await fixture.pic.advanceTime(timeToAdvance);

    await fixture.pic.tick();
    const finalTime = await fixture.actor.get_time();

    expect(initialTime).toBeLessThan(expectedTime);
    expect(finalTime).toEqual(expectedTime);

    jest.useRealTimers();
  });

  it('should advance certified time', async () => {
    const currentDate = new Date();

    const timeToAdvance = 1_000;
    const expectedDate = addTime(currentDate, timeToAdvance);
    const expectedTime = dateToNanos(expectedDate);

    jest.useFakeTimers().setSystemTime(currentDate);
    await fixture.pic.resetCertifiedTime();
    const initialTime = await fixture.actor.get_time();

    await fixture.pic.advanceCertifiedTime(timeToAdvance);

    const finalTime = await fixture.actor.get_time();

    expect(initialTime).toBeLessThan(expectedTime);
    expect(finalTime).toEqual(expectedTime);

    jest.useRealTimers();
  });
});
