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

import PQueue from 'p-queue';
import db from './db';
import bcdn from './bunnyNet';
import cloudinary from './cloudinary';

const queue = new PQueue({ concurrency: 10 });

const DB_BATCH_SIZE=10; // limit
const count = 0; // offset

const getBatch = async () => {
    const query = `
    SELECT "cloudinaryId", url 
    FROM files
    WHERE url LIKE 'https://res.cloudinary.com/nolt%'
    LIMIT ${DB_BATCH_SIZE}
    OFFSET ${count};
    `;

    const data = await db.query(query, {
        type: db.QueryTypes.SELECT,
    });

    return data;
};

let data = await getBatch();
console.log(data);
// do {

// } while (data.length > 0);
