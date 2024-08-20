import { sleep, processPgBatch, getPgBatch, getTotalPgRecords } from './helpers';
import logger from './logger';

logger.info("Starting the process (Postgres)");
const DB_BATCH_SIZE=500; // limit
let count = 0; // offset


const total = await getTotalPgRecords();

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