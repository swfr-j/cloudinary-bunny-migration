import PQueue from 'p-queue';
import bcdn from './bunnyNet';
import cloudinary from './cloudinary';
import db from './db';

const queue = new PQueue({ concurrency: 10 });

export const getBatch = async (DB_BATCH_SIZE, count) => {
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const processItem = async (item) => {
    console.log(item);
    console.log("Downloading file");
    await sleep(1000);
}

export const processBatch = async (batch) => {
    for(const item of batch) {
        queue.add(() => processItem(item));
    }

    await queue.onIdle();
};