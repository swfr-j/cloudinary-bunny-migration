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
import { getBatch, processBatch } from './helpers';

const DB_BATCH_SIZE=10; // limit
let count = 0; // offset

// fetch the initial batch
let data = await getBatch(DB_BATCH_SIZE, count);

do {
    // use pqueue to iterate over the batch and download and upload the files
    await processBatch(data);

    // refetch data if the batch size is less than the limit
    count += DB_BATCH_SIZE;
    console.log(`Fetching batch with offset ${count}`);
    break;
    data = await getBatch(DB_BATCH_SIZE, count);    
} while (data.length > 0);

