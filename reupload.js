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
    let batch, batch2, batch3;
    
    logger.warn(`Batch1 Cursor: ${batch.nextCursor}, Batch size: ${batch.resources.length}`);
    batch = await getBatch(nextCursor, DB_BATCH_SIZE);    
    
    if (batch.nextCursor !== undefined) {
        logger.warn(`Batch2 Cursor: ${batch2.nextCursor}, Batch size: ${batch.resources.length}`);
        batch2 = await getBatch(batch.nextCursor, DB_BATCH_SIZE);
    }
    
    if (batch2.nextCursor !== undefined) {
        logger.warn(`Batch3 Cursor: ${batch3.nextCursor}, Batch size: ${batch.resources.length}`);
        batch3 = await getBatch(batch2.nextCursor, DB_BATCH_SIZE);
    }
    
    if (batch.nextCursor === undefined || batch2.nextCursor === undefined || batch3.nextCursor === undefined) {
        breakNextLoop = true;
    }

    // write nextCursor and count to a file
    writeToFile("cursor.txt", `${batch.nextCursor}\n${batch2.nextCursor}\n${batch3.nextCursor}`);
    writeToFile("count.txt", `${count}`);


    // use pqueue to iterate over the batch and download and upload the files
    logger.info(`Processing batch with size ${batch.resources.length} and ${batch2.resources.length} and ${batch3.resources.length}`);
    const processes = [];
    processes.push(processReuploadBatch(batch.resources));
    if (batch2.resources.length > 0) {
        processes.push(processReuploadBatch(batch2.resources));
    } 
    if (batch3.resources.length > 0) {
        processes.push(processReuploadBatch(batch3.resources));
    }
    await Promise.all(processes);

    count += batch.resources.length + batch2.resources.length + batch3.resources.length;
    logger.info("Sleeping for 15 seconds");
    await sleep(15 * 1000); // 15 seconds
} while (!breakNextLoop);

logger.info("Process completed");
logger.info(`Total files processed: ${count}`);