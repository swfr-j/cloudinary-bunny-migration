import PQueue from 'p-queue';
import bcdn from './bunnyNet';
import cloudinary from './cloudinary';
import path from 'path';    
import axios from 'axios';
import { csvWriter } from './csvHelpers';
import logger from './logger';
import db from './db';

// 5 concurrent uploads, 5 minute timeout
const queue = new PQueue({ concurrency: 10, timeout: 1000 * 60 * 5, throwOnTimeout: true }); 
const reUploadQueue = new PQueue({ concurrency: 25, timeout: 1000 * 60, throwOnTimeout: true, retries: 3 });
const pgQueue = new PQueue({ concurrency: 10, timeout: 1000 * 60 * 5, throwOnTimeout: true });

export const getBatch = async (cursor, DB_BATCH_SIZE, resourceType = 'image') => {
    try {
        const resources = await cloudinary.v2.api.resources({
            max_results: DB_BATCH_SIZE,
            next_cursor: cursor,
            resource_type: resourceType,
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
    
    // check if the file is already uploaded
    const checkUrl = `${process.env.BUNNYCDN_PUBLIC_DOMAIN}${bunnyPath}`;
    
    try {
        const res = await axios.head(checkUrl);
        if (res.status === 200) {
            logger.info(`File already uploaded with public id ${public_id}`);
            return;
        }
    } catch (error) {
        logger.error(`File not found ${public_id}`);
    }

    let data;
    let file;
    try {
        file = await axios.get(url, {
            responseType: 'arraybuffer',
        });
    } catch (error) {
        logger.error(`Download Failed ${public_id}, ${error.status}, ${error.message}`);
        return;
    }
    
    try {
        data = await bcdn.uploadFile(file.data, fileName, bunnyPath);
    } catch (error) {
        logger.error(`Upload failed ${public_id}, ${error.status}, ${error.message}`);   
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
        logger.error(`Failed to write to CSV ${public_id}, ${error.status}, ${error.message}`);
    }
}

export const processReuploadItem = async (item) => {
    const { public_id, format, secure_url: url } = item;
    const bunnyPath = url.replace('https://res.cloudinary.com/', '/cldn/');
    // divide bunnyPath into path and fileName
    const fileName = `${public_id}.${format}`;
    
    // check if the file is already uploaded
    const checkUrl = `${process.env.BUNNYCDN_PUBLIC_DOMAIN}${bunnyPath}`;
    let data;
    let file;
        
    try {
        const res = await axios.head(checkUrl);
        if (res.status !== 200) {
            logger.error(`File not found ${public_id}`);
            throw new Error("File not found");
        }

        logger.info(`File already uploaded with public id ${public_id}`);
        data = { url: checkUrl };
    } catch (error) {
        logger.error(`File not found ${public_id}. Uploading again`);
        try {
            file = await axios.get(url, {
                responseType: 'arraybuffer',
            });
        } catch (error) {
            logger.error(`Download Failed ${public_id}, ${error.status}, ${error.message}`);
            return;
        }
        
        try {
            data = await bcdn.uploadFile(file.data, fileName, bunnyPath);
            logger.info(`Uploaded: ${url}`);
        } catch (error) {
            logger.error(`Upload failed ${public_id}, ${error.status}, ${error.message}`);   
        }
    }

    const bunnyUrl = data.url;

    const csvFilePath = path.resolve(__dirname, 'data_reuploaded.csv');
    try {
        await csvWriter(csvFilePath).writeRecords([
            { public_id, cloudinary_url: url, bunny_url: bunnyUrl }
        ]);
        logger.info(`Record written to CSV for ${public_id}`);
    } catch(error) {
        logger.error(`Failed to write to CSV ${public_id}, ${error.status}, ${error.message}`);
    }
}

export const processReuploadBatch = async (batch) => {
    for(const item of batch) {
        reUploadQueue.add(() => processReuploadItem(item));
    }

    await reUploadQueue.onIdle();
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

export const processPgItem = async (item) => {
    const { cloudinaryId, url } = item;
    const bunnyPath = url.replace('https://res.cloudinary.com/', '/cldn/');
    const fileName = `${cloudinaryId}.${item.extension}`;

    const checkUrl = `${process.env.BUNNYCDN_PUBLIC_DOMAIN}${bunnyPath}`;
    // check if the file is already uploaded

    let data;
    let file;

    try {
        const res = await axios.head(checkUrl);
        if (res.status !== 200) {
            logger.error(`File not found ${public_id}`);
            throw new Error("File not found");
        }

        logger.info(`File already uploaded with public id ${public_id}`);
        data = { url: checkUrl };
    } catch (error) {
        logger.error(`File not found ${cloudinaryId}`);
        try {
            file = await axios.get(url, {
                responseType: 'arraybuffer',
            });
        } catch (error) {
            logger.error(`Download Failed ${cloudinaryId}, ${error.status}, ${error.message}`);
            return;
        }
    
        try {
            data = await bcdn.uploadFile(file.data, fileName, bunnyPath);
        } catch (error) {
            logger.error(`Upload failed ${cloudinaryId}, ${error.status}, ${error.message}`);
        }
    }


   

    const csvFilePath = path.resolve(__dirname, 'data_pg.csv');
    try {
        await csvWriter(csvFilePath).writeRecords([
            { public_id: cloudinaryId, cloudinary_url: url, bunny_url: data.url }
        ]);
        logger.info(`Record written to CSV for ${cloudinaryId}`);
    } catch(error) {
        logger.error(`Failed to write to CSV ${cloudinaryId}, ${error.status}, ${error.message}`);
    }
};

export const processPgBatch = async (batch) => {
    for(const item of batch) {
        pgQueue.add(() => processPgItem(item));
    }

    await pgQueue.onIdle();
    await sleep(5000);
}

export const getPgBatch = async (offset, DB_BATCH_SIZE) => {
    try {
        const res = await db.query(`
            SELECT "cloudinaryId", url, extension FROM files
            WHERE url LIKE 'https://res.cloudinary.com/%'
                AND "dateDeleted" IS NULL
            LIMIT ${DB_BATCH_SIZE}
            OFFSET ${offset};
        `, { type: db.QueryTypes.SELECT });
        return res;
    } catch (error) {
        logger.error("Failed to fetch resources", error.status, error.message);
    }
}

export const getTotalPgRecords = async () => {
    try {
        const res = await db.query(`
            SELECT COUNT(*) FROM files
            WHERE url LIKE 'https://res.cloudinary.com/%'
                AND "dateDeleted" IS NULL;
        `, { type: db.QueryTypes.SELECT });
        return res;
    } catch (error) {
        logger.error("Failed to fetch resources", error.status, error.message);
    }
}

export const getBCDNPGRecords = async () => {
    try {
        const res = await db.query(`
            SELECT count(*) FROM files
            WHERE url LIKE 'https://cdnb.nolt.in/%'
                AND "dateDeleted" IS NULL;
        `, { type: db.QueryTypes.SELECT });
        return res;
    } catch (error) {
        logger.error("Failed to fetch resources", error.status, error.message);
    }
}

export const getBCDNBatch = async (offset, DB_BATCH_SIZE) => {
    try {
        const res = await db.query(`
            SELECT "cloudinaryId" as id, url FROM files
            WHERE url LIKE 'https://cdnb.nolt.in/%'
                AND "dateDeleted" IS NULL
            LIMIT ${DB_BATCH_SIZE}
            OFFSET ${offset};
        `, { type: db.QueryTypes.SELECT });
        return res;
    } catch (error) {
        logger.error("Failed to fetch resources", error.status, error.message);
    }
}