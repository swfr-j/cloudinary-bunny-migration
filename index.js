// either create a file from cloudinary in json format contianing all the data
// or use db iteration with "like" keyword to find all the entries staring with 
// res.cloudinary.com 
// Get that in batches of 1000 and then use pqueue module to iterate over them
// pqueue concurrency can be set to 10
// in each thread, use axios to get the file from cloudinary and keep it in a buffer
// and then upload to bynnyNet using the uploadFile method
// It should remove the https://res.cloudinary.com/nolt from the url and store the path
// in a seprarate variable passable to the uploadFile method
// Separate the path and fileName from the url and pass it to the uploadFile method
// DB Update will be done from a separate script after all the files are uploaded
// and it should first check if the file is uploaded to bunnyNet and then update the
// DB with the new URL
import { getBatch, processBatch, sleep } from './helpers';
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
    
    const data = batch.resources;
    nextCursor = batch.nextCursor;
    count += data.length;

    // write nextCursor and count to a file
    writeToFile("cursor.txt", nextCursor);
    writeToFile("count.txt", count);


    // use pqueue to iterate over the batch and download and upload the files
    logger.info(`Processing batch with size ${data.length}`);
    await processBatch(data);
    
    // totalCount++;
    // if (totalCount > 6) { 
    //     logger.warn("Breaking the loop for testing");
    //     break; 
    // } // for testing
    // avoid rate limiting

    if (batch.nextCursor === undefined) {
        breakNextLoop = true;
    }

    logger.info("Sleeping for 30 seconds");
    await sleep(30 * 1000); // 30 seconds

    logger.warn(`New cursor: ${batch.nextCursor}, Batch size: ${batch.resources.length}`);
} while (!breakNextLoop);

logger.info("Process completed");
logger.info(`Total files processed: ${count}`);