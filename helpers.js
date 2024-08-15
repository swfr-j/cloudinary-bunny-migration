import PQueue from 'p-queue';
import bcdn from './bunnyNet';
import cloudinary from './cloudinary';
import path from 'path';    
import axios from 'axios';
import { csvWriter } from './csvHelpers';
import logger from './logger';

const queue = new PQueue({ concurrency: 10 });

// export const getBatch = async (DB_BATCH_SIZE, count) => {
//     const query = `
//     SELECT "cloudinaryId", url 
//     FROM files
//     WHERE url LIKE 'https://res.cloudinary.com/nolt%' AND "dateDeleted" IS NULL
//     LIMIT ${DB_BATCH_SIZE}
//     OFFSET ${count};
//     `;

//     const data = await db.query(query, {
//         type: db.QueryTypes.SELECT,
//     });

//     return data;
// };

export const getBatch = async (cursor, DB_BATCH_SIZE, count) => {
    try {
        const resources = await cloudinary.api.resources({
            max_results: DB_BATCH_SIZE,
            next_cursor: cursor
        });
        let nextCursor = resources.next_cursor;

        return [nextCursor, resources.resources];
    } catch (error) {
        logger.error("Failed to fetch resources", error.status, error.message);
    }
}


const processItem = async (item) => {
    const { public_id, format, secure_url: url } = item;
    const bunnyPath = url.replace('https://res.cloudinary.com/', '/cldn/');
    // divide bunnyPath into path and fileName
    const fileName = `${public_id}.${format}`;
    
    let data;
    let file;

    try {
        file = await axios.get(url, {
            responseType: 'arraybuffer',
        });
    } catch (error) {
        logger.error("Download Failed", error.status, error.message); 
    }
    
    try {
        data = await bcdn.uploadFile(file.data, fileName, bunnyPath);
    } catch (error) {
        logger.error("Upload failed", error.status, error.message);
    }

    logger.info("Uploaded: ", url, data);
    const bunnyUrl = data.url;

    const csvFilePath = path.resolve(__dirname, 'data.csv');
    try {
        await csvWriter(csvFilePath).writeRecords([
            { public_id, cloudinary_url: url, bunny_url: bunnyUrl }
        ]);
        logger.info(`Record written to CSV for ${public_id}`);
    } catch(error) {
        logger.error("Failed to write to CSV", error.status, error.message);
    }
}

// to avoid rate limiting
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const processBatch = async (batch) => {
    for(const item of batch) {
        queue.add(() => processItem(item));
    }

    await queue.onIdle();
    await sleep(100);
};