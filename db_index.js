import { sleep, processPgBatch, getPgBatch, getTotalPgRecords } from './helpers';
import logger from './logger';

logger.info("Starting the process (Postgres)");
const DB_BATCH_SIZE=1000; // limit
let count = 0; // offset


let total = await getTotalPgRecords();

total = total[0].count;

console.log(total);

do {
    logger.info(`Fetching batch with offset ${count}`);
    let batch;
    batch = await getPgBatch(count, DB_BATCH_SIZE);
    count += batch.length;
    
    logger.info(`Processing batch with size ${batch.length}`);
    await processPgBatch(batch);

    sleep(5000);
} while (count <= total);