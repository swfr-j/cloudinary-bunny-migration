import PQueue from 'p-queue';
import bcdn from './bunnyNet';
import cloudinary from './cloudinary';
import path from 'path';    
import axios from 'axios';
import { csvWriter } from './csvHelpers';
import logger from './logger';

const queue = new PQueue({ concurrency: 10 });

export const getBatch = async (cursor, DB_BATCH_SIZE) => {
    try {
        const resources = await cloudinary.v2.api.resources({
            max_results: DB_BATCH_SIZE,
            next_cursor: cursor
        });
        let nextCursor = resources.next_cursor;

        return { nextCursor, resources: resources.resources };
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
        return;
    }
    
    try {
        data = await bcdn.uploadFile(file.data, fileName, bunnyPath);
    } catch (error) {
        logger.error("Upload failed", error.status, error.message);
    }

    logger.info(`Uploaded: ${url}`);
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
export const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const processBatch = async (batch) => {
    for(const item of batch) {
        queue.add(() => processItem(item));
    }

    await queue.onIdle();
    await sleep(100);
};