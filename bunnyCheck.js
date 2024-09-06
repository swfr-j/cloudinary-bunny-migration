import axios from "axios";
import { getBCDNPGRecords, getBCDNBatch, sleep } from "./helpers";
import logger from "./logger";
import PQueue from "p-queue";

const queue = new PQueue({ concurrency: 10, timeout: 1000, throwOnTimeout: true });

const processBatch = async (public_id, bunny_url) => {
  if (!bunny_url) {
    return;
  }
  try {
    const res = await axios.head(bunny_url);

    if (res.status !== 200) {
      throw new Error(`Url not working: ${bunny_url} with public id ${public_id}`);
    }
    logger.info(`Url working: ${bunny_url}`);
  } catch (error) {
    logger.error(`Error checking URL: ${bunny_url} with public id ${public_id}, ${error.message}`);
  }
};

const main = async () => {
  const BATCH_SIZE = 1000;
  let count = 0;

  let total = await getBCDNPGRecords();
  total = total[0].count;
  logger.info(`Total records: ${total}`);

  do {
    logger.info(`Fetching batch with offset ${count}`);
    let batch;
    batch = await getBCDNBatch(count, BATCH_SIZE);
    count += BATCH_SIZE;

    logger.info(`Processing batch with size ${batch.length}`);
    
    for (const item of batch) {
      queue.add(() => processBatch(item.id, item.url));
    }
    await queue.onIdle();
    await sleep(5000);
  } while (count <= total);
};

main().catch((error) => {
  logger.error("Error processing CSV:", error);
});
