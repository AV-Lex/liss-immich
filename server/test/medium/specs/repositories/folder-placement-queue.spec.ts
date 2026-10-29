import { Queue, Worker } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { JobName, JobStatus, QueueName } from 'src/enum.js';
import { JobRepository } from 'src/repositories/job.repository.js';
import { BaseService } from 'src/services/base.service.js';
import { newTestService } from 'test/utils.js';

let valkey: StartedTestContainer;
beforeAll(async () => {
  valkey = await new GenericContainer(
    'docker.io/valkey/valkey:9@sha256:c123e3715db63d06d4ad6964884037aa0d5d4d703939b9929954112889708e1d',
  )
    .withExposedPorts(6379)
    .start();
});
afterAll(async () => {
  await valkey?.stop();
});

it('does not coalesce late association into an already active metadata placement job', async () => {
  const connection = { host: valkey.getHost(), port: valkey.getMappedPort(6379) };
  const queue = new Queue(`folder-${randomUUID()}`, { connection, defaultJobOptions: { removeOnComplete: true } });
  const { mocks } = newTestService(BaseService);
  const repository = new JobRepository(
    { get: () => queue } as never,
    mocks.config as never,
    mocks.event as never,
    mocks.logger as never,
  );
  repository['handlers'][JobName.StorageTemplateMigrationSingle] = {
    queueName: QueueName.StorageTemplateMigration,
    jobName: JobName.StorageTemplateMigrationSingle,
    label: 'folder-placement-test',
    handler: async () => JobStatus.Success,
  };
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started!: () => void;
  const active = new Promise<void>((resolve) => {
    started = resolve;
  });
  const seen: boolean[] = [];
  const worker = new Worker(
    queue.name,
    async (job) => {
      seen.push(!!job.data.folderAssociation);
      if (!job.data.folderAssociation) {
        started();
        await blocked;
      }
    },
    { connection },
  );
  try {
    const id = randomUUID();
    await repository.queue({ name: JobName.StorageTemplateMigrationSingle, data: { id } });
    await active;
    await repository.queue({ name: JobName.StorageTemplateMigrationSingle, data: { id, folderAssociation: true } });
    await repository.queue({ name: JobName.StorageTemplateMigrationSingle, data: { id, folderAssociation: true } });
    release();
    await expect.poll(() => seen.length, { timeout: 10_000 }).toBe(3);
    expect(seen).toEqual([false, true, true]);
  } finally {
    release();
    await worker.close();
    await queue.close();
  }
});
