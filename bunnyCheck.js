import axios from "axios";
import { getBCDNPGRecords, getBCDNBatch, sleep } from "./helpers";
import { csvWriter } from "./csvHelpers";
import logger from "./logger";

const processBatch = async (public_id, bunny_url) => {
  if (!bunny_url) {
    return;
  }
  try {
    const res = await axios.head(bunny_url);

    if (res.status !== 200) {
      throw new Error(`Url not working: ${bunny_url}`);
    }
    logger.info(`Url working: ${bunny_url}`);
    await csvWriter("check_bcdn_success.csv").writeRecords([
      { public_id, bunny_url },
    ]);
  } catch (error) {
    logger.error(`Error checking URL: ${bunny_url}, ${error.message}`);
    await csvWriter("check_bcdn_errors.csv").writeRecords([
      { public_id, bunny_url, error: error.message },
    ]);
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
    const promises = [];
    for (const item of batch) {
      promises.push(processBatch(item.public_id, item.bunny_url));
    }

    await Promise.all(promises);

    await sleep(5000);
  } while (count <= total);
};

main().catch((error) => {
  logger.error("Error processing CSV:", error);
});
