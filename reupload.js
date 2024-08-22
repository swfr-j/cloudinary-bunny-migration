// reupload the failed files and document it inside a csv
import { getBatch, processReuploadBatch, sleep } from './helpers';
import logger from './logger';
import fs from 'fs';

logger.info("Starting the process");
const DB_BATCH_SIZE=500; // limit
let count = 0; // offset
let breakNextLoop = false; // 

// read cursor from command line
// bun index.js cursor
let nextCursor;
if (process.argv.length > 2) {
    nextCursor = process.argv[2];
    count = parseInt(process.argv[3]) || 0;
}

const writeToFile = (fileName, data) => {
    fs.writeFile(fileName, data, (err) => {
        if (err) {
            logger.error("Failed to write to file", err);
        }
    });
};

// let totalCount = 0;
do {
    logger.warn(`Fetching batch with offset ${count}`);
    let batch;
    batch = await getBatch(nextCursor, DB_BATCH_SIZE);    
    console.log(batch.resources.length);

    const data = batch.resources;
    nextCursor = batch.nextCursor;
    count += data.length;

    // write nextCursor and count to a file
    writeToFile("cursor.txt", nextCursor);
    writeToFile("count.txt", count);


    // use pqueue to iterate over the batch and download and upload the files
    logger.info(`Processing batch with size ${data.length}`);
    await processReuploadBatch(data);
    
    // totalCount++;
    // if (totalCount > 6) { 
    //     logger.warn("Breaking the loop for testing");
    //     break; 
    // } // for testing
    // avoid rate limiting

    if (batch.nextCursor === undefined) {
        breakNextLoop = true;
    }

    logger.info("Sleeping for 15 seconds");
    await sleep(15 * 1000); // 15 seconds

    logger.warn(`New cursor: ${batch.nextCursor}, Batch size: ${batch.resources.length}`);
} while (!breakNextLoop);

logger.info("Process completed");
logger.info(`Total files processed: ${count}`);